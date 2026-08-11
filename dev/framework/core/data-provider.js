function normalizeOptions(options) {
  if (options == null) return {};
  if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  return { ...options };
}

function nonEmptyString(value, label, code) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new DataProviderError(`${label} must be a non-empty string`, code, { value });
  }
  return value.trim();
}

export class DataProviderError extends Error {
  constructor(message, code = 'DATA_PROVIDER_ERROR', details = null) {
    super(message);
    this.name = 'DataProviderError';
    this.code = code;
    this.details = details;
  }
}

export class DataProvider {
  constructor(options = {}) {
    this.options = normalizeOptions(options);
  }

  get type() {
    return 'abstract';
  }

  get capabilities() {
    return {
      read: true,
      write: false,
      delete: false,
      query: false,
      transactions: false
    };
  }

  supports(capability) {
    if (typeof capability !== 'string' || !capability.trim()) return false;
    return Boolean(this.capabilities?.[capability.trim()]);
  }

  async init() {
    return this;
  }

  async listCollections() {
    throw new DataProviderError('listCollections() must be implemented', 'NOT_IMPLEMENTED', {
      operation: 'listCollections'
    });
  }

  async getCollection(_collectionName) {
    throw new DataProviderError('getCollection() must be implemented', 'NOT_IMPLEMENTED', {
      operation: 'getCollection'
    });
  }

  async getRecord(collectionName, id, options = {}) {
    const collection = nonEmptyString(collectionName, 'collectionName', 'INVALID_COLLECTION_NAME');
    const normalizedOptions = normalizeOptions(options);
    const idField = nonEmptyString(normalizedOptions.idField ?? 'id', 'idField', 'INVALID_ID_FIELD');
    const records = await this.getCollection(collection, normalizedOptions);

    if (records == null || typeof records === 'string' || typeof records[Symbol.iterator] !== 'function') {
      throw new DataProviderError(
        `Collection ${collection} must be iterable`,
        'INVALID_COLLECTION_RESULT',
        { collectionName: collection, resultType: records == null ? String(records) : typeof records }
      );
    }

    for (const record of records) {
      if (record?.[idField] === id) return record;
    }
    return null;
  }

  async saveCollection(collectionName, _records, _options = {}) {
    throw new DataProviderError('Provider is read-only', 'READ_ONLY', {
      operation: 'saveCollection',
      collectionName
    });
  }

  async saveRecord(collectionName, _record, _options = {}) {
    throw new DataProviderError('Provider is read-only', 'READ_ONLY', {
      operation: 'saveRecord',
      collectionName
    });
  }

  async deleteRecord(collectionName, id, _options = {}) {
    throw new DataProviderError('Provider is read-only', 'READ_ONLY', {
      operation: 'deleteRecord',
      collectionName,
      id
    });
  }

  async close() {
    return this;
  }
}
