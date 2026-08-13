import { RendererWiz } from '../../../wiz/renderer-wiz.js';

export class SiteGenerationRenderHandlerError extends Error {
  constructor(message, code = 'SITE_GENERATION_RENDER_HANDLER_ERROR', details = {}) {
    super(message);
    this.name = 'SiteGenerationRenderHandlerError';
    this.code = code;
    this.details = details;
  }
}

const RECORD_SOURCES = new Set(['data', 'resolved', 'enriched', 'entry']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value, label, code) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new SiteGenerationRenderHandlerError(`${label} must be a non-empty string`, code, { value });
  }
  return value.trim();
}

function findArtifact(name, inputs, artifacts, configuredValue = null) {
  if (configuredValue != null) return configuredValue;
  if (inputs && Object.prototype.hasOwnProperty.call(inputs, name)) return inputs[name];
  if (artifacts && Object.prototype.hasOwnProperty.call(artifacts, name)) return artifacts[name];
  return null;
}

function normalizePageFamilies(config) {
  if (!isObject(config) || !Array.isArray(config.pages) || config.pages.length === 0) {
    throw new SiteGenerationRenderHandlerError('render.config.pages must be a non-empty array', 'INVALID_RENDER_CONFIG');
  }

  const ids = new Set();
  return config.pages.map((page, index) => {
    if (!isObject(page)) {
      throw new SiteGenerationRenderHandlerError('render.config.pages entries must be objects', 'INVALID_PAGE_CONFIG', { index });
    }
    const id = nonEmptyString(page.id, 'page.id', 'INVALID_PAGE_ID');
    if (ids.has(id)) {
      throw new SiteGenerationRenderHandlerError(`Duplicate page id: ${id}`, 'DUPLICATE_PAGE_ID', { id });
    }
    ids.add(id);

    const collection = nonEmptyString(page.collection, 'page.collection', 'INVALID_PAGE_COLLECTION');
    const renderer = nonEmptyString(page.renderer, 'page.renderer', 'INVALID_PAGE_RENDERER');
    const source = page.source == null ? 'enriched' : String(page.source).trim();
    if (!RECORD_SOURCES.has(source)) {
      throw new SiteGenerationRenderHandlerError(`Unsupported page source: ${source}`, 'INVALID_PAGE_SOURCE', {
        id,
        source,
        allowed: [...RECORD_SOURCES]
      });
    }
    if (page.options != null && !isObject(page.options)) {
      throw new SiteGenerationRenderHandlerError('page.options must be an object', 'INVALID_PAGE_OPTIONS', { id });
    }

    return {
      id,
      collection,
      renderer,
      source,
      options: page.options ? structuredClone(page.options) : {}
    };
  });
}

function materializeEntry(entry, source) {
  const normalized = isObject(entry) ? entry : { data: entry, resolved: {}, issues: [] };
  const data = isObject(normalized.data) ? normalized.data : {};
  const resolved = isObject(normalized.resolved) ? normalized.resolved : {};

  if (source === 'data') return structuredClone(data);
  if (source === 'resolved') return structuredClone(resolved);
  if (source === 'entry') return structuredClone(normalized);
  return { ...structuredClone(data), ...structuredClone(resolved) };
}

function failure(error, pageId = null) {
  return {
    status: 'fail',
    outputs: {},
    warnings: [],
    details: {
      reason: 'render_handler_error',
      page_id: pageId,
      error: {
        name: error?.name ?? 'Error',
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        details: error?.details ?? null
      }
    }
  };
}

export function createRenderStageHandler({
  renderer = null,
  config = null,
  rendererFactory = () => new RendererWiz()
} = {}) {
  if (renderer != null && (!isObject(renderer) || typeof renderer.render !== 'function')) {
    throw new SiteGenerationRenderHandlerError('renderer.render() is required', 'INVALID_RENDERER');
  }
  if (typeof rendererFactory !== 'function') {
    throw new SiteGenerationRenderHandlerError('rendererFactory must be a function', 'INVALID_RENDERER_FACTORY');
  }

  return async function renderStageHandler({ stage, inputs = {}, artifacts = {} } = {}) {
    if (stage?.type && stage.type !== 'render') {
      return {
        status: 'fail',
        outputs: {},
        warnings: [],
        details: {
          reason: 'unexpected_stage_type',
          expected: 'render',
          actual: stage.type
        }
      };
    }

    const resolvedData = findArtifact('data.resolved', inputs, artifacts);
    if (!isObject(resolvedData) || !isObject(resolvedData.collections)) {
      return {
        status: 'fail',
        outputs: {},
        warnings: [],
        details: { reason: 'data_resolved_artifact_required' }
      };
    }

    const renderConfig = findArtifact('render.config', inputs, artifacts, config);
    let pageFamilies;
    let activeRenderer;
    try {
      pageFamilies = normalizePageFamilies(renderConfig);
      activeRenderer = renderer ?? rendererFactory();
      if (!activeRenderer || typeof activeRenderer.render !== 'function') {
        throw new SiteGenerationRenderHandlerError('rendererFactory returned an invalid renderer', 'INVALID_RENDERER');
      }
    } catch (error) {
      return failure(error);
    }

    const pages = {};
    const pageIds = [];
    let totalRecords = 0;

    for (const page of pageFamilies) {
      try {
        const entries = resolvedData.collections[page.collection];
        if (!Array.isArray(entries)) {
          throw new SiteGenerationRenderHandlerError(
            `Collection ${page.collection} is absent from data.resolved`,
            'RESOLVED_COLLECTION_REQUIRED',
            { pageId: page.id, collection: page.collection }
          );
        }
        if (typeof activeRenderer.has === 'function' && !activeRenderer.has(page.renderer)) {
          throw new SiteGenerationRenderHandlerError(
            `Unknown renderer: ${page.renderer}`,
            'UNKNOWN_RENDERER',
            { pageId: page.id, renderer: page.renderer }
          );
        }

        const items = entries.map((entry) => materializeEntry(entry, page.source));
        const content = await activeRenderer.render(page.renderer, items, structuredClone(page.options));
        if (typeof content !== 'string') {
          throw new SiteGenerationRenderHandlerError(
            `Renderer ${page.renderer} must return a string`,
            'INVALID_RENDER_OUTPUT',
            { pageId: page.id, renderer: page.renderer, outputType: typeof content }
          );
        }

        pages[page.id] = {
          id: page.id,
          collection: page.collection,
          renderer: page.renderer,
          source: page.source,
          record_count: items.length,
          content
        };
        pageIds.push(page.id);
        totalRecords += items.length;
      } catch (error) {
        return failure(error, page.id);
      }
    }

    return {
      status: 'pass',
      outputs: {
        'pages.rendered': {
          pages,
          page_ids: pageIds,
          page_count: pageIds.length,
          total_records: totalRecords
        }
      },
      warnings: [],
      details: {
        pages: pageIds.length,
        records: totalRecords,
        renderer_component: 'RendererWiz',
        renderer_nlab_id: null,
        renderer_nlab_id_status: 'not_declared'
      }
    };
  };
}
