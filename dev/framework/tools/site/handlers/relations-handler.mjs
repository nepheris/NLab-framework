import { DataResolver } from '../../../core/data-resolver.js';

export class SiteGenerationRelationsHandlerError extends Error {
  constructor(message, code = 'SITE_GENERATION_RELATIONS_HANDLER_ERROR', details = {}) {
    super(message);
    this.name = 'SiteGenerationRelationsHandlerError';
    this.code = code;
    this.details = details;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeCollections(value) {
  if (value == null) return null;
  if (!Array.isArray(value)) {
    throw new SiteGenerationRelationsHandlerError('collections must be an array or null', 'INVALID_COLLECTIONS');
  }
  const seen = new Set();
  const names = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) {
      throw new SiteGenerationRelationsHandlerError('collection names must be non-empty strings', 'INVALID_COLLECTION_NAME', {
        value: item
      });
    }
    const name = item.trim();
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

function assertRegistry(registry) {
  if (!isObject(registry) || !isObject(registry.collections)) {
    throw new SiteGenerationRelationsHandlerError('registry.collections is required', 'REGISTRY_REQUIRED');
  }
}

function findLoadedSnapshot(inputs, artifacts) {
  const direct = inputs?.['data.loaded'];
  if (isObject(direct) && isObject(direct.collections)) return direct;
  const propagated = artifacts?.['data.loaded'];
  if (isObject(propagated) && isObject(propagated.collections)) return propagated;
  return null;
}

class LoadedSnapshotProvider {
  constructor(registry, snapshot) {
    this.registry = registry;
    this.snapshot = snapshot;
  }

  async init() {
    return this;
  }

  async listCollections() {
    return Object.keys(this.snapshot.collections);
  }

  async getCollection(collectionName) {
    if (!Object.prototype.hasOwnProperty.call(this.snapshot.collections, collectionName)) {
      throw new SiteGenerationRelationsHandlerError(
        `Collection ${collectionName} is absent from data.loaded`,
        'COLLECTION_NOT_LOADED',
        { collectionName }
      );
    }
    const records = this.snapshot.collections[collectionName];
    if (!Array.isArray(records)) {
      throw new SiteGenerationRelationsHandlerError(
        `Collection ${collectionName} in data.loaded must be an array`,
        'INVALID_LOADED_COLLECTION',
        { collectionName }
      );
    }
    return records;
  }
}

function normalizeIssue(issue, collection, recordIndex) {
  return {
    collection,
    record_index: recordIndex,
    level: issue?.level ?? 'warning',
    code: issue?.code ?? 'RELATION_ISSUE',
    field: issue?.field ?? null,
    target: issue?.target ?? null,
    value: issue?.value ?? null
  };
}

function failure(error, collection = null) {
  return {
    status: 'fail',
    outputs: {},
    warnings: [],
    details: {
      reason: 'relations_handler_error',
      collection,
      error: {
        name: error?.name ?? 'Error',
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        details: error?.details ?? null
      }
    }
  };
}

export function createRelationsStageHandler({
  registry,
  collections = null,
  failOnWarnings = false,
  resolverFactory = ({ provider, registry: registryValue }) => new DataResolver({
    provider,
    registry: registryValue
  })
} = {}) {
  assertRegistry(registry);
  const selectedCollections = normalizeCollections(collections);
  if (typeof resolverFactory !== 'function') {
    throw new SiteGenerationRelationsHandlerError('resolverFactory must be a function', 'INVALID_RESOLVER_FACTORY');
  }

  return async function relationsStageHandler({ stage, inputs = {}, artifacts = {} } = {}) {
    if (stage?.type && stage.type !== 'relations') {
      return {
        status: 'fail',
        outputs: {},
        warnings: [],
        details: {
          reason: 'unexpected_stage_type',
          expected: 'relations',
          actual: stage.type
        }
      };
    }

    const snapshot = findLoadedSnapshot(inputs, artifacts);
    if (!snapshot) {
      return {
        status: 'fail',
        outputs: {},
        warnings: [],
        details: { reason: 'data_loaded_artifact_required' }
      };
    }

    const names = selectedCollections ?? Object.keys(snapshot.collections);
    const provider = new LoadedSnapshotProvider(registry, snapshot);
    let resolver;
    try {
      resolver = resolverFactory({ provider, registry });
      if (!resolver || typeof resolver.init !== 'function' || typeof resolver.resolveCollection !== 'function') {
        throw new SiteGenerationRelationsHandlerError('resolverFactory returned an invalid resolver', 'INVALID_RESOLVER');
      }
      await resolver.init();
    } catch (error) {
      return failure(error);
    }

    const collectionsOutput = {};
    const recordCounts = {};
    const issues = [];
    let totalRecords = 0;

    for (const collectionName of names) {
      try {
        const resolvedRecords = await resolver.resolveCollection(collectionName);
        collectionsOutput[collectionName] = resolvedRecords;
        recordCounts[collectionName] = resolvedRecords.length;
        totalRecords += resolvedRecords.length;
        resolvedRecords.forEach((entry, index) => {
          for (const issue of entry?.issues ?? []) {
            issues.push(normalizeIssue(issue, collectionName, index));
          }
        });
      } catch (error) {
        return failure(error, collectionName);
      }
    }

    const errors = issues.filter((issue) => issue.level === 'error').length;
    const warningsCount = issues.filter((issue) => issue.level === 'warning').length;
    const status = errors > 0 || (failOnWarnings && warningsCount > 0)
      ? 'fail'
      : warningsCount > 0
        ? 'warn'
        : 'pass';

    const report = {
      valid: errors === 0,
      collection_count: names.length,
      record_count: totalRecords,
      errors,
      warnings: warningsCount,
      issues
    };

    return {
      status,
      outputs: {
        'data.resolved': {
          collections: collectionsOutput,
          collection_names: [...names],
          record_counts: recordCounts,
          total_records: totalRecords
        },
        'relations.report': report
      },
      warnings: warningsCount > 0 ? [`relations_warnings:${warningsCount}`] : [],
      details: {
        reason: status === 'fail' ? 'relation_issues' : null,
        collections: names.length,
        records: totalRecords,
        errors,
        warnings: warningsCount,
        selected_collections: selectedCollections
      }
    };
  };
}
