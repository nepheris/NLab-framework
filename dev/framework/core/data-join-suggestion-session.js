const DEFAULTS = Object.freeze({ maxSuggestions: 100 });
const COERCIONS = new Set(['none', 'string', 'number']);
const CARDINALITIES = new Set(['unknown', '1:1', '1:N', 'N:1', 'N:N']);
const BAD_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const KINDS = new Set(['simple', 'composite']);

function fail(message, code = 'DATA_JOIN_SUGGESTION_SESSION_ERROR', details = null, ErrorType = Error) {
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

function clone(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('Session output contains a non-finite number', 'NON_FINITE_SUGGESTION_VALUE');
    return value;
  }
  if (Array.isArray(value)) return value.map(clone);
  if (isPlainObject(value)) {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_SEGMENTS.has(key)) continue;
      if (entry !== undefined) output[key] = clone(entry);
    }
    return output;
  }
  fail('Session output must be JSON-like', 'UNSAFE_SUGGESTION_VALUE', { type: typeof value }, TypeError);
}

function boundedInteger(value, fallback, name, min, max) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || !Number.isInteger(number) || number < min || number > max) {
    fail(`${name} must be an integer between ${min} and ${max}`, 'INVALID_SUGGESTION_SESSION_OPTION', { name, value }, RangeError);
  }
  return number;
}

function text(value, fallback = '') {
  return typeof value === 'string' ? value.slice(0, 1000) : fallback;
}

function normalizePath(value, label) {
  if (typeof value !== 'string') fail(`${label} must be a string`, 'INVALID_SUGGESTION_PATH', { label }, TypeError);
  const path = value.trim();
  if (!path || path.length > 512) fail(`${label} must be 1..512 characters`, 'INVALID_SUGGESTION_PATH', { label }, TypeError);
  const segments = path.split('.');
  if (segments.some((segment) => !segment || BAD_SEGMENTS.has(segment))) {
    fail(`${label} contains an unsafe or empty segment`, 'INVALID_SUGGESTION_PATH', { label, path }, TypeError);
  }
  return path;
}

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    fail('Suggestion score must be between 0 and 100', 'INVALID_SUGGESTION_SCORE', { value }, TypeError);
  }
  return score;
}

function normalizeCoercion(value) {
  const coerce = String(value ?? 'none');
  if (!COERCIONS.has(coerce)) {
    fail(`Unsupported suggestion coercion: ${coerce}`, 'INVALID_SUGGESTION_COERCION', { coerce }, TypeError);
  }
  return coerce;
}

function normalizeCardinality(value) {
  const cardinality = String(value ?? 'unknown');
  return CARDINALITIES.has(cardinality) ? cardinality : 'unknown';
}

function normalizeKey(key, index) {
  if (!isPlainObject(key)) fail(`Suggestion key ${index} must be an object`, 'INVALID_SUGGESTION_KEY', { index }, TypeError);
  return {
    left: normalizePath(key.left, `keys[${index}].left`),
    right: normalizePath(key.right, `keys[${index}].right`),
    label: text(key.label)
  };
}

function normalizeReason(reason, index) {
  if (!isPlainObject(reason)) return { code: `REASON_${index + 1}`, message: text(reason, String(reason ?? '')) };
  const output = {
    code: text(reason.code, `REASON_${index + 1}`),
    message: text(reason.message)
  };
  if (reason.weight !== undefined) {
    const weight = Number(reason.weight);
    if (Number.isFinite(weight)) output.weight = Number(weight.toFixed(4));
  }
  return output;
}

function normalizeWarning(warning, index) {
  if (!isPlainObject(warning)) return { code: `WARNING_${index + 1}`, level: 'warning', message: text(warning, String(warning ?? '')) };
  return {
    code: text(warning.code, `WARNING_${index + 1}`),
    level: text(warning.level, 'warning'),
    message: text(warning.message)
  };
}

function normalizeField(field, fallbackPath) {
  if (!isPlainObject(field)) return { specPath: fallbackPath, name: fallbackPath.split('.').at(-1) ?? fallbackPath };
  return {
    specPath: normalizePath(field.specPath ?? fallbackPath, 'field.specPath'),
    pointer: typeof field.pointer === 'string' ? field.pointer.slice(0, 1000) : null,
    name: text(field.name, fallbackPath.split('.').at(-1) ?? fallbackPath),
    type: text(field.type)
  };
}

function normalizeCoverage(value) {
  if (!isPlainObject(value)) return null;
  const output = {};
  for (const key of ['left', 'right', 'average', 'minimum']) {
    if (value[key] === undefined) continue;
    const number = Number(value[key]);
    if (Number.isFinite(number) && number >= 0 && number <= 1) output[key] = Number(number.toFixed(6));
  }
  return Object.keys(output).length ? output : null;
}

function identityPayload(kind, keys, coerce) {
  const canonicalKeys = [...keys]
    .map(({ left, right }) => ({ left, right }))
    .sort((a, b) => a.left.localeCompare(b.left) || a.right.localeCompare(b.right));
  return JSON.stringify({ kind, keys: canonicalKeys, coerce });
}

function hash32(value, seed) {
  let hash = seed >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function stableId(kind, identity) {
  return `${kind}:${hash32(identity, 2166136261)}${hash32(identity, 2246822519)}`;
}

function normalizeSimple(candidate) {
  if (!isPlainObject(candidate) || !isPlainObject(candidate.left) || !isPlainObject(candidate.right)) {
    fail('Simple suggestion candidate is malformed', 'INVALID_SIMPLE_SUGGESTION', null, TypeError);
  }
  const keys = [normalizeKey({
    left: candidate.left.specPath,
    right: candidate.right.specPath,
    label: ''
  }, 0)];
  const coerce = normalizeCoercion(candidate.comparisonHint?.coerce);
  const identity = identityPayload('simple', keys, coerce);
  return {
    id: stableId('simple', identity),
    identity,
    kind: 'simple',
    score: normalizeScore(candidate.score),
    keys,
    comparisonHint: { coerce },
    cardinality: normalizeCardinality(candidate.expectedCardinality),
    summary: `${keys[0].left} = ${keys[0].right}`,
    fields: {
      left: normalizeField(candidate.left, keys[0].left),
      right: normalizeField(candidate.right, keys[0].right)
    },
    reasons: Array.isArray(candidate.reasons) ? candidate.reasons.map(normalizeReason) : [],
    warnings: Array.isArray(candidate.warnings) ? candidate.warnings.map(normalizeWarning) : []
  };
}

function normalizeComponent(component, index) {
  if (!isPlainObject(component) || !isPlainObject(component.left) || !isPlainObject(component.right)) {
    return { index, score: null };
  }
  const score = Number(component.score);
  return {
    index,
    score: Number.isFinite(score) && score >= 0 && score <= 100 ? score : null,
    left: normalizeField(component.left, component.left.specPath ?? `left${index + 1}`),
    right: normalizeField(component.right, component.right.specPath ?? `right${index + 1}`)
  };
}

function normalizeComposite(candidate) {
  if (!isPlainObject(candidate) || !Array.isArray(candidate.keys) || candidate.keys.length < 2) {
    fail('Composite suggestion candidate is malformed', 'INVALID_COMPOSITE_SUGGESTION', null, TypeError);
  }
  const keys = candidate.keys.map(normalizeKey).sort((a, b) =>
    a.left.localeCompare(b.left) || a.right.localeCompare(b.right) || a.label.localeCompare(b.label)
  );
  const coerce = normalizeCoercion(candidate.comparisonHint?.coerce);
  const identity = identityPayload('composite', keys, coerce);
  return {
    id: stableId('composite', identity),
    identity,
    kind: 'composite',
    score: normalizeScore(candidate.score),
    keys,
    comparisonHint: { coerce },
    cardinality: normalizeCardinality(candidate.observedCardinality),
    summary: keys.map((key) => `${key.left} = ${key.right}`).join(' + '),
    coverage: normalizeCoverage(candidate.coverage),
    components: Array.isArray(candidate.components) ? candidate.components.map(normalizeComponent) : [],
    reasons: Array.isArray(candidate.reasons) ? candidate.reasons.map(normalizeReason) : [],
    warnings: Array.isArray(candidate.warnings) ? candidate.warnings.map(normalizeWarning) : []
  };
}

function normalizeResult(value, kind) {
  if (!isPlainObject(value) || !Array.isArray(value.candidates)) {
    fail(`${kind} matcher must return { candidates: [] }`, 'INVALID_SUGGESTION_MATCH_RESULT', { kind }, TypeError);
  }
  const normalizeCandidate = kind === 'simple' ? normalizeSimple : normalizeComposite;
  return {
    candidates: value.candidates.map(normalizeCandidate),
    warnings: Array.isArray(value.warnings) ? value.warnings.map(normalizeWarning) : []
  };
}

function candidateSort(a, b) {
  return b.score - a.score
    || a.keys.length - b.keys.length
    || a.kind.localeCompare(b.kind)
    || a.identity.localeCompare(b.identity);
}

function dedupeCandidates(candidates) {
  const sorted = [...candidates].sort(candidateSort);
  const identities = new Set();
  const ids = new Map();
  const output = [];
  for (const candidate of sorted) {
    if (identities.has(candidate.identity)) continue;
    identities.add(candidate.identity);
    let id = candidate.id;
    const collision = ids.get(id);
    if (collision && collision !== candidate.identity) {
      id = `${id}:${hash32(candidate.identity, 3266489917)}`;
    }
    ids.set(id, candidate.identity);
    output.push({ ...candidate, id });
  }
  return output;
}

function dedupeWarnings(warnings) {
  const seen = new Set();
  return warnings.filter((warning) => {
    const key = `${warning.code}\u0000${warning.level}\u0000${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function matcherCapable(value) {
  return value && typeof value.match === 'function';
}

export class DataJoinSuggestionSession {
  constructor(options = {}) {
    if (!isPlainObject(options)) fail('Suggestion session options must be an object', 'INVALID_SUGGESTION_SESSION_OPTIONS', null, TypeError);
    this.simpleMatcher = matcherCapable(options.simpleMatcher) ? options.simpleMatcher : null;
    this.compositeMatcher = matcherCapable(options.compositeMatcher) ? options.compositeMatcher : null;
    if (!this.simpleMatcher && !this.compositeMatcher) {
      fail('At least one matcher with match() is required', 'MISSING_SUGGESTION_MATCHER', null, TypeError);
    }
    this.maxSuggestions = boundedInteger(options.maxSuggestions, DEFAULTS.maxSuggestions, 'maxSuggestions', 1, 1000);
    this._revision = 0;
    this._candidates = [];
    this._byId = new Map();
    this._selectedId = null;
    this._selectionState = 'none';
    this._warnings = [];
    this._lastRefresh = null;
  }

  refresh(input = {}) {
    if (!isPlainObject(input)) fail('refresh() input must be an object', 'INVALID_SUGGESTION_REFRESH', null, TypeError);
    const context = input.context === undefined ? {} : input.context;
    if (!isPlainObject(context)) fail('refresh context must be an object', 'INVALID_SUGGESTION_CONTEXT', null, TypeError);

    const simpleRaw = this.simpleMatcher
      ? this.simpleMatcher.match(input.leftCatalog, input.rightCatalog, context)
      : { candidates: [], warnings: [] };

    if (this.compositeMatcher && (!Array.isArray(input.leftRows) || !Array.isArray(input.rightRows))) {
      fail('Composite suggestions require leftRows and rightRows arrays', 'MISSING_COMPOSITE_ROWS', null, TypeError);
    }
    const compositeRaw = this.compositeMatcher
      ? this.compositeMatcher.match(
          input.leftRows,
          input.rightRows,
          input.leftCatalog,
          input.rightCatalog,
          context
        )
      : { candidates: [], warnings: [] };

    // Normalize all external results before touching session state: refresh is atomic on failure.
    const simple = normalizeResult(simpleRaw, 'simple');
    const composite = normalizeResult(compositeRaw, 'composite');
    const combined = dedupeCandidates([...simple.candidates, ...composite.candidates]);
    const nextCandidates = combined.slice(0, this.maxSuggestions).map((candidate, rank) => ({ ...candidate, rank: rank + 1 }));
    const nextById = new Map(nextCandidates.map((candidate) => [candidate.id, candidate]));

    const previousSelectedId = this._selectedId;
    const selectionPreserved = Boolean(previousSelectedId && nextById.has(previousSelectedId));
    const selectionInvalidated = Boolean(previousSelectedId && !selectionPreserved);
    const nextSelectedId = selectionPreserved ? previousSelectedId : null;
    const nextSelectionState = selectionPreserved ? 'selected' : selectionInvalidated ? 'invalidated' : 'none';

    this._revision += 1;
    this._candidates = nextCandidates;
    this._byId = nextById;
    this._selectedId = nextSelectedId;
    this._selectionState = nextSelectionState;
    this._warnings = dedupeWarnings([...simple.warnings, ...composite.warnings]);
    this._lastRefresh = {
      simpleCandidates: simple.candidates.length,
      compositeCandidates: composite.candidates.length,
      uniqueCandidates: combined.length,
      retainedCandidates: nextCandidates.length,
      selectionPreserved,
      selectionInvalidated
    };
    return this.snapshot();
  }

  list(options = {}) {
    if (!isPlainObject(options)) fail('list() options must be an object', 'INVALID_SUGGESTION_LIST_OPTIONS', null, TypeError);
    const kind = options.kind === undefined ? null : String(options.kind);
    if (kind !== null && !KINDS.has(kind)) fail(`Unknown suggestion kind: ${kind}`, 'INVALID_SUGGESTION_KIND', { kind }, TypeError);
    const minScore = options.minScore === undefined ? 0 : Number(options.minScore);
    if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
      fail('minScore must be between 0 and 100', 'INVALID_SUGGESTION_MIN_SCORE', { value: options.minScore }, RangeError);
    }
    const limit = boundedInteger(options.limit, this.maxSuggestions, 'limit', 1, this.maxSuggestions);
    return clone(this._candidates.filter((candidate) => (!kind || candidate.kind === kind) && candidate.score >= minScore).slice(0, limit));
  }

  select(id) {
    if (typeof id !== 'string' || !id.trim()) return { ok: false, reason: 'invalid-id' };
    const normalizedId = id.trim();
    const candidate = this._byId.get(normalizedId);
    if (!candidate) return { ok: false, reason: 'unknown-candidate', id: normalizedId };
    this._selectedId = normalizedId;
    this._selectionState = 'selected';
    return { ok: true, candidate: clone(candidate) };
  }

  clearSelection() {
    const previousId = this._selectedId;
    this._selectedId = null;
    this._selectionState = 'none';
    return { ok: true, cleared: Boolean(previousId), previousId };
  }

  selected() {
    return this._selectedId ? clone(this._byId.get(this._selectedId) ?? null) : null;
  }

  proposal(options = {}) {
    if (!isPlainObject(options)) fail('proposal() options must be an object', 'INVALID_SUGGESTION_PROPOSAL_OPTIONS', null, TypeError);
    const candidate = this._selectedId ? this._byId.get(this._selectedId) : null;
    if (!candidate) return { ok: false, reason: 'no-selection' };

    const cardinalityPolicy = String(options.cardinalityPolicy ?? 'omit');
    if (!['omit', 'auto', 'candidate'].includes(cardinalityPolicy)) {
      fail('cardinalityPolicy must be omit, auto or candidate', 'INVALID_CARDINALITY_POLICY', { cardinalityPolicy }, TypeError);
    }
    const patch = {
      keys: candidate.keys.map((key) => ({ ...key })),
      comparison: { coerce: candidate.comparisonHint.coerce }
    };
    if (cardinalityPolicy === 'auto') patch.expectedCardinality = 'auto';
    if (cardinalityPolicy === 'candidate') {
      patch.expectedCardinality = candidate.cardinality === 'unknown' ? 'auto' : candidate.cardinality;
    }
    return {
      ok: true,
      candidateId: candidate.id,
      kind: candidate.kind,
      patch,
      evidence: {
        score: candidate.score,
        cardinality: candidate.cardinality,
        coverage: candidate.coverage ? { ...candidate.coverage } : null,
        reasons: clone(candidate.reasons),
        warnings: clone(candidate.warnings)
      }
    };
  }

  status() {
    return clone({
      revision: this._revision,
      candidateCount: this._candidates.length,
      selectedId: this._selectedId,
      hasSelection: Boolean(this._selectedId),
      selectionState: this._selectionState,
      warningCount: this._warnings.length,
      lastRefresh: this._lastRefresh
    });
  }

  snapshot() {
    return clone({
      type: 'nlab.data-join-suggestion-session',
      version: 1,
      status: this.status(),
      candidates: this._candidates,
      selectedId: this._selectedId,
      warnings: this._warnings
    });
  }
}

export function createDataJoinSuggestionSession(options) {
  return new DataJoinSuggestionSession(options);
}
