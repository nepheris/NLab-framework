export class DataResolverError extends Error {
  constructor(message, code = 'DATA_RESOLVER_ERROR', details = null) {
    super(message);
    this.name = 'DataResolverError';
    this.code = code;
    this.details = details;
  }
}

export class DataResolver {
  constructor({ provider, registry = null } = {}) {
    if (!provider) {
      throw new DataResolverError('provider is required', 'PROVIDER_REQUIRED');
    }

    this.provider = provider;
    this.registry = registry ?? provider.registry ?? null;
    this.indexes = new Map();
  }

  async init() {
    if (!this.registry) {
      if (typeof this.provider.init === 'function' && !this.provider.registry) {
        await this.provider.init();
      }
      this.registry = this.provider.registry ?? null;
    }

    if (!this.registry?.collections) {
      throw new DataResolverError(
        'A registry with collections is required',
        'REGISTRY_REQUIRED'
      );
    }

    return this;
  }

  clearIndexes(collectionName = null) {
    if (!collectionName) {
      this.indexes.clear();
      return;
    }

    for (const key of this.indexes.keys()) {
      if (key.startsWith(`${collectionName}:`)) {
        this.indexes.delete(key);
      }
    }
  }

  async getIndex(collectionName, field = null) {
    this.#assertReady();

    const definition = this.#getCollectionDefinition(collectionName);
    const indexField = field || definition.idField || 'id';
    const cacheKey = `${collectionName}:${indexField}`;

    if (this.indexes.has(cacheKey)) {
      return this.indexes.get(cacheKey);
    }

    const records = await this.provider.getCollection(collectionName);
    const index = new Map();

    for (const record of records) {
      const value = record?.[indexField];
      if (value === undefined || value === null) continue;

      if (index.has(value)) {
        throw new DataResolverError(
          `Duplicate index key ${String(value)} in ${collectionName}.${indexField}`,
          'DUPLICATE_INDEX_KEY',
          { collectionName, field: indexField, value }
        );
      }

      index.set(value, record);
    }

    this.indexes.set(cacheKey, index);
    return index;
  }

  async resolveRecord(collectionName, record) {
    this.#assertReady();

    const definition = this.#getCollectionDefinition(collectionName);
    const relations = definition.relations ?? [];
    const resolved = {};
    const issues = [];

    for (const relation of relations) {
      const result = await this.#resolveRelation(
        relation,
        record?.[relation.field]
      );
      resolved[relation.field] = result.value;
      issues.push(...result.issues);
    }

    return {
      data: record,
      resolved,
      issues
    };
  }

  async resolveCollection(collectionName) {
    const records = await this.provider.getCollection(collectionName);
    return Promise.all(
      records.map((record) => this.resolveRecord(collectionName, record))
    );
  }

  async #resolveRelation(relation, rawValue) {
    const cardinality = relation.cardinality || 'one';

    if (cardinality === 'many') {
      const values = rawValue == null ? [] : rawValue;

      if (!Array.isArray(values)) {
        throw new DataResolverError(
          `Relation ${relation.field} expects an array`,
          'INVALID_RELATION_VALUE',
          { relation, value: rawValue }
        );
      }

      const resolved = [];
      const issues = [];

      for (const value of values) {
        const result = await this.#resolveOne(relation, value);
        resolved.push(result.value);
        issues.push(...result.issues);
      }

      return { value: resolved, issues };
    }

    if (Array.isArray(rawValue)) {
      throw new DataResolverError(
        `Relation ${relation.field} expects a scalar`,
        'INVALID_RELATION_VALUE',
        { relation, value: rawValue }
      );
    }

    return this.#resolveOne(relation, rawValue);
  }

  async #resolveOne(relation, rawValue) {
    const missingSource =
      rawValue === undefined || rawValue === null || rawValue === '';

    if (missingSource) {
      if (relation.required) {
        return this.#handleMissing(
          relation,
          rawValue,
          'MISSING_REQUIRED_REFERENCE'
        );
      }
      return { value: null, issues: [] };
    }

    const targetDefinition = this.#getCollectionDefinition(relation.target);
    const targetField =
      relation.targetField || targetDefinition.idField || 'id';
    const index = await this.getIndex(relation.target, targetField);

    if (index.has(rawValue)) {
      return { value: index.get(rawValue), issues: [] };
    }

    return this.#handleMissing(
      relation,
      rawValue,
      'REFERENCE_NOT_FOUND'
    );
  }

  #handleMissing(relation, rawValue, code) {
    const policy = relation.onMissing || 'warn';
    const issue = {
      level: policy === 'error' ? 'error' : 'warning',
      code,
      field: relation.field,
      target: relation.target,
      value: rawValue
    };

    if (policy === 'error') {
      throw new DataResolverError(
        `Unable to resolve ${relation.field}: ${String(rawValue)}`,
        code,
        issue
      );
    }

    if (policy === 'keep') {
      return { value: rawValue, issues: [issue] };
    }

    if (policy === 'null') {
      return { value: null, issues: [] };
    }

    return { value: null, issues: [issue] };
  }

  #getCollectionDefinition(collectionName) {
    const definition = this.registry.collections[collectionName];

    if (!definition) {
      throw new DataResolverError(
        `Unknown collection: ${collectionName}`,
        'UNKNOWN_COLLECTION',
        { collectionName }
      );
    }

    return definition;
  }

  #assertReady() {
    if (!this.registry?.collections) {
      throw new DataResolverError(
        'Resolver is not initialized',
        'NOT_INITIALIZED'
      );
    }
  }
}
