import { DataProvider, DataProviderError } from '../core/data-provider.js';

export class JsonDataProvider extends DataProvider {
  constructor(options = {}) {
    super(options);
    this.registry = options.registry ?? null;
    this.registryUrl = options.registryUrl ?? null;
    this.baseUrl = options.baseUrl ?? '';
    this.fetchFn = options.fetchFn ?? globalThis.fetch?.bind(globalThis);
    this.cacheEnabled = options.cache !== false;
    this.cache = new Map();
  }

  get type() {
    return 'json-static';
  }

  async init() {
    if (!this.fetchFn) {
      throw new DataProviderError('No fetch implementation available', 'FETCH_UNAVAILABLE');
    }

    if (!this.registry && !this.registryUrl) {
      throw new DataProviderError('registry or registryUrl is required', 'REGISTRY_REQUIRED');
    }

    if (!this.registry) {
      this.registry = await this.#loadJson(this.#resolveUrl(this.registryUrl));
    }

    if (!this.registry?.collections || typeof this.registry.collections !== 'object') {
      throw new DataProviderError(
        'Invalid data registry: collections object is required',
        'INVALID_REGISTRY'
      );
    }

    return this;
  }

  async listCollections() {
    this.#assertReady();
    return Object.keys(this.registry.collections);
  }

  async getCollection(collectionName, options = {}) {
    this.#assertReady();

    const definition = this.registry.collections[collectionName];
    if (!definition) {
      throw new DataProviderError(
        `Unknown collection: ${collectionName}`,
        'UNKNOWN_COLLECTION',
        { collectionName }
      );
    }

    if (this.cacheEnabled && !options.refresh && this.cache.has(collectionName)) {
      return this.cache.get(collectionName);
    }

    const payload = await this.#loadJson(this.#resolveUrl(definition.source));
    const records = Array.isArray(payload) ? payload : payload?.records;

    if (!Array.isArray(records)) {
      throw new DataProviderError(
        `Collection ${collectionName} must be an array or expose records[]`,
        'INVALID_COLLECTION',
        { collectionName }
      );
    }

    if (this.cacheEnabled) {
      this.cache.set(collectionName, records);
    }

    return records;
  }

  async getRecord(collectionName, id, options = {}) {
    const definition = this.registry?.collections?.[collectionName];
    const idField = options.idField || definition?.idField || 'id';
    return super.getRecord(collectionName, id, { ...options, idField });
  }

  clearCache(collectionName = null) {
    if (collectionName) {
      this.cache.delete(collectionName);
      return;
    }
    this.cache.clear();
  }

  async close() {
    this.clearCache();
  }

  #assertReady() {
    if (!this.registry) {
      throw new DataProviderError('Provider is not initialized', 'NOT_INITIALIZED');
    }
  }

  #resolveUrl(source) {
    if (!source) return source;

    try {
      return new URL(
        source,
        this.baseUrl || globalThis.location?.href || 'http://localhost/'
      ).toString();
    } catch {
      return source;
    }
  }

  async #loadJson(url) {
    const response = await this.fetchFn(url);

    if (!response?.ok) {
      throw new DataProviderError(
        `Unable to load JSON source: ${url}`,
        'LOAD_FAILED',
        { url, status: response?.status ?? null }
      );
    }

    try {
      return await response.json();
    } catch (error) {
      throw new DataProviderError(
        `Invalid JSON source: ${url}`,
        'INVALID_JSON',
        { url, cause: error?.message ?? String(error) }
      );
    }
  }
}
