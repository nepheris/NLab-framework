const TYPE = 'nlab.data-wiz-dataset-profile';
const VERSION = 1;
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const DATA_TYPES = new Set(['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'array', 'object', 'mixed', 'unknown']);
const ROLES = new Set(['identifier', 'dimension', 'measure', 'time', 'label', 'unknown']);
const DEFAULT_MAX_ROWS = 5000;
const DEFAULT_MAX_FIELDS = 256;
const DEFAULT_MAX_DEPTH = 8;
const DEFAULT_MAX_DISTINCT = 2048;
const DEFAULT_MAX_EXAMPLES = 5;
const DEFAULT_MAX_NUMERIC_SAMPLES = 4096;
const MAX_TEXT = 1024;

function fail(message, code = 'DATASET_PROFILE_ERROR', details = null, ErrorType = Error) {
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
    if (!Number.isFinite(value)) fail('DatasetProfile values must use finite numbers', 'NON_FINITE_PROFILE_VALUE', null, TypeError);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail('Cyclic DatasetProfile values are not supported', 'CYCLIC_PROFILE_VALUE', null, TypeError);
    seen.add(value);
    try { return value.map((entry) => cloneSafe(entry, seen)); }
    finally { seen.delete(value); }
  }
  if (!isPlainObject(value)) fail('DatasetProfile values must be JSON-like', 'UNSUPPORTED_PROFILE_VALUE', null, TypeError);
  if (seen.has(value)) fail('Cyclic DatasetProfile values are not supported', 'CYCLIC_PROFILE_VALUE', null, TypeError);
  seen.add(value);
  try {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) fail(`Unsafe DatasetProfile key: ${key}`, 'UNSAFE_PROFILE_KEY', { key }, TypeError);
      Object.defineProperty(output, key, { value: cloneSafe(entry, seen), enumerable: true, configurable: true, writable: true });
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function positiveInteger(value, fallback, label) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) fail(`${label} must be a positive finite number`, 'INVALID_PROFILE_LIMIT', { label, value }, RangeError);
  return Math.floor(number);
}

function boundedText(value, fallback = '') {
  const text = String(value ?? fallback).trim();
  if (text.length > MAX_TEXT) fail(`DatasetProfile text exceeds ${MAX_TEXT} characters`, 'PROFILE_TEXT_TOO_LONG', { max: MAX_TEXT }, RangeError);
  return text;
}

function encodePointerSegment(segment) {
  return String(segment).replaceAll('~', '~0').replaceAll('/', '~1');
}

function pointerFor(segments) {
  return segments.length ? `/${segments.map(encodePointerSegment).join('/')}` : '';
}

function addressableSegments(segments) {
  return segments.every((segment) => !BAD_KEYS.has(segment) && !String(segment).includes('.'));
}

function specPathFor(segments) {
  return addressableSegments(segments) ? segments.join('.') : null;
}

function readSegments(row, segments) {
  let value = row;
  for (const segment of segments) {
    if (!isPlainObject(value) || !Object.hasOwn(value, segment)) return { exists: false, value: undefined };
    value = value[segment];
  }
  return { exists: true, value };
}

function warning(code, level, message, details = {}) {
  return { code, level, message, details: cloneSafe(details) };
}

function pushWarning(list, entry, identities = null) {
  if (identities) {
    const identity = `${entry.code}\u0000${JSON.stringify(entry.details)}`;
    if (identities.has(identity)) return;
    identities.add(identity);
  }
  list.push(entry);
}

function discoverFields(rows, options) {
  const byPointer = new Map();
  const warnings = [];
  const warningIds = new Set();
  let fieldLimitExceeded = false;
  let depthLimitReached = false;

  const addField = (segments, kind = 'leaf') => {
    if (!segments.length) return null;
    const pointer = pointerFor(segments);
    if (byPointer.has(pointer)) return byPointer.get(pointer);
    if (byPointer.size >= options.maxFields) {
      fieldLimitExceeded = true;
      return null;
    }
    const entry = {
      pointer,
      segments: [...segments],
      path: segments.join('.'),
      specPath: specPathFor(segments),
      addressable: addressableSegments(segments),
      depth: segments.length,
      kind
    };
    byPointer.set(pointer, entry);
    if (!entry.addressable) {
      pushWarning(warnings, warning('UNADDRESSABLE_FIELD_PATH', 'warning', 'Field cannot be represented unambiguously by DataWiz dot-path semantics', {
        pointer, path: entry.path
      }), warningIds);
    }
    return entry;
  };

  const walk = (value, segments, depth, stack) => {
    if (segments.length) addField(segments, isPlainObject(value) ? 'object' : Array.isArray(value) ? 'array' : 'leaf');
    if (!isPlainObject(value)) return;
    if (stack.has(value)) {
      pushWarning(warnings, warning('CYCLIC_OBJECT_SKIPPED', 'warning', 'Cyclic object encountered during schema discovery', { pointer: pointerFor(segments) }), warningIds);
      return;
    }
    if (depth >= options.maxDepth) {
      depthLimitReached = true;
      return;
    }
    stack.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) {
        pushWarning(warnings, warning('UNSAFE_FIELD_SKIPPED', 'warning', `Unsafe field ${key} was skipped`, {
          pointer: pointerFor([...segments, key]), key
        }), warningIds);
        continue;
      }
      walk(child, [...segments, key], depth + 1, stack);
    }
    stack.delete(value);
  };

  rows.forEach((row, index) => {
    if (!isPlainObject(row)) return;
    walk(row, [], 0, new WeakSet());
    if (fieldLimitExceeded) return;
  });

  if (fieldLimitExceeded) warnings.push(warning('FIELD_LIMIT_REACHED', 'warning', 'Schema discovery reached maxFields', { maxFields: options.maxFields }));
  if (depthLimitReached) warnings.push(warning('DEPTH_LIMIT_REACHED', 'warning', 'Schema discovery reached maxDepth', { maxDepth: options.maxDepth }));

  return {
    fields: [...byPointer.values()].sort((a, b) => a.pointer.localeCompare(b.pointer)),
    warnings,
    fieldLimitExceeded,
    depthLimitReached
  };
}

function sourceType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function numericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function temporalValue(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  const datetime = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(text);
  if (!dateOnly && !datetime) return null;
  if (dateOnly) {
    const [year, month, day] = text.split('-').map(Number);
    const epoch = Date.UTC(year, month - 1, day);
    const check = new Date(epoch);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    return { kind: 'date', epoch, text };
  }
  const epoch = Date.parse(text);
  if (!Number.isFinite(epoch)) return null;
  return { kind: 'datetime', epoch, text };
}

function stableIdentity(value) {
  if (value === null) return 'null:null';
  const type = sourceType(value);
  if (type === 'object' || type === 'array') {
    try { return `${type}:${JSON.stringify(value)}`; }
    catch { return `${type}:[cyclic]`; }
  }
  return `${type}:${String(value)}`;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function inferDataType(nonEmptyValues, typeCounts, numericCount, temporalCounts) {
  if (!nonEmptyValues.length) return 'unknown';
  const actual = Object.keys(typeCounts).filter((type) => typeCounts[type] > 0);
  const allNumeric = numericCount === nonEmptyValues.length;
  if (allNumeric) {
    const numeric = nonEmptyValues.map(numericValue);
    return numeric.every((value) => Number.isInteger(value)) ? 'integer' : 'number';
  }
  const temporalTotal = temporalCounts.date + temporalCounts.datetime;
  if (temporalTotal === nonEmptyValues.length) return temporalCounts.datetime ? 'datetime' : 'date';
  if (actual.length === 1) {
    const only = actual[0];
    if (DATA_TYPES.has(only)) return only;
    if (only === 'integer') return 'integer';
  }
  if (actual.every((type) => type === 'integer' || type === 'number')) return typeCounts.number ? 'number' : 'integer';
  return 'mixed';
}

function inferRole(field, rowsSampled, name = '') {
  name = String(name ?? '').toLowerCase();
  const populated = Math.max(1, field.count);
  const uniqueness = field.distinct / populated;
  const strongIdName = /^(id|uuid|guid|identifier|key)$/.test(name) || /(?:^|[_-])id$/.test(name) || /_uuid$/.test(name);
  const timeName = /(^|[_-])(date|time|datetime|timestamp|created|updated|year|month|day)([_-]|$)/.test(name) || /(at|date|time)$/.test(name);
  const labelName = /^(name|title|label|display|description|nom|titre|libelle|libellé)$/.test(name);
  const measureName = /(amount|total|price|cost|qty|quantity|count|score|value|rate|percent|percentage|duration|distance|weight|height|volume|temperature|revenue|sales)/.test(name);

  if (field.dataType === 'date' || field.dataType === 'datetime' || timeName) return 'time';
  if (strongIdName && uniqueness >= 0.8) return 'identifier';
  if (labelName && field.dataType === 'string') return 'label';
  if ((field.dataType === 'number' || field.dataType === 'integer') && !strongIdName) {
    if (measureName || field.distinct > Math.min(20, Math.max(5, rowsSampled * 0.05))) return 'measure';
    return 'dimension';
  }
  if (field.dataType === 'string' || field.dataType === 'boolean') return 'dimension';
  return 'unknown';
}

function profileField(rows, descriptor, options) {
  let missing = 0;
  let nulls = 0;
  let blanks = 0;
  const nonEmpty = [];
  const typeCounts = {};
  const distinct = new Set();
  let distinctCapped = false;
  const examples = [];
  const exampleIds = new Set();
  const numeric = [];
  let numericTotal = 0;
  let numericFromStrings = 0;
  let numericSum = 0;
  let numericMin = Infinity;
  let numericMax = -Infinity;
  let stringCount = 0;
  let stringLengthSum = 0;
  let stringMinLength = Infinity;
  let stringMaxLength = -Infinity;
  const temporalCounts = { date: 0, datetime: 0 };
  let temporalMin = Infinity;
  let temporalMax = -Infinity;
  let nonFinite = 0;

  for (const row of rows) {
    const read = readSegments(row, descriptor.segments);
    if (!read.exists) { missing += 1; continue; }
    const value = read.value;
    if (value === null || value === undefined) { nulls += 1; continue; }
    if (typeof value === 'string' && value.trim() === '') { blanks += 1; continue; }
    nonEmpty.push(value);
    const type = sourceType(value);
    typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    if (typeof value === 'number' && !Number.isFinite(value)) nonFinite += 1;

    if (distinct.size < options.maxDistinct) distinct.add(stableIdentity(value));
    else if (!distinct.has(stableIdentity(value))) distinctCapped = true;

    if (examples.length < options.maxExamples) {
      const identity = stableIdentity(value);
      if (!exampleIds.has(identity)) {
        exampleIds.add(identity);
        try { examples.push(cloneSafe(value)); }
        catch { examples.push('[non-serializable]'); }
      }
    }

    const number = numericValue(value);
    if (number !== null) {
      numericTotal += 1;
      numericSum += number;
      numericMin = Math.min(numericMin, number);
      numericMax = Math.max(numericMax, number);
      if (typeof value === 'string') numericFromStrings += 1;
      if (numeric.length < options.maxNumericSamples) numeric.push(number);
    }

    if (typeof value === 'string') {
      stringCount += 1;
      stringLengthSum += value.length;
      stringMinLength = Math.min(stringMinLength, value.length);
      stringMaxLength = Math.max(stringMaxLength, value.length);
      const temporal = temporalValue(value);
      if (temporal) {
        temporalCounts[temporal.kind] += 1;
        temporalMin = Math.min(temporalMin, temporal.epoch);
        temporalMax = Math.max(temporalMax, temporal.epoch);
      }
    }
  }

  const dataType = inferDataType(nonEmpty, typeCounts, numericTotal, temporalCounts);
  const count = nonEmpty.length;
  const field = {
    pointer: descriptor.pointer,
    path: descriptor.path,
    specPath: descriptor.specPath,
    addressable: descriptor.addressable,
    depth: descriptor.depth,
    label: descriptor.segments.at(-1) ?? descriptor.path,
    dataType,
    role: 'unknown',
    count,
    present: rows.length - missing,
    missing,
    nulls,
    blanks,
    distinct: distinct.size,
    distinctCapped,
    cardinality: count ? distinct.size / count : 0,
    unique: count > 0 && !distinctCapped && distinct.size === count,
    types: typeCounts,
    examples,
    numeric: numericTotal ? {
      count: numericTotal,
      min: numericMin,
      max: numericMax,
      sum: numericSum,
      mean: numericSum / numericTotal,
      median: median(numeric),
      medianSampled: numericTotal > numeric.length,
      integer: numeric.every((value) => Number.isInteger(value)),
      coercedStrings: numericFromStrings
    } : null,
    string: stringCount ? {
      count: stringCount,
      minLength: stringMinLength,
      maxLength: stringMaxLength,
      meanLength: stringLengthSum / stringCount
    } : null,
    temporal: temporalCounts.date + temporalCounts.datetime ? {
      count: temporalCounts.date + temporalCounts.datetime,
      date: temporalCounts.date,
      datetime: temporalCounts.datetime,
      min: new Date(temporalMin).toISOString(),
      max: new Date(temporalMax).toISOString()
    } : null,
    warnings: []
  };
  const last = descriptor.segments.at(-1)?.toLowerCase() ?? '';
  field.role = inferRole(field, rows.length, last);
  if (!field.addressable) field.warnings.push('UNADDRESSABLE_FIELD_PATH');
  if (dataType === 'mixed') field.warnings.push('MIXED_TYPES');
  if (numericFromStrings && (dataType === 'number' || dataType === 'integer')) field.warnings.push('NUMERIC_COERCION_USED');
  if (nonFinite) field.warnings.push('NON_FINITE_VALUES');
  if (distinctCapped) field.warnings.push('DISTINCT_LIMIT_REACHED');
  if (field.role === 'dimension' && field.count >= 50 && field.cardinality > 0.8) field.warnings.push('HIGH_CARDINALITY_DIMENSION');
  if ((/^(id|uuid|guid|identifier|key)$/.test(last) || /(?:^|[_-])id$/.test(last)) && field.count > 0 && field.cardinality < 0.98) {
    field.warnings.push('IDENTIFIER_NOT_UNIQUE');
  }
  const temporalFound = temporalCounts.date + temporalCounts.datetime;
  if (stringCount && temporalFound > 0 && temporalFound < stringCount) field.warnings.push('PARTIAL_TEMPORAL_VALUES');
  return field;
}

function normalizeWarning(value, index) {
  if (!isPlainObject(value)) fail(`warnings[${index}] must be an object`, 'INVALID_PROFILE_WARNING', { index }, TypeError);
  return {
    code: boundedText(value.code),
    level: ['info', 'warning', 'error'].includes(value.level) ? value.level : 'warning',
    message: boundedText(value.message),
    details: cloneSafe(isPlainObject(value.details) ? value.details : {})
  };
}

function normalizeField(value, index) {
  if (!isPlainObject(value)) fail(`fields[${index}] must be an object`, 'INVALID_PROFILE_FIELD', { index }, TypeError);
  const dataType = DATA_TYPES.has(value.dataType) ? value.dataType : 'unknown';
  const role = ROLES.has(value.role) ? value.role : 'unknown';
  const number = (input, fallback = 0) => Number.isFinite(Number(input)) ? Number(input) : fallback;
  return {
    ...cloneSafe(value),
    pointer: boundedText(value.pointer),
    path: boundedText(value.path),
    specPath: value.specPath == null ? null : boundedText(value.specPath),
    addressable: Boolean(value.addressable),
    depth: Math.max(0, Math.floor(number(value.depth))),
    label: boundedText(value.label, value.path),
    dataType,
    role,
    count: Math.max(0, Math.floor(number(value.count))),
    present: Math.max(0, Math.floor(number(value.present))),
    missing: Math.max(0, Math.floor(number(value.missing))),
    nulls: Math.max(0, Math.floor(number(value.nulls))),
    blanks: Math.max(0, Math.floor(number(value.blanks))),
    distinct: Math.max(0, Math.floor(number(value.distinct))),
    distinctCapped: Boolean(value.distinctCapped),
    cardinality: Math.max(0, Math.min(1, number(value.cardinality))),
    unique: Boolean(value.unique),
    warnings: Array.isArray(value.warnings) ? [...new Set(value.warnings.map((entry) => boundedText(entry)).filter(Boolean))] : []
  };
}

function normalizeProfile(value) {
  if (!isPlainObject(value)) fail('DatasetProfile snapshot must be an object', 'INVALID_PROFILE_SNAPSHOT', null, TypeError);
  if (!isPlainObject(value.dataset)) fail('DatasetProfile dataset block is required', 'INVALID_PROFILE_DATASET', null, TypeError);
  const dataset = {
    rows: Math.max(0, Math.floor(Number(value.dataset.rows) || 0)),
    sampledRows: Math.max(0, Math.floor(Number(value.dataset.sampledRows) || 0)),
    objectRows: Math.max(0, Math.floor(Number(value.dataset.objectRows) || 0)),
    invalidRows: Math.max(0, Math.floor(Number(value.dataset.invalidRows) || 0)),
    complete: Boolean(value.dataset.complete)
  };
  const fields = Array.isArray(value.fields) ? value.fields.map(normalizeField) : [];
  const pointers = new Set();
  for (const field of fields) {
    if (!field.pointer || pointers.has(field.pointer)) fail('DatasetProfile fields require unique non-empty pointers', 'DUPLICATE_PROFILE_FIELD', { pointer: field.pointer }, TypeError);
    pointers.add(field.pointer);
  }
  const warnings = Array.isArray(value.warnings) ? value.warnings.map(normalizeWarning) : [];
  return {
    dataset,
    fieldCount: fields.length,
    fields,
    warnings,
    options: cloneSafe(isPlainObject(value.options) ? value.options : {})
  };
}

function buildProfile(rows, options) {
  if (!Array.isArray(rows)) fail('DatasetProfile input must be an array', 'INVALID_PROFILE_INPUT', null, TypeError);
  const sampled = rows.slice(0, options.maxRows);
  const objectRows = sampled.filter(isPlainObject);
  const invalidRows = sampled.length - objectRows.length;
  const discovery = discoverFields(objectRows, options);
  const warnings = [...discovery.warnings];
  if (rows.length > sampled.length) warnings.push(warning('ROW_SAMPLE_LIMIT_REACHED', 'warning', 'Dataset profiling used a bounded row sample', {
    rows: rows.length, sampledRows: sampled.length, maxRows: options.maxRows
  }));
  if (invalidRows) warnings.push(warning('NON_OBJECT_ROWS_IGNORED', 'warning', 'Non-object rows were ignored during field profiling', {
    invalidRows, sampledRows: sampled.length
  }));
  const fields = discovery.fields.map((descriptor) => profileField(objectRows, descriptor, options));
  return normalizeProfile({
    dataset: {
      rows: rows.length,
      sampledRows: sampled.length,
      objectRows: objectRows.length,
      invalidRows,
      complete: rows.length === sampled.length
    },
    fields,
    warnings,
    options: {
      maxRows: options.maxRows,
      maxFields: options.maxFields,
      maxDepth: options.maxDepth,
      maxDistinct: options.maxDistinct,
      maxExamples: options.maxExamples,
      maxNumericSamples: options.maxNumericSamples
    }
  });
}

export const DATA_WIZ_DATASET_PROFILE_TYPE = TYPE;
export const DATA_WIZ_DATASET_PROFILE_VERSION = VERSION;

export class DataWizDatasetProfile {
  constructor(snapshot) {
    this._profile = normalizeProfile(snapshot);
  }

  static fromRows(rows = [], options = {}) {
    const normalized = {
      maxRows: positiveInteger(options.maxRows, DEFAULT_MAX_ROWS, 'maxRows'),
      maxFields: positiveInteger(options.maxFields, DEFAULT_MAX_FIELDS, 'maxFields'),
      maxDepth: positiveInteger(options.maxDepth, DEFAULT_MAX_DEPTH, 'maxDepth'),
      maxDistinct: positiveInteger(options.maxDistinct, DEFAULT_MAX_DISTINCT, 'maxDistinct'),
      maxExamples: positiveInteger(options.maxExamples, DEFAULT_MAX_EXAMPLES, 'maxExamples'),
      maxNumericSamples: positiveInteger(options.maxNumericSamples, DEFAULT_MAX_NUMERIC_SAMPLES, 'maxNumericSamples')
    };
    return new DataWizDatasetProfile(buildProfile(rows, normalized));
  }

  static parse(input) {
    let payload;
    try { payload = typeof input === 'string' ? JSON.parse(input) : cloneSafe(input); }
    catch (error) { fail('Invalid DatasetProfile JSON', 'INVALID_PROFILE_JSON', { cause: error?.message }, SyntaxError); }
    if (!isPlainObject(payload)) fail('DatasetProfile payload must be an object', 'INVALID_PROFILE_PAYLOAD', null, TypeError);
    if (payload.type !== TYPE) fail(`Unsupported DatasetProfile type: ${String(payload.type)}`, 'INVALID_PROFILE_TYPE', { type: payload.type }, TypeError);
    if (payload.version !== VERSION) fail(`Unsupported DatasetProfile version: ${String(payload.version)}`, 'INVALID_PROFILE_VERSION', { version: payload.version }, TypeError);
    return new DataWizDatasetProfile(payload.profile);
  }

  snapshot() { return cloneSafe(this._profile); }

  field(pathOrPointer) {
    const key = String(pathOrPointer ?? '');
    const field = this._profile.fields.find((entry) => entry.pointer === key || (entry.specPath !== null && entry.specPath === key));
    return field ? cloneSafe(field) : null;
  }

  facts() {
    const buckets = { numeric: [], categorical: [], temporal: [], identifiers: [], labels: [], unsupported: [] };
    for (const field of this._profile.fields) {
      const path = field.specPath ?? field.pointer;
      const summary = { path, pointer: field.pointer, dataType: field.dataType, role: field.role, cardinality: field.cardinality };
      if (field.role === 'identifier') buckets.identifiers.push(summary);
      if (field.role === 'label') buckets.labels.push(summary);
      if (field.role === 'time' || field.dataType === 'date' || field.dataType === 'datetime') buckets.temporal.push(summary);
      if ((field.dataType === 'number' || field.dataType === 'integer') && field.role !== 'identifier') buckets.numeric.push(summary);
      if (field.role === 'dimension' || field.role === 'label' || field.dataType === 'boolean') buckets.categorical.push(summary);
      if (!field.addressable || ['array', 'object', 'mixed', 'unknown'].includes(field.dataType)) buckets.unsupported.push(summary);
    }
    return {
      rows: this._profile.dataset.rows,
      sampledRows: this._profile.dataset.sampledRows,
      fieldCount: this._profile.fields.length,
      ...cloneSafe(buckets)
    };
  }

  toProvenanceVariables({ includeUnaddressable = false } = {}) {
    return this._profile.fields
      .filter((field) => includeUnaddressable || field.addressable)
      .map((field) => ({
        field: field.specPath ?? field.pointer,
        label: field.label,
        role: field.role,
        dataType: field.dataType,
        sourceField: field.specPath ?? field.pointer,
        metadata: {
          pointer: field.pointer,
          addressable: field.addressable,
          count: field.count,
          missing: field.missing,
          distinct: field.distinct,
          cardinality: field.cardinality,
          warnings: [...field.warnings]
        }
      }));
  }

  explain() {
    const facts = this.facts();
    return {
      rows: this._profile.dataset.rows,
      sampledRows: this._profile.dataset.sampledRows,
      complete: this._profile.dataset.complete,
      fields: this._profile.fields.length,
      numeric: facts.numeric.map((field) => field.path),
      categorical: facts.categorical.map((field) => field.path),
      temporal: facts.temporal.map((field) => field.path),
      identifiers: facts.identifiers.map((field) => field.path),
      warnings: this._profile.warnings.map((entry) => entry.code)
    };
  }

  toJSON() { return { type: TYPE, version: VERSION, profile: this.snapshot() }; }

  serialize({ indent = 2 } = {}) {
    const safeIndent = Math.max(0, Math.min(8, Math.floor(Number(indent) || 0)));
    return JSON.stringify(this.toJSON(), null, safeIndent);
  }
}
