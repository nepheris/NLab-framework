import { DataValidator } from '../../../core/data-validator.js';

export class SiteGenerationValidationHandlerError extends Error {
  constructor(message, code = 'SITE_GENERATION_VALIDATION_HANDLER_ERROR', details = {}) {
    super(message);
    this.name = 'SiteGenerationValidationHandlerError';
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
    throw new SiteGenerationValidationHandlerError('collections must be an array or null', 'INVALID_COLLECTIONS');
  }
  const seen = new Set();
  const names = [];
  for (const valueName of value) {
    if (typeof valueName !== 'string' || !valueName.trim()) {
      throw new SiteGenerationValidationHandlerError('collection names must be non-empty strings', 'INVALID_COLLECTION_NAME', {
        value: valueName
      });
    }
    const name = valueName.trim();
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

function assertRegistry(registry) {
  if (!isObject(registry) || !isObject(registry.collections)) {
    throw new SiteGenerationValidationHandlerError('registry.collections is required', 'REGISTRY_REQUIRED');
  }
}

function findLoadedSnapshot(dependencies) {
  if (!isObject(dependencies)) return null;
  for (const dependency of Object.values(dependencies)) {
    const loaded = dependency?.outputs?.['data.loaded'];
    if (isObject(loaded) && isObject(loaded.collections)) return loaded;
  }
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
      const error = new SiteGenerationValidationHandlerError(
        `Collection ${collectionName} is absent from data.loaded`,
        'COLLECTION_NOT_LOADED',
        { collectionName }
      );
      throw error;
    }
    const records = this.snapshot.collections[collectionName];
    if (!Array.isArray(records)) {
      throw new SiteGenerationValidationHandlerError(
        `Collection ${collectionName} in data.loaded must be an array`,
        'INVALID_LOADED_COLLECTION',
        { collectionName }
      );
    }
    return records;
  }
}

function aggregateSelectedReports(registryReport, collectionReports) {
  const issues = [...registryReport.issues];
  let checked = 0;
  for (const report of Object.values(collectionReports)) {
    issues.push(...report.issues);
    checked += report.checked;
  }
  const errors = issues.filter((issue) => issue.level === 'error').length;
  const warnings = issues.filter((issue) => issue.level === 'warning').length;
  return {
    scope: 'selected',
    collection: null,
    valid: errors === 0,
    checked,
    errors,
    warnings,
    issues,
    collections: collectionReports,
    registry: registryReport
  };
}

function failure(error, reason = 'validation_failed') {
  return {
    status: 'fail',
    outputs: {},
    warnings: [],
    details: {
      reason,
      error: {
        name: error?.name ?? 'Error',
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        details: error?.details ?? null
      }
    }
  };
}

export function createValidationStageHandler({
  registry,
  collections = null,
  failOnWarnings = false,
  validatorFactory = ({ provider, registry: registryValue }) => new DataValidator({
    provider,
    registry: registryValue
  })
} = {}) {
  assertRegistry(registry);
  const selectedCollections = normalizeCollections(collections);
  if (typeof validatorFactory !== 'function') {
    throw new SiteGenerationValidationHandlerError('validatorFactory must be a function', 'INVALID_VALIDATOR_FACTORY');
  }

  return async function validationStageHandler({ stage, dependencies } = {}) {
    if (stage?.type && stage.type !== 'validation') {
      return {
        status: 'fail',
        outputs: {},
        warnings: [],
        details: {
          reason: 'unexpected_stage_type',
          expected: 'validation',
          actual: stage.type
        }
      };
    }

    const snapshot = findLoadedSnapshot(dependencies);
    if (!snapshot) {
      return {
        status: 'fail',
        outputs: {},
        warnings: [],
        details: { reason: 'data_loaded_dependency_required' }
      };
    }

    try {
      const provider = new LoadedSnapshotProvider(registry, snapshot);
      const validator = validatorFactory({ provider, registry });
      if (!validator || typeof validator.init !== 'function') {
        throw new SiteGenerationValidationHandlerError('validatorFactory returned an invalid validator', 'INVALID_VALIDATOR');
      }
      await validator.init();

      let report;
      if (selectedCollections == null) {
        if (typeof validator.validateAll !== 'function') {
          throw new SiteGenerationValidationHandlerError('validator.validateAll() is required', 'VALIDATE_ALL_REQUIRED');
        }
        report = await validator.validateAll();
      } else {
        if (typeof validator.validateRegistry !== 'function' || typeof validator.validateCollection !== 'function') {
          throw new SiteGenerationValidationHandlerError(
            'validator.validateRegistry() and validateCollection() are required for selected collections',
            'SELECTED_VALIDATION_REQUIRED'
          );
        }
        const registryReport = validator.validateRegistry();
        const collectionReports = {};
        for (const collectionName of selectedCollections) {
          collectionReports[collectionName] = await validator.validateCollection(collectionName);
        }
        report = aggregateSelectedReports(registryReport, collectionReports);
      }

      const errors = Number(report?.errors ?? 0);
      const warningsCount = Number(report?.warnings ?? 0);
      const status = errors > 0 || (failOnWarnings && warningsCount > 0)
        ? 'fail'
        : warningsCount > 0
          ? 'warn'
          : 'pass';

      return {
        status,
        outputs: {
          'validation.report': report
        },
        warnings: warningsCount > 0 ? [`validation_warnings:${warningsCount}`] : [],
        details: {
          reason: status === 'fail' ? 'validation_issues' : null,
          checked: Number(report?.checked ?? 0),
          errors,
          warnings: warningsCount,
          selected_collections: selectedCollections
        }
      };
    } catch (error) {
      return failure(error, 'validation_handler_error');
    }
  };
}
