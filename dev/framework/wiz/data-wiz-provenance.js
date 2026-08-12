const TYPE = 'nlab.data-wiz-provenance';
const VERSION = 1;
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SOURCE_KINDS = new Set(['dataset', 'collection', 'resultset', 'file', 'api', 'derived', 'unknown']);
const VARIABLE_ROLES = new Set(['identifier', 'dimension', 'measure', 'time', 'label', 'unknown']);
const DATA_TYPES = new Set(['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'array', 'object', 'mixed', 'unknown']);
const OPERATIONS = new Set(['none', 'count', 'distinct', 'sum', 'mean', 'median', 'min', 'max', 'custom']);
const RESULT_KINDS = new Set(['scalar', 'series', 'table', 'distribution', 'summary', 'unknown']);
const MAX_TEXT = 512;
const MAX_VARIABLES = 256;
const MAX_FIELDS = 256;

function fail(message, code = 'INVALID_PROVENANCE') {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}

function cloneJsonSafe(value, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('Provenance values must use finite numbers', 'NON_FINITE_PROVENANCE_VALUE');
    return value;
  }
  if (typeof value !== 'object') fail(`Unsupported provenance value: ${typeof value}`, 'UNSUPPORTED_PROVENANCE_VALUE');
  if (seen.has(value)) fail('Cyclic provenance values are not supported', 'CYCLIC_PROVENANCE_VALUE');
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((entry) => cloneJsonSafe(entry, seen));
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) fail(`Unsafe provenance key: ${key}`, 'UNSAFE_PROVENANCE_KEY');
      Object.defineProperty(output, key, {
        value: cloneJsonSafe(entry, seen), enumerable: true, configurable: true, writable: true
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
  if (required && !result) fail('Required provenance text is missing');
  if (result.length > MAX_TEXT) fail(`Provenance text exceeds ${MAX_TEXT} characters`);
  return result;
}

function integer(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) fail('Provenance row counts must be non-negative finite numbers');
  return Math.floor(number);
}

function enumValue(value, values, fallback) {
  const normalized = text(value, fallback).toLowerCase();
  return values.has(normalized) ? normalized : fallback;
}

function stringList(value, { max = MAX_FIELDS } = {}) {
  if (value === null || value === undefined) return [];
  const source = Array.isArray(value) ? value : [value];
  if (source.length > max) fail(`Provenance list exceeds ${max} items`);
  const seen = new Set();
  const output = [];
  for (const item of source) {
    const normalized = text(item, '');
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

function normalizeSource(value = {}) {
  const source = objectValue(value, 'source');
  return {
    id: text(source.id, ''),
    label: text(source.label, source.id ?? ''),
    kind: enumValue(source.kind, SOURCE_KINDS, 'unknown'),
    rows: integer(source.rows, null),
    metadata: cloneJsonSafe(objectValue(source.metadata, 'source.metadata'))
  };
}

function normalizeVariable(value, index) {
  const variable = objectValue(value, `variables[${index}]`);
  const field = text(variable.field, '', { required: true });
  return {
    field,
    label: text(variable.label, field),
    role: enumValue(variable.role, VARIABLE_ROLES, 'unknown'),
    dataType: enumValue(variable.dataType, DATA_TYPES, 'unknown'),
    sourceField: text(variable.sourceField, field),
    metadata: cloneJsonSafe(objectValue(variable.metadata, `variables[${index}].metadata`))
  };
}

function normalizeVariables(value = []) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) fail('variables must be an array');
  if (value.length > MAX_VARIABLES) fail(`variables exceeds ${MAX_VARIABLES} items`);
  const seen = new Set();
  const output = [];
  value.forEach((entry, index) => {
    const variable = normalizeVariable(entry, index);
    if (seen.has(variable.field)) return;
    seen.add(variable.field);
    output.push(variable);
  });
  return output;
}

function normalizeMeasure(value = {}) {
  if (value === null) return null;
  const measure = objectValue(value, 'measure');
  const operation = enumValue(measure.operation, OPERATIONS, 'none');
  const field = text(measure.field, '');
  if (!field && !['none', 'count'].includes(operation)) fail(`Measure operation ${operation} requires a field`);
  return {
    operation,
    field,
    label: text(measure.label, field || operation),
    options: cloneJsonSafe(objectValue(measure.options, 'measure.options'))
  };
}

function normalizeResult(value = {}) {
  const result = objectValue(value, 'result');
  return {
    kind: enumValue(result.kind, RESULT_KINDS, 'unknown'),
    rows: integer(result.rows, null),
    value: result.value === undefined ? null : cloneJsonSafe(result.value),
    fields: stringList(result.fields),
    metadata: cloneJsonSafe(objectValue(result.metadata, 'result.metadata'))
  };
}

function normalizeState(value = {}) {
  const input = objectValue(value, 'provenance');
  return {
    source: normalizeSource(input.source),
    variables: normalizeVariables(input.variables),
    measure: input.measure === undefined ? null : normalizeMeasure(input.measure),
    result: normalizeResult(input.result)
  };
}

function mergeState(current, patch) {
  const source = objectValue(patch, 'provenance patch');
  return {
    source: source.source === undefined ? cloneJsonSafe(current.source) : cloneJsonSafe(source.source),
    variables: source.variables === undefined ? cloneJsonSafe(current.variables) : cloneJsonSafe(source.variables),
    measure: source.measure === undefined ? cloneJsonSafe(current.measure) : cloneJsonSafe(source.measure),
    result: source.result === undefined ? cloneJsonSafe(current.result) : cloneJsonSafe(source.result)
  };
}

export const DATA_WIZ_PROVENANCE_TYPE = TYPE;
export const DATA_WIZ_PROVENANCE_VERSION = VERSION;

export class DataWizProvenance {
  constructor(value = {}) {
    this._state = normalizeState(value);
    this._initial = cloneJsonSafe(this._state);
  }

  static parse(input) {
    const payload = typeof input === 'string' ? JSON.parse(input) : cloneJsonSafe(input);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('DataWiz provenance payload must be an object');
    if (payload.type !== TYPE) fail(`Unsupported DataWiz provenance type: ${String(payload.type)}`);
    if (payload.version !== VERSION) fail(`Unsupported DataWiz provenance version: ${String(payload.version)}`);
    return new DataWizProvenance(payload.provenance);
  }

  snapshot() {
    return cloneJsonSafe(this._state);
  }

  update(patch = {}) {
    const next = normalizeState(mergeState(this._state, patch));
    this._state = next;
    return this.snapshot();
  }

  setSource(source) { return this.update({ source }); }
  setVariables(variables) { return this.update({ variables }); }
  setMeasure(measure) { return this.update({ measure }); }
  setResult(result) { return this.update({ result }); }

  reset() {
    this._state = cloneJsonSafe(this._initial);
    return this.snapshot();
  }

  explain() {
    const state = this._state;
    const sourceName = state.source.label || state.source.id || 'source non nommée';
    const variables = state.variables.map((variable) => ({
      field: variable.field,
      label: variable.label,
      role: variable.role,
      dataType: variable.dataType,
      text: `${variable.label} [${variable.role}/${variable.dataType}]`
    }));
    const measure = state.measure ? {
      ...cloneJsonSafe(state.measure),
      text: state.measure.operation === 'none'
        ? (state.measure.label || 'sans agrégation')
        : `${state.measure.operation}${state.measure.field ? `(${state.measure.field})` : ''}`
    } : null;
    const resultParts = [state.result.kind];
    if (state.result.rows !== null) resultParts.push(`${state.result.rows} ligne${state.result.rows === 1 ? '' : 's'}`);
    if (state.result.fields.length) resultParts.push(state.result.fields.join(', '));
    return {
      source: {
        ...cloneJsonSafe(state.source),
        text: state.source.rows === null ? sourceName : `${sourceName} — ${state.source.rows} lignes`
      },
      variables,
      measure,
      result: {
        ...cloneJsonSafe(state.result),
        text: resultParts.join(' — ')
      }
    };
  }

  toJSON() {
    return { type: TYPE, version: VERSION, provenance: this.snapshot() };
  }

  serialize({ indent = 2 } = {}) {
    const safeIndent = Math.max(0, Math.min(8, Math.floor(Number(indent) || 0)));
    return JSON.stringify(this.toJSON(), null, safeIndent);
  }
}
