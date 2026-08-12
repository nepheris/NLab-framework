import { DataWizChartSpec } from './data-wiz-chart-spec.js';

const TYPE = 'nlab.data-wiz-chart-recommendations';
const VERSION = 1;
const DEFAULT_MAX_RECOMMENDATIONS = 12;
const DEFAULT_MAX_FIELDS_PER_ROLE = 5;
const MAX_RECOMMENDATIONS = 50;
const MAX_FIELDS_PER_ROLE = 20;
const SOURCE_KINDS = new Set(['dataset', 'collection', 'resultset', 'derived', 'unknown']);
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function fail(message, code = 'CHART_RECOMMENDER_ERROR', details = null, ErrorType = Error) {
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
    if (!Number.isFinite(value)) fail('Recommendation values must use finite numbers', 'NON_FINITE_RECOMMENDATION_VALUE', null, TypeError);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail('Cyclic recommendation values are not supported', 'CYCLIC_RECOMMENDATION_VALUE', null, TypeError);
    seen.add(value);
    try { return value.map((entry) => cloneSafe(entry, seen)); }
    finally { seen.delete(value); }
  }
  if (!isPlainObject(value)) fail('Recommendation values must be JSON-like', 'UNSUPPORTED_RECOMMENDATION_VALUE', null, TypeError);
  if (seen.has(value)) fail('Cyclic recommendation values are not supported', 'CYCLIC_RECOMMENDATION_VALUE', null, TypeError);
  seen.add(value);
  try {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) fail(`Unsafe recommendation key: ${key}`, 'UNSAFE_RECOMMENDATION_KEY', { key }, TypeError);
      Object.defineProperty(output, key, { value: cloneSafe(entry, seen), enumerable: true, configurable: true, writable: true });
    }
    return output;
  } finally { seen.delete(value); }
}

function positiveInteger(value, fallback, label, max) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1 || number > max) fail(`${label} must be between 1 and ${max}`, 'INVALID_RECOMMENDER_LIMIT', { label, value, max }, RangeError);
  return Math.floor(number);
}

function normalizeOptions(value = {}) {
  if (!isPlainObject(value)) fail('Recommender options must be an object', 'INVALID_RECOMMENDER_OPTIONS', null, TypeError);
  const allowed = new Set(['maxRecommendations', 'maxFieldsPerRole', 'includeSecondary', 'source']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`Unknown recommender option ${key}`, 'UNKNOWN_RECOMMENDER_OPTION', { key }, TypeError);
  if (value.includeSecondary !== undefined && typeof value.includeSecondary !== 'boolean') fail('includeSecondary must be a boolean', 'INVALID_RECOMMENDER_BOOLEAN', { key: 'includeSecondary' }, TypeError);
  const source = value.source == null ? { id: '', label: '', kind: 'unknown' } : normalizeSource(value.source);
  return {
    maxRecommendations: positiveInteger(value.maxRecommendations, DEFAULT_MAX_RECOMMENDATIONS, 'maxRecommendations', MAX_RECOMMENDATIONS),
    maxFieldsPerRole: positiveInteger(value.maxFieldsPerRole, DEFAULT_MAX_FIELDS_PER_ROLE, 'maxFieldsPerRole', MAX_FIELDS_PER_ROLE),
    includeSecondary: value.includeSecondary === undefined ? true : value.includeSecondary,
    source
  };
}

function normalizeSource(value) {
  if (!isPlainObject(value)) fail('source must be an object', 'INVALID_RECOMMENDER_SOURCE', null, TypeError);
  const allowed = new Set(['id', 'label', 'kind']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) fail(`Unknown source key ${key}`, 'UNKNOWN_RECOMMENDER_SOURCE_KEY', { key }, TypeError);
  const kind = String(value.kind ?? 'unknown').trim();
  if (!SOURCE_KINDS.has(kind)) fail(`Invalid source kind ${kind}`, 'INVALID_RECOMMENDER_SOURCE_KIND', { kind }, TypeError);
  const id = String(value.id ?? '').trim();
  return { id, label: String(value.label ?? id).trim(), kind };
}

function profileSnapshot(profile) {
  let snapshot;
  if (profile && typeof profile.snapshot === 'function') snapshot = profile.snapshot();
  else if (isPlainObject(profile) && profile.type === 'nlab.data-wiz-dataset-profile' && profile.version === 1) snapshot = profile.profile;
  else snapshot = profile;
  if (!isPlainObject(snapshot) || !Array.isArray(snapshot.fields) || !isPlainObject(snapshot.dataset)) {
    fail('recommend() requires a DataWizDatasetProfile-compatible instance, payload or snapshot', 'INVALID_RECOMMENDER_PROFILE', null, TypeError);
  }
  return cloneSafe(snapshot);
}

function profileAdapter(profile) {
  const snapshot = profileSnapshot(profile);
  const byPath = new Map();
  for (const field of snapshot.fields) {
    if (!isPlainObject(field) || typeof field.pointer !== 'string') continue;
    if (typeof field.specPath === 'string' && field.specPath) byPath.set(field.specPath, field);
    byPath.set(field.pointer, field);
  }
  return {
    snapshot,
    field: (path) => {
      const found = byPath.get(String(path ?? ''));
      return found ? cloneSafe(found) : null;
    }
  };
}

function fieldPath(field) { return field.specPath || field.pointer; }

function eligibleFields(snapshot) {
  const fields = snapshot.fields.filter((field) => isPlainObject(field) && field.addressable !== false && typeof field.specPath === 'string' && field.specPath);
  const numeric = fields.filter((field) => ['number', 'integer'].includes(field.dataType) && field.role !== 'identifier');
  const temporal = fields.filter((field) => ['date', 'datetime'].includes(field.dataType) || field.role === 'time');
  const categorical = fields.filter((field) => field.role === 'dimension' || field.role === 'label' || ['string', 'boolean'].includes(field.dataType))
    .filter((field) => field.role !== 'time' && field.role !== 'identifier');
  return { fields, numeric, temporal, categorical };
}

function warning(code, message, details = {}) { return { code, message, details: cloneSafe(details) }; }

function fieldQuality(field, snapshot, role) {
  const denominator = Math.max(1, Number(snapshot.dataset.objectRows ?? snapshot.dataset.sampledRows ?? snapshot.dataset.rows ?? 1));
  const count = Number(field.count ?? 0);
  const completeness = Math.max(0, Math.min(1, count / denominator));
  const cardinality = Math.max(0, Math.min(1, Number(field.cardinality ?? 0)));
  let score = completeness * 10;
  const warnings = [];
  if (Array.isArray(field.warnings)) {
    if (field.warnings.includes('MIXED_TYPES')) { score -= 15; warnings.push(warning('MIXED_TYPES', `${fieldPath(field)} contains mixed types`, { field: fieldPath(field) })); }
    if (field.warnings.includes('NON_FINITE_VALUES')) { score -= 20; warnings.push(warning('NON_FINITE_VALUES', `${fieldPath(field)} contains non-finite values`, { field: fieldPath(field) })); }
    if (field.warnings.includes('DISTINCT_LIMIT_REACHED')) { score -= 3; warnings.push(warning('DISTINCT_LIMIT_REACHED', `${fieldPath(field)} cardinality is capped`, { field: fieldPath(field) })); }
  }
  if (role === 'categorical') {
    if (count >= 50 && cardinality > 0.8) { score -= 20; warnings.push(warning('HIGH_CARDINALITY_CATEGORY', `${fieldPath(field)} has high cardinality`, { field: fieldPath(field), cardinality })); }
    else if (cardinality > 0 && cardinality <= 0.25) score += 5;
    if (field.role === 'label') score += 2;
  }
  if (role === 'numeric') {
    if (field.role === 'measure') score += 5;
    if (Number(field.distinct ?? 0) <= 2) score -= 8;
  }
  if (role === 'temporal') {
    if (field.role === 'time') score += 5;
    if (field.dataType === 'datetime') score += 2;
  }
  return { score, warnings };
}

function stableHash(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36).padStart(7, '0');
}

function aggregateFor(field) {
  const name = `${field.specPath ?? ''} ${field.label ?? ''}`.toLowerCase();
  return /(amount|total|revenue|sales|quantity|qty|count|volume|distance)/.test(name) ? 'sum' : 'mean';
}

function sortFields(fields, snapshot, role, max) {
  return [...fields]
    .map((field) => ({ field, quality: fieldQuality(field, snapshot, role) }))
    .sort((a, b) => b.quality.score - a.quality.score || fieldPath(a.field).localeCompare(fieldPath(b.field)))
    .slice(0, max);
}

function proposal(rule, baseScore, reason, chartValue, fieldQualities, profile, source, extraWarnings = []) {
  const chart = new DataWizChartSpec({ ...chartValue, source });
  const validation = chart.validate({ type: 'nlab.data-wiz-dataset-profile', version: 1, profile: profile.snapshot });
  if (validation.gate === 'blocked') return null;
  const warnings = [...fieldQualities.flatMap((entry) => entry.warnings), ...extraWarnings];
  for (const item of validation.messages ?? []) {
    if (item.level === 'warning') warnings.push(warning(item.code, item.message, item.details ?? {}));
  }
  const score = Math.max(0, Math.min(100, Math.round(baseScore + fieldQualities.reduce((total, entry) => total + entry.score, 0) / Math.max(1, fieldQualities.length) - warnings.length * 2)));
  const signature = JSON.stringify({ rule, mark: chartValue.mark, encodings: chartValue.encodings });
  return {
    id: `chart-rec-${stableHash(signature)}`,
    rule,
    score,
    reason,
    warnings,
    chart: chart.toJSON(),
    validation: cloneSafe(validation)
  };
}

function addCandidate(list, candidate, seen) {
  if (!candidate) return;
  const signature = JSON.stringify(candidate.chart.chart);
  if (seen.has(signature)) return;
  seen.add(signature);
  list.push(candidate);
}

function buildCandidates(adapter, options) {
  const snapshot = adapter.snapshot;
  const roles = eligibleFields(snapshot);
  const numeric = sortFields(roles.numeric, snapshot, 'numeric', options.maxFieldsPerRole);
  const categorical = sortFields(roles.categorical, snapshot, 'categorical', options.maxFieldsPerRole);
  const temporal = sortFields(roles.temporal, snapshot, 'temporal', options.maxFieldsPerRole);
  const candidates = [];
  const seen = new Set();

  for (const number of numeric) {
    const field = fieldPath(number.field);
    addCandidate(candidates, proposal('numeric-distribution', 76, `Show the distribution of ${field} with a histogram.`, {
      mark: 'histogram', encodings: { x: { field, type: 'quantitative', bin: { maxBins: 20 } } }
    }, [number.quality], adapter, options.source), seen);
  }

  for (const category of categorical) {
    const field = fieldPath(category.field);
    addCandidate(candidates, proposal('categorical-frequency', 74, `Compare frequencies across ${field}.`, {
      mark: 'bar', encodings: { x: { field, type: 'nominal', sort: 'asc' }, y: { aggregate: 'count', type: 'quantitative' } }
    }, [category.quality], adapter, options.source), seen);
  }

  for (const time of temporal) for (const number of numeric) {
    const x = fieldPath(time.field); const y = fieldPath(number.field); const aggregate = aggregateFor(number.field);
    addCandidate(candidates, proposal('temporal-measure', 89, `Track ${aggregate}(${y}) over ${x}.`, {
      mark: 'line', encodings: { x: { field: x, type: 'temporal' }, y: { field: y, type: 'quantitative', aggregate } }
    }, [time.quality, number.quality], adapter, options.source), seen);
  }

  for (const category of categorical) for (const number of numeric) {
    const x = fieldPath(category.field); const y = fieldPath(number.field); const aggregate = aggregateFor(number.field);
    addCandidate(candidates, proposal('category-measure', 85, `Compare ${aggregate}(${y}) across ${x}.`, {
      mark: 'bar', encodings: { x: { field: x, type: 'nominal' }, y: { field: y, type: 'quantitative', aggregate } }
    }, [category.quality, number.quality], adapter, options.source), seen);
    addCandidate(candidates, proposal('category-distribution', 79, `Compare the distribution of ${y} across ${x}.`, {
      mark: 'box', encodings: { x: { field: x, type: 'nominal' }, y: { field: y, type: 'quantitative' } }
    }, [category.quality, number.quality], adapter, options.source), seen);
    if (options.includeSecondary && Number(category.field.distinct ?? Infinity) > 1 && Number(category.field.distinct ?? Infinity) <= 12) {
      addCandidate(candidates, proposal('category-radar-secondary', 58, `Secondary radar view of ${aggregate}(${y}) across the small category set ${x}.`, {
        mark: 'radar', encodings: { theta: { field: x, type: 'nominal' }, radius: { field: y, type: 'quantitative', aggregate } }
      }, [category.quality, number.quality], adapter, options.source, [warning('SECONDARY_VISUALIZATION', 'Radar is a secondary option; bar charts are usually easier to compare.', { mark: 'radar' })]), seen);
    }
  }

  for (let first = 0; first < numeric.length; first += 1) for (let second = first + 1; second < numeric.length; second += 1) {
    const x = fieldPath(numeric[first].field); const y = fieldPath(numeric[second].field);
    addCandidate(candidates, proposal('measure-pair', 83, `Inspect the relationship between ${x} and ${y}.`, {
      mark: 'scatter', encodings: { x: { field: x, type: 'quantitative' }, y: { field: y, type: 'quantitative' } }
    }, [numeric[first].quality, numeric[second].quality], adapter, options.source), seen);
  }

  if (!numeric.length) {
    for (const time of temporal) {
      const x = fieldPath(time.field);
      addCandidate(candidates, proposal('temporal-frequency', 72, `Track record frequency over ${x}.`, {
        mark: 'line', encodings: { x: { field: x, type: 'temporal' }, y: { aggregate: 'count', type: 'quantitative' } }
      }, [time.quality], adapter, options.source), seen);
    }
  }
  return candidates;
}

export const DATA_WIZ_CHART_RECOMMENDATIONS_TYPE = TYPE;
export const DATA_WIZ_CHART_RECOMMENDATIONS_VERSION = VERSION;

export class DataWizChartRecommender {
  recommend(profile, options = {}) {
    const normalized = normalizeOptions(options);
    const adapter = profileAdapter(profile);
    const candidates = buildCandidates(adapter, normalized)
      .sort((a, b) => b.score - a.score || a.rule.localeCompare(b.rule) || a.id.localeCompare(b.id))
      .slice(0, normalized.maxRecommendations)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
    return cloneSafe({
      type: TYPE,
      version: VERSION,
      generatedFrom: {
        rows: Number(adapter.snapshot.dataset.rows ?? 0),
        sampledRows: Number(adapter.snapshot.dataset.sampledRows ?? adapter.snapshot.dataset.rows ?? 0),
        fieldCount: adapter.snapshot.fields.length
      },
      autoApplied: false,
      recommendations: candidates
    });
  }

  explain(result) {
    if (!isPlainObject(result) || result.type !== TYPE || result.version !== VERSION || !Array.isArray(result.recommendations)) {
      fail('explain() requires a ChartRecommender result', 'INVALID_RECOMMENDATION_RESULT', null, TypeError);
    }
    return {
      count: result.recommendations.length,
      autoApplied: false,
      top: result.recommendations[0] ? {
        id: result.recommendations[0].id,
        rule: result.recommendations[0].rule,
        score: result.recommendations[0].score,
        reason: result.recommendations[0].reason
      } : null,
      rules: [...new Set(result.recommendations.map((entry) => entry.rule))]
    };
  }
}
