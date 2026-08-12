const BAD_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_BINS = 200;

function itemsArray(items) {
  return Array.isArray(items) ? items : [];
}

function pathParts(path) {
  const parts = Array.isArray(path)
    ? path.map(String)
    : String(path ?? '').split('.').filter(Boolean);
  if (parts.some((part) => BAD_PATH_SEGMENTS.has(part))) {
    const error = new TypeError(`Unsafe data path: ${parts.join('.')}`);
    error.code = 'UNSAFE_PATH';
    throw error;
  }
  return parts;
}

function readPath(item, path) {
  let value = item;
  for (const part of pathParts(path)) value = value?.[part];
  return value;
}

function missing(value) {
  return value === undefined || value === null || value === '';
}

function numericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizeFields(items, fields) {
  if (Array.isArray(fields) && fields.length) return [...new Set(fields.map(String))];
  const discovered = new Set();
  for (const item of items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    for (const key of Object.keys(item)) discovered.add(key);
  }
  return [...discovered];
}

function normalizeBins(value) {
  const bins = Number(value);
  if (!Number.isFinite(bins)) return 10;
  return Math.min(MAX_BINS, Math.max(1, Math.trunc(bins)));
}

function groupIdentity(value) {
  if (value === null || value === undefined || value === '') return { key: 'empty', value: '(vide)' };
  const type = valueType(value);
  if (type === 'object' || type === 'array') {
    let serialized;
    try { serialized = JSON.stringify(value); }
    catch { serialized = String(value); }
    return { key: `${type}:${serialized}`, value: serialized };
  }
  return { key: `${type}:${String(value)}`, value };
}

export class DataWiz {
  describe(items = [], fields = null) {
    const rows = itemsArray(items);
    const selected = normalizeFields(rows, fields);
    const result = {};

    for (const field of selected) {
      const values = rows.map((item) => readPath(item, field)).filter((value) => !missing(value));
      const numeric = values.map(numericValue).filter((value) => value !== null);
      const counts = new Map();
      const types = {};

      values.forEach((value, index) => {
        const id = groupIdentity(value);
        const current = counts.get(id.key) ?? { value: id.value, count: 0, firstIndex: index };
        current.count += 1;
        counts.set(id.key, current);
        const type = valueType(value);
        types[type] = (types[type] ?? 0) + 1;
      });

      const sum = numeric.reduce((total, value) => total + value, 0);
      result[field] = {
        count: values.length,
        missing: rows.length - values.length,
        unique: counts.size,
        top: [...counts.values()]
          .sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex)
          .slice(0, 5)
          .map(({ value, count }) => ({ value, count })),
        types,
        numeric: numeric.length ? {
          count: numeric.length,
          min: Math.min(...numeric),
          max: Math.max(...numeric),
          mean: sum / numeric.length,
          median: median(numeric),
          sum
        } : null
      };
    }

    return { rows: rows.length, fields: result };
  }

  groupBy(items = [], field, { emptyLabel = '(vide)', sort = 'input' } = {}) {
    const rows = itemsArray(items);
    const groups = new Map();

    for (const item of rows) {
      const raw = readPath(item, field);
      const values = Array.isArray(raw) ? raw : [raw];
      for (const value of values.length ? values : [undefined]) {
        const identity = groupIdentity(value);
        const key = identity.key === 'empty' ? `empty:${emptyLabel}` : identity.key;
        const shown = identity.key === 'empty' ? emptyLabel : identity.value;
        const bucket = groups.get(key) ?? { value: shown, rows: [], firstIndex: groups.size };
        bucket.rows.push(item);
        groups.set(key, bucket);
      }
    }

    const output = [...groups.values()].map(({ value, rows: groupedRows }) => ({
      value,
      count: groupedRows.length,
      rows: groupedRows
    }));

    if (sort === 'asc' || sort === 'desc') {
      const direction = sort === 'asc' ? 1 : -1;
      output.sort((a, b) => direction * String(a.value).localeCompare(String(b.value), undefined, { numeric: true }));
    }
    return output;
  }

  histogram(items = [], field, { bins = 10, min = null, max = null } = {}) {
    const values = itemsArray(items)
      .map((item) => numericValue(readPath(item, field)))
      .filter((value) => value !== null);
    if (!values.length) return [];

    const binCount = normalizeBins(bins);
    const observedMin = Math.min(...values);
    const observedMax = Math.max(...values);
    const domainMin = numericValue(min) ?? observedMin;
    const domainMax = numericValue(max) ?? observedMax;
    if (domainMax < domainMin) {
      const error = new RangeError('histogram max must be greater than or equal to min');
      error.code = 'INVALID_HISTOGRAM_DOMAIN';
      throw error;
    }

    if (domainMax === domainMin) {
      return [{ min: domainMin, max: domainMax, count: values.filter((value) => value === domainMin).length }];
    }

    const width = (domainMax - domainMin) / binCount;
    const histogram = Array.from({ length: binCount }, (_, index) => ({
      min: domainMin + index * width,
      max: index === binCount - 1 ? domainMax : domainMin + (index + 1) * width,
      count: 0
    }));

    for (const value of values) {
      if (value < domainMin || value > domainMax) continue;
      const index = value === domainMax
        ? binCount - 1
        : Math.min(binCount - 1, Math.floor((value - domainMin) / width));
      histogram[index].count += 1;
    }
    return histogram;
  }
}
