import { DataIndex } from './data-index.js';

export class DataResolverError extends Error {
  constructor(message, code = 'DATA_RESOLVER_ERROR', details = null) {
    super(message); this.name = 'DataResolverError'; this.code = code; this.details = details;
  }
}

export class DataResolver {
  constructor({ provider, registry = null, dataIndex = null } = {}) {
    if (!provider) throw new DataResolverError('provider is required', 'PROVIDER_REQUIRED');
    this.provider = provider;
    this.registry = registry ?? provider.registry ?? null;
    this.dataIndex = dataIndex ?? new DataIndex();
  }

  async init() {
    if (!this.registry) {
      if (typeof this.provider.init === 'function' && !this.provider.registry) await this.provider.init();
      this.registry = this.provider.registry ?? null;
    }
    if (!this.registry?.collections) throw new DataResolverError('A registry with collections is required', 'REGISTRY_REQUIRED');
    return this;
  }

  clearIndexes(collectionName = null) { this.dataIndex.clear(collectionName); }

  async getIndex(collectionName, field = null) {
    this.#assertReady();
    const definition = this.#definition(collectionName);
    const indexField = field || definition.idField || 'id';
    const cached = this.dataIndex.get(collectionName, indexField);
    if (cached) return cached;
    return this.dataIndex.build(collectionName, await this.provider.getCollection(collectionName), indexField);
  }

  async resolveRecord(collectionName, record) {
    this.#assertReady();
    const definition = this.#definition(collectionName);
    const resolved = {};
    const issues = [];
    for (const relation of definition.relations ?? []) {
      const result = await this.#resolveRelation(relation, record?.[relation.field]);
      resolved[relation.field] = result.value;
      issues.push(...result.issues);
    }
    return { data: record, resolved, issues };
  }

  async resolveCollection(collectionName) {
    const records = await this.provider.getCollection(collectionName);
    return Promise.all(records.map((record) => this.resolveRecord(collectionName, record)));
  }

  async #resolveRelation(relation, rawValue) {
    const cardinality = relation.cardinality || 'one';
    if (cardinality === 'many') {
      const values = rawValue == null ? [] : rawValue;
      if (!Array.isArray(values)) throw new DataResolverError(`Relation ${relation.field} expects an array`, 'INVALID_RELATION_VALUE', { relation, value: rawValue });
      const value = []; const issues = [];
      for (const item of values) { const result = await this.#resolveOne(relation, item); value.push(result.value); issues.push(...result.issues); }
      return { value, issues };
    }
    if (Array.isArray(rawValue)) throw new DataResolverError(`Relation ${relation.field} expects a scalar`, 'INVALID_RELATION_VALUE', { relation, value: rawValue });
    return this.#resolveOne(relation, rawValue);
  }

  async #resolveOne(relation, rawValue) {
    const missing = rawValue === undefined || rawValue === null || rawValue === '';
    if (missing) return relation.required ? this.#missing(relation, rawValue, 'MISSING_REQUIRED_REFERENCE') : { value: null, issues: [] };
    const targetDefinition = this.#definition(relation.target);
    const targetField = relation.targetField || targetDefinition.idField || 'id';
    const index = await this.getIndex(relation.target, targetField);
    return index.has(rawValue) ? { value: index.get(rawValue), issues: [] } : this.#missing(relation, rawValue, 'REFERENCE_NOT_FOUND');
  }

  #missing(relation, rawValue, code) {
    const policy = relation.onMissing || 'warn';
    const issue = { level: policy === 'error' ? 'error' : 'warning', code, field: relation.field, target: relation.target, value: rawValue };
    if (policy === 'error') throw new DataResolverError(`Unable to resolve ${relation.field}: ${String(rawValue)}`, code, issue);
    if (policy === 'keep') return { value: rawValue, issues: [issue] };
    if (policy === 'null') return { value: null, issues: [] };
    return { value: null, issues: [issue] };
  }

  #definition(collectionName) {
    const definition = this.registry.collections[collectionName];
    if (!definition) throw new DataResolverError(`Unknown collection: ${collectionName}`, 'UNKNOWN_COLLECTION', { collectionName });
    return definition;
  }

  #assertReady() { if (!this.registry?.collections) throw new DataResolverError('Resolver is not initialized', 'NOT_INITIALIZED'); }
}
