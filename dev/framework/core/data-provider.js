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
    this.options = options;
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

  async init() {}

  async listCollections() {
    throw new DataProviderError('listCollections() must be implemented', 'NOT_IMPLEMENTED');
  }

  async getCollection(_collectionName) {
    throw new DataProviderError('getCollection() must be implemented', 'NOT_IMPLEMENTED');
  }

  async getRecord(collectionName, id, options = {}) {
    const records = await this.getCollection(collectionName, options);
    const idField = options.idField || 'id';
    return records.find((record) => record?.[idField] === id) ?? null;
  }

  async saveCollection(_collectionName, _records, _options = {}) {
    throw new DataProviderError('Provider is read-only', 'READ_ONLY');
  }

  async saveRecord(_collectionName, _record, _options = {}) {
    throw new DataProviderError('Provider is read-only', 'READ_ONLY');
  }

  async deleteRecord(_collectionName, _id, _options = {}) {
    throw new DataProviderError('Provider is read-only', 'READ_ONLY');
  }

  async close() {}
}
