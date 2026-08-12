const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const JOIN_TYPES = new Set(['inner', 'left', 'right', 'full', 'left-semi', 'left-anti', 'right-semi', 'right-anti']);
const COLLISIONS = new Set(['nested', 'suffix', 'leftWins', 'rightWins', 'error']);
const COERCIONS = new Set(['none', 'string', 'number']);
const DEFAULT_MAX_OUTPUT_ROWS = 250000;

function fail(message, code = 'DATA_JOIN_EXECUTION_ERROR', details = null, ErrorType = Error) {
  const error = new ErrorType(message);
  error.code = code;
  error.details = details;
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneJson(value, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('Join rows must contain finite numbers', 'NON_FINITE_JOIN_ROW', null, TypeError);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail('Cyclic join rows are not supported', 'CYCLIC_JOIN_ROW', null, TypeError);
    seen.add(value);
    try { return value.map((entry) => cloneJson(entry, seen)); }
    finally { seen.delete(value); }
  }
  if (!isPlainObject(value)) fail(`Unsupported join row value: ${Object.prototype.toString.call(value)}`, 'UNSUPPORTED_JOIN_ROW_VALUE', null, TypeError);
  if (seen.has(value)) fail('Cyclic join rows are not supported', 'CYCLIC_JOIN_ROW', null, TypeError);
  seen.add(value);
  try {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) fail(`Unsafe join row key: ${key}`, 'UNSAFE_JOIN_ROW_KEY', { key }, TypeError);
      Object.defineProperty(output, key, {
        value: cloneJson(entry, seen), enumerable: true, configurable: true, writable: true
      });
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function pathParts(path) {
  const parts = Array.isArray(path)
    ? path.map((part) => String(part ?? '').trim()).filter(Boolean)
    : String(path ?? '').trim().split('.').filter(Boolean);
  if (!parts.length) fail('Join key path must not be empty', 'INVALID_JOIN_PATH', { path }, TypeError);
  if (parts.some((part) => BAD_KEYS.has(part))) fail(`Unsafe join path: ${parts.join('.')}`, 'UNSAFE_JOIN_PATH', { path: parts.join('.') }, TypeError);
  return parts;
}

function readPath(row, path) {
  let value = row;
  for (const part of pathParts(path)) value = value?.[part];
  return value;
}

function normalizeState(spec) {
  let state;
  if (spec && typeof spec.snapshot === 'function') state = spec.snapshot();
  else if (isPlainObject(spec) && spec.type === 'nlab.data-join-spec' && spec.version === 1) state = spec.join;
  else state = spec;

  if (!isPlainObject(state)) fail('DataJoinExecutor requires a DataJoinSpec snapshot or instance', 'INVALID_JOIN_SPEC', null, TypeError);
  const type = JOIN_TYPES.has(state.type) ? state.type : null;
  if (!type) fail(`Unsupported join type: ${String(state.type)}`, 'UNSUPPORTED_JOIN_TYPE', { type: state.type }, TypeError);
  if (!Array.isArray(state.keys) || state.keys.length === 0) fail('JoinSpec must contain key mappings', 'INVALID_JOIN_KEYS', null, TypeError);

  const keys = state.keys.map((entry, index) => {
    if (!isPlainObject(entry)) fail(`Join key ${index} must be an object`, 'INVALID_JOIN_KEYS', { index }, TypeError);
    return { left: pathParts(entry.left).join('.'), right: pathParts(entry.right).join('.') };
  });
  const comparison = isPlainObject(state.comparison) ? state.comparison : {};
  const collision = isPlainObject(state.collision) ? state.collision : {};
  const policy = COLLISIONS.has(collision.policy) ? collision.policy : 'nested';
  const coerce = COERCIONS.has(comparison.coerce) ? comparison.coerce : 'none';

  return {
    type,
    keys,
    expectedCardinality: typeof state.expectedCardinality === 'string' ? state.expectedCardinality : 'auto',
    direction: typeof state.direction === 'string' ? state.direction : 'none',
    precedence: typeof state.precedence === 'string' ? state.precedence : 'none',
    comparison: {
      trim: comparison.trim === undefined ? true : Boolean(comparison.trim),
      caseSensitive: comparison.caseSensitive === undefined ? true : Boolean(comparison.caseSensitive),
      coerce,
      blankAsNull: comparison.blankAsNull === undefined ? true : Boolean(comparison.blankAsNull),
      nullMatchesNull: comparison.nullMatchesNull === undefined ? false : Boolean(comparison.nullMatchesNull)
    },
    collision: {
      policy,
      leftSuffix: String(collision.leftSuffix ?? '_left'),
      rightSuffix: String(collision.rightSuffix ?? '_right')
    }
  };
}

function missing(value, options) {
  return value === null || value === undefined || (options.blankAsNull && typeof value === 'string' && value.trim() === '');
}

function scalarToken(value, options) {
  if (missing(value, options)) return options.nullMatchesNull ? { ok: true, token: ['null', null] } : { ok: false, reason: 'missing' };
  if (typeof value === 'object' || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return { ok: false, reason: 'non-scalar' };
  }
  let normalized = value;
  if (options.coerce === 'string') normalized = String(normalized);
  if (options.coerce === 'number') {
    const numeric = typeof normalized === 'number' ? normalized : Number(String(normalized).trim());
    if (!Number.isFinite(numeric)) return { ok: false, reason: 'non-numeric' };
    normalized = numeric;
  }
  if (typeof normalized === 'string') {
    if (options.trim) normalized = normalized.trim();
    if (!options.caseSensitive) normalized = normalized.toLocaleLowerCase();
  }
  if (typeof normalized === 'number' && !Number.isFinite(normalized)) return { ok: false, reason: 'non-finite' };
  return { ok: true, token: [typeof normalized, normalized] };
}

function keyFor(row, side, state) {
  const tokens = [];
  for (const mapping of state.keys) {
    const normalized = scalarToken(readPath(row, mapping[side]), state.comparison);
    if (!normalized.ok) return normalized;
    tokens.push(normalized.token);
  }
  return { ok: true, encoded: JSON.stringify(tokens) };
}

function buildIndex(rows, side, state) {
  const groups = new Map();
  const rejected = [];
  rows.forEach((row, index) => {
    const key = keyFor(row, side, state);
    if (!key.ok) {
      rejected.push({ index, reason: key.reason });
      return;
    }
    const indexes = groups.get(key.encoded) ?? [];
    indexes.push(index);
    groups.set(key.encoded, indexes);
  });
  return { groups, rejected };
}

function diagnosticFromSpec(spec, leftRows, rightRows) {
  if (spec && typeof spec.diagnose === 'function') return cloneJson(spec.diagnose(leftRows, rightRows));
  return null;
}

function shallowKeys(value) {
  return isPlainObject(value) ? Object.keys(value) : [];
}

function mergeSuffix(left, right, collision) {
  const l = isPlainObject(left) ? left : {};
  const r = isPlainObject(right) ? right : {};
  const leftKeys = new Set(shallowKeys(l));
  const rightKeys = new Set(shallowKeys(r));
  const output = {};
  for (const [key, value] of Object.entries(l)) {
    const target = rightKeys.has(key) ? `${key}${collision.leftSuffix}` : key;
    if (BAD_KEYS.has(target)) fail(`Unsafe output key: ${target}`, 'UNSAFE_JOIN_OUTPUT_KEY', { key: target }, TypeError);
    if (Object.hasOwn(output, target)) fail(`Output key collision after suffixing: ${target}`, 'JOIN_OUTPUT_KEY_COLLISION', { key: target });
    output[target] = cloneJson(value);
  }
  for (const [key, value] of Object.entries(r)) {
    const target = leftKeys.has(key) ? `${key}${collision.rightSuffix}` : key;
    if (BAD_KEYS.has(target)) fail(`Unsafe output key: ${target}`, 'UNSAFE_JOIN_OUTPUT_KEY', { key: target }, TypeError);
    if (Object.hasOwn(output, target)) fail(`Output key collision after suffixing: ${target}`, 'JOIN_OUTPUT_KEY_COLLISION', { key: target });
    output[target] = cloneJson(value);
  }
  return output;
}

function mergeWins(left, right, winner) {
  const l = isPlainObject(left) ? cloneJson(left) : {};
  const r = isPlainObject(right) ? cloneJson(right) : {};
  return winner === 'left' ? { ...r, ...l } : { ...l, ...r };
}

function materializePair(left, right, collision) {
  switch (collision.policy) {
    case 'nested': return { left: left === null ? null : cloneJson(left), right: right === null ? null : cloneJson(right) };
    case 'suffix': return mergeSuffix(left, right, collision);
    case 'leftWins': return mergeWins(left, right, 'left');
    case 'rightWins': return mergeWins(left, right, 'right');
    case 'error': {
      const l = isPlainObject(left) ? left : {};
      const r = isPlainObject(right) ? right : {};
      const overlap = Object.keys(l).filter((key) => Object.hasOwn(r, key));
      if (overlap.length) fail('Join output contains colliding fields', 'JOIN_FIELD_COLLISION', { fields: overlap });
      return { ...cloneJson(l), ...cloneJson(r) };
    }
    default: fail(`Unsupported collision policy: ${collision.policy}`, 'UNSUPPORTED_COLLISION_POLICY');
  }
}

function materializeSingle(row) {
  return cloneJson(row);
}

function positiveLimit(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) fail('maxOutputRows must be a positive finite number', 'INVALID_OUTPUT_LIMIT', { value }, RangeError);
  return Math.floor(number);
}

function countPlannedRows(state, leftRows, rightRows, leftIndex, rightIndex) {
  let matchedPairs = 0;
  let matchedLeft = 0;
  let matchedRight = 0;
  let matchedGroups = 0;
  let manyLeft = false;
  let manyRight = false;
  const matchedLeftSet = new Set();
  const matchedRightSet = new Set();
  for (const [key, leftIndexes] of leftIndex.groups) {
    const rightIndexes = rightIndex.groups.get(key);
    if (!rightIndexes) continue;
    matchedGroups += 1;
    manyLeft ||= leftIndexes.length > 1;
    manyRight ||= rightIndexes.length > 1;
    matchedPairs += leftIndexes.length * rightIndexes.length;
    leftIndexes.forEach((index) => matchedLeftSet.add(index));
    rightIndexes.forEach((index) => matchedRightSet.add(index));
  }
  matchedLeft = matchedLeftSet.size;
  matchedRight = matchedRightSet.size;
  const unmatchedLeft = leftRows.length - matchedLeft;
  const unmatchedRight = rightRows.length - matchedRight;
  let outputRows;
  switch (state.type) {
    case 'inner': outputRows = matchedPairs; break;
    case 'left': outputRows = matchedPairs + unmatchedLeft; break;
    case 'right': outputRows = matchedPairs + unmatchedRight; break;
    case 'full': outputRows = matchedPairs + unmatchedLeft + unmatchedRight; break;
    case 'left-semi': outputRows = matchedLeft; break;
    case 'left-anti': outputRows = unmatchedLeft; break;
    case 'right-semi': outputRows = matchedRight; break;
    case 'right-anti': outputRows = unmatchedRight; break;
    default: outputRows = matchedPairs;
  }
  const observedCardinality = matchedGroups === 0 ? 'unknown' : manyLeft && manyRight ? 'N:N' : manyLeft ? 'N:1' : manyRight ? '1:N' : '1:1';
  return { matchedPairs, matchedLeft, matchedRight, unmatchedLeft, unmatchedRight, outputRows, matchedLeftSet, matchedRightSet, observedCardinality };
}

function strictCardinalityCheck(diagnostic, state, plan, options) {
  if (!options.strictCardinality) return;
  const mismatch = diagnostic?.warnings?.find((item) => item?.code === 'CARDINALITY_MISMATCH');
  if (mismatch) fail(mismatch.message || 'Join cardinality mismatch', 'CARDINALITY_MISMATCH', mismatch.details ?? diagnostic);
  const observed = diagnostic?.observedCardinality ?? plan.observedCardinality;
  if (state.expectedCardinality !== 'auto' && observed !== 'unknown' && observed !== state.expectedCardinality) {
    fail(`Expected ${state.expectedCardinality} but observed ${observed}`, 'CARDINALITY_MISMATCH', {
      expected: state.expectedCardinality, observed
    });
  }
}

export class DataJoinExecutor {
  constructor({ maxOutputRows = DEFAULT_MAX_OUTPUT_ROWS } = {}) {
    this.maxOutputRows = positiveLimit(maxOutputRows, DEFAULT_MAX_OUTPUT_ROWS);
  }

  execute(leftRows = [], rightRows = [], spec, options = {}) {
    if (!Array.isArray(leftRows) || !Array.isArray(rightRows)) fail('Join inputs must be arrays', 'INVALID_JOIN_INPUT', null, TypeError);
    const state = normalizeState(spec);
    const maxOutputRows = positiveLimit(options.maxOutputRows, this.maxOutputRows);
    const diagnostic = diagnosticFromSpec(spec, leftRows, rightRows);
    const leftIndex = buildIndex(leftRows, 'left', state);
    const rightIndex = buildIndex(rightRows, 'right', state);
    const plan = countPlannedRows(state, leftRows, rightRows, leftIndex, rightIndex);
    strictCardinalityCheck(diagnostic, state, plan, options);
    if (plan.outputRows > maxOutputRows) {
      fail(`Join would produce ${plan.outputRows} rows, above limit ${maxOutputRows}`, 'OUTPUT_LIMIT_EXCEEDED', {
        estimatedRows: plan.outputRows, maxOutputRows
      }, RangeError);
    }

    const rows = [];
    const provenance = [];
    const pushPair = (leftIndexValue, rightIndexValue, kind) => {
      const left = leftIndexValue === null ? null : leftRows[leftIndexValue];
      const right = rightIndexValue === null ? null : rightRows[rightIndexValue];
      rows.push(materializePair(left, right, state.collision));
      provenance.push({ leftIndex: leftIndexValue, rightIndex: rightIndexValue, kind });
    };
    const pushSingle = (side, index, kind) => {
      const row = side === 'left' ? leftRows[index] : rightRows[index];
      rows.push(materializeSingle(row));
      provenance.push({ leftIndex: side === 'left' ? index : null, rightIndex: side === 'right' ? index : null, kind });
    };

    if (state.type === 'left-semi' || state.type === 'left-anti') {
      leftRows.forEach((_, index) => {
        const matched = plan.matchedLeftSet.has(index);
        if ((state.type === 'left-semi' && matched) || (state.type === 'left-anti' && !matched)) {
          pushSingle('left', index, matched ? 'matched-left' : 'unmatched-left');
        }
      });
    } else if (state.type === 'right-semi' || state.type === 'right-anti') {
      rightRows.forEach((_, index) => {
        const matched = plan.matchedRightSet.has(index);
        if ((state.type === 'right-semi' && matched) || (state.type === 'right-anti' && !matched)) {
          pushSingle('right', index, matched ? 'matched-right' : 'unmatched-right');
        }
      });
    } else {
      leftRows.forEach((_, leftRowIndex) => {
        const key = keyFor(leftRows[leftRowIndex], 'left', state);
        const rightIndexes = key.ok ? rightIndex.groups.get(key.encoded) : null;
        if (rightIndexes?.length) {
          rightIndexes.forEach((rightRowIndex) => pushPair(leftRowIndex, rightRowIndex, 'matched'));
        } else if (state.type === 'left' || state.type === 'full') {
          pushPair(leftRowIndex, null, 'unmatched-left');
        }
      });
      if (state.type === 'right' || state.type === 'full') {
        rightRows.forEach((_, rightRowIndex) => {
          if (!plan.matchedRightSet.has(rightRowIndex)) pushPair(null, rightRowIndex, 'unmatched-right');
        });
      }
    }

    return {
      rows,
      provenance,
      execution: {
        joinType: state.type,
        collisionPolicy: state.collision.policy,
        expectedCardinality: state.expectedCardinality,
        observedCardinality: diagnostic?.observedCardinality ?? plan.observedCardinality,
        inputRows: { left: leftRows.length, right: rightRows.length },
        outputRows: rows.length,
        matchedPairs: plan.matchedPairs,
        matchedRows: { left: plan.matchedLeft, right: plan.matchedRight },
        unmatchedRows: { left: plan.unmatchedLeft, right: plan.unmatchedRight },
        rejectedKeys: { left: cloneJson(leftIndex.rejected), right: cloneJson(rightIndex.rejected) },
        maxOutputRows
      },
      diagnostic
    };
  }
}

export function executeDataJoin(leftRows = [], rightRows = [], spec, options = {}) {
  return new DataJoinExecutor(options).execute(leftRows, rightRows, spec, options);
}
