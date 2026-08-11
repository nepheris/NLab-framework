export class DataIndexError extends Error {
  constructor(message, code = 'DATA_INDEX_ERROR', details = null) {
    super(message);
    this.name = 'DataIndexError';
    this.code = code;
    this.details = details;
  }
}

const token = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new DataIndexError(`${label} must be a non-empty string`, `INVALID_${label.toUpperCase()}`, { value });
  }
  return value.trim();
};

export class DataIndex {
  constructor() { this.indexes = new Map(); }

  build(collectionName, records, field = 'id') {
    const collection = token(collectionName, 'collection');
    const indexField = token(field, 'field');
    if (!Array.isArray(records)) {
      throw new DataIndexError('records must be an array', 'INVALID_RECORDS', { collection, field:indexField });
    }

    const key = this.#key(collection, indexField);
    const index = new Map();
    const firstIndexes = new Map();

    for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
      const record = records[recordIndex];
      const value = record?.[indexField];
      if (value === undefined || value === null || value === '') continue;
      if (index.has(value)) {
        throw new DataIndexError(
          `Duplicate index key ${String(value)} in ${collection}.${indexField}`,
          'DUPLICATE_INDEX_KEY',
          { collection, field:indexField, value, firstIndex:firstIndexes.get(value), recordIndex }
        );
      }
      index.set(value, record);
      firstIndexes.set(value, recordIndex);
    }

    // Publication atomique : une construction invalide ne remplace jamais l'index précédent.
    this.indexes.set(key, index);
    return index;
  }

  get(collectionName, field = 'id') {
    const collection = token(collectionName, 'collection');
    const indexField = token(field, 'field');
    return this.indexes.get(this.#key(collection, indexField)) ?? null;
  }

  has(collectionName, field = 'id') {
    const collection = token(collectionName, 'collection');
    const indexField = token(field, 'field');
    return this.indexes.has(this.#key(collection, indexField));
  }

  size(collectionName = null) {
    if (collectionName == null) return this.indexes.size;
    const collection = token(collectionName, 'collection');
    const prefix = `${collection}:`;
    let count = 0;
    for (const key of this.indexes.keys()) if (key.startsWith(prefix)) count += 1;
    return count;
  }

  clear(collectionName = null) {
    if (collectionName == null) { this.indexes.clear(); return this; }
    const collection = token(collectionName, 'collection');
    const prefix = `${collection}:`;
    for (const key of [...this.indexes.keys()]) {
      if (key.startsWith(prefix)) this.indexes.delete(key);
    }
    return this;
  }

  #key(collectionName, field) { return `${collectionName}:${field}`; }
}
