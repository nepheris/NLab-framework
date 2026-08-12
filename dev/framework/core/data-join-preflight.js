import { DataJoinSpec, DATA_JOIN_SPEC_TYPE, DATA_JOIN_SPEC_VERSION } from './data-join-spec.js';

const TYPE = 'nlab.data-join-preflight';
const VERSION = 1;
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const PAIR_JOIN_TYPES = new Set(['inner', 'left', 'right', 'full']);
const SEMI_ANTI_TYPES = new Set(['left-semi', 'left-anti', 'right-semi', 'right-anti']);
const COLLISION_POLICIES = new Set(['nested', 'suffix', 'leftWins', 'rightWins', 'error']);
const DEFAULT_MAX_OUTPUT_ROWS = 250000;
const DEFAULT_MAX_ISSUES = 100;
const DEFAULT_MAX_DISTINCT_FIELDS = 4096;
const DEFAULT_MAX_SHAPE_PAIRS = 20000;
const DEFAULT_MAX_PROJECTION_SAMPLES = 25;

function fail(message, code = 'DATA_JOIN_PREFLIGHT_ERROR', details = null, ErrorType = Error) {
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

function cloneSafe(value, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('Preflight values must use finite numbers', 'NON_FINITE_PREFLIGHT_VALUE', null, TypeError);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail('Cyclic preflight values are not supported', 'CYCLIC_PREFLIGHT_VALUE', null, TypeError);
    seen.add(value);
    try { return value.map((entry) => cloneSafe(entry, seen)); }
    finally { seen.delete(value); }
  }
  if (!isPlainObject(value)) fail('Preflight values must be JSON-like', 'UNSUPPORTED_PREFLIGHT_VALUE', null, TypeError);
  if (seen.has(value)) fail('Cyclic preflight values are not supported', 'CYCLIC_PREFLIGHT_VALUE', null, TypeError);
  seen.add(value);
  try {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) fail(`Unsafe preflight key: ${key}`, 'UNSAFE_PREFLIGHT_KEY', { key }, TypeError);
      Object.defineProperty(output, key, {
        value: cloneSafe(entry, seen), enumerable: true, configurable: true, writable: true
      });
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function positiveInteger(value, fallback, label) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) fail(`${label} must be a positive finite number`, 'INVALID_PREFLIGHT_LIMIT', { label, value }, RangeError);
  return Math.floor(number);
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

function missing(value, options) {
  return value === null || value === undefined || (options.blankAsNull && typeof value === 'string' && value.trim() === '');
}

function scalarToken(value, options) {
  if (missing(value, options)) return options.nullMatchesNull ? { ok: true, token: ['null', null] } : { ok: false, reason: 'missing' };
  if (typeof value === 'object' || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') return { ok: false, reason: 'non-scalar' };
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

function rowToken(row, side, state) {
  const tokens = [];
  for (const mapping of state.keys) {
    const normalized = scalarToken(readPath(row, mapping[side]), state.comparison);
    if (!normalized.ok) return normalized;
    tokens.push(normalized.token);
  }
  return { ok: true, encoded: JSON.stringify(tokens) };
}

function buildMatchIndex(rows, side, state) {
  const groups = new Map();
  const rejected = new Set();
  rows.forEach((row, index) => {
    const key = rowToken(row, side, state);
    if (!key.ok) { rejected.add(index); return; }
    const indexes = groups.get(key.encoded) ?? [];
    indexes.push(index);
    groups.set(key.encoded, indexes);
  });
  return { groups, rejected };
}

function buildMaterializationPlan(leftRows, rightRows, state) {
  const leftIndex = buildMatchIndex(leftRows, 'left', state);
  const rightIndex = buildMatchIndex(rightRows, 'right', state);
  const matchedGroups = [];
  const matchedLeft = new Set();
  const matchedRight = new Set();
  for (const [encoded, leftIndexes] of leftIndex.groups) {
    const rightIndexes = rightIndex.groups.get(encoded);
    if (!rightIndexes) continue;
    matchedGroups.push({ encoded, leftIndexes: [...leftIndexes], rightIndexes: [...rightIndexes] });
    leftIndexes.forEach((index) => matchedLeft.add(index));
    rightIndexes.forEach((index) => matchedRight.add(index));
  }
  const materializedLeft = new Set();
  const materializedRight = new Set();
  if (PAIR_JOIN_TYPES.has(state.type)) {
    matchedLeft.forEach((index) => materializedLeft.add(index));
    matchedRight.forEach((index) => materializedRight.add(index));
    if (state.type === 'left' || state.type === 'full') leftRows.forEach((_, index) => { if (!matchedLeft.has(index)) materializedLeft.add(index); });
    if (state.type === 'right' || state.type === 'full') rightRows.forEach((_, index) => { if (!matchedRight.has(index)) materializedRight.add(index); });
  } else if (state.type === 'left-semi') {
    matchedLeft.forEach((index) => materializedLeft.add(index));
  } else if (state.type === 'left-anti') {
    leftRows.forEach((_, index) => { if (!matchedLeft.has(index)) materializedLeft.add(index); });
  } else if (state.type === 'right-semi') {
    matchedRight.forEach((index) => materializedRight.add(index));
  } else if (state.type === 'right-anti') {
    rightRows.forEach((_, index) => { if (!matchedRight.has(index)) materializedRight.add(index); });
  }
  return { leftIndex, rightIndex, matchedGroups, matchedLeft, matchedRight, materializedLeft, materializedRight };
}

function shapeOf(row) {
  return isPlainObject(row) ? sorted(Object.keys(row)) : [];
}

function shapeId(fields) { return JSON.stringify(fields); }

function normalizeSpec(input) {
  if (input instanceof DataJoinSpec) return new DataJoinSpec(input.snapshot());
  if (typeof input === 'string') return DataJoinSpec.parse(input);
  if (!isPlainObject(input)) fail('Preflight requires a DataJoinSpec, payload, snapshot or JSON string', 'INVALID_PREFLIGHT_SPEC', null, TypeError);
  const looksLikePayload = input.type === DATA_JOIN_SPEC_TYPE || Object.hasOwn(input, 'version') || Object.hasOwn(input, 'join');
  if (looksLikePayload) {
    if (input.type !== DATA_JOIN_SPEC_TYPE || input.version !== DATA_JOIN_SPEC_VERSION) {
      fail('Unsupported DataJoinSpec payload', 'INVALID_PREFLIGHT_SPEC_VERSION', { type: input.type, version: input.version }, TypeError);
    }
    return DataJoinSpec.parse(input);
  }
  return new DataJoinSpec(input);
}

function issue(code, level, message, details = {}) {
  return { code, level, message, details: cloneSafe(details) };
}

function pushIssue(list, entry, maxIssues) {
  if (list.length < maxIssues) list.push(entry);
}

function auditJsonValue(value, path, state, stack) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      pushIssue(state.issues, issue('NON_FINITE_JOIN_ROW', 'error', 'Join row contains a non-finite number', { side: state.side, rowIndex: state.rowIndex, path }), state.maxIssues);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (stack.has(value)) {
      pushIssue(state.issues, issue('CYCLIC_JOIN_ROW', 'error', 'Join row contains a cyclic array', { side: state.side, rowIndex: state.rowIndex, path }), state.maxIssues);
      return;
    }
    stack.add(value);
    value.forEach((entry, index) => auditJsonValue(entry, `${path}/${index}`, state, stack));
    stack.delete(value);
    return;
  }
  if (!isPlainObject(value)) {
    pushIssue(state.issues, issue('UNSUPPORTED_JOIN_ROW_VALUE', 'error', 'Join row contains a non JSON-like value', {
      side: state.side, rowIndex: state.rowIndex, path, valueType: typeof value, tag: Object.prototype.toString.call(value)
    }), state.maxIssues);
    return;
  }
  if (stack.has(value)) {
    pushIssue(state.issues, issue('CYCLIC_JOIN_ROW', 'error', 'Join row contains a cyclic object', { side: state.side, rowIndex: state.rowIndex, path }), state.maxIssues);
    return;
  }
  stack.add(value);
  for (const [key, entry] of Object.entries(value)) {
    const childPath = `${path}/${String(key).replaceAll('~', '~0').replaceAll('/', '~1')}`;
    if (BAD_KEYS.has(key)) {
      pushIssue(state.issues, issue('UNSAFE_JOIN_ROW_KEY', 'error', `Join row contains unsafe key ${key}`, {
        side: state.side, rowIndex: state.rowIndex, path: childPath, key
      }), state.maxIssues);
      continue;
    }
    auditJsonValue(entry, childPath, state, stack);
  }
  stack.delete(value);
}

function collectFields(rows, side, { maxIssues, maxDistinctFields, materializedIndexes = null }) {
  const fields = new Set();
  const issues = [];
  let fieldLimitExceeded = false;
  rows.forEach((row, rowIndex) => {
    if (!materializedIndexes || materializedIndexes.has(rowIndex)) {
      auditJsonValue(row, '', { side, rowIndex, issues, maxIssues }, new WeakSet());
    }
    if (!isPlainObject(row)) return;
    for (const key of Object.keys(row)) {
      if (!fields.has(key) && fields.size >= maxDistinctFields) {
        fieldLimitExceeded = true;
        continue;
      }
      fields.add(key);
    }
  });
  if (fieldLimitExceeded) {
    pushIssue(issues, issue('FIELD_SCAN_LIMIT_EXCEEDED', 'warning', 'Distinct-field scan reached its configured limit', {
      side, maxDistinctFields
    }), maxIssues);
  }
  return { fields, issues, fieldLimitExceeded };
}

function sorted(values) {
  return [...values].sort((a, b) => String(a).localeCompare(String(b)));
}

function suffixProjection(leftFields, rightFields, collision) {
  const projected = { left: [], right: [], duplicates: [] };
  const targets = new Map();
  const pushTarget = (side, sourceField, targetField) => {
    projected[side].push({ sourceField, targetField });
    const origins = targets.get(targetField) ?? [];
    origins.push({ side, sourceField });
    targets.set(targetField, origins);
  };
  for (const key of leftFields) pushTarget('left', key, rightFields.includes(key) ? `${key}${collision.leftSuffix}` : key);
  for (const key of rightFields) pushTarget('right', key, leftFields.includes(key) ? `${key}${collision.rightSuffix}` : key);
  for (const [targetField, origins] of targets) if (origins.length > 1) projected.duplicates.push({ targetField, origins });
  return projected;
}

function collisionAudit(state, leftRows, rightRows, plan, globalLeftFields, globalRightFields, maxIssues, maxShapePairs) {
  const overlap = sorted([...globalLeftFields].filter((key) => globalRightFields.has(key)));
  const pairOutput = PAIR_JOIN_TYPES.has(state.type);
  const applicable = pairOutput;
  const issues = [];
  const projected = { samples: [], duplicates: [] };
  const observedCollisionFields = new Set();
  const observedProjectionDuplicates = new Map();
  const observedUnsafeTargets = new Set();

  if (!applicable) {
    return {
      applicable: false, pairOutput: false, policy: cloneSafe(state.collision), overlap, projected,
      issues: [issue('COLLISION_POLICY_NOT_APPLICABLE', 'info', 'Semi/anti joins emit single-side rows; pair collision policy is not applied', { joinType: state.type })]
    };
  }

  const policy = state.collision.policy;
  if (!COLLISION_POLICIES.has(policy)) {
    pushIssue(issues, issue('UNSUPPORTED_COLLISION_POLICY', 'error', `Unsupported collision policy ${String(policy)}`, { policy }), maxIssues);
    return { applicable, pairOutput, policy: cloneSafe(state.collision), overlap, projected, issues };
  }

  const evaluatedShapePairs = new Set();
  let shapePairLimitExceeded = false;
  scanGroups:
  for (const group of plan.matchedGroups) {
    const leftShapes = new Map();
    const rightShapes = new Map();
    for (const index of group.leftIndexes) { const fields = shapeOf(leftRows[index]); leftShapes.set(shapeId(fields), fields); }
    for (const index of group.rightIndexes) { const fields = shapeOf(rightRows[index]); rightShapes.set(shapeId(fields), fields); }
    for (const leftFields of leftShapes.values()) {
      for (const rightFields of rightShapes.values()) {
        const pairIdentity = `${shapeId(leftFields)}\u0000${shapeId(rightFields)}`;
        if (evaluatedShapePairs.has(pairIdentity)) continue;
        if (evaluatedShapePairs.size >= maxShapePairs) { shapePairLimitExceeded = true; break scanGroups; }
        evaluatedShapePairs.add(pairIdentity);
        const pairOverlap = leftFields.filter((key) => rightFields.includes(key));
        pairOverlap.forEach((key) => observedCollisionFields.add(key));
        if (policy === 'suffix') {
          const pairProjection = suffixProjection(leftFields, rightFields, state.collision);
          if (projected.samples.length < DEFAULT_MAX_PROJECTION_SAMPLES) {
            projected.samples.push({ left: cloneSafe(pairProjection.left), right: cloneSafe(pairProjection.right) });
          }
          for (const entry of [...pairProjection.left, ...pairProjection.right]) if (BAD_KEYS.has(entry.targetField)) observedUnsafeTargets.add(entry.targetField);
          for (const duplicate of pairProjection.duplicates) {
            const current = observedProjectionDuplicates.get(duplicate.targetField) ?? [];
            current.push(...duplicate.origins);
            observedProjectionDuplicates.set(duplicate.targetField, current);
          }
        }
      }
    }
  }
  if (shapePairLimitExceeded) {
    pushIssue(issues, issue('SHAPE_PAIR_SCAN_LIMIT_EXCEEDED', policy === 'error' || policy === 'suffix' ? 'error' : 'warning',
      'Matched row-shape scan reached its configured limit', { maxShapePairs, collisionPolicy: policy }), maxIssues);
  }

  const actualOverlap = sorted(observedCollisionFields);
  if (policy === 'error' && actualOverlap.length) {
    pushIssue(issues, issue('JOIN_FIELD_COLLISION', 'error', 'Matched pair output contains colliding top-level fields', { fields: actualOverlap }), maxIssues);
  } else if (policy === 'leftWins' && actualOverlap.length) {
    pushIssue(issues, issue('RIGHT_FIELDS_OVERWRITTEN', 'warning', 'Left-wins policy will overwrite right-side values for matched colliding fields', { fields: actualOverlap }), maxIssues);
  } else if (policy === 'rightWins' && actualOverlap.length) {
    pushIssue(issues, issue('LEFT_FIELDS_OVERWRITTEN', 'warning', 'Right-wins policy will overwrite left-side values for matched colliding fields', { fields: actualOverlap }), maxIssues);
  } else if (policy === 'nested' && actualOverlap.length) {
    pushIssue(issues, issue('FIELD_OVERLAP_ISOLATED_BY_NESTING', 'info', 'Matched overlapping source fields remain isolated under left/right nested output', { fields: actualOverlap }), maxIssues);
  } else if (policy === 'suffix') {
    for (const targetField of sorted(observedUnsafeTargets)) {
      pushIssue(issues, issue('UNSAFE_JOIN_OUTPUT_KEY', 'error', `Suffixing produces unsafe output field ${targetField}`, { targetField }), maxIssues);
    }
    const duplicates = sorted(observedProjectionDuplicates.keys()).map((targetField) => ({
      targetField,
      origins: cloneSafe(observedProjectionDuplicates.get(targetField))
    }));
    projected.duplicates = duplicates;
    if (duplicates.length) {
      pushIssue(issues, issue('JOIN_OUTPUT_KEY_COLLISION', 'error', 'Suffix policy produces duplicate output field names for at least one matched row shape', { duplicates }), maxIssues);
    } else if (actualOverlap.length) {
      pushIssue(issues, issue('FIELDS_SUFFIXED', 'info', 'Matched colliding source fields will be disambiguated by suffixes', {
        fields: actualOverlap, leftSuffix: state.collision.leftSuffix, rightSuffix: state.collision.rightSuffix
      }), maxIssues);
    }
  }

  return {
    applicable, pairOutput, policy: cloneSafe(state.collision), overlap, actualOverlap,
    evaluatedShapePairs: evaluatedShapePairs.size, shapePairScanComplete: !shapePairLimitExceeded, projected, issues
  };
}

function normalizeDiagnosticMessages(diagnostic) {
  if (!diagnostic || !Array.isArray(diagnostic.warnings)) return [];
  return diagnostic.warnings.map((entry) => issue(
    String(entry?.code ?? 'JOIN_DIAGNOSTIC'),
    entry?.level === 'error' ? 'error' : entry?.level === 'info' ? 'info' : 'warning',
    String(entry?.message ?? entry?.code ?? 'Join diagnostic'),
    isPlainObject(entry?.details) ? entry.details : {}
  ));
}

function gateFrom(messages) {
  if (messages.some((entry) => entry.level === 'error')) return 'blocked';
  if (messages.some((entry) => entry.level === 'warning')) return 'warning';
  return 'ready';
}

export const DATA_JOIN_PREFLIGHT_TYPE = TYPE;
export const DATA_JOIN_PREFLIGHT_VERSION = VERSION;

export class DataJoinPreflight {
  constructor({ maxOutputRows = DEFAULT_MAX_OUTPUT_ROWS, maxIssues = DEFAULT_MAX_ISSUES, maxDistinctFields = DEFAULT_MAX_DISTINCT_FIELDS, maxShapePairs = DEFAULT_MAX_SHAPE_PAIRS } = {}) {
    this.maxOutputRows = positiveInteger(maxOutputRows, DEFAULT_MAX_OUTPUT_ROWS, 'maxOutputRows');
    this.maxIssues = positiveInteger(maxIssues, DEFAULT_MAX_ISSUES, 'maxIssues');
    this.maxDistinctFields = positiveInteger(maxDistinctFields, DEFAULT_MAX_DISTINCT_FIELDS, 'maxDistinctFields');
    this.maxShapePairs = positiveInteger(maxShapePairs, DEFAULT_MAX_SHAPE_PAIRS, 'maxShapePairs');
  }

  assess(leftRows = [], rightRows = [], spec, options = {}) {
    if (!Array.isArray(leftRows) || !Array.isArray(rightRows)) fail('Preflight inputs must be arrays', 'INVALID_PREFLIGHT_INPUT', null, TypeError);
    const join = normalizeSpec(spec);
    const state = join.snapshot();
    if (!PAIR_JOIN_TYPES.has(state.type) && !SEMI_ANTI_TYPES.has(state.type)) {
      fail(`Unsupported join type ${String(state.type)}`, 'UNSUPPORTED_PREFLIGHT_JOIN_TYPE', { type: state.type }, TypeError);
    }

    const maxOutputRows = positiveInteger(options.maxOutputRows, this.maxOutputRows, 'maxOutputRows');
    const maxIssues = positiveInteger(options.maxIssues, this.maxIssues, 'maxIssues');
    const maxDistinctFields = positiveInteger(options.maxDistinctFields, this.maxDistinctFields, 'maxDistinctFields');
    const maxShapePairs = positiveInteger(options.maxShapePairs, this.maxShapePairs, 'maxShapePairs');
    const diagnostic = join.diagnose(leftRows, rightRows);
    const plan = buildMaterializationPlan(leftRows, rightRows, state);
    const left = collectFields(leftRows, 'left', { maxIssues, maxDistinctFields, materializedIndexes: plan.materializedLeft });
    const right = collectFields(rightRows, 'right', { maxIssues, maxDistinctFields, materializedIndexes: plan.materializedRight });
    const collision = collisionAudit(state, leftRows, rightRows, plan, left.fields, right.fields, maxIssues, maxShapePairs);
    const messages = [
      ...normalizeDiagnosticMessages(diagnostic),
      ...left.issues,
      ...right.issues,
      ...collision.issues
    ];

    if (diagnostic.rows.estimatedOutput > maxOutputRows) {
      messages.push(issue('OUTPUT_LIMIT_EXCEEDED', 'error', 'Estimated join output exceeds configured execution limit', {
        estimatedRows: diagnostic.rows.estimatedOutput,
        maxOutputRows
      }));
    }

    const gate = gateFrom(messages);
    const result = {
      type: TYPE,
      version: VERSION,
      gate,
      ready: gate !== 'blocked',
      executableWithoutWarnings: gate === 'ready',
      join: {
        type: state.type,
        expectedCardinality: state.expectedCardinality,
        direction: state.direction,
        precedence: state.precedence,
        collision: cloneSafe(state.collision)
      },
      rows: {
        left: leftRows.length,
        right: rightRows.length,
        estimatedOutput: diagnostic.rows.estimatedOutput,
        maxOutputRows
      },
      diagnostic: cloneSafe(diagnostic),
      fields: {
        left: sorted(left.fields),
        right: sorted(right.fields),
        overlap: cloneSafe(collision.overlap),
        scanComplete: { left: !left.fieldLimitExceeded, right: !right.fieldLimitExceeded }
      },
      materialization: {
        applicable: collision.applicable,
        pairOutput: collision.pairOutput,
        policy: cloneSafe(collision.policy),
        actualOverlap: cloneSafe(collision.actualOverlap ?? []),
        evaluatedShapePairs: collision.evaluatedShapePairs ?? 0,
        shapePairScanComplete: collision.shapePairScanComplete ?? true,
        projected: cloneSafe(collision.projected)
      },
      messages: cloneSafe(messages)
    };
    return cloneSafe(result);
  }

  explain(result) {
    if (!isPlainObject(result) || result.type !== TYPE || result.version !== VERSION) {
      fail('Preflight explain() requires a DataJoinPreflight result', 'INVALID_PREFLIGHT_RESULT', null, TypeError);
    }
    return {
      gate: result.gate,
      summary: result.gate === 'blocked'
        ? 'Join must not be executed until blocking preflight errors are resolved.'
        : result.gate === 'warning'
          ? 'Join is executable but preflight warnings should be reviewed.'
          : 'Join passed preflight without warnings.',
      blockers: result.messages.filter((entry) => entry.level === 'error').map((entry) => entry.code),
      warnings: result.messages.filter((entry) => entry.level === 'warning').map((entry) => entry.code),
      infos: result.messages.filter((entry) => entry.level === 'info').map((entry) => entry.code)
    };
  }
}
