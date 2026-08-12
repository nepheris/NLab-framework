import { DataWizRendererAdapter } from './data-wiz-renderer-adapter.js';

const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SUPPORTED_MARKS = ['bar', 'line', 'area', 'point', 'scatter', 'histogram', 'box', 'radar'];
const SUPPORTED_CHANNELS = ['x', 'y', 'color', 'size', 'detail', 'theta', 'radius'];
const SUPPORTED_AGGREGATES = ['none', 'count', 'distinct', 'sum', 'mean', 'median', 'min', 'max'];
const SUPPORTED_TIME_UNITS = ['none', 'year', 'quarter', 'month', 'week', 'day', 'date', 'hours', 'minutes', 'seconds'];
const SUPPORTED_STACKS = ['none', 'zero', 'normalize'];
const SUPPORTED_ORIENTATIONS = ['auto', 'vertical', 'horizontal'];
const SUPPORTED_LEGENDS = ['auto', 'show', 'hide'];

function fail(message, code = 'PLOTLY_ADAPTER_ERROR', details = null, ErrorType = Error) {
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
    if (!Number.isFinite(value)) fail('Plotly plan values must use finite numbers', 'NON_FINITE_PLOTLY_VALUE', null, TypeError);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail('Cyclic Plotly plan values are not supported', 'CYCLIC_PLOTLY_VALUE', null, TypeError);
    seen.add(value);
    try { return value.map((entry) => cloneSafe(entry, seen)); }
    finally { seen.delete(value); }
  }
  if (!isPlainObject(value)) fail('Plotly plan values must be JSON-like', 'UNSUPPORTED_PLOTLY_VALUE', null, TypeError);
  if (seen.has(value)) fail('Cyclic Plotly plan values are not supported', 'CYCLIC_PLOTLY_VALUE', null, TypeError);
  seen.add(value);
  try {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) fail(`Unsafe Plotly plan key: ${key}`, 'UNSAFE_PLOTLY_KEY', { key }, TypeError);
      Object.defineProperty(output, key, { value: cloneSafe(entry, seen), enumerable: true, configurable: true, writable: true });
    }
    return output;
  } finally { seen.delete(value); }
}

function normalizeChartPayload(value) {
  if (!isPlainObject(value) || value.type !== 'nlab.data-wiz-chart-spec' || value.version !== 1 || !isPlainObject(value.chart)) {
    fail('Plotly compiler requires a DataWizChartSpec V1 payload', 'INVALID_PLOTLY_CHART', null, TypeError);
  }
  return cloneSafe(value.chart);
}

function normalizeChartData(value, expectedMark) {
  if (!isPlainObject(value) || value.type !== 'nlab.data-wiz-chart-data' || value.version !== 1) {
    fail('Plotly compiler requires ChartDataMaterializer V1 output in context.chartData', 'INVALID_PLOTLY_CHART_DATA', null, TypeError);
  }
  if (value.mark !== expectedMark) fail('ChartSpec mark does not match materialized chart data', 'PLOTLY_MARK_MISMATCH', { chartMark: expectedMark, dataMark: value.mark }, TypeError);
  if (!Array.isArray(value.records) || !Array.isArray(value.provenance) || value.records.length !== value.provenance.length) {
    fail('Materialized chart records/provenance are inconsistent', 'INVALID_PLOTLY_CHART_DATA', null, TypeError);
  }
  return cloneSafe(value);
}

function identity(value) { return JSON.stringify([typeof value, value]); }

function colorMode(state) {
  const encoding = state.encodings?.color;
  if (!encoding) return 'none';
  return encoding.type === 'quantitative' ? 'continuous' : 'group';
}

function groupPoints(records, provenance, state) {
  const mode = colorMode(state);
  if (mode !== 'group') return [{ name: null, records, provenance }];
  const groups = new Map();
  records.forEach((record, index) => {
    const value = record?.values?.color ?? null;
    const key = identity(value);
    const group = groups.get(key) ?? { name: value === null ? '(vide)' : String(value), records: [], provenance: [] };
    group.records.push(record);
    group.provenance.push(provenance[index]);
    groups.set(key, group);
  });
  return [...groups.values()];
}

function values(group, channel) { return group.records.map((record) => record.values?.[channel] ?? null); }
function customdata(group) { return group.provenance.map((entry) => cloneSafe(entry?.sourceIndexes ?? [])); }

function applyCommonTrace(trace, group, state) {
  if (group.name !== null) trace.name = group.name;
  trace.customdata = customdata(group);
  if (state.presentation?.interactions?.tooltip === false) trace.hoverinfo = 'skip';
  const mode = colorMode(state);
  if (mode === 'continuous' && state.encodings?.color) {
    trace.marker = { ...(trace.marker ?? {}), color: values(group, 'color'), showscale: true };
  }
  if (state.encodings?.size && ['point', 'scatter'].includes(state.mark)) {
    trace.marker = { ...(trace.marker ?? {}), size: values(group, 'size') };
  }
  return trace;
}

function cartesianTrace(group, state, type, mode = null) {
  const trace = { type };
  if (mode) trace.mode = mode;
  if (state.encodings?.x) trace.x = values(group, 'x');
  if (state.encodings?.y) trace.y = values(group, 'y');
  return applyCommonTrace(trace, group, state);
}

function compileBar(groups, state) {
  const horizontal = state.presentation?.orientation === 'horizontal';
  return groups.map((group) => {
    const trace = cartesianTrace(group, state, 'bar');
    if (horizontal) {
      const previousX = trace.x;
      trace.x = trace.y ?? [];
      trace.y = previousX ?? [];
      trace.orientation = 'h';
    }
    return trace;
  });
}

function compileScatterLike(groups, state) {
  return groups.map((group) => {
    let mode = state.mark === 'line' || state.mark === 'area' ? 'lines' : 'markers';
    const trace = cartesianTrace(group, state, 'scatter', mode);
    if (state.mark === 'area') {
      if (state.presentation?.stack === 'zero' || state.presentation?.stack === 'normalize') {
        trace.stackgroup = 'nlab';
        if (state.presentation.stack === 'normalize') trace.groupnorm = 'percent';
      } else trace.fill = 'tozeroy';
    }
    return trace;
  });
}

function compileBox(groups, state) {
  return groups.map((group) => applyCommonTrace({
    type: 'box',
    ...(state.encodings?.x ? { x: values(group, 'x') } : {}),
    ...(state.encodings?.y ? { y: values(group, 'y') } : {})
  }, group, state));
}

function compileHistogram(chartData, state) {
  if (chartData.mode !== 'histogram') fail('Histogram ChartSpec requires histogram materialized data', 'PLOTLY_HISTOGRAM_DATA_REQUIRED', { mode: chartData.mode }, TypeError);
  const x = chartData.records.map((record) => record.values?.x ?? null);
  const y = chartData.records.map((record) => Number(record.metrics?.count ?? 0));
  const bins = chartData.transforms?.bins?.x?.bins ?? [];
  const width = bins.length === x.length ? bins.map((bin) => Number(bin.max) - Number(bin.min)) : undefined;
  const customdataValue = chartData.provenance.map((entry, index) => ({
    sourceIndexes: cloneSafe(entry?.sourceIndexes ?? []),
    bin: bins[index] ? { min: bins[index].min, max: bins[index].max } : null
  }));
  const trace = { type: 'bar', x, y, customdata: customdataValue };
  if (width?.every(Number.isFinite)) trace.width = width;
  if (state.presentation?.interactions?.tooltip === false) trace.hoverinfo = 'skip';
  return [trace];
}

function compileRadar(groups, state) {
  return groups.map((group) => applyCommonTrace({
    type: 'scatterpolar',
    mode: 'lines+markers',
    fill: 'toself',
    theta: values(group, 'theta'),
    r: values(group, 'radius')
  }, group, state));
}

function axisTitles(state, horizontalBar) {
  let xTitle = state.encodings?.x?.title || '';
  let yTitle = state.encodings?.y?.title || '';
  if (horizontalBar) [xTitle, yTitle] = [yTitle, xTitle];
  return { xTitle, yTitle };
}

function buildLayout(state, traceCount) {
  const layout = {};
  const presentation = state.presentation ?? {};
  if (presentation.title || presentation.subtitle) {
    layout.title = {};
    if (presentation.title) layout.title.text = presentation.title;
    if (presentation.subtitle) layout.title.subtitle = { text: presentation.subtitle };
  }
  if (presentation.legend === 'show') layout.showlegend = true;
  else if (presentation.legend === 'hide') layout.showlegend = false;
  else if (traceCount <= 1) layout.showlegend = false;

  if (state.mark !== 'radar') {
    const horizontalBar = state.mark === 'bar' && presentation.orientation === 'horizontal';
    const { xTitle, yTitle } = axisTitles(state, horizontalBar);
    if (xTitle) layout.xaxis = { title: { text: xTitle } };
    if (yTitle) layout.yaxis = { title: { text: yTitle } };
  }
  if (state.mark === 'bar' || state.mark === 'histogram') {
    if (presentation.stack === 'zero') layout.barmode = 'stack';
    if (presentation.stack === 'normalize') { layout.barmode = 'stack'; layout.barnorm = 'percent'; }
  }
  if (presentation.interactions?.select === true && state.mark !== 'radar') layout.dragmode = 'select';
  return layout;
}

function buildConfig(state) {
  const interactions = state.presentation?.interactions ?? {};
  return {
    responsive: true,
    displaylogo: false,
    scrollZoom: interactions.zoom === true
  };
}

export const DATA_WIZ_PLOTLY_ADAPTER_ID = 'plotly-js';
export const DATA_WIZ_PLOTLY_ADAPTER_VERSION = 1;
export const DATA_WIZ_PLOTLY_CAPABILITIES = Object.freeze({
  marks: Object.freeze([...SUPPORTED_MARKS]),
  channels: Object.freeze([...SUPPORTED_CHANNELS]),
  aggregates: Object.freeze([...SUPPORTED_AGGREGATES]),
  timeUnits: Object.freeze([...SUPPORTED_TIME_UNITS]),
  stackModes: Object.freeze([...SUPPORTED_STACKS]),
  orientations: Object.freeze([...SUPPORTED_ORIENTATIONS]),
  legendModes: Object.freeze([...SUPPORTED_LEGENDS]),
  binning: true,
  interactions: Object.freeze({ tooltip: true, zoom: true, select: true }),
  maxEncodings: 7
});

export function compileDataWizPlotlyPlan(chartPayload, chartData) {
  const state = normalizeChartPayload(chartPayload);
  if (!SUPPORTED_MARKS.includes(state.mark)) fail(`Plotly adapter does not compile mark ${state.mark}`, 'PLOTLY_MARK_UNSUPPORTED', { mark: state.mark }, TypeError);
  const materialized = normalizeChartData(chartData, state.mark);
  const groups = groupPoints(materialized.records, materialized.provenance, state);
  let data;
  switch (state.mark) {
    case 'bar': data = compileBar(groups, state); break;
    case 'line': case 'area': case 'point': case 'scatter': data = compileScatterLike(groups, state); break;
    case 'box': data = compileBox(groups, state); break;
    case 'histogram': data = compileHistogram(materialized, state); break;
    case 'radar': data = compileRadar(groups, state); break;
    default: fail(`Plotly adapter does not compile mark ${state.mark}`, 'PLOTLY_MARK_UNSUPPORTED', { mark: state.mark }, TypeError);
  }
  return cloneSafe({
    data,
    layout: buildLayout(state, data.length),
    config: buildConfig(state),
    meta: {
      adapterId: DATA_WIZ_PLOTLY_ADAPTER_ID,
      runtimeBundled: false,
      materializedType: materialized.type,
      materializedMode: materialized.mode
    }
  });
}

export function createDataWizPlotlyAdapter() {
  return new DataWizRendererAdapter({
    descriptor: {
      id: DATA_WIZ_PLOTLY_ADAPTER_ID,
      label: 'Plotly.js',
      version: String(DATA_WIZ_PLOTLY_ADAPTER_VERSION),
      metadata: { runtimeBundled: false, planShape: 'data-layout-config', targetApi: 'plotly.js-3.x' }
    },
    capabilities: cloneSafe(DATA_WIZ_PLOTLY_CAPABILITIES)
  }, {
    compiler: ({ chart, context }) => compileDataWizPlotlyPlan(chart, context?.chartData)
  });
}
