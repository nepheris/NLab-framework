import { DataWizChartSpec } from './data-wiz-chart-spec.js';

const TYPE = 'nlab.data-wiz-renderer-adapter';
const VERSION = 1;
const ASSESSMENT_TYPE = 'nlab.data-wiz-renderer-assessment';
const ASSESSMENT_VERSION = 1;
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MARKS = new Set(['bar', 'line', 'area', 'point', 'scatter', 'histogram', 'box', 'violin', 'heatmap', 'radar']);
const CHANNELS = new Set(['x', 'y', 'color', 'size', 'detail', 'facet', 'row', 'column', 'theta', 'radius']);
const AGGREGATES = new Set(['none', 'count', 'distinct', 'sum', 'mean', 'median', 'min', 'max']);
const TIME_UNITS = new Set(['none', 'year', 'quarter', 'month', 'week', 'day', 'date', 'hours', 'minutes', 'seconds']);
const STACK_MODES = new Set(['none', 'zero', 'normalize', 'center']);
const ORIENTATIONS = new Set(['auto', 'vertical', 'horizontal']);
const LEGEND_MODES = new Set(['auto', 'show', 'hide']);
const MAX_TEXT = 1024;
const MAX_CAPABILITY_ITEMS = 64;
const MAX_ENCODINGS = 32;

function fail(message, code = 'RENDERER_ADAPTER_ERROR', details = null, ErrorType = Error) {
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
    if (!Number.isFinite(value)) fail('RendererAdapter values must use finite numbers', 'NON_FINITE_RENDERER_VALUE', null, TypeError);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail('Cyclic RendererAdapter values are not supported', 'CYCLIC_RENDERER_VALUE', null, TypeError);
    seen.add(value);
    try { return value.map((entry) => cloneSafe(entry, seen)); }
    finally { seen.delete(value); }
  }
  if (!isPlainObject(value)) fail('RendererAdapter values must be JSON-like', 'UNSUPPORTED_RENDERER_VALUE', null, TypeError);
  if (seen.has(value)) fail('Cyclic RendererAdapter values are not supported', 'CYCLIC_RENDERER_VALUE', null, TypeError);
  seen.add(value);
  try {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) fail(`Unsafe RendererAdapter key: ${key}`, 'UNSAFE_RENDERER_KEY', { key }, TypeError);
      Object.defineProperty(output, key, { value: cloneSafe(entry, seen), enumerable: true, configurable: true, writable: true });
    }
    return output;
  } finally { seen.delete(value); }
}

function text(value, fallback = '', { required = false } = {}) {
  const result = String(value ?? fallback).trim();
  if (required && !result) fail('Required RendererAdapter text is missing', 'MISSING_RENDERER_TEXT', null, TypeError);
  if (result.length > MAX_TEXT) fail(`RendererAdapter text exceeds ${MAX_TEXT} characters`, 'RENDERER_TEXT_TOO_LONG', { max: MAX_TEXT }, RangeError);
  return result;
}

function rejectUnknown(input, allowed, label) {
  for (const key of Object.keys(input)) if (!allowed.has(key)) fail(`Unknown ${label} key: ${key}`, 'UNKNOWN_RENDERER_KEY', { label, key }, TypeError);
}

function enumList(value, allowed, fallback, label, { required = false } = {}) {
  const source = value == null ? fallback : value;
  if (!Array.isArray(source)) fail(`${label} must be an array`, 'INVALID_RENDERER_CAPABILITY', { label }, TypeError);
  if (source.length > MAX_CAPABILITY_ITEMS) fail(`${label} exceeds ${MAX_CAPABILITY_ITEMS} items`, 'RENDERER_CAPABILITY_LIMIT', { label }, RangeError);
  const seen = new Set(); const output = [];
  for (const item of source) {
    const normalized = String(item ?? '').trim();
    if (!allowed.has(normalized)) fail(`Unsupported ${label} value: ${normalized}`, 'INVALID_RENDERER_CAPABILITY', { label, value: normalized }, TypeError);
    if (!seen.has(normalized)) { seen.add(normalized); output.push(normalized); }
  }
  if (required && !output.length) fail(`${label} must contain at least one value`, 'EMPTY_RENDERER_CAPABILITY', { label }, TypeError);
  return output;
}

function strictBoolean(value, fallback, label) {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') fail(`${label} must be a boolean`, 'INVALID_RENDERER_BOOLEAN', { label, value }, TypeError);
  return value;
}

function normalizeDescriptor(value = {}) {
  if (!isPlainObject(value)) fail('descriptor must be an object', 'INVALID_RENDERER_DESCRIPTOR', null, TypeError);
  rejectUnknown(value, new Set(['id', 'label', 'version', 'metadata']), 'descriptor');
  return {
    id: text(value.id, '', { required: true }),
    label: text(value.label, value.id ?? ''),
    version: text(value.version, '1'),
    metadata: cloneSafe(isPlainObject(value.metadata) ? value.metadata : {})
  };
}

function normalizeInteractions(value = {}) {
  if (!isPlainObject(value)) fail('capabilities.interactions must be an object', 'INVALID_RENDERER_INTERACTIONS', null, TypeError);
  rejectUnknown(value, new Set(['tooltip', 'zoom', 'select']), 'capabilities.interactions');
  return {
    tooltip: strictBoolean(value.tooltip, false, 'capabilities.interactions.tooltip'),
    zoom: strictBoolean(value.zoom, false, 'capabilities.interactions.zoom'),
    select: strictBoolean(value.select, false, 'capabilities.interactions.select')
  };
}

function normalizeCapabilities(value = {}) {
  if (!isPlainObject(value)) fail('capabilities must be an object', 'INVALID_RENDERER_CAPABILITIES', null, TypeError);
  rejectUnknown(value, new Set(['marks', 'channels', 'aggregates', 'timeUnits', 'stackModes', 'orientations', 'legendModes', 'binning', 'interactions', 'maxEncodings']), 'capabilities');
  const maxEncodings = Number(value.maxEncodings ?? 10);
  if (!Number.isFinite(maxEncodings) || maxEncodings < 1 || maxEncodings > MAX_ENCODINGS) fail(`capabilities.maxEncodings must be between 1 and ${MAX_ENCODINGS}`, 'INVALID_RENDERER_LIMIT', { maxEncodings }, RangeError);
  return {
    marks: enumList(value.marks, MARKS, [], 'capabilities.marks', { required: true }),
    channels: enumList(value.channels, CHANNELS, [], 'capabilities.channels', { required: true }),
    aggregates: enumList(value.aggregates, AGGREGATES, ['none', 'count'], 'capabilities.aggregates'),
    timeUnits: enumList(value.timeUnits, TIME_UNITS, ['none'], 'capabilities.timeUnits'),
    stackModes: enumList(value.stackModes, STACK_MODES, ['none'], 'capabilities.stackModes'),
    orientations: enumList(value.orientations, ORIENTATIONS, ['auto'], 'capabilities.orientations'),
    legendModes: enumList(value.legendModes, LEGEND_MODES, ['auto'], 'capabilities.legendModes'),
    binning: strictBoolean(value.binning, false, 'capabilities.binning'),
    interactions: normalizeInteractions(value.interactions),
    maxEncodings: Math.floor(maxEncodings)
  };
}

function normalizeContract(value = {}) {
  if (!isPlainObject(value)) fail('RendererAdapter contract must be an object', 'INVALID_RENDERER_CONTRACT', null, TypeError);
  rejectUnknown(value, new Set(['descriptor', 'capabilities']), 'adapter');
  return { descriptor: normalizeDescriptor(value.descriptor), capabilities: normalizeCapabilities(value.capabilities) };
}

function normalizeChart(input) {
  if (input instanceof DataWizChartSpec) return new DataWizChartSpec(input.snapshot());
  if (typeof input === 'string') return DataWizChartSpec.parse(input);
  if (!isPlainObject(input)) fail('assess() requires a DataWizChartSpec-compatible value', 'INVALID_RENDERER_CHART', null, TypeError);
  if (input.type === 'nlab.data-wiz-chart-spec' || Object.hasOwn(input, 'version') || Object.hasOwn(input, 'chart')) {
    if (input.type !== 'nlab.data-wiz-chart-spec' || input.version !== 1) fail('Unsupported ChartSpec payload', 'INVALID_RENDERER_CHART_VERSION', { type: input.type, version: input.version }, TypeError);
    return DataWizChartSpec.parse(input);
  }
  return new DataWizChartSpec(input);
}

function message(code, level, textValue, details = {}) { return { code, level, message: textValue, details: cloneSafe(details) }; }

function capabilityMessages(state, capabilities) {
  const messages = [];
  if (!capabilities.marks.includes(state.mark)) messages.push(message('RENDERER_MARK_UNSUPPORTED', 'error', `Renderer does not support mark ${state.mark}`, { mark: state.mark }));
  const entries = Object.entries(state.encodings ?? {});
  if (entries.length > capabilities.maxEncodings) messages.push(message('RENDERER_ENCODING_LIMIT', 'error', `Chart uses ${entries.length} encodings above renderer limit ${capabilities.maxEncodings}`, { encodings: entries.length, maxEncodings: capabilities.maxEncodings }));
  for (const [channel, encoding] of entries) {
    if (!capabilities.channels.includes(channel)) messages.push(message('RENDERER_CHANNEL_UNSUPPORTED', 'error', `Renderer does not support channel ${channel}`, { channel }));
    if (!capabilities.aggregates.includes(encoding.aggregate)) messages.push(message('RENDERER_AGGREGATE_UNSUPPORTED', 'error', `Renderer does not support aggregate ${encoding.aggregate}`, { channel, aggregate: encoding.aggregate }));
    if (!capabilities.timeUnits.includes(encoding.timeUnit)) messages.push(message('RENDERER_TIMEUNIT_UNSUPPORTED', 'error', `Renderer does not support timeUnit ${encoding.timeUnit}`, { channel, timeUnit: encoding.timeUnit }));
    if (encoding.bin && !capabilities.binning) messages.push(message('RENDERER_BINNING_UNSUPPORTED', 'error', 'Renderer does not support binned encodings', { channel }));
  }
  const presentation = state.presentation ?? {};
  if (!capabilities.stackModes.includes(presentation.stack)) messages.push(message('RENDERER_STACK_UNSUPPORTED', 'error', `Renderer does not support stack mode ${presentation.stack}`, { stack: presentation.stack }));
  if (!capabilities.orientations.includes(presentation.orientation)) messages.push(message('RENDERER_ORIENTATION_UNSUPPORTED', 'error', `Renderer does not support orientation ${presentation.orientation}`, { orientation: presentation.orientation }));
  if (!capabilities.legendModes.includes(presentation.legend)) messages.push(message('RENDERER_LEGEND_DEGRADED', 'warning', `Renderer cannot guarantee legend mode ${presentation.legend}`, { legend: presentation.legend }));
  const interactions = presentation.interactions ?? {};
  for (const key of ['tooltip', 'zoom', 'select']) {
    if (interactions[key] === true && capabilities.interactions[key] !== true) messages.push(message('RENDERER_INTERACTION_DEGRADED', 'warning', `Renderer does not support requested interaction ${key}`, { interaction: key }));
  }
  return messages;
}

function gateFor(chartValidation, messages) {
  if (chartValidation?.gate === 'blocked' || messages.some((entry) => entry.level === 'error')) return 'blocked';
  if (chartValidation?.gate === 'warning' || messages.some((entry) => entry.level === 'warning')) return 'warning';
  return 'ready';
}

export const DATA_WIZ_RENDERER_ADAPTER_TYPE = TYPE;
export const DATA_WIZ_RENDERER_ADAPTER_VERSION = VERSION;
export const DATA_WIZ_RENDERER_ASSESSMENT_TYPE = ASSESSMENT_TYPE;
export const DATA_WIZ_RENDERER_ASSESSMENT_VERSION = ASSESSMENT_VERSION;

export class DataWizRendererAdapter {
  constructor(value = {}, { compiler = null } = {}) {
    this._contract = normalizeContract(value);
    if (compiler !== null && typeof compiler !== 'function') fail('compiler must be a function or null', 'INVALID_RENDERER_COMPILER', null, TypeError);
    this._compiler = compiler;
  }

  static parse(input, options = {}) {
    let payload;
    try { payload = typeof input === 'string' ? JSON.parse(input) : cloneSafe(input); }
    catch (error) { fail('Invalid RendererAdapter JSON', 'INVALID_RENDERER_JSON', { cause: error?.message }, SyntaxError); }
    if (!isPlainObject(payload)) fail('RendererAdapter payload must be an object', 'INVALID_RENDERER_PAYLOAD', null, TypeError);
    if (payload.type !== TYPE) fail(`Unsupported RendererAdapter type: ${String(payload.type)}`, 'INVALID_RENDERER_TYPE', { type: payload.type }, TypeError);
    if (payload.version !== VERSION) fail(`Unsupported RendererAdapter version: ${String(payload.version)}`, 'INVALID_RENDERER_VERSION', { version: payload.version }, TypeError);
    return new DataWizRendererAdapter(payload.adapter, options);
  }

  snapshot() { return cloneSafe(this._contract); }

  assess(chartSpec, { profile = null } = {}) {
    const chart = normalizeChart(chartSpec);
    const state = chart.snapshot();
    const chartValidation = chart.validate(profile);
    const messages = capabilityMessages(state, this._contract.capabilities);
    const gate = gateFor(chartValidation, messages);
    return cloneSafe({
      type: ASSESSMENT_TYPE,
      version: ASSESSMENT_VERSION,
      adapter: cloneSafe(this._contract.descriptor),
      gate,
      ready: gate !== 'blocked',
      compileAllowed: gate !== 'blocked' && this._compiler !== null,
      chart: { mark: state.mark, encodings: Object.keys(state.encodings).length },
      chartValidation: cloneSafe(chartValidation),
      messages
    });
  }

  supports(chartSpec, options = {}) { return this.assess(chartSpec, options).ready; }

  compile(chartSpec, context = {}, { profile = null } = {}) {
    if (this._compiler === null) fail('RendererAdapter has no compiler attached', 'RENDERER_COMPILER_UNAVAILABLE', { adapterId: this._contract.descriptor.id });
    const chart = normalizeChart(chartSpec);
    const assessment = this.assess(chart, { profile });
    if (assessment.gate === 'blocked') fail('ChartSpec is incompatible with renderer adapter', 'RENDERER_COMPATIBILITY_BLOCKED', assessment);
    const safeContext = cloneSafe(context);
    let compiled;
    try {
      compiled = this._compiler({
        adapter: this.snapshot(),
        chart: chart.toJSON(),
        context: safeContext,
        assessment: cloneSafe(assessment)
      });
    } catch (error) {
      fail('Renderer compiler failed', 'RENDERER_COMPILER_ERROR', { adapterId: this._contract.descriptor.id, cause: error?.message ?? String(error) });
    }
    if (compiled && typeof compiled.then === 'function') fail('Renderer compiler must be synchronous in V1', 'ASYNC_RENDERER_COMPILER_UNSUPPORTED', { adapterId: this._contract.descriptor.id }, TypeError);
    return cloneSafe({ adapterId: this._contract.descriptor.id, assessment, compiled: cloneSafe(compiled) });
  }

  toJSON() { return { type: TYPE, version: VERSION, adapter: this.snapshot() }; }

  serialize({ indent = 2 } = {}) {
    const safeIndent = Math.max(0, Math.min(8, Math.floor(Number(indent) || 0)));
    return JSON.stringify(this.toJSON(), null, safeIndent);
  }
}
