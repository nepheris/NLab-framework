import { DataIndex } from './data-index.js';

export class DataValidatorError extends Error {
  constructor(message, code = 'DATA_VALIDATOR_ERROR', details = null) {
    super(message);
    this.name = 'DataValidatorError';
    this.code = code;
    this.details = details;
  }
}

const CARDINALITIES = new Set(['one', 'many']);
const MISSING_POLICIES = new Set(['error', 'warn', 'keep', 'null']);
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const nonEmptyString = (value) => typeof value === 'string' && value.length > 0;

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
    if (!this.#hasCollections()) {
      throw new DataValidatorError('A registry with collections is required', 'REGISTRY_REQUIRED');
    }
    return this;
  }

  validateRegistry() {
    this.#assertReady();
    const issues = [];
    const providers = isObject(this.registry.providers) ? this.registry.providers : null;

    for (const [name, definition] of Object.entries(this.registry.collections)) {
      if (!isObject(definition)) {
        issues.push(this.#issue('error', 'INVALID_COLLECTION_DEFINITION', name, null, null));
        continue;
      }
      if (!nonEmptyString(definition.provider)) issues.push(this.#issue('error', 'MISSING_PROVIDER', name, null, 'provider'));
      else if (providers && !Object.hasOwn(providers, definition.provider)) {
        issues.push(this.#issue('error', 'UNKNOWN_PROVIDER', name, null, 'provider', { provider: definition.provider }));
      }
      if (!nonEmptyString(definition.source)) issues.push(this.#issue('error', 'MISSING_SOURCE', name, null, 'source'));
      if (!nonEmptyString(definition.idField)) issues.push(this.#issue('error', 'MISSING_ID_FIELD', name, null, 'idField'));

      if (definition.requiredFields != null && !Array.isArray(definition.requiredFields)) {
        issues.push(this.#issue('error', 'INVALID_REQUIRED_FIELDS', name, null, 'requiredFields'));
      }

      if (definition.relations != null && !Array.isArray(definition.relations)) {
        issues.push(this.#issue('error', 'INVALID_RELATIONS', name, null, 'relations'));
        continue;
      }

      for (const relation of definition.relations ?? []) {
        const relationIssues = this.#relationDefinitionIssues(name, relation);
        issues.push(...relationIssues);
        if (relationIssues.some((issue) => issue.code === 'INVALID_RELATION')) continue;
        if (!Object.hasOwn(this.registry.collections, relation.target)) {
          issues.push(this.#issue('error', 'UNKNOWN_RELATION_TARGET', name, null, relation.field, { target: relation.target }));
        }
      }
    }
    return this.#report('registry', null, issues, Object.keys(this.registry.collections).length);
  }

  async validateRecord(collectionName, record, { recordIndex = null } = {}) {
    this.#assertReady();
    const name = this.#collectionName(collectionName);
    const definition = this.#definition(name);
    const issues = [];

    if (!isObject(record)) {
      issues.push(this.#issue('error', 'INVALID_RECORD', name, recordIndex, null));
      return this.#report('record', name, issues, 1);
    }
    if (!isObject(definition)) {
      issues.push(this.#issue('error', 'INVALID_COLLECTION_DEFINITION', name, recordIndex, null));
      return this.#report('record', name, issues, 1);
    }

    const requiredFields = Array.isArray(definition.requiredFields) ? definition.requiredFields : [];
    if (definition.requiredFields != null && !Array.isArray(definition.requiredFields)) {
      issues.push(this.#issue('error', 'INVALID_REQUIRED_FIELDS', name, recordIndex, 'requiredFields'));
    }

    const relations = Array.isArray(definition.relations) ? definition.relations : [];
    if (definition.relations != null && !Array.isArray(definition.relations)) {
      issues.push(this.#issue('error', 'INVALID_RELATIONS', name, recordIndex, 'relations'));
    }

    const mandatory = new Set([nonEmptyString(definition.idField) ? definition.idField : 'id', ...requiredFields.filter(nonEmptyString)]);
    for (const relation of relations) {
      if (isObject(relation) && relation.required && nonEmptyString(relation.field)) mandatory.add(relation.field);
    }
    for (const field of mandatory) {
      const value = record[field];
      if (value === undefined || value === null || value === '') {
        issues.push(this.#issue('error', 'MISSING_REQUIRED_FIELD', name, recordIndex, field));
      }
    }

    for (const relation of relations) {
      const definitionIssues = this.#relationDefinitionIssues(name, relation, recordIndex);
      issues.push(...definitionIssues);
      if (definitionIssues.length) continue;

      const raw = record[relation.field];
      if (raw == null || raw === '') continue;
      const cardinality = relation.cardinality ?? 'one';
      if (cardinality === 'many' && !Array.isArray(raw)) {
        issues.push(this.#issue('error', 'INVALID_CARDINALITY', name, recordIndex, relation.field, { expected: 'array', actual: 'scalar' }));
        continue;
      }
      if (cardinality === 'one' && Array.isArray(raw)) {
        issues.push(this.#issue('error', 'INVALID_CARDINALITY', name, recordIndex, relation.field, { expected: 'scalar', actual: 'array' }));
        continue;
      }

      if (!Object.hasOwn(this.registry.collections, relation.target)) {
        issues.push(this.#issue('error', 'UNKNOWN_RELATION_TARGET', name, recordIndex, relation.field, { target: relation.target }));
        continue;
      }
      const targetDefinition = this.registry.collections[relation.target];
      if (!isObject(targetDefinition)) {
        issues.push(this.#issue('error', 'INVALID_RELATION_TARGET', name, recordIndex, relation.field, { target: relation.target }));
        continue;
      }

      const targetField = relation.targetField ?? targetDefinition.idField ?? 'id';
      if (!nonEmptyString(targetField)) {
        issues.push(this.#issue('error', 'INVALID_TARGET_FIELD', name, recordIndex, relation.field, { target: relation.target, targetField }));
        continue;
      }

      let index;
      try {
        index = await this.#index(relation.target, targetField);
      } catch (error) {
        if (error?.code === 'DUPLICATE_INDEX_KEY') {
          issues.push(this.#issue('error', 'DUPLICATE_TARGET_KEY', name, recordIndex, relation.field, { target: relation.target, targetField, ...error.details }));
          continue;
        }
        throw error;
      }

      const values = cardinality === 'many' ? raw : [raw];
      const policy = relation.onMissing ?? 'warn';
      for (const value of values) {
        if (!index.has(value)) {
          issues.push(this.#issue(policy === 'error' ? 'error' : 'warning', 'REFERENCE_NOT_FOUND', name, recordIndex, relation.field, { target: relation.target, targetField, value, policy }));
        }
      }
    }
    return this.#report('record', name, issues, 1);
  }

  async validateCollection(collectionName) {
    this.#assertReady();
    const name = this.#collectionName(collectionName);
    const definition = this.#definition(name);
    if (!isObject(definition)) {
      return this.#report('collection', name, [this.#issue('error', 'INVALID_COLLECTION_DEFINITION', name, null, null)], 0);
    }

    const records = await this.#records(name);
    const issues = [];
    const idField = nonEmptyString(definition.idField) ? definition.idField : 'id';
    const seen = new Map();
    for (let i = 0; i < records.length; i += 1) {
      const record = records[i];
      const result = await this.validateRecord(name, record, { recordIndex: i });
      issues.push(...result.issues);
      const id = isObject(record) ? record[idField] : undefined;
      if (id === undefined || id === null || id === '') continue;
      if (seen.has(id)) {
        issues.push(this.#issue('error', 'DUPLICATE_ID', name, i, idField, { value: id, firstIndex: seen.get(id) }));
      } else seen.set(id, i);
    }
    return this.#report('collection', name, issues, records.length);
  }

  async validateAll() {
    this.#assertReady();
    const registry = this.validateRegistry();
    const collections = {};
    const issues = [...registry.issues];
    let checked = 0;

    for (const name of Object.keys(this.registry.collections)) {
      try {
        const report = await this.validateCollection(name);
        collections[name] = report;
        issues.push(...report.issues);
        checked += report.checked;
      } catch (error) {
        if (!(error instanceof DataValidatorError)) throw error;
        const issue = this.#issue('error', error.code, name, null, null, error.details);
        const report = this.#report('collection', name, [issue], 0);
        collections[name] = report;
        issues.push(issue);
      }
    }
    return { ...this.#report('all', null, issues, checked), collections, registry };
  }

  clearIndexes(collectionName = null) { this.dataIndex.clear(collectionName); return this; }

  async #records(collectionName) {
    if (typeof this.provider.getCollection !== 'function') {
      throw new DataValidatorError('provider.getCollection is required', 'GET_COLLECTION_REQUIRED', { collectionName });
    }
    const records = await this.provider.getCollection(collectionName);
    if (!Array.isArray(records)) {
      throw new DataValidatorError(`Collection ${collectionName} must resolve to an array`, 'INVALID_COLLECTION_DATA', { collectionName, value: records });
    }
    return records;
  }

  async #index(collectionName, field) {
    const cached = this.dataIndex.get(collectionName, field);
    if (cached) return cached;
    return this.dataIndex.build(collectionName, await this.#records(collectionName), field);
  }

  #relationDefinitionIssues(collectionName, relation, recordIndex = null) {
    if (!isObject(relation) || !nonEmptyString(relation.field) || !nonEmptyString(relation.target)) {
      return [this.#issue('error', 'INVALID_RELATION', collectionName, recordIndex, relation?.field ?? null, { relation })];
    }
    const issues = [];
    const cardinality = relation.cardinality ?? 'one';
    if (!CARDINALITIES.has(cardinality)) {
      issues.push(this.#issue('error', 'INVALID_RELATION_CARDINALITY', collectionName, recordIndex, relation.field, { cardinality }));
    }
    const policy = relation.onMissing ?? 'warn';
    if (!MISSING_POLICIES.has(policy)) {
      issues.push(this.#issue('error', 'INVALID_MISSING_POLICY', collectionName, recordIndex, relation.field, { policy }));
    }
    if (relation.targetField != null && !nonEmptyString(relation.targetField)) {
      issues.push(this.#issue('error', 'INVALID_TARGET_FIELD', collectionName, recordIndex, relation.field, { targetField: relation.targetField }));
    }
    return issues;
  }

  #collectionName(collectionName) {
    if (typeof collectionName !== 'string' || !collectionName.trim()) {
      throw new DataValidatorError('collectionName must be a non-empty string', 'INVALID_COLLECTION_NAME', { collectionName });
    }
    return collectionName.trim();
  }

  #definition(collectionName) {
    if (!Object.hasOwn(this.registry.collections, collectionName)) {
      throw new DataValidatorError(`Unknown collection: ${collectionName}`, 'UNKNOWN_COLLECTION', { collectionName });
    }
    return this.registry.collections[collectionName];
  }

  #issue(level, code, collection, recordIndex, field, details = null) {
    return { level, code, collection, recordIndex, field, details };
  }

  #report(scope, collection, issues, checked) {
    const errors = issues.filter((issue) => issue.level === 'error').length;
    const warnings = issues.filter((issue) => issue.level === 'warning').length;
    return { scope, collection, valid: errors === 0, checked, errors, warnings, issues: [...issues] };
  }

  #hasCollections() {
    return isObject(this.registry) && isObject(this.registry.collections);
  }

  #assertReady() {
    if (!this.#hasCollections()) throw new DataValidatorError('Validator is not initialized', 'NOT_INITIALIZED');
  }
}
