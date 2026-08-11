import { DataIndex } from './data-index.js';

export class DataValidatorError extends Error {
  constructor(message, code = 'DATA_VALIDATOR_ERROR', details = null) {
    super(message); this.name = 'DataValidatorError'; this.code = code; this.details = details;
  }
}

export class DataValidator {
  constructor({ provider, registry = null, dataIndex = null } = {}) {
    if (!provider) throw new DataValidatorError('provider is required', 'PROVIDER_REQUIRED');
    this.provider = provider;
    this.registry = registry ?? provider.registry ?? null;
    this.dataIndex = dataIndex ?? new DataIndex();
  }

  async init() {
    if (!this.registry) {
      if (typeof this.provider.init === 'function' && !this.provider.registry) await this.provider.init();
      this.registry = this.provider.registry ?? null;
    }
    if (!this.registry?.collections) throw new DataValidatorError('A registry with collections is required', 'REGISTRY_REQUIRED');
    return this;
  }

  validateRegistry() {
    this.#assertReady();
    const issues = [];
    for (const [name, definition] of Object.entries(this.registry.collections)) {
      if (!definition?.provider) issues.push(this.#issue('error', 'MISSING_PROVIDER', name, null, 'provider'));
      if (!definition?.source) issues.push(this.#issue('error', 'MISSING_SOURCE', name, null, 'source'));
      if (!definition?.idField) issues.push(this.#issue('error', 'MISSING_ID_FIELD', name, null, 'idField'));
      for (const relation of definition?.relations ?? []) {
        if (!this.registry.collections[relation.target]) issues.push(this.#issue('error', 'UNKNOWN_RELATION_TARGET', name, null, relation.field, { target: relation.target }));
      }
    }
    return this.#report('registry', null, issues, Object.keys(this.registry.collections).length);
  }

  async validateRecord(collectionName, record, { recordIndex = null } = {}) {
    this.#assertReady();
    const definition = this.#definition(collectionName);
    const issues = [];
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      issues.push(this.#issue('error', 'INVALID_RECORD', collectionName, recordIndex, null));
      return this.#report('record', collectionName, issues, 1);
    }

    const requiredFields = new Set([definition.idField || 'id', ...(definition.requiredFields ?? [])]);
    for (const relation of definition.relations ?? []) if (relation.required) requiredFields.add(relation.field);
    for (const field of requiredFields) {
      const value = record[field];
      if (value === undefined || value === null || value === '') issues.push(this.#issue('error', 'MISSING_REQUIRED_FIELD', collectionName, recordIndex, field));
    }

    for (const relation of definition.relations ?? []) {
      const raw = record[relation.field];
      if (raw == null || raw === '') continue;
      const cardinality = relation.cardinality || 'one';
      if (cardinality === 'many' && !Array.isArray(raw)) {
        issues.push(this.#issue('error', 'INVALID_CARDINALITY', collectionName, recordIndex, relation.field, { expected: 'array' }));
        continue;
      }
      if (cardinality === 'one' && Array.isArray(raw)) {
        issues.push(this.#issue('error', 'INVALID_CARDINALITY', collectionName, recordIndex, relation.field, { expected: 'scalar' }));
        continue;
      }
      const values = cardinality === 'many' ? raw : [raw];
      const targetDefinition = this.#definition(relation.target);
      const targetField = relation.targetField || targetDefinition.idField || 'id';
      const index = await this.#index(relation.target, targetField);
      for (const value of values) {
        if (!index.has(value)) issues.push(this.#issue(relation.onMissing === 'error' ? 'error' : 'warning', 'REFERENCE_NOT_FOUND', collectionName, recordIndex, relation.field, { target: relation.target, targetField, value }));
      }
    }
    return this.#report('record', collectionName, issues, 1);
  }

  async validateCollection(collectionName) {
    this.#assertReady();
    const definition = this.#definition(collectionName);
    const records = await this.provider.getCollection(collectionName);
    const issues = [];
    const idField = definition.idField || 'id';
    const seen = new Map();
    for (let i = 0; i < records.length; i += 1) {
      const record = records[i];
      const result = await this.validateRecord(collectionName, record, { recordIndex: i });
      issues.push(...result.issues);
      const id = record?.[idField];
      if (id === undefined || id === null || id === '') continue;
      if (seen.has(id)) issues.push(this.#issue('error', 'DUPLICATE_ID', collectionName, i, idField, { value: id, firstIndex: seen.get(id) }));
      else seen.set(id, i);
    }
    return this.#report('collection', collectionName, issues, records.length);
  }

  async validateAll() {
    this.#assertReady();
    const registry = this.validateRegistry();
    const collections = {}; const issues = [...registry.issues]; let checked = 0;
    for (const name of Object.keys(this.registry.collections)) {
      const report = await this.validateCollection(name);
      collections[name] = report; issues.push(...report.issues); checked += report.checked;
    }
    return { ...this.#report('all', null, issues, checked), collections, registry };
  }

  clearIndexes(collectionName = null) { this.dataIndex.clear(collectionName); }

  async #index(collectionName, field) {
    const cached = this.dataIndex.get(collectionName, field);
    if (cached) return cached;
    return this.dataIndex.build(collectionName, await this.provider.getCollection(collectionName), field);
  }

  #definition(collectionName) {
    const definition = this.registry.collections[collectionName];
    if (!definition) throw new DataValidatorError(`Unknown collection: ${collectionName}`, 'UNKNOWN_COLLECTION', { collectionName });
    return definition;
  }

  #issue(level, code, collection, recordIndex, field, details = null) { return { level, code, collection, recordIndex, field, details }; }
  #report(scope, collection, issues, checked) {
    const errors = issues.filter((issue) => issue.level === 'error').length;
    const warnings = issues.filter((issue) => issue.level === 'warning').length;
    return { scope, collection, valid: errors === 0, checked, errors, warnings, issues };
  }
  #assertReady() { if (!this.registry?.collections) throw new DataValidatorError('Validator is not initialized', 'NOT_INITIALIZED'); }
}
