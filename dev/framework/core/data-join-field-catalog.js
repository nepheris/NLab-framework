const BAD_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const DEFAULTS = Object.freeze({ maxRows: 1000, maxDepth: 8, maxFields: 1000, maxExamples: 3 });
const SCALAR_TYPES = new Set(['string', 'number', 'boolean']);

function fail(message, code = 'DATA_JOIN_FIELD_CATALOG_ERROR', details = null, ErrorType = Error) {
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

function boundedInteger(value, fallback, name, { min = 0, max = 1000000 } = {}) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) {
    fail(`${name} must be a finite integer >= ${min}`, 'INVALID_CATALOG_LIMIT', { name, value }, RangeError);
  }
  return Math.min(max, Math.floor(number));
}

function escapePointerSegment(segment) {
  return String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
}

function pointerFor(segments) {
  return `/${segments.map(escapePointerSegment).join('/')}`;
}

function specPathFor(segments) {
  if (!segments.length) return null;
  if (segments.some((segment) => segment.length === 0 || segment.includes('.') || BAD_SEGMENTS.has(segment))) return null;
  return segments.join('.');
}

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const type = typeof value;
  if (type === 'number') return Number.isFinite(value) ? 'number' : 'non-finite-number';
  if (type === 'string' || type === 'boolean') return type;
  if (isPlainObject(value)) return 'object';
  if (type === 'undefined') return 'undefined';
  if (type === 'bigint') return 'bigint';
  if (type === 'symbol') return 'symbol';
  if (type === 'function') return 'function';
  return 'unsupported-object';
}

function distinctToken(value) {
  return JSON.stringify([typeof value, value]);
}

function copyScalar(value) {
  return value;
}

function warningKey(code, pointer = '', extra = '') {
  return `${code}\u0000${pointer}\u0000${extra}`;
}

function publicField(stat, sampledRows) {
  const types = [...stat.types].sort();
  const nonNullTypes = types.filter((type) => type !== 'null');
  const type = nonNullTypes.length === 0
    ? (types.includes('null') ? 'null' : 'unknown')
    : nonNullTypes.length === 1
      ? nonNullTypes[0]
      : 'mixed';
  const scalarCompatible = nonNullTypes.length > 0 && nonNullTypes.every((entry) => SCALAR_TYPES.has(entry));
  const joinable = Boolean(stat.specPath) && scalarCompatible && stat.scalarCount > 0;
  return {
    name: stat.name,
    segments: [...stat.segments],
    pointer: stat.pointer,
    specPath: stat.specPath,
    depth: stat.depth,
    type,
    types,
    present: stat.present,
    missing: Math.max(0, sampledRows - stat.present),
    nulls: stat.nulls,
    distinct: stat.distinct.size,
    examples: stat.examples.map(copyScalar),
    joinable
  };
}

function treeFromFields(fields) {
  const byPointer = new Map();
  const roots = [];
  for (const field of fields) {
    const node = { ...field, segments: [...field.segments], examples: [...field.examples], types: [...field.types], children: [] };
    byPointer.set(field.pointer, node);
    if (field.segments.length === 1) {
      roots.push(node);
      continue;
    }
    const parentPointer = pointerFor(field.segments.slice(0, -1));
    const parent = byPointer.get(parentPointer);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => a.pointer.localeCompare(b.pointer));
    for (const node of nodes) sortNodes(node.children);
  };
  sortNodes(roots);
  return roots;
}

export class DataJoinFieldCatalog {
  constructor(options = {}) {
    if (options === null || typeof options !== 'object' || Array.isArray(options)) {
      fail('Catalog options must be an object', 'INVALID_CATALOG_OPTIONS', null, TypeError);
    }
    this.options = {
      maxRows: boundedInteger(options.maxRows, DEFAULTS.maxRows, 'maxRows', { min: 0 }),
      maxDepth: boundedInteger(options.maxDepth, DEFAULTS.maxDepth, 'maxDepth', { min: 1, max: 64 }),
      maxFields: boundedInteger(options.maxFields, DEFAULTS.maxFields, 'maxFields', { min: 1 }),
      maxExamples: boundedInteger(options.maxExamples, DEFAULTS.maxExamples, 'maxExamples', { min: 0, max: 100 })
    };
  }

  build(rows = []) {
    if (!Array.isArray(rows)) fail('Catalog input must be an array of records', 'INVALID_CATALOG_ROWS', null, TypeError);
    const sampled = rows.slice(0, this.options.maxRows);
    const stats = new Map();
    const warnings = new Map();
    let objectRows = 0;
    let nonObjectRows = 0;
    let fieldLimitReached = false;

    const warn = (code, message, pointer = '', details = {}, extra = '') => {
      const key = warningKey(code, pointer, extra);
      if (!warnings.has(key)) warnings.set(key, { code, level: 'warning', message, pointer: pointer || null, details });
    };

    const ensureField = (segments) => {
      const pointer = pointerFor(segments);
      let stat = stats.get(pointer);
      if (stat) return stat;
      if (stats.size >= this.options.maxFields) {
        if (!fieldLimitReached) {
          fieldLimitReached = true;
          warn('FIELD_LIMIT_REACHED', `Field discovery stopped at ${this.options.maxFields} fields`, '', { maxFields: this.options.maxFields });
        }
        return null;
      }
      const name = segments.at(-1);
      const specPath = specPathFor(segments);
      stat = {
        name,
        segments: [...segments],
        pointer,
        specPath,
        depth: segments.length,
        present: 0,
        nulls: 0,
        scalarCount: 0,
        types: new Set(),
        distinct: new Set(),
        examples: []
      };
      stats.set(pointer, stat);
      if (!specPath) {
        warn('UNADDRESSABLE_JOIN_PATH', 'Field is visible by JSON Pointer but cannot be addressed by DataJoinSpec V1 dot paths', pointer, {
          segments: [...segments]
        });
      }
      return stat;
    };

    const observe = (value, segments, stack) => {
      const pointer = pointerFor(segments);
      const stat = ensureField(segments);
      if (!stat) return;
      stat.present += 1;
      const type = valueType(value);
      stat.types.add(type);
      if (type === 'null') {
        stat.nulls += 1;
        return;
      }
      if (SCALAR_TYPES.has(type)) {
        stat.scalarCount += 1;
        const token = distinctToken(value);
        stat.distinct.add(token);
        if (stat.examples.length < this.options.maxExamples && !stat.examples.some((entry) => distinctToken(entry) === token)) {
          stat.examples.push(copyScalar(value));
        }
        return;
      }
      if (type === 'non-finite-number') {
        warn('NON_FINITE_VALUE', 'Non-finite numeric value cannot be used as a join key', pointer, {});
        return;
      }
      if (type === 'array') return;
      if (type !== 'object') {
        warn('UNSUPPORTED_FIELD_VALUE', `Observed ${type}; field is not joinable`, pointer, { type }, type);
        return;
      }
      if (segments.length >= this.options.maxDepth) {
        warn('DEPTH_LIMIT_REACHED', `Nested field discovery stopped at depth ${this.options.maxDepth}`, pointer, { maxDepth: this.options.maxDepth });
        return;
      }
      if (stack.has(value)) {
        warn('CYCLIC_VALUE_SKIPPED', 'Cyclic object value was not traversed', pointer, {});
        return;
      }
      stack.add(value);
      try {
        for (const key of Object.keys(value).sort()) {
          if (BAD_SEGMENTS.has(key)) {
            warn('UNSAFE_FIELD_SKIPPED', `Unsafe field segment ${key} was skipped`, `${pointer}/${escapePointerSegment(key)}`, { key });
            continue;
          }
          observe(value[key], [...segments, key], stack);
        }
      } finally {
        stack.delete(value);
      }
    };

    sampled.forEach((row, rowIndex) => {
      if (!isPlainObject(row)) {
        nonObjectRows += 1;
        return;
      }
      objectRows += 1;
      const stack = new WeakSet([row]);
      for (const key of Object.keys(row).sort()) {
        if (BAD_SEGMENTS.has(key)) {
          warn('UNSAFE_FIELD_SKIPPED', `Unsafe field segment ${key} was skipped`, `/${escapePointerSegment(key)}`, { key });
          continue;
        }
        observe(row[key], [key], stack);
      }
      void rowIndex;
    });

    if (nonObjectRows > 0) {
      warn('NON_OBJECT_ROWS', `${nonObjectRows} sampled rows are not plain objects and were skipped`, '', { count: nonObjectRows });
    }
    if (rows.length > sampled.length) {
      warn('ROW_SAMPLE_LIMIT', `Only ${sampled.length} of ${rows.length} rows were profiled`, '', {
        totalRows: rows.length, sampledRows: sampled.length, maxRows: this.options.maxRows
      });
    }

    const fields = [...stats.values()]
      .map((stat) => publicField(stat, sampled.length))
      .sort((a, b) => a.pointer.localeCompare(b.pointer));

    return {
      rows: {
        total: rows.length,
        sampled: sampled.length,
        objectRows,
        nonObjectRows
      },
      limits: { ...this.options },
      fields,
      tree: treeFromFields(fields),
      warnings: [...warnings.values()].sort((a, b) => `${a.code}\u0000${a.pointer ?? ''}`.localeCompare(`${b.code}\u0000${b.pointer ?? ''}`))
    };
  }
}

export function buildDataJoinFieldCatalog(rows = [], options = {}) {
  return new DataJoinFieldCatalog(options).build(rows);
}
