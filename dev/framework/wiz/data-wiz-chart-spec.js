const TYPE = 'nlab.data-wiz-chart-spec';
const VERSION = 1;
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MARKS = new Set(['bar', 'line', 'area', 'point', 'scatter', 'histogram', 'box', 'violin', 'heatmap', 'radar']);
const CHANNELS = new Set(['x', 'y', 'color', 'size', 'detail', 'facet', 'row', 'column', 'theta', 'radius']);
const ENCODING_TYPES = new Set(['auto', 'quantitative', 'nominal', 'ordinal', 'temporal']);
const AGGREGATES = new Set(['none', 'count', 'distinct', 'sum', 'mean', 'median', 'min', 'max']);
const TIME_UNITS = new Set(['none', 'year', 'quarter', 'month', 'week', 'day', 'date', 'hours', 'minutes', 'seconds']);
const SORTS = new Set(['none', 'asc', 'desc']);
const ORIENTATIONS = new Set(['auto', 'vertical', 'horizontal']);
const STACKS = new Set(['none', 'zero', 'normalize', 'center']);
const LEGENDS = new Set(['auto', 'show', 'hide']);
const SOURCE_KINDS = new Set(['dataset', 'collection', 'resultset', 'derived', 'unknown']);
const MAX_TEXT = 1024;
const MAX_ENCODINGS = 10;

function fail(message, code = 'CHART_SPEC_ERROR', details = null, ErrorType = Error) {
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
    if (!Number.isFinite(value)) fail('ChartSpec values must use finite numbers', 'NON_FINITE_CHART_VALUE', null, TypeError);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail('Cyclic ChartSpec values are not supported', 'CYCLIC_CHART_VALUE', null, TypeError);
    seen.add(value);
    try { return value.map((entry) => cloneSafe(entry, seen)); }
    finally { seen.delete(value); }
  }
  if (!isPlainObject(value)) fail('ChartSpec values must be JSON-like', 'UNSUPPORTED_CHART_VALUE', null, TypeError);
  if (seen.has(value)) fail('Cyclic ChartSpec values are not supported', 'CYCLIC_CHART_VALUE', null, TypeError);
  seen.add(value);
  try {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) fail(`Unsafe ChartSpec key: ${key}`, 'UNSAFE_CHART_KEY', { key }, TypeError);
      Object.defineProperty(output, key, { value: cloneSafe(entry, seen), enumerable: true, configurable: true, writable: true });
    }
    return output;
  } finally { seen.delete(value); }
}

function text(value, fallback = '', { required = false } = {}) {
  const result = String(value ?? fallback).trim();
  if (required && !result) fail('Required ChartSpec text is missing', 'MISSING_CHART_TEXT', null, TypeError);
  if (result.length > MAX_TEXT) fail(`ChartSpec text exceeds ${MAX_TEXT} characters`, 'CHART_TEXT_TOO_LONG', { max: MAX_TEXT }, RangeError);
  return result;
}

function strictEnum(value, values, fallback, label) {
  const raw = value === undefined || value === null || value === '' ? fallback : String(value).trim();
  if (!values.has(raw)) fail(`Invalid ${label}: ${String(value)}`, 'INVALID_CHART_ENUM', { label, value, allowed: [...values] }, TypeError);
  return raw;
}

function rejectUnknown(input, allowed, label) {
  for (const key of Object.keys(input)) if (!allowed.has(key)) fail(`Unknown ${label} key: ${key}`, 'UNKNOWN_CHART_KEY', { label, key }, TypeError);
}

function normalizeSource(value = {}) {
  if (!isPlainObject(value)) fail('source must be an object', 'INVALID_CHART_SOURCE', null, TypeError);
  rejectUnknown(value, new Set(['id', 'label', 'kind']), 'source');
  return {
    id: text(value.id),
    label: text(value.label, value.id ?? ''),
    kind: strictEnum(value.kind, SOURCE_KINDS, 'unknown', 'source.kind')
  };
}

function normalizeBin(value) {
  if (value === undefined || value === null || value === false) return false;
  if (value === true) return { maxBins: 10 };
  if (!isPlainObject(value)) fail('encoding.bin must be boolean or object', 'INVALID_CHART_BIN', null, TypeError);
  rejectUnknown(value, new Set(['maxBins']), 'encoding.bin');
  const maxBins = Number(value.maxBins ?? 10);
  if (!Number.isFinite(maxBins) || maxBins < 1 || maxBins > 500) fail('encoding.bin.maxBins must be between 1 and 500', 'INVALID_CHART_BIN', { maxBins }, RangeError);
  return { maxBins: Math.floor(maxBins) };
}

function normalizeEncoding(value, channel) {
  if (!isPlainObject(value)) fail(`encoding ${channel} must be an object`, 'INVALID_CHART_ENCODING', { channel }, TypeError);
  rejectUnknown(value, new Set(['field', 'type', 'aggregate', 'bin', 'timeUnit', 'title', 'sort']), `encoding.${channel}`);
  const aggregate = strictEnum(value.aggregate, AGGREGATES, 'none', `encoding.${channel}.aggregate`);
  const field = value.field === undefined || value.field === null ? '' : text(value.field);
  if (!field && aggregate !== 'count') fail(`encoding ${channel} requires a field unless aggregate=count`, 'MISSING_CHART_FIELD', { channel }, TypeError);
  return {
    field,
    type: strictEnum(value.type, ENCODING_TYPES, 'auto', `encoding.${channel}.type`),
    aggregate,
    bin: normalizeBin(value.bin),
    timeUnit: strictEnum(value.timeUnit, TIME_UNITS, 'none', `encoding.${channel}.timeUnit`),
    title: text(value.title, field),
    sort: strictEnum(value.sort, SORTS, 'none', `encoding.${channel}.sort`)
  };
}

function normalizeEncodings(value = {}) {
  if (!isPlainObject(value)) fail('encodings must be an object', 'INVALID_CHART_ENCODINGS', null, TypeError);
  const entries = Object.entries(value).filter(([, entry]) => entry !== null && entry !== undefined);
  if (!entries.length) fail('ChartSpec requires at least one encoding', 'EMPTY_CHART_ENCODINGS', null, TypeError);
  if (entries.length > MAX_ENCODINGS) fail(`ChartSpec supports at most ${MAX_ENCODINGS} encodings`, 'TOO_MANY_CHART_ENCODINGS', { max: MAX_ENCODINGS }, RangeError);
  const output = {};
  for (const [channel, encoding] of entries) {
    if (!CHANNELS.has(channel)) fail(`Unsupported encoding channel ${channel}`, 'INVALID_CHART_CHANNEL', { channel }, TypeError);
    output[channel] = normalizeEncoding(encoding, channel);
  }
  return output;
}

function normalizeInteractions(value = {}) {
  if (!isPlainObject(value)) fail('presentation.interactions must be an object', 'INVALID_CHART_INTERACTIONS', null, TypeError);
  rejectUnknown(value, new Set(['tooltip', 'zoom', 'select']), 'presentation.interactions');
  const boolean = (key, fallback) => {
    if (value[key] === undefined) return fallback;
    if (typeof value[key] !== 'boolean') fail(`presentation.interactions.${key} must be a boolean`, 'INVALID_CHART_BOOLEAN', { key, value: value[key] }, TypeError);
    return value[key];
  };
  return { tooltip: boolean('tooltip', true), zoom: boolean('zoom', false), select: boolean('select', false) };
}

function normalizePresentation(value = {}) {
  if (!isPlainObject(value)) fail('presentation must be an object', 'INVALID_CHART_PRESENTATION', null, TypeError);
  rejectUnknown(value, new Set(['title', 'subtitle', 'orientation', 'stack', 'legend', 'interactions']), 'presentation');
  return {
    title: text(value.title),
    subtitle: text(value.subtitle),
    orientation: strictEnum(value.orientation, ORIENTATIONS, 'auto', 'presentation.orientation'),
    stack: strictEnum(value.stack, STACKS, 'none', 'presentation.stack'),
    legend: strictEnum(value.legend, LEGENDS, 'auto', 'presentation.legend'),
    interactions: normalizeInteractions(value.interactions)
  };
}

function normalizeState(value = {}) {
  if (!isPlainObject(value)) fail('ChartSpec state must be an object', 'INVALID_CHART_STATE', null, TypeError);
  rejectUnknown(value, new Set(['id', 'label', 'mark', 'source', 'encodings', 'presentation', 'metadata']), 'chart');
  return {
    id: text(value.id),
    label: text(value.label, value.id ?? ''),
    mark: strictEnum(value.mark, MARKS, 'bar', 'mark'),
    source: normalizeSource(value.source),
    encodings: normalizeEncodings(value.encodings),
    presentation: normalizePresentation(value.presentation),
    metadata: cloneSafe(isPlainObject(value.metadata) ? value.metadata : {})
  };
}

function mergeState(current, patch) {
  if (!isPlainObject(patch)) fail('ChartSpec patch must be an object', 'INVALID_CHART_PATCH', null, TypeError);
  rejectUnknown(patch, new Set(['id', 'label', 'mark', 'source', 'encodings', 'presentation', 'metadata']), 'chart patch');
  const encodings = patch.encodings === undefined
    ? cloneSafe(current.encodings)
    : (() => {
        if (!isPlainObject(patch.encodings)) fail('encodings patch must be an object', 'INVALID_CHART_ENCODINGS', null, TypeError);
        const next = cloneSafe(current.encodings);
        for (const [channel, value] of Object.entries(patch.encodings)) {
          if (!CHANNELS.has(channel)) fail(`Unsupported encoding channel ${channel}`, 'INVALID_CHART_CHANNEL', { channel }, TypeError);
          if (value === null) delete next[channel]; else next[channel] = cloneSafe(value);
        }
        return next;
      })();
  return {
    ...cloneSafe(current),
    ...cloneSafe(patch),
    source: patch.source === undefined ? cloneSafe(current.source) : { ...cloneSafe(current.source), ...cloneSafe(patch.source) },
    encodings,
    presentation: patch.presentation === undefined ? cloneSafe(current.presentation) : {
      ...cloneSafe(current.presentation),
      ...cloneSafe(patch.presentation),
      interactions: patch.presentation?.interactions === undefined
        ? cloneSafe(current.presentation.interactions)
        : { ...cloneSafe(current.presentation.interactions), ...cloneSafe(patch.presentation.interactions) }
    }
  };
}

function message(code, level, textValue, details = {}) {
  return { code, level, message: textValue, details: cloneSafe(details) };
}

function encodingSemanticType(encoding, field) {
  if (encoding.type !== 'auto') return encoding.type;
  if (!field) return encoding.aggregate === 'count' ? 'quantitative' : 'auto';
  if (field.dataType === 'number' || field.dataType === 'integer') return 'quantitative';
  if (field.dataType === 'date' || field.dataType === 'datetime' || field.role === 'time') return 'temporal';
  if (field.dataType === 'string' || field.dataType === 'boolean' || field.role === 'dimension' || field.role === 'label') return 'nominal';
  return 'auto';
}

function profileAdapter(profile) {
  if (!profile) return null;
  if (typeof profile.field === 'function' && typeof profile.snapshot === 'function') {
    const snapshot = profile.snapshot();
    return { snapshot, field: (path) => profile.field(path) };
  }
  let snapshot = profile;
  if (isPlainObject(profile) && profile.type === 'nlab.data-wiz-dataset-profile' && profile.version === 1) snapshot = profile.profile;
  if (!isPlainObject(snapshot) || !Array.isArray(snapshot.fields)) fail('validate(profile) requires a DataWizDatasetProfile-compatible snapshot', 'INVALID_CHART_PROFILE', null, TypeError);
  return {
    snapshot,
    field: (path) => snapshot.fields.find((entry) => entry.specPath === path || entry.pointer === path) ?? null
  };
}

function channel(state, name) { return state.encodings[name] ?? null; }

function validateMarkShape(state, messages) {
  const has = (name) => Boolean(channel(state, name));
  const required = (names, mark = state.mark) => {
    const missing = names.filter((name) => !has(name));
    if (missing.length) messages.push(message('MARK_CHANNELS_MISSING', 'error', `${mark} requires channels: ${missing.join(', ')}`, { mark, missing }));
  };
  switch (state.mark) {
    case 'line': case 'area': case 'scatter': required(['x', 'y']); break;
    case 'histogram': required(['x']); break;
    case 'box': case 'violin': required(['y']); break;
    case 'heatmap': required(['x', 'y']); break;
    case 'radar': required(['theta', 'radius']); break;
    case 'bar': case 'point': if (!has('x') && !has('y')) messages.push(message('MARK_CHANNELS_MISSING', 'error', `${state.mark} requires x or y`, { mark: state.mark })); break;
  }
  if (state.mark === 'histogram') {
    const x = channel(state, 'x');
    if (x && !x.bin) messages.push(message('HISTOGRAM_BIN_REQUIRED', 'error', 'Histogram x encoding must enable binning', { channel: 'x' }));
  }
  if (state.mark === 'scatter') {
    for (const name of ['x', 'y']) {
      const encoding = channel(state, name);
      if (encoding && !['auto', 'quantitative'].includes(encoding.type)) messages.push(message('SCATTER_QUANTITATIVE_EXPECTED', 'warning', `Scatter ${name} is normally quantitative`, { channel: name, type: encoding.type }));
    }
  }
  if ((state.mark === 'box' || state.mark === 'violin') && channel(state, 'y') && !['auto', 'quantitative'].includes(channel(state, 'y').type)) {
    messages.push(message('DISTRIBUTION_QUANTITATIVE_EXPECTED', 'error', `${state.mark} y encoding must be quantitative`, { type: channel(state, 'y').type }));
  }
}

function validateEncodingAgainstProfile(channelName, encoding, adapter, messages) {
  const field = encoding.field ? adapter?.field(encoding.field) : null;
  if (encoding.field && adapter && !field) {
    messages.push(message('CHART_FIELD_NOT_FOUND', 'error', `Field ${encoding.field} is not present in DatasetProfile`, { channel: channelName, field: encoding.field }));
    return;
  }
  if (field && field.addressable === false && encoding.field === field.pointer) {
    messages.push(message('CHART_FIELD_NOT_ADDRESSABLE', 'error', `Field ${encoding.field} has no unambiguous DataWiz specPath`, { channel: channelName, field: encoding.field, pointer: field.pointer }));
  }
  const semanticType = encodingSemanticType(encoding, field);
  const numericField = field && (field.dataType === 'number' || field.dataType === 'integer');
  const temporalField = field && (field.dataType === 'date' || field.dataType === 'datetime' || field.role === 'time');
  if (field && semanticType === 'quantitative' && !numericField) {
    messages.push(message('QUANTITATIVE_FIELD_MISMATCH', 'error', `Field ${encoding.field} is not quantitative in DatasetProfile`, { channel: channelName, field: encoding.field, dataType: field.dataType }));
  }
  if (field && semanticType === 'temporal' && !temporalField) {
    messages.push(message('TEMPORAL_FIELD_MISMATCH', 'error', `Field ${encoding.field} is not temporal in DatasetProfile`, { channel: channelName, field: encoding.field, dataType: field.dataType }));
  }
  if (field && ['sum', 'mean', 'median'].includes(encoding.aggregate) && !numericField) {
    messages.push(message('NUMERIC_AGGREGATE_MISMATCH', 'error', `${encoding.aggregate} requires a numeric field`, { channel: channelName, field: encoding.field, dataType: field.dataType }));
  }
  if (field && encoding.bin && !numericField) {
    messages.push(message('BIN_FIELD_MISMATCH', 'error', 'Binning requires a numeric field', { channel: channelName, field: encoding.field, dataType: field.dataType }));
  }
  if (field && encoding.timeUnit !== 'none' && !temporalField) {
    messages.push(message('TIMEUNIT_FIELD_MISMATCH', 'error', 'timeUnit requires a temporal field', { channel: channelName, field: encoding.field, timeUnit: encoding.timeUnit }));
  }
  if (field?.role === 'identifier' && ['x', 'y', 'color', 'facet', 'row', 'column', 'theta'].includes(channelName)) {
    messages.push(message('IDENTIFIER_ENCODING', 'warning', `Identifier ${encoding.field} is used as a visual encoding`, { channel: channelName, field: encoding.field }));
  }
  if (field && (semanticType === 'nominal' || semanticType === 'ordinal') && field.count >= 50 && field.cardinality > 0.8) {
    messages.push(message('HIGH_CARDINALITY_ENCODING', 'warning', `High-cardinality field ${encoding.field} may reduce readability`, { channel: channelName, field: encoding.field, cardinality: field.cardinality }));
  }
  if (field && semanticType === 'nominal' && numericField) {
    messages.push(message('NUMERIC_AS_NOMINAL', 'warning', `Numeric field ${encoding.field} is intentionally encoded as nominal`, { channel: channelName, field: encoding.field }));
  }
}

function validateState(state, profile = null) {
  const messages = [];
  validateMarkShape(state, messages);
  const adapter = profileAdapter(profile);
  if (adapter?.snapshot?.dataset?.complete === false) messages.push(message('DATASET_PROFILE_SAMPLED', 'info', 'Chart validation uses a sampled DatasetProfile', {
    rows: adapter.snapshot.dataset.rows, sampledRows: adapter.snapshot.dataset.sampledRows
  }));
  for (const [channelName, encoding] of Object.entries(state.encodings)) validateEncodingAgainstProfile(channelName, encoding, adapter, messages);

  if (state.presentation.stack !== 'none' && !['bar', 'area'].includes(state.mark)) {
    messages.push(message('STACK_MARK_MISMATCH', 'warning', `Stacking is unusual for mark ${state.mark}`, { mark: state.mark, stack: state.presentation.stack }));
  }
  if (state.mark === 'radar' && state.presentation.orientation !== 'auto') {
    messages.push(message('ORIENTATION_NOT_APPLICABLE', 'info', 'Radar charts ignore Cartesian orientation', { orientation: state.presentation.orientation }));
  }
  const gate = messages.some((entry) => entry.level === 'error') ? 'blocked' : messages.some((entry) => entry.level === 'warning') ? 'warning' : 'ready';
  return { valid: gate !== 'blocked', gate, messages };
}

export const DATA_WIZ_CHART_SPEC_TYPE = TYPE;
export const DATA_WIZ_CHART_SPEC_VERSION = VERSION;
export const DATA_WIZ_CHART_MARKS = Object.freeze([...MARKS]);
export const DATA_WIZ_CHART_CHANNELS = Object.freeze([...CHANNELS]);

export class DataWizChartSpec {
  constructor(value = {}) {
    this._state = normalizeState(value);
    this._initial = cloneSafe(this._state);
  }

  static parse(input) {
    let payload;
    try { payload = typeof input === 'string' ? JSON.parse(input) : cloneSafe(input); }
    catch (error) { fail('Invalid ChartSpec JSON', 'INVALID_CHART_JSON', { cause: error?.message }, SyntaxError); }
    if (!isPlainObject(payload)) fail('ChartSpec payload must be an object', 'INVALID_CHART_PAYLOAD', null, TypeError);
    if (payload.type !== TYPE) fail(`Unsupported ChartSpec type: ${String(payload.type)}`, 'INVALID_CHART_TYPE', { type: payload.type }, TypeError);
    if (payload.version !== VERSION) fail(`Unsupported ChartSpec version: ${String(payload.version)}`, 'INVALID_CHART_VERSION', { version: payload.version }, TypeError);
    return new DataWizChartSpec(payload.chart);
  }

  snapshot() { return cloneSafe(this._state); }

  update(patch = {}) {
    const next = normalizeState(mergeState(this._state, patch));
    this._state = next;
    return this.snapshot();
  }

  setEncoding(channelName, encoding) {
    if (!CHANNELS.has(channelName)) fail(`Unsupported encoding channel ${channelName}`, 'INVALID_CHART_CHANNEL', { channel: channelName }, TypeError);
    return this.update({ encodings: { [channelName]: encoding } });
  }

  removeEncoding(channelName) { return this.setEncoding(channelName, null); }

  reset() { this._state = cloneSafe(this._initial); return this.snapshot(); }

  validate(profile = null) { return cloneSafe(validateState(this._state, profile)); }

  explain(profile = null) {
    const validation = validateState(this._state, profile);
    return {
      mark: this._state.mark,
      encodings: Object.fromEntries(Object.entries(this._state.encodings).map(([channelName, encoding]) => [channelName, {
        field: encoding.field || '(count)',
        type: encoding.type,
        aggregate: encoding.aggregate,
        bin: Boolean(encoding.bin),
        timeUnit: encoding.timeUnit
      }])),
      gate: validation.gate,
      blockers: validation.messages.filter((entry) => entry.level === 'error').map((entry) => entry.code),
      warnings: validation.messages.filter((entry) => entry.level === 'warning').map((entry) => entry.code)
    };
  }

  toJSON() { return { type: TYPE, version: VERSION, chart: this.snapshot() }; }

  serialize({ indent = 2 } = {}) {
    const safeIndent = Math.max(0, Math.min(8, Math.floor(Number(indent) || 0)));
    return JSON.stringify(this.toJSON(), null, safeIndent);
  }
}
