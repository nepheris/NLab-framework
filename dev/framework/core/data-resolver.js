import { DataIndex } from './data-index.js';

export class DataResolverError extends Error {
  constructor(message, code = 'DATA_RESOLVER_ERROR', details = null) {
    super(message); this.name = 'DataResolverError'; this.code = code; this.details = details;
  }
}

const MISSING_POLICIES = new Set(['warn', 'error', 'keep', 'null']);
const CARDINALITIES = new Set(['one', 'many']);

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
    if (!this.registry?.collections || typeof this.registry.collections !== 'object' || Array.isArray(this.registry.collections)) {
      throw new DataResolverError('A registry with collections is required', 'REGISTRY_REQUIRED');
    }
    return this;
  }

  clearIndexes(collectionName = null) { this.dataIndex.clear(collectionName); return this; }

  async getIndex(collectionName, field = null) {
    this.#assertReady();
    const definition = this.#definition(collectionName);
    const indexField = field ?? definition.idField ?? 'id';
    const cached = this.dataIndex.get(collectionName, indexField);
    if (cached) return cached;
    return this.dataIndex.build(collectionName, await this.#records(collectionName), indexField);
  }

  async resolveRecord(collectionName, record) {
    this.#assertReady();
    const definition = this.#definition(collectionName);
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new DataResolverError('record must be an object', 'INVALID_RECORD', { collectionName, record });
    }
    const relations = definition.relations ?? [];
    if (!Array.isArray(relations)) {
      throw new DataResolverError(`Relations for ${collectionName} must be an array`, 'INVALID_RELATIONS', { collectionName, relations });
    }

    const resolved = {};
    const issues = [];
    for (const relation of relations) {
      this.#validateRelation(relation, collectionName);
      const result = await this.#resolveRelation(relation, record[relation.field]);
      resolved[relation.field] = result.value;
      issues.push(...result.issues);
    }
    return { data: record, resolved, issues };
  }

  async resolveCollection(collectionName) {
    this.#assertReady();
    this.#definition(collectionName);
    const records = await this.#records(collectionName);
    return Promise.all(records.map((record) => this.resolveRecord(collectionName, record)));
  }

  async #records(collectionName) {
    if (typeof this.provider.getCollection !== 'function') {
      throw new DataResolverError('provider.getCollection is required', 'GET_COLLECTION_REQUIRED', { collectionName });
    }
    const records = await this.provider.getCollection(collectionName);
    if (!Array.isArray(records)) {
      throw new DataResolverError(`Collection ${collectionName} must resolve to an array`, 'INVALID_COLLECTION_DATA', { collectionName, value:records });
    }
    return records;
  }

  #validateRelation(relation, collectionName) {
    if (!relation || typeof relation !== 'object' || Array.isArray(relation) || typeof relation.field !== 'string' || !relation.field || typeof relation.target !== 'string' || !relation.target) {
      throw new DataResolverError(`Invalid relation in ${collectionName}`, 'INVALID_RELATION', { collectionName, relation });
    }
    const cardinality = relation.cardinality ?? 'one';
    if (!CARDINALITIES.has(cardinality)) {
      throw new DataResolverError(`Invalid cardinality for ${relation.field}: ${String(cardinality)}`, 'INVALID_CARDINALITY', { collectionName, relation, cardinality });
    }
    const policy = relation.onMissing ?? 'warn';
    if (!MISSING_POLICIES.has(policy)) {
      throw new DataResolverError(`Invalid onMissing policy for ${relation.field}: ${String(policy)}`, 'INVALID_MISSING_POLICY', { collectionName, relation, policy });
    }
  }

  async #resolveRelation(relation, rawValue) {
    const cardinality = relation.cardinality ?? 'one';
    if (cardinality === 'many') {
      const values = rawValue == null ? [] : rawValue;
      if (!Array.isArray(values)) throw new DataResolverError(`Relation ${relation.field} expects an array`, 'INVALID_RELATION_VALUE', { relation, value: rawValue });
      const value = []; const issues = [];
      for (const item of values) {
        const result = await this.#resolveOne(relation, item);
        value.push(result.value); issues.push(...result.issues);
      }
      return { value, issues };
    }
    if (Array.isArray(rawValue)) throw new DataResolverError(`Relation ${relation.field} expects a scalar`, 'INVALID_RELATION_VALUE', { relation, value: rawValue });
    return this.#resolveOne(relation, rawValue);
  }

  async #resolveOne(relation, rawValue) {
    const missing = rawValue === undefined || rawValue === null || rawValue === '';
    if (missing) return relation.required ? this.#missing(relation, rawValue, 'MISSING_REQUIRED_REFERENCE') : { value: null, issues: [] };
    const targetDefinition = this.#definition(relation.target);
    const targetField = relation.targetField ?? targetDefinition.idField ?? 'id';
    const index = await this.getIndex(relation.target, targetField);
    return index.has(rawValue) ? { value: index.get(rawValue), issues: [] } : this.#missing(relation, rawValue, 'REFERENCE_NOT_FOUND');
  }

  #missing(relation, rawValue, code) {
    const policy = relation.onMissing ?? 'warn';
    const issue = { level: policy === 'error' ? 'error' : 'warning', code, field: relation.field, target: relation.target, value: rawValue };
    if (policy === 'error') throw new DataResolverError(`Unable to resolve ${relation.field}: ${String(rawValue)}`, code, issue);
    if (policy === 'keep') return { value: rawValue, issues: [issue] };
    if (policy === 'null') return { value: null, issues: [] };
    return { value: null, issues: [issue] };
  }

  #definition(collectionName) {
    if (typeof collectionName !== 'string' || !collectionName.trim()) {
      throw new DataResolverError('collectionName must be a non-empty string', 'INVALID_COLLECTION_NAME', { collectionName });
    }
    const name = collectionName.trim();
    const collections = this.registry.collections;
    if (!Object.hasOwn(collections, name)) {
      throw new DataResolverError(`Unknown collection: ${name}`, 'UNKNOWN_COLLECTION', { collectionName:name });
    }
    return collections[name];
  }

  #assertReady() {
    if (!this.registry?.collections || typeof this.registry.collections !== 'object' || Array.isArray(this.registry.collections)) {
      throw new DataResolverError('Resolver is not initialized', 'NOT_INITIALIZED');
    }
  }
}
