import { DataWizChartSpec } from './data-wiz-chart-spec.js';

const TYPE = 'nlab.data-wiz-chart-data';
const VERSION = 1;
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const AGGREGATES = new Set(['none', 'count', 'distinct', 'sum', 'mean', 'median', 'min', 'max']);
const TIME_UNITS = new Set(['none', 'year', 'quarter', 'month', 'week', 'day', 'date', 'hours', 'minutes', 'seconds']);
const DEFAULT_MAX_OUTPUT_ROWS = 100000;
const DEFAULT_MAX_GROUPS = 100000;
const MAX_DIAGNOSTICS = 200;

function fail(message, code = 'CHART_DATA_MATERIALIZER_ERROR', details = null, ErrorType = Error) {
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
    if (!Number.isFinite(value)) fail('Materialized chart values must use finite numbers', 'NON_FINITE_MATERIALIZED_VALUE', null, TypeError);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail('Cyclic materialized values are not supported', 'CYCLIC_MATERIALIZED_VALUE', null, TypeError);
    seen.add(value);
    try { return value.map((entry) => cloneSafe(entry, seen)); }
    finally { seen.delete(value); }
  }
  if (!isPlainObject(value)) fail('Materialized chart values must be JSON-like', 'UNSUPPORTED_MATERIALIZED_VALUE', null, TypeError);
  if (seen.has(value)) fail('Cyclic materialized values are not supported', 'CYCLIC_MATERIALIZED_VALUE', null, TypeError);
  seen.add(value);
  try {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) fail(`Unsafe materialized key: ${key}`, 'UNSAFE_MATERIALIZED_KEY', { key }, TypeError);
      Object.defineProperty(output, key, { value: cloneSafe(entry, seen), enumerable: true, configurable: true, writable: true });
    }
    return output;
  } finally { seen.delete(value); }
}

function positiveInteger(value, fallback, label) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) fail(`${label} must be a positive finite number`, 'INVALID_MATERIALIZER_LIMIT', { label, value }, RangeError);
  return Math.floor(number);
}

function normalizeChart(input) {
  if (input instanceof DataWizChartSpec) return new DataWizChartSpec(input.snapshot());
  if (typeof input === 'string') return DataWizChartSpec.parse(input);
  if (!isPlainObject(input)) fail('materialize() requires a DataWizChartSpec-compatible value', 'INVALID_MATERIALIZER_CHART', null, TypeError);
  if (input.type === 'nlab.data-wiz-chart-spec' || Object.hasOwn(input, 'version') || Object.hasOwn(input, 'chart')) {
    if (input.type !== 'nlab.data-wiz-chart-spec' || input.version !== 1) fail('Unsupported ChartSpec payload', 'INVALID_MATERIALIZER_CHART_VERSION', { type: input.type, version: input.version }, TypeError);
    return DataWizChartSpec.parse(input);
  }
  return new DataWizChartSpec(input);
}

function pathParts(path) {
  const parts = String(path ?? '').trim().split('.').filter(Boolean);
  if (!parts.length) return [];
  if (parts.some((part) => BAD_KEYS.has(part))) fail(`Unsafe chart field path: ${parts.join('.')}`, 'UNSAFE_MATERIALIZER_PATH', { path: parts.join('.') }, TypeError);
  return parts;
}

function readPath(row, path) {
  if (!path) return { exists: false, value: undefined };
  let value = row;
  for (const part of pathParts(path)) {
    if (!isPlainObject(value) || !Object.hasOwn(value, part)) return { exists: false, value: undefined };
    value = value[part];
  }
  return { exists: true, value };
}

function missing(value) { return value === undefined || value === null || (typeof value === 'string' && value.trim() === ''); }

function scalar(value) {
  if (missing(value)) return { ok: true, value: null };
  if (typeof value === 'string' || typeof value === 'boolean') return { ok: true, value };
  if (typeof value === 'number') return Number.isFinite(value) ? { ok: true, value } : { ok: false, reason: 'non-finite' };
  return { ok: false, reason: 'non-scalar' };
}

function numericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function temporalEpoch(value) {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  const text = value.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split('-').map(Number);
    const epoch = Date.UTC(year, month - 1, day);
    const check = new Date(epoch);
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
    return epoch;
  }
  const epoch = Date.parse(text);
  return Number.isFinite(epoch) ? epoch : null;
}

function startOfWeek(date) {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diff);
}

function timeBucket(value, unit) {
  if (unit === 'none') return scalar(value);
  const epoch = temporalEpoch(value);
  if (epoch === null) return { ok: false, reason: 'invalid-temporal' };
  const date = new Date(epoch);
  let start;
  switch (unit) {
    case 'year': start = Date.UTC(date.getUTCFullYear(), 0, 1); break;
    case 'quarter': start = Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1); break;
    case 'month': start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1); break;
    case 'week': start = startOfWeek(date); break;
    case 'day': case 'date': start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()); break;
    case 'hours': start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours()); break;
    case 'minutes': start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()); break;
    case 'seconds': start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()); break;
    default: return { ok: false, reason: 'unsupported-time-unit' };
  }
  return { ok: true, value: new Date(start).toISOString() };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function aggregateValues(rows, encoding) {
  const operation = encoding.aggregate;
  if (!AGGREGATES.has(operation) || operation === 'none') fail(`Invalid aggregate ${operation}`, 'INVALID_MATERIALIZER_AGGREGATE', { aggregate: operation }, TypeError);
  if (operation === 'count' && !encoding.field) return { value: rows.length, rejected: 0 };
  const values = [];
  let rejected = 0;
  for (const row of rows) {
    const read = readPath(row.row, encoding.field);
    if (!read.exists || missing(read.value)) continue;
    const simple = scalar(read.value);
    if (!simple.ok) { rejected += 1; continue; }
    values.push(simple.value);
  }
  if (operation === 'count') return { value: values.length, rejected };
  if (operation === 'distinct') return { value: new Set(values.map((value) => JSON.stringify([typeof value, value]))).size, rejected };
  const numeric = [];
  for (const value of values) {
    const number = numericValue(value);
    if (number === null) { rejected += 1; continue; }
    numeric.push(number);
  }
  if (!numeric.length) return { value: null, rejected };
  switch (operation) {
    case 'sum': return { value: numeric.reduce((total, value) => total + value, 0), rejected };
    case 'mean': return { value: numeric.reduce((total, value) => total + value, 0) / numeric.length, rejected };
    case 'median': return { value: median(numeric), rejected };
    case 'min': return { value: Math.min(...numeric), rejected };
    case 'max': return { value: Math.max(...numeric), rejected };
    default: return { value: null, rejected };
  }
}

function buildBins(rows, state, diagnostics) {
  const bins = {};
  for (const [channel, encoding] of Object.entries(state.encodings)) {
    if (!encoding.bin) continue;
    const maxBins = Math.max(1, Math.floor(Number(encoding.bin.maxBins ?? 10)));
    const values = [];
    for (const row of rows) {
      const read = readPath(row, encoding.field);
      const number = read.exists ? numericValue(read.value) : null;
      if (number !== null) values.push(number);
    }
    if (!values.length) {
      bins[channel] = { field: encoding.field, maxBins, min: null, max: null, width: null, bins: [] };
      diagnostics.push({ code: 'BIN_NO_NUMERIC_VALUES', level: 'warning', channel, field: encoding.field });
      continue;
    }
    const min = Math.min(...values), max = Math.max(...values);
    const count = min === max ? 1 : maxBins;
    const width = min === max ? 0 : (max - min) / count;
    const definitions = Array.from({ length: count }, (_, index) => {
      const start = min + index * width;
      const end = index === count - 1 ? max : min + (index + 1) * width;
      return { index, min: start, max: end, center: min === max ? min : (start + end) / 2 };
    });
    bins[channel] = { field: encoding.field, maxBins, min, max, width, bins: definitions };
  }
  return bins;
}

function applyBin(number, meta) {
  if (!meta || meta.min === null) return { ok: false, reason: 'invalid-bin-value' };
  if (meta.width === 0) return { ok: true, value: meta.min, binIndex: 0 };
  let index = number === meta.max ? meta.bins.length - 1 : Math.floor((number - meta.min) / meta.width);
  index = Math.max(0, Math.min(meta.bins.length - 1, index));
  return { ok: true, value: meta.bins[index].center, binIndex: index };
}

function transformedValue(row, encoding, channel, bins) {
  if (!encoding.field) return { ok: true, value: null };
  const read = readPath(row, encoding.field);
  if (!read.exists || missing(read.value)) return { ok: true, value: null };
  if (encoding.bin) {
    const number = numericValue(read.value);
    if (number === null) return { ok: false, reason: 'invalid-numeric', raw: read.value };
    return applyBin(number, bins[channel]);
  }
  if (encoding.timeUnit !== 'none') return timeBucket(read.value, encoding.timeUnit);
  if (encoding.type === 'quantitative') {
    const number = numericValue(read.value);
    if (number === null) return { ok: false, reason: 'invalid-numeric', raw: read.value };
    return { ok: true, value: number };
  }
  if (encoding.type === 'temporal') {
    const epoch = temporalEpoch(read.value);
    if (epoch === null) return { ok: false, reason: 'invalid-temporal', raw: read.value };
    return { ok: true, value: typeof read.value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(read.value.trim()) ? read.value.trim() : new Date(epoch).toISOString() };
  }
  return scalar(read.value);
}

function groupIdentity(values) {
  return JSON.stringify(Object.entries(values).map(([channel, value]) => [channel, typeof value, value]));
}

function pushDiagnostic(list, entry) { if (list.length < MAX_DIAGNOSTICS) list.push(entry); }

function sortRecords(records, provenance, state) {
  const sortable = Object.entries(state.encodings).filter(([, encoding]) => encoding.sort === 'asc' || encoding.sort === 'desc');
  if (!sortable.length) return { records, provenance };
  const pairs = records.map((record, index) => ({ record, provenance: provenance[index], index }));
  pairs.sort((a, b) => {
    for (const [channel, encoding] of sortable) {
      const av = a.record.values[channel], bv = b.record.values[channel];
      if (av === bv) continue;
      const direction = encoding.sort === 'asc' ? 1 : -1;
      if (av === null) return direction;
      if (bv === null) return -direction;
      if (typeof av === 'number' && typeof bv === 'number') return direction * (av - bv);
      return direction * String(av).localeCompare(String(bv), undefined, { numeric: true });
    }
    return a.index - b.index;
  });
  return { records: pairs.map((pair) => pair.record), provenance: pairs.map((pair) => pair.provenance) };
}

function materializeRaw(rows, state, bins, diagnostics, maxOutputRows) {
  const records = [], provenance = [];
  rows.forEach((row, index) => {
    if (!isPlainObject(row)) { pushDiagnostic(diagnostics, { code: 'NON_OBJECT_ROW_SKIPPED', level: 'warning', rowIndex: index }); return; }
    const values = {};
    for (const [channel, encoding] of Object.entries(state.encodings)) {
      const transformed = transformedValue(row, encoding, channel, bins);
      if (!transformed.ok) { pushDiagnostic(diagnostics, { code: 'CHANNEL_VALUE_REJECTED', level: 'warning', rowIndex: index, channel, field: encoding.field, reason: transformed.reason }); return; }
      values[channel] = transformed.value;
    }
    if (records.length >= maxOutputRows) fail('Materialized output exceeds maxOutputRows', 'MATERIALIZED_OUTPUT_LIMIT', { maxOutputRows }, RangeError);
    records.push({ values }); provenance.push({ sourceIndexes: [index] });
  });
  return sortRecords(records, provenance, state);
}

function materializeAggregated(rows, state, bins, diagnostics, maxGroups) {
  const groupEncodings = Object.entries(state.encodings).filter(([, encoding]) => encoding.aggregate === 'none');
  const aggregateEncodings = Object.entries(state.encodings).filter(([, encoding]) => encoding.aggregate !== 'none');
  for (const [channel, encoding] of aggregateEncodings) {
    if (encoding.bin || encoding.timeUnit !== 'none') fail('Aggregate encodings cannot also use bin/timeUnit in V1', 'AGGREGATE_TRANSFORM_CONFLICT', { channel }, TypeError);
  }
  const groups = new Map();
  if (groupEncodings.length === 0) groups.set('[]', { values: {}, rows: [], firstIndex: -1 });
  rows.forEach((row, index) => {
    if (!isPlainObject(row)) { pushDiagnostic(diagnostics, { code: 'NON_OBJECT_ROW_SKIPPED', level: 'warning', rowIndex: index }); return; }
    const values = {};
    for (const [channel, encoding] of groupEncodings) {
      const transformed = transformedValue(row, encoding, channel, bins);
      if (!transformed.ok) { pushDiagnostic(diagnostics, { code: 'GROUP_VALUE_REJECTED', level: 'warning', rowIndex: index, channel, field: encoding.field, reason: transformed.reason }); return; }
      values[channel] = transformed.value;
    }
    const identity = groupIdentity(values);
    let group = groups.get(identity);
    if (!group) {
      if (groups.size >= maxGroups) fail('Materialized groups exceed maxGroups', 'MATERIALIZED_GROUP_LIMIT', { maxGroups }, RangeError);
      group = { values, rows: [], firstIndex: index };
      groups.set(identity, group);
    }
    group.rows.push({ row, index });
  });

  const records = [], provenance = [];
  for (const group of groups.values()) {
    const values = { ...group.values };
    for (const [channel, encoding] of aggregateEncodings) {
      const aggregated = aggregateValues(group.rows, encoding);
      values[channel] = aggregated.value;
      if (aggregated.rejected) pushDiagnostic(diagnostics, { code: 'AGGREGATE_VALUES_REJECTED', level: 'warning', channel, field: encoding.field, rejected: aggregated.rejected });
    }
    records.push({ values }); provenance.push({ sourceIndexes: group.rows.map((entry) => entry.index) });
  }
  return sortRecords(records, provenance, state);
}

function materializeHistogram(rows, state, bins, diagnostics, maxGroups) {
  const x = state.encodings.x;
  const meta = bins.x;
  const groups = new Map();
  rows.forEach((row, index) => {
    if (!isPlainObject(row)) { pushDiagnostic(diagnostics, { code: 'NON_OBJECT_ROW_SKIPPED', level: 'warning', rowIndex: index }); return; }
    const read = readPath(row, x.field);
    const number = read.exists ? numericValue(read.value) : null;
    if (number === null) { pushDiagnostic(diagnostics, { code: 'HISTOGRAM_VALUE_REJECTED', level: 'warning', rowIndex: index, field: x.field }); return; }
    const binned = applyBin(number, meta);
    if (!binned.ok) return;
    let group = groups.get(binned.binIndex);
    if (!group) {
      if (groups.size >= maxGroups) fail('Histogram groups exceed maxGroups', 'MATERIALIZED_GROUP_LIMIT', { maxGroups }, RangeError);
      group = { value: binned.value, indexes: [] }; groups.set(binned.binIndex, group);
    }
    group.indexes.push(index);
  });
  const records = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, group]) => ({ values: { x: group.value }, metrics: { count: group.indexes.length } }));
  const provenance = [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([, group]) => ({ sourceIndexes: [...group.indexes] }));
  return { records, provenance };
}

export const DATA_WIZ_CHART_DATA_TYPE = TYPE;
export const DATA_WIZ_CHART_DATA_VERSION = VERSION;

export class DataWizChartDataMaterializer {
  constructor({ maxOutputRows = DEFAULT_MAX_OUTPUT_ROWS, maxGroups = DEFAULT_MAX_GROUPS } = {}) {
    this.maxOutputRows = positiveInteger(maxOutputRows, DEFAULT_MAX_OUTPUT_ROWS, 'maxOutputRows');
    this.maxGroups = positiveInteger(maxGroups, DEFAULT_MAX_GROUPS, 'maxGroups');
  }

  materialize(rows = [], chartSpec, { profile = null } = {}) {
    if (!Array.isArray(rows)) fail('Materializer rows must be an array', 'INVALID_MATERIALIZER_ROWS', null, TypeError);
    const chart = normalizeChart(chartSpec);
    const validation = chart.validate(profile);
    if (validation.gate === 'blocked') fail('ChartSpec is blocked and cannot be materialized', 'CHART_SPEC_BLOCKED', validation);
    const state = chart.snapshot();
    for (const [channel, encoding] of Object.entries(state.encodings)) {
      if (!AGGREGATES.has(encoding.aggregate)) fail(`Unsupported aggregate ${encoding.aggregate}`, 'INVALID_MATERIALIZER_AGGREGATE', { channel, aggregate: encoding.aggregate }, TypeError);
      if (!TIME_UNITS.has(encoding.timeUnit)) fail(`Unsupported timeUnit ${encoding.timeUnit}`, 'INVALID_MATERIALIZER_TIMEUNIT', { channel, timeUnit: encoding.timeUnit }, TypeError);
    }
    const diagnostics = [];
    const bins = buildBins(rows, state, diagnostics);
    const hasAggregate = Object.values(state.encodings).some((encoding) => encoding.aggregate !== 'none');
    let output;
    let mode;
    if (state.mark === 'histogram') {
      const extraChannels = Object.keys(state.encodings).filter((channel) => channel !== 'x');
      if (extraChannels.length) fail('Histogram materialization V1 supports x only', 'HISTOGRAM_CHANNELS_UNSUPPORTED', { channels: extraChannels }, TypeError);
      mode = 'histogram'; output = materializeHistogram(rows, state, bins, diagnostics, this.maxGroups);
    }
    else if (hasAggregate) { mode = 'aggregate'; output = materializeAggregated(rows, state, bins, diagnostics, this.maxGroups); }
    else { mode = 'raw'; output = materializeRaw(rows, state, bins, diagnostics, this.maxOutputRows); }
    if (output.records.length > this.maxOutputRows) fail('Materialized output exceeds maxOutputRows', 'MATERIALIZED_OUTPUT_LIMIT', { rows: output.records.length, maxOutputRows: this.maxOutputRows }, RangeError);
    const result = {
      type: TYPE,
      version: VERSION,
      mark: state.mark,
      mode,
      channels: cloneSafe(state.encodings),
      records: cloneSafe(output.records),
      provenance: cloneSafe(output.provenance),
      transforms: { bins: cloneSafe(bins) },
      diagnostics: {
        inputRows: rows.length,
        outputRows: output.records.length,
        messages: cloneSafe(diagnostics),
        truncatedMessages: diagnostics.length >= MAX_DIAGNOSTICS
      }
    };
    return cloneSafe(result);
  }
}
