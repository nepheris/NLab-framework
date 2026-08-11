export class DataIndex {
  constructor() { this.indexes = new Map(); }

  build(collectionName, records, field = 'id') {
    const key = `${collectionName}:${field}`;
    const index = new Map();
    for (const record of records) {
      const value = record?.[field];
      if (value === undefined || value === null || value === '') continue;
      if (index.has(value)) {
        const error = new Error(`Duplicate index key ${String(value)} in ${collectionName}.${field}`);
        error.code = 'DUPLICATE_INDEX_KEY';
        throw error;
      }
      index.set(value, record);
    }
    this.indexes.set(key, index);
    return index;
  }

  get(collectionName, field = 'id') {
    return this.indexes.get(`${collectionName}:${field}`) ?? null;
  }

  clear(collectionName = null) {
    if (!collectionName) { this.indexes.clear(); return; }
    for (const key of [...this.indexes.keys()]) {
      if (key.startsWith(`${collectionName}:`)) this.indexes.delete(key);
    }
  }
}
