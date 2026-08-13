export class SiteGenerationDataLoadHandlerError extends Error {
  constructor(message, code = 'SITE_GENERATION_DATA_LOAD_HANDLER_ERROR', details = {}) {
    super(message);
    this.name = 'SiteGenerationDataLoadHandlerError';
    this.code = code;
    this.details = details;
  }
}

function normalizeCollectionNames(value) {
  if (value == null) return null;
  if (!Array.isArray(value)) {
    throw new SiteGenerationDataLoadHandlerError('collections must be an array or null', 'INVALID_COLLECTIONS');
  }

  const names = [];
  const seen = new Set();
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim()) {
      throw new SiteGenerationDataLoadHandlerError('collection names must be non-empty strings', 'INVALID_COLLECTION_NAME', {
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

function assertProvider(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new SiteGenerationDataLoadHandlerError('provider is required', 'PROVIDER_REQUIRED');
  }
  if (typeof provider.getCollection !== 'function') {
    throw new SiteGenerationDataLoadHandlerError('provider.getCollection() is required', 'INVALID_PROVIDER');
  }
}

function providerFailure(error, collectionName = null) {
  return {
    status: 'fail',
    outputs: {},
    warnings: [],
    details: {
      reason: 'data_load_failed',
      collection: collectionName,
      error: {
        name: error?.name ?? 'Error',
        code: error?.code ?? null,
        message: error?.message ?? String(error)
      }
    }
  };
}

export function createDataLoadStageHandler({
  provider,
  collections = null,
  refresh = false,
  initialize = true,
  close = false,
  allowEmpty = false
} = {}) {
  assertProvider(provider);
  const configuredCollections = normalizeCollectionNames(collections);

  return async function dataLoadStageHandler({ stage } = {}) {
    if (stage && stage.type && stage.type !== 'data-load') {
      return {
        status: 'fail',
        outputs: {},
        warnings: [],
        details: {
          reason: 'unexpected_stage_type',
          expected: 'data-load',
          actual: stage.type
        }
      };
    }

    let currentCollection = null;
    try {
      if (initialize && typeof provider.init === 'function') {
        await provider.init();
      }

      let collectionNames = configuredCollections;
      if (collectionNames == null) {
        if (typeof provider.listCollections !== 'function') {
          throw new SiteGenerationDataLoadHandlerError(
            'provider.listCollections() is required when collections are not configured',
            'LIST_COLLECTIONS_REQUIRED'
          );
        }
        collectionNames = normalizeCollectionNames(await provider.listCollections());
      }

      if (!allowEmpty && collectionNames.length === 0) {
        return {
          status: 'fail',
          outputs: {},
          warnings: [],
          details: { reason: 'no_collections_available' }
        };
      }

      const loaded = {};
      const recordCounts = {};
      let totalRecords = 0;

      for (const collectionName of collectionNames) {
        currentCollection = collectionName;
        const records = await provider.getCollection(collectionName, { refresh: Boolean(refresh) });
        if (!Array.isArray(records)) {
          throw new SiteGenerationDataLoadHandlerError(
            `Collection ${collectionName} did not return an array`,
            'INVALID_COLLECTION_RESULT',
            { collectionName }
          );
        }
        loaded[collectionName] = records;
        recordCounts[collectionName] = records.length;
        totalRecords += records.length;
      }

      return {
        status: 'pass',
        outputs: {
          'data.loaded': {
            collections: loaded,
            collection_names: [...collectionNames],
            record_counts: recordCounts,
            total_records: totalRecords
          }
        },
        warnings: [],
        details: {
          provider_type: typeof provider.type === 'string' ? provider.type : null,
          collection_count: collectionNames.length,
          total_records: totalRecords,
          refresh: Boolean(refresh)
        }
      };
    } catch (error) {
      return providerFailure(error, currentCollection);
    } finally {
      if (close && typeof provider.close === 'function') {
        try {
          await provider.close();
        } catch {
          // Closing must never hide the actual stage result.
        }
      }
    }
  };
}
