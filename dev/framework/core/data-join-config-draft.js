const TYPE = 'nlab.data-join-config-draft';
const VERSION = 1;
const SPEC_TYPE = 'nlab.data-join-spec';
const SPEC_VERSION = 1;

const BAD_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const JOIN_TYPES = new Set(['inner', 'left', 'right', 'full', 'left-semi', 'left-anti', 'right-semi', 'right-anti']);
const CARDINALITIES = new Set(['auto', '1:1', '1:N', 'N:1', 'N:N']);
const DIRECTIONS = new Set(['none', 'left-to-right', 'right-to-left', 'bidirectional']);
const PRECEDENCE = new Set(['none', 'left', 'right', 'error', 'manual']);
const COLLISIONS = new Set(['nested', 'suffix', 'leftWins', 'rightWins', 'error']);
const COERCIONS = new Set(['none', 'string', 'number']);
const REVIEW_SECTIONS = Object.freeze(['keys', 'join', 'cardinality', 'navigation', 'precedence', 'comparison', 'collision']);
const MAX_KEYS = 16;
const MAX_TEXT = 512;

const DEFAULT_STATE = Object.freeze({
  type: 'inner',
  keys: Object.freeze([]),
  expectedCardinality: 'auto',
  direction: 'none',
  precedence: 'none',
  comparison: Object.freeze({
    trim: true,
    caseSensitive: true,
    coerce: 'none',
    blankAsNull: true,
    nullMatchesNull: false
  }),
  collision: Object.freeze({
    policy: 'nested',
    leftSuffix: '_left',
    rightSuffix: '_right'
  }),
  metadata: Object.freeze({})
});

function fail(message, code = 'DATA_JOIN_CONFIG_DRAFT_ERROR', details = null, ErrorType = TypeError) {
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
    if (!Number.isFinite(value)) fail('Draft values must use finite numbers', 'NON_FINITE_DRAFT_VALUE');
    return value;
  }
  if (typeof value !== 'object') fail(`Unsupported draft value: ${typeof value}`, 'UNSUPPORTED_DRAFT_VALUE');
  if (seen.has(value)) fail('Cyclic draft values are not supported', 'CYCLIC_DRAFT_VALUE');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((entry) => cloneSafe(entry, seen));
    if (!isPlainObject(value)) fail('Draft objects must use a plain prototype', 'UNSAFE_DRAFT_OBJECT');
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_SEGMENTS.has(key)) fail(`Unsafe draft key: ${key}`, 'UNSAFE_DRAFT_KEY');
      Object.defineProperty(output, key, {
        value: cloneSafe(entry, seen),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function text(value, label, { required = false, fallback = '' } = {}) {
  if (value === undefined || value === null) value = fallback;
  if (typeof value !== 'string') fail(`${label} must be a string`, 'INVALID_DRAFT_TEXT', { label, value });
  const result = value.trim();
  if (required && !result) fail(`${label} is required`, 'INVALID_DRAFT_TEXT', { label });
  if (result.length > MAX_TEXT) fail(`${label} exceeds ${MAX_TEXT} characters`, 'INVALID_DRAFT_TEXT', { label });
  return result;
}

function exactEnum(value, allowed, label) {
  if (typeof value !== 'string' || !allowed.has(value)) {
    fail(`${label} is invalid`, 'INVALID_DRAFT_ENUM', { label, value, allowed: [...allowed] });
  }
  return value;
}

function strictBoolean(value, label) {
  if (typeof value !== 'boolean') fail(`${label} must be boolean`, 'INVALID_DRAFT_BOOLEAN', { label, value });
  return value;
}

function canonicalPath(value, label) {
  const parts = Array.isArray(value)
    ? value.map((entry, index) => text(entry, `${label}[${index}]`, { required: true }))
    : text(value, label, { required: true }).split('.').filter(Boolean);
  if (!parts.length) fail(`${label} must not be empty`, 'INVALID_DRAFT_PATH', { label });
  if (parts.some((part) => BAD_SEGMENTS.has(part))) {
    fail(`${label} contains an unsafe segment`, 'UNSAFE_DRAFT_PATH', { label, path: parts.join('.') });
  }
  const path = parts.join('.');
  if (path.length > MAX_TEXT) fail(`${label} exceeds ${MAX_TEXT} characters`, 'INVALID_DRAFT_PATH', { label });
  return path;
}

function normalizeKeys(value) {
  if (!Array.isArray(value) || value.length === 0) {
    fail('Draft requires at least one key mapping', 'INVALID_DRAFT_KEYS');
  }
  if (value.length > MAX_KEYS) fail(`Draft supports at most ${MAX_KEYS} key mappings`, 'INVALID_DRAFT_KEYS');
  const seen = new Set();
  return value.map((entry, index) => {
    if (!isPlainObject(entry)) fail(`keys[${index}] must be an object`, 'INVALID_DRAFT_KEY', { index });
    const left = canonicalPath(entry.left, `keys[${index}].left`);
    const right = canonicalPath(entry.right, `keys[${index}].right`);
    const identity = `${left}\u0000${right}`;
    if (seen.has(identity)) fail(`Duplicate key mapping at index ${index}`, 'DUPLICATE_DRAFT_KEY', { left, right });
    seen.add(identity);
    return { left, right, label: text(entry.label, `keys[${index}].label`, { fallback: '' }) };
  });
}

function assertKnownKeys(object, allowed, label) {
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) fail(`${label}.${key} is not supported`, 'UNKNOWN_DRAFT_FIELD', { label, key });
  }
}

function normalizeComparisonPatch(value, current) {
  if (!isPlainObject(value)) fail('comparison patch must be an object', 'INVALID_COMPARISON_PATCH');
  assertKnownKeys(value, new Set(['trim', 'caseSensitive', 'coerce', 'blankAsNull', 'nullMatchesNull']), 'comparison');
  const output = { ...current };
  if ('trim' in value) output.trim = strictBoolean(value.trim, 'comparison.trim');
  if ('caseSensitive' in value) output.caseSensitive = strictBoolean(value.caseSensitive, 'comparison.caseSensitive');
  if ('coerce' in value) output.coerce = exactEnum(value.coerce, COERCIONS, 'comparison.coerce');
  if ('blankAsNull' in value) output.blankAsNull = strictBoolean(value.blankAsNull, 'comparison.blankAsNull');
  if ('nullMatchesNull' in value) output.nullMatchesNull = strictBoolean(value.nullMatchesNull, 'comparison.nullMatchesNull');
  return output;
}

function normalizeCollisionPatch(value, current) {
  if (!isPlainObject(value)) fail('collision patch must be an object', 'INVALID_COLLISION_PATCH');
  assertKnownKeys(value, new Set(['policy', 'leftSuffix', 'rightSuffix']), 'collision');
  const output = { ...current };
  if ('policy' in value) output.policy = exactEnum(value.policy, COLLISIONS, 'collision.policy');
  if ('leftSuffix' in value) output.leftSuffix = text(value.leftSuffix, 'collision.leftSuffix', { fallback: '' });
  if ('rightSuffix' in value) output.rightSuffix = text(value.rightSuffix, 'collision.rightSuffix', { fallback: '' });
  return output;
}

function defaultState() {
  return {
    type: DEFAULT_STATE.type,
    keys: [],
    expectedCardinality: DEFAULT_STATE.expectedCardinality,
    direction: DEFAULT_STATE.direction,
    precedence: DEFAULT_STATE.precedence,
    comparison: { ...DEFAULT_STATE.comparison },
    collision: { ...DEFAULT_STATE.collision },
    metadata: {}
  };
}

function defaultReviews() {
  return Object.fromEntries(REVIEW_SECTIONS.map((section) => [section, false]));
}

function sectionName(value) {
  if (typeof value !== 'string' || !REVIEW_SECTIONS.includes(value)) {
    fail('Unknown draft review section', 'INVALID_REVIEW_SECTION', { value, allowed: REVIEW_SECTIONS });
  }
  return value;
}

function minimalEvidence(proposal) {
  const source = {};
  if (typeof proposal.candidateId === 'string') source.candidateId = text(proposal.candidateId, 'candidateId');
  if (proposal.kind === 'simple' || proposal.kind === 'composite') source.kind = proposal.kind;
  if (isPlainObject(proposal.evidence)) {
    const evidence = {};
    const score = Number(proposal.evidence.score);
    if (Number.isFinite(score) && score >= 0 && score <= 100) evidence.score = score;
    if (typeof proposal.evidence.cardinality === 'string' && CARDINALITIES.has(proposal.evidence.cardinality)) {
      evidence.cardinality = proposal.evidence.cardinality;
    } else if (proposal.evidence.cardinality === 'unknown') {
      evidence.cardinality = 'unknown';
    }
    if (isPlainObject(proposal.evidence.coverage)) {
      const coverage = {};
      for (const key of ['left', 'right', 'average', 'minimum']) {
        const number = Number(proposal.evidence.coverage[key]);
        if (Number.isFinite(number) && number >= 0 && number <= 1) coverage[key] = number;
      }
      if (Object.keys(coverage).length) evidence.coverage = coverage;
    }
    if (Array.isArray(proposal.evidence.warnings)) evidence.warningCount = proposal.evidence.warnings.length;
    if (Object.keys(evidence).length) source.evidence = evidence;
  }
  return Object.keys(source).length ? source : null;
}

function proposalPatch(value) {
  if (!isPlainObject(value)) fail('Suggestion proposal must be an object', 'INVALID_DRAFT_PROPOSAL');
  if (value.ok === false) fail('Cannot adopt a failed suggestion proposal', 'FAILED_SUGGESTION_PROPOSAL', { reason: value.reason ?? null });
  const patch = isPlainObject(value.patch) ? value.patch : value;
  assertKnownKeys(patch, new Set(['keys', 'comparison', 'expectedCardinality']), 'proposal.patch');
  if (!Array.isArray(patch.keys)) fail('Suggestion proposal must contain keys[]', 'INVALID_DRAFT_PROPOSAL');
  if (patch.comparison !== undefined) {
    if (!isPlainObject(patch.comparison)) fail('proposal.patch.comparison must be an object', 'INVALID_DRAFT_PROPOSAL');
    assertKnownKeys(patch.comparison, new Set(['coerce']), 'proposal.patch.comparison');
  }
  return {
    keys: normalizeKeys(patch.keys),
    coerce: patch.comparison?.coerce === undefined
      ? 'none'
      : exactEnum(patch.comparison.coerce, COERCIONS, 'proposal.patch.comparison.coerce'),
    expectedCardinality: patch.expectedCardinality === undefined
      ? null
      : exactEnum(patch.expectedCardinality, CARDINALITIES, 'proposal.patch.expectedCardinality'),
    source: minimalEvidence(value)
  };
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
}

function semanticEqual(left, right) {
  return JSON.stringify(stableObject(left)) === JSON.stringify(stableObject(right));
}

function normalizeValidatorResult(result) {
  if (result === undefined || result === true) return { ok: true };
  if (result === false) return { ok: false, code: 'VALIDATOR_REJECTED', message: 'Draft validator rejected the payload' };
  if (!isPlainObject(result)) {
    return { ok: false, code: 'INVALID_VALIDATOR_RESULT', message: 'Draft validator returned an unsupported result' };
  }
  if (result.ok === false) {
    return {
      ok: false,
      code: typeof result.code === 'string' ? result.code : 'VALIDATOR_REJECTED',
      message: typeof result.message === 'string' ? result.message : 'Draft validator rejected the payload',
      details: result.details === undefined ? null : cloneSafe(result.details)
    };
  }
  return { ok: true, details: result.details === undefined ? null : cloneSafe(result.details) };
}

export function createDataJoinSpecDraftValidator(DataJoinSpecCtor) {
  if (typeof DataJoinSpecCtor !== 'function') {
    fail('DataJoinSpec constructor is required', 'INVALID_DATA_JOIN_SPEC_VALIDATOR', null, TypeError);
  }
  return (payload) => {
    if (!isPlainObject(payload) || payload.type !== SPEC_TYPE || payload.version !== SPEC_VERSION || !isPlainObject(payload.join)) {
      return { ok: false, code: 'INVALID_JOIN_SPEC_PAYLOAD', message: 'Expected a DataJoinSpec V1 payload' };
    }
    let spec;
    try {
      spec = new DataJoinSpecCtor(cloneSafe(payload.join));
    } catch (error) {
      return {
        ok: false,
        code: typeof error?.code === 'string' ? error.code : 'DATA_JOIN_SPEC_REJECTED',
        message: error instanceof Error ? error.message : String(error)
      };
    }
    if (!spec || typeof spec.snapshot !== 'function') {
      return { ok: false, code: 'INVALID_DATA_JOIN_SPEC_ADAPTER', message: 'DataJoinSpec instance must expose snapshot()' };
    }
    let normalized;
    try {
      normalized = cloneSafe(spec.snapshot());
    } catch (error) {
      return {
        ok: false,
        code: 'INVALID_DATA_JOIN_SPEC_SNAPSHOT',
        message: error instanceof Error ? error.message : String(error)
      };
    }
    if (!semanticEqual(normalized, payload.join)) {
      return {
        ok: false,
        code: 'DATA_JOIN_SPEC_NORMALIZATION_MISMATCH',
        message: 'DataJoinSpec normalized the draft differently',
        details: { normalized }
      };
    }
    return { ok: true };
  };
}

export class DataJoinConfigDraft {
  constructor(options = {}) {
    if (!isPlainObject(options)) fail('Draft options must be an object', 'INVALID_DRAFT_OPTIONS');
    if (options.validator !== undefined && typeof options.validator !== 'function') {
      fail('validator must be a function', 'INVALID_DRAFT_VALIDATOR');
    }
    this.validator = options.validator ?? null;
    this._revision = 0;
    this._state = defaultState();
    this._reviewed = defaultReviews();
    this._source = null;
  }

  adoptProposal(proposal) {
    const adopted = proposalPatch(proposal);
    this._state.keys = adopted.keys;
    this._state.comparison.coerce = adopted.coerce;
    this._state.expectedCardinality = adopted.expectedCardinality ?? 'auto';
    this._reviewed.keys = true;
    // A new key proposal can change both coercion and observed cardinality semantics.
    this._reviewed.comparison = false;
    this._reviewed.cardinality = false;
    this._source = adopted.source;
    this._revision += 1;
    return this.snapshot();
  }

  update(section, value) {
    const name = sectionName(section);
    switch (name) {
      case 'keys':
        this._state.keys = normalizeKeys(value);
        this._state.comparison.coerce = 'none';
        this._state.expectedCardinality = 'auto';
        this._reviewed.keys = true;
        this._reviewed.comparison = false;
        this._reviewed.cardinality = false;
        this._source = null;
        break;
      case 'join':
        this._state.type = exactEnum(value, JOIN_TYPES, 'join.type');
        this._reviewed.join = true;
        break;
      case 'cardinality':
        this._state.expectedCardinality = exactEnum(value, CARDINALITIES, 'expectedCardinality');
        this._reviewed.cardinality = true;
        break;
      case 'navigation':
        this._state.direction = exactEnum(value, DIRECTIONS, 'direction');
        this._reviewed.navigation = true;
        break;
      case 'precedence':
        this._state.precedence = exactEnum(value, PRECEDENCE, 'precedence');
        this._reviewed.precedence = true;
        break;
      case 'comparison':
        this._state.comparison = normalizeComparisonPatch(value, this._state.comparison);
        this._reviewed.comparison = true;
        break;
      case 'collision':
        this._state.collision = normalizeCollisionPatch(value, this._state.collision);
        this._reviewed.collision = true;
        break;
      default:
        fail('Unsupported draft section', 'INVALID_REVIEW_SECTION', { section: name });
    }
    this._revision += 1;
    return this.snapshot();
  }

  confirm(section) {
    const name = sectionName(section);
    if (name === 'keys' && this._state.keys.length === 0) {
      fail('Cannot confirm keys before a key mapping exists', 'MISSING_DRAFT_KEYS');
    }
    this._reviewed[name] = true;
    this._revision += 1;
    return this.status();
  }

  unconfirm(section) {
    const name = sectionName(section);
    this._reviewed[name] = false;
    this._revision += 1;
    return this.status();
  }

  setMetadata(value) {
    if (!isPlainObject(value)) fail('metadata must be an object', 'INVALID_DRAFT_METADATA');
    this._state.metadata = cloneSafe(value);
    this._revision += 1;
    return cloneSafe(this._state.metadata);
  }

  reset() {
    this._state = defaultState();
    this._reviewed = defaultReviews();
    this._source = null;
    this._revision += 1;
    return this.snapshot();
  }

  state() {
    return cloneSafe(this._state);
  }

  status() {
    const missing = REVIEW_SECTIONS.filter((section) => !this._reviewed[section]);
    return cloneSafe({
      revision: this._revision,
      reviewed: { ...this._reviewed },
      missing,
      complete: missing.length === 0 && this._state.keys.length > 0,
      keyCount: this._state.keys.length,
      sourceCandidateId: this._source?.candidateId ?? null
    });
  }

  snapshot() {
    return cloneSafe({
      type: TYPE,
      version: VERSION,
      status: this.status(),
      join: this._state,
      source: this._source
    });
  }

  finalize() {
    const status = this.status();
    if (!status.complete) {
      return { ok: false, reason: 'incomplete', missing: status.missing };
    }
    const payload = cloneSafe({
      type: SPEC_TYPE,
      version: SPEC_VERSION,
      join: this._state
    });
    if (this.validator) {
      let result;
      try {
        result = normalizeValidatorResult(this.validator(cloneSafe(payload)));
      } catch (error) {
        return {
          ok: false,
          reason: 'validation-failed',
          validation: {
            code: typeof error?.code === 'string' ? error.code : 'VALIDATOR_ERROR',
            message: error instanceof Error ? error.message : String(error)
          }
        };
      }
      if (!result.ok) {
        return {
          ok: false,
          reason: 'validation-failed',
          validation: cloneSafe({
            code: result.code,
            message: result.message,
            details: result.details ?? null
          })
        };
      }
    }
    return {
      ok: true,
      payload,
      source: cloneSafe(this._source),
      reviewed: cloneSafe(this._reviewed)
    };
  }
}

export function createDataJoinConfigDraft(options) {
  return new DataJoinConfigDraft(options);
}
