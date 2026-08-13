export class SiteGenerationRoutesHandlerError extends Error {
  constructor(message, code = 'SITE_GENERATION_ROUTES_HANDLER_ERROR', details = {}) {
    super(message);
    this.name = 'SiteGenerationRoutesHandlerError';
    this.code = code;
    this.details = details;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function findArtifact(name, inputs, artifacts, configuredValue = null) {
  if (configuredValue != null) return configuredValue;
  if (inputs && Object.prototype.hasOwnProperty.call(inputs, name)) return inputs[name];
  if (artifacts && Object.prototype.hasOwnProperty.call(artifacts, name)) return artifacts[name];
  return null;
}

function requiredString(value, label, code) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new SiteGenerationRoutesHandlerError(`${label} must be a non-empty string`, code, { value });
  }
  return value.trim();
}

function normalizePath(value) {
  const raw = requiredString(value, 'route.path', 'INVALID_ROUTE_PATH');
  if (raw.includes('\\')) {
    throw new SiteGenerationRoutesHandlerError('route.path must use POSIX separators', 'INVALID_ROUTE_PATH', { value: raw });
  }
  if (raw.includes('?') || raw.includes('#')) {
    throw new SiteGenerationRoutesHandlerError('route.path must not contain query or fragment', 'INVALID_ROUTE_PATH', { value: raw });
  }
  const segments = raw.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new SiteGenerationRoutesHandlerError('route.path must not contain dot segments', 'INVALID_ROUTE_PATH', { value: raw });
  }
  return `/${segments.join('/')}${raw.endsWith('/') && segments.length ? '/' : ''}` || '/';
}

function normalizeConfig(config, renderedPages) {
  if (!isObject(config) || !Array.isArray(config.routes) || config.routes.length === 0) {
    throw new SiteGenerationRoutesHandlerError('routes.config.routes must be a non-empty array', 'INVALID_ROUTES_CONFIG');
  }

  const ids = new Set();
  const paths = new Set();
  return config.routes.map((route, index) => {
    if (!isObject(route)) {
      throw new SiteGenerationRoutesHandlerError('routes.config.routes entries must be objects', 'INVALID_ROUTE_CONFIG', { index });
    }
    const id = requiredString(route.id, 'route.id', 'INVALID_ROUTE_ID');
    if (ids.has(id)) throw new SiteGenerationRoutesHandlerError(`Duplicate route id: ${id}`, 'DUPLICATE_ROUTE_ID', { id });
    ids.add(id);

    const pageId = requiredString(route.page_id ?? route.pageId, 'route.page_id', 'INVALID_ROUTE_PAGE_ID');
    if (!Object.prototype.hasOwnProperty.call(renderedPages.pages, pageId)) {
      throw new SiteGenerationRoutesHandlerError(`Unknown rendered page: ${pageId}`, 'UNKNOWN_ROUTE_PAGE', { id, pageId });
    }

    const path = normalizePath(route.path);
    if (paths.has(path)) throw new SiteGenerationRoutesHandlerError(`Duplicate route path: ${path}`, 'DUPLICATE_ROUTE_PATH', { id, path });
    paths.add(path);

    return {
      id,
      page_id: pageId,
      path,
      output_file: typeof route.output_file === 'string' && route.output_file.trim() ? route.output_file.trim() : null,
      metadata: isObject(route.metadata) ? structuredClone(route.metadata) : {}
    };
  });
}

function failure(error) {
  return {
    status: 'fail',
    outputs: {},
    warnings: [],
    details: {
      reason: 'routes_handler_error',
      error: {
        name: error?.name ?? 'Error',
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        details: error?.details ?? null
      }
    }
  };
}

export function createRoutesStageHandler({ config = null } = {}) {
  return async function routesStageHandler({ stage, inputs = {}, artifacts = {} } = {}) {
    if (stage?.type && stage.type !== 'routes') {
      return {
        status: 'fail',
        outputs: {},
        warnings: [],
        details: {
          reason: 'unexpected_stage_type',
          expected: 'routes',
          actual: stage.type
        }
      };
    }

    const renderedPages = findArtifact('pages.rendered', inputs, artifacts);
    if (!isObject(renderedPages) || !isObject(renderedPages.pages)) {
      return {
        status: 'fail',
        outputs: {},
        warnings: [],
        details: { reason: 'pages_rendered_artifact_required' }
      };
    }

    const routesConfig = findArtifact('routes.config', inputs, artifacts, config);
    try {
      const routes = normalizeConfig(routesConfig, renderedPages);
      const byPath = {};
      const byId = {};
      for (const route of routes) {
        byPath[route.path] = route.id;
        byId[route.id] = route;
      }

      return {
        status: 'pass',
        outputs: {
          'routes.manifest': {
            routes,
            route_ids: routes.map((route) => route.id),
            paths: routes.map((route) => route.path),
            by_id: byId,
            by_path: byPath,
            route_count: routes.length
          }
        },
        warnings: [],
        details: {
          routes: routes.length,
          deterministic: true,
          referenced_nlab_artifacts: []
        }
      };
    } catch (error) {
      return failure(error);
    }
  };
}
