export class ResultSet {
  constructor(items = [], { total = null, query = null, filters = null, meta = {} } = {}) {
    this.items = [...items];
    this.total = total ?? this.items.length;
    this.query = query;
    this.filters = filters;
    this.meta = { ...meta };
  }
  map(fn) { return new ResultSet(this.items.map(fn), { total:this.total, query:this.query, filters:this.filters, meta:this.meta }); }
  slice(start, end) { return new ResultSet(this.items.slice(start, end), { total:this.total, query:this.query, filters:this.filters, meta:this.meta }); }
  withMeta(meta) { return new ResultSet(this.items, { total:this.total, query:this.query, filters:this.filters, meta:{ ...this.meta, ...meta } }); }
}
