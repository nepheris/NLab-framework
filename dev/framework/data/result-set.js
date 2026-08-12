function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneContainer(value) {
  if (Array.isArray(value)) return [...value];
  if (isPlainObject(value)) return { ...value };
  return value;
}

function normalizeTotal(total, length) {
  if (total == null) return length;
  const value = Number(total);
  if (!Number.isInteger(value) || value < 0) throw new TypeError('total must be a non-negative integer');
  if (value < length) throw new RangeError('total cannot be smaller than items length');
  return value;
}

export class ResultSet {
  constructor(items = [], { total = null, query = null, filters = null, meta = {} } = {}) {
    if (items == null || typeof items[Symbol.iterator] !== 'function') {
      throw new TypeError('items must be iterable');
    }
    if (!isPlainObject(meta)) throw new TypeError('meta must be an object');

    this.items = [...items];
    this.total = normalizeTotal(total, this.items.length);
    this.query = query;
    this.filters = cloneContainer(filters);
    this.meta = { ...meta };
  }

  get length() { return this.items.length; }
  get isEmpty() { return this.items.length === 0; }
  get first() { return this.items[0]; }

  at(index) {
    return this.items.at(index);
  }

  map(fn) {
    if (typeof fn !== 'function') throw new TypeError('map callback must be a function');
    return new ResultSet(this.items.map(fn), this.#context());
  }

  slice(start, end) {
    return new ResultSet(this.items.slice(start, end), this.#context());
  }

  withMeta(meta) {
    if (!isPlainObject(meta)) throw new TypeError('meta must be an object');
    return new ResultSet(this.items, {
      ...this.#context(),
      meta: { ...this.meta, ...meta }
    });
  }

  toJSON() {
    return {
      items: [...this.items],
      total: this.total,
      query: this.query,
      filters: cloneContainer(this.filters),
      meta: { ...this.meta }
    };
  }

  [Symbol.iterator]() {
    return this.items[Symbol.iterator]();
  }

  #context() {
    return {
      total: this.total,
      query: this.query,
      filters: cloneContainer(this.filters),
      meta: { ...this.meta }
    };
  }
}
