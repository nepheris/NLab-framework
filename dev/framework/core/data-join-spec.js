const TYPE = 'nlab.data-join-spec';
const VERSION = 1;
const BAD_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const JOIN_TYPES = new Set(['inner', 'left', 'right', 'full', 'left-semi', 'left-anti', 'right-semi', 'right-anti']);
const CARDINALITIES = new Set(['auto', '1:1', '1:N', 'N:1', 'N:N']);
const DIRECTIONS = new Set(['none', 'left-to-right', 'right-to-left', 'bidirectional']);
const PRECEDENCE = new Set(['none', 'left', 'right', 'error', 'manual']);
const COLLISIONS = new Set(['nested', 'suffix', 'leftWins', 'rightWins', 'error']);
const COERCIONS = new Set(['none', 'string', 'number']);
const MAX_KEYS = 16;
const MAX_TEXT = 512;

function fail(message, code = 'INVALID_JOIN_SPEC') {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}

function cloneSafe(value, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('JoinSpec values must use finite numbers', 'NON_FINITE_JOIN_VALUE');
    return value;
  }
  if (typeof value !== 'object') fail(`Unsupported JoinSpec value: ${typeof value}`, 'UNSUPPORTED_JOIN_VALUE');
  if (seen.has(value)) fail('Cyclic JoinSpec values are not supported', 'CYCLIC_JOIN_VALUE');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((entry) => cloneSafe(entry, seen));
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_SEGMENTS.has(key)) fail(`Unsafe JoinSpec key: ${key}`, 'UNSAFE_JOIN_KEY');
      Object.defineProperty(output, key, {
        value: cloneSafe(entry, seen), enumerable: true, configurable: true, writable: true
      });
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function objectValue(value, label) {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}

function text(value, fallback = '', { required = false } = {}) {
  const result = String(value ?? fallback).trim();
  if (required && !result) fail('Required JoinSpec text is missing');
  if (result.length > MAX_TEXT) fail(`JoinSpec text exceeds ${MAX_TEXT} characters`);
  return result;
}

function enumValue(value, values, fallback) {
  const raw = text(value, fallback);
  if (values.has(raw)) return raw;
  const lower = raw.toLowerCase();
  for (const candidate of values) if (candidate.toLowerCase() === lower) return candidate;
  return fallback;
}

function pathParts(path) {
  const parts = Array.isArray(path)
    ? path.map((entry) => text(entry, '', { required: true }))
    : text(path, '', { required: true }).split('.').filter(Boolean);
  if (!parts.length) fail('Join key path must not be empty');
  if (parts.some((part) => BAD_SEGMENTS.has(part))) fail(`Unsafe join path: ${parts.join('.')}`, 'UNSAFE_JOIN_PATH');
  return parts;
}

function canonicalPath(path) {
  return pathParts(path).join('.');
}

function readPath(row, path) {
  let value = row;
  for (const part of pathParts(path)) value = value?.[part];
  return value;
}

function normalizeKeys(value) {
  if (!Array.isArray(value) || value.length === 0) fail('JoinSpec requires at least one key mapping');
  if (value.length > MAX_KEYS) fail(`JoinSpec supports at most ${MAX_KEYS} key mappings`);
  const seen = new Set();
  const output = [];
  value.forEach((entry, index) => {
    const key = objectValue(entry, `keys[${index}]`);
    const left = canonicalPath(key.left);
    const right = canonicalPath(key.right);
    const identity = `${left}\u0000${right}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    output.push({ left, right, label: text(key.label, '') });
  });
  if (!output.length) fail('JoinSpec requires at least one unique key mapping');
  return output;
}

function normalizeComparison(value = {}) {
  const input = objectValue(value, 'comparison');
  return {
    trim: input.trim === undefined ? true : Boolean(input.trim),
    caseSensitive: input.caseSensitive === undefined ? true : Boolean(input.caseSensitive),
    coerce: enumValue(input.coerce, COERCIONS, 'none'),
    blankAsNull: input.blankAsNull === undefined ? true : Boolean(input.blankAsNull),
    nullMatchesNull: input.nullMatchesNull === undefined ? false : Boolean(input.nullMatchesNull)
  };
}

function normalizeCollision(value = {}) {
  const input = objectValue(value, 'collision');
  return {
    policy: enumValue(input.policy, COLLISIONS, 'nested'),
    leftSuffix: text(input.leftSuffix, '_left'),
    rightSuffix: text(input.rightSuffix, '_right')
  };
}

function normalizeState(value = {}) {
  const input = objectValue(value, 'join');
  return {
    type: enumValue(input.type, JOIN_TYPES, 'inner'),
    keys: normalizeKeys(input.keys),
    expectedCardinality: enumValue(input.expectedCardinality, CARDINALITIES, 'auto'),
    direction: enumValue(input.direction, DIRECTIONS, 'none'),
    precedence: enumValue(input.precedence, PRECEDENCE, 'none'),
    comparison: normalizeComparison(input.comparison),
    collision: normalizeCollision(input.collision),
    metadata: cloneSafe(objectValue(input.metadata, 'metadata'))
  };
}

function mergeState(current, patch) {
  const input = objectValue(patch, 'join patch');
  return {
    ...cloneSafe(current),
    ...cloneSafe(input),
    comparison: input.comparison === undefined
      ? cloneSafe(current.comparison)
      : { ...cloneSafe(current.comparison), ...cloneSafe(input.comparison) },
    collision: input.collision === undefined
      ? cloneSafe(current.collision)
      : { ...cloneSafe(current.collision), ...cloneSafe(input.collision) }
  };
}

function missing(value, options) {
  return value === null || value === undefined || (options.blankAsNull && typeof value === 'string' && value.trim() === '');
}

function normalizeScalar(value, options) {
  if (missing(value, options)) return options.nullMatchesNull ? { ok: true, token: ['null', null], display: null } : { ok: false, reason: 'missing' };
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
  return { ok: true, token: [typeof normalized, normalized], display: normalized };
}

function rowKey(row, side, state) {
  const tokens = [];
  const display = [];
  for (const mapping of state.keys) {
    const part = normalizeScalar(readPath(row, mapping[side]), state.comparison);
    if (!part.ok) return { ok: false, reason: part.reason };
    tokens.push(part.token);
    display.push(part.display);
  }
  return { ok: true, encoded: JSON.stringify(tokens), display };
}

function indexRows(rows, side, state) {
  const source = Array.isArray(rows) ? rows : [];
  const groups = new Map();
  const rejected = { missing: 0, 'non-scalar': 0, 'non-numeric': 0, 'non-finite': 0 };
  source.forEach((row, index) => {
    const key = rowKey(row, side, state);
    if (!key.ok) {
      rejected[key.reason] = (rejected[key.reason] ?? 0) + 1;
      return;
    }
    const group = groups.get(key.encoded) ?? { key: key.display, indexes: [] };
    group.indexes.push(index);
    groups.set(key.encoded, group);
  });
  return { rows: source.length, groups, rejected };
}

function sumRejected(rejected) {
  return Object.values(rejected).reduce((total, value) => total + value, 0);
}

function observedCardinality(matched) {
  if (!matched.length) return 'unknown';
  const manyLeft = matched.some((entry) => entry.left > 1);
  const manyRight = matched.some((entry) => entry.right > 1);
  if (manyLeft && manyRight) return 'N:N';
  if (manyLeft) return 'N:1';
  if (manyRight) return '1:N';
  return '1:1';
}

function outputEstimate(type, stats) {
  const inner = stats.matched.reduce((total, group) => total + group.left * group.right, 0);
  switch (type) {
    case 'inner': return inner;
    case 'left': return inner + stats.unmatchedLeft;
    case 'right': return inner + stats.unmatchedRight;
    case 'full': return inner + stats.unmatchedLeft + stats.unmatchedRight;
    case 'left-semi': return stats.matchedLeft;
    case 'left-anti': return stats.unmatchedLeft;
    case 'right-semi': return stats.matchedRight;
    case 'right-anti': return stats.unmatchedRight;
    default: return inner;
  }
}

function warning(code, level, message, details = {}) {
  return { code, level, message, details };
}

function buildWarnings(state, left, right, observed, estimate, duplicateLeft, duplicateRight) {
  const warnings = [];
  const missingLeft = sumRejected(left.rejected);
  const missingRight = sumRejected(right.rejected);
  if (missingLeft) warnings.push(warning('LEFT_KEYS_REJECTED', 'warning', `${missingLeft} left rows have unusable join keys`, cloneSafe(left.rejected)));
  if (missingRight) warnings.push(warning('RIGHT_KEYS_REJECTED', 'warning', `${missingRight} right rows have unusable join keys`, cloneSafe(right.rejected)));
  if (duplicateLeft.length) warnings.push(warning('LEFT_KEY_DUPLICATES', 'warning', `${duplicateLeft.length} left keys are duplicated`, { groups: duplicateLeft.length }));
  if (duplicateRight.length) warnings.push(warning('RIGHT_KEY_DUPLICATES', 'warning', `${duplicateRight.length} right keys are duplicated`, { groups: duplicateRight.length }));
  if (observed === 'N:N') warnings.push(warning('MANY_TO_MANY', 'warning', 'Many-to-many join detected; output rows can multiply', {}));
  if (state.expectedCardinality !== 'auto' && observed !== 'unknown' && state.expectedCardinality !== observed) {
    warnings.push(warning('CARDINALITY_MISMATCH', 'error', `Expected ${state.expectedCardinality} but observed ${observed}`, {
      expected: state.expectedCardinality, observed
    }));
  }
  const inputRows = Math.max(1, left.rows + right.rows);
  if (estimate > Math.max(10000, inputRows * 10)) {
    warnings.push(warning('OUTPUT_EXPLOSION', 'warning', `Estimated output is ${estimate} rows`, { estimate, inputRows }));
  }
  return warnings;
}

export const DATA_JOIN_SPEC_TYPE = TYPE;
export const DATA_JOIN_SPEC_VERSION = VERSION;

export class DataJoinSpec {
  constructor(value = {}) {
    this._state = normalizeState(value);
    this._initial = cloneSafe(this._state);
  }

  static parse(input) {
    const payload = typeof input === 'string' ? JSON.parse(input) : cloneSafe(input);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('DataJoinSpec payload must be an object');
    if (payload.type !== TYPE) fail(`Unsupported DataJoinSpec type: ${String(payload.type)}`);
    if (payload.version !== VERSION) fail(`Unsupported DataJoinSpec version: ${String(payload.version)}`);
    return new DataJoinSpec(payload.join);
  }

  snapshot() { return cloneSafe(this._state); }

  update(patch = {}) {
    const next = normalizeState(mergeState(this._state, patch));
    this._state = next;
    return this.snapshot();
  }

  reset() {
    this._state = cloneSafe(this._initial);
    return this.snapshot();
  }

  diagnose(leftRows = [], rightRows = []) {
    const state = this._state;
    const left = indexRows(leftRows, 'left', state);
    const right = indexRows(rightRows, 'right', state);
    const matched = [];
    let matchedLeft = 0;
    let matchedRight = 0;

    for (const [encoded, leftGroup] of left.groups) {
      const rightGroup = right.groups.get(encoded);
      if (!rightGroup) continue;
      matched.push({ key: cloneSafe(leftGroup.key), left: leftGroup.indexes.length, right: rightGroup.indexes.length });
      matchedLeft += leftGroup.indexes.length;
      matchedRight += rightGroup.indexes.length;
    }

    const unmatchedLeft = left.rows - matchedLeft;
    const unmatchedRight = right.rows - matchedRight;
    const duplicateLeft = [...left.groups.values()].filter((group) => group.indexes.length > 1).map((group) => ({ key: cloneSafe(group.key), count: group.indexes.length }));
    const duplicateRight = [...right.groups.values()].filter((group) => group.indexes.length > 1).map((group) => ({ key: cloneSafe(group.key), count: group.indexes.length }));
    const observed = observedCardinality(matched);
    const stats = { matched, matchedLeft, matchedRight, unmatchedLeft, unmatchedRight };
    const estimatedRows = outputEstimate(state.type, stats);

    return {
      joinType: state.type,
      expectedCardinality: state.expectedCardinality,
      observedCardinality: observed,
      rows: { left: left.rows, right: right.rows, estimatedOutput: estimatedRows },
      keys: { matched: matched.length, matchedRows: { left: matchedLeft, right: matchedRight }, unmatchedRows: { left: unmatchedLeft, right: unmatchedRight } },
      rejected: { left: cloneSafe(left.rejected), right: cloneSafe(right.rejected) },
      duplicates: { left: duplicateLeft, right: duplicateRight },
      warnings: buildWarnings(state, left, right, observed, estimatedRows, duplicateLeft, duplicateRight)
    };
  }

  explain() {
    const state = this._state;
    return {
      join: `${state.type} join`,
      keys: state.keys.map((key) => `${key.left} = ${key.right}`),
      cardinality: state.expectedCardinality,
      navigation: state.direction,
      precedence: state.precedence,
      collision: state.collision.policy
    };
  }

  toJSON() { return { type: TYPE, version: VERSION, join: this.snapshot() }; }

  serialize({ indent = 2 } = {}) {
    const safeIndent = Math.max(0, Math.min(8, Math.floor(Number(indent) || 0)));
    return JSON.stringify(this.toJSON(), null, safeIndent);
  }
}
