import { promises as fs } from 'node:fs';
import path from 'node:path';

export class SiteGenerationAssetsHandlerError extends Error {
  constructor(message, code = 'SITE_GENERATION_ASSETS_HANDLER_ERROR', details = {}) {
    super(message);
    this.name = 'SiteGenerationAssetsHandlerError';
    this.code = code;
    this.details = details;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeRelativePath(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new SiteGenerationAssetsHandlerError(`${label} must be a non-empty string`, 'INVALID_ASSET_PATH', { label, value });
  }
  const raw = value.trim().replaceAll('\\', '/');
  if (raw.startsWith('/') || /^[A-Za-z]:\//.test(raw) || raw.includes('?') || raw.includes('#')) {
    throw new SiteGenerationAssetsHandlerError(`${label} must be a safe relative path`, 'UNSAFE_ASSET_PATH', { label, value });
  }
  const normalized = path.posix.normalize(raw);
  if (normalized === '.' || normalized === '..' || normalized.startsWith('../') || normalized.split('/').includes('..')) {
    throw new SiteGenerationAssetsHandlerError(`${label} escapes its declared root`, 'UNSAFE_ASSET_PATH', { label, value });
  }
  return normalized.replace(/^\.\//, '');
}

function findArtifact(name, inputs, artifacts, configuredValue = null) {
  if (configuredValue != null) return configuredValue;
  if (inputs && Object.prototype.hasOwnProperty.call(inputs, name)) return inputs[name];
  if (artifacts && Object.prototype.hasOwnProperty.call(artifacts, name)) return artifacts[name];
  return null;
}

function normalizeSources(value) {
  const list = Array.isArray(value) ? value : isObject(value) && Array.isArray(value.assets) ? value.assets : null;
  if (!list) {
    throw new SiteGenerationAssetsHandlerError('assets.sources must be an array or { assets: [] }', 'INVALID_ASSET_SOURCES');
  }
  const ids = new Set();
  const targets = new Set();
  return list.map((entry, index) => {
    if (!isObject(entry)) {
      throw new SiteGenerationAssetsHandlerError('asset entries must be objects', 'INVALID_ASSET_ENTRY', { index });
    }
    if (typeof entry.id !== 'string' || !entry.id.trim()) {
      throw new SiteGenerationAssetsHandlerError('asset.id must be a non-empty string', 'INVALID_ASSET_ID', { index });
    }
    const id = entry.id.trim();
    if (ids.has(id)) throw new SiteGenerationAssetsHandlerError(`Duplicate asset id: ${id}`, 'DUPLICATE_ASSET_ID', { id });
    ids.add(id);

    const source = safeRelativePath(entry.source, 'asset.source');
    const target = safeRelativePath(entry.target ?? entry.source, 'asset.target');
    if (targets.has(target)) throw new SiteGenerationAssetsHandlerError(`Duplicate asset target: ${target}`, 'DUPLICATE_ASSET_TARGET', { target });
    targets.add(target);

    return {
      id,
      source,
      target,
      required: entry.required !== false,
      fallback: entry.fallback == null ? null : safeRelativePath(entry.fallback, 'asset.fallback'),
      metadata: isObject(entry.metadata) ? structuredClone(entry.metadata) : {}
    };
  });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function failure(error, assetId = null) {
  return {
    status: 'fail',
    outputs: {},
    warnings: [],
    details: {
      reason: 'assets_handler_error',
      asset_id: assetId,
      error: {
        name: error?.name ?? 'Error',
        code: error?.code ?? null,
        message: error?.message ?? String(error),
        details: error?.details ?? null
      }
    }
  };
}

export function createAssetsStageHandler({
  sourceRoot,
  outputRoot,
  sources = null,
  fileSystem = fs
} = {}) {
  if (typeof sourceRoot !== 'string' || !sourceRoot.trim()) {
    throw new SiteGenerationAssetsHandlerError('sourceRoot is required', 'SOURCE_ROOT_REQUIRED');
  }
  if (typeof outputRoot !== 'string' || !outputRoot.trim()) {
    throw new SiteGenerationAssetsHandlerError('outputRoot is required', 'OUTPUT_ROOT_REQUIRED');
  }
  if (!fileSystem || typeof fileSystem.readFile !== 'function' || typeof fileSystem.writeFile !== 'function' || typeof fileSystem.mkdir !== 'function') {
    throw new SiteGenerationAssetsHandlerError('fileSystem readFile/writeFile/mkdir are required', 'INVALID_FILE_SYSTEM');
  }

  const sourceBase = path.resolve(sourceRoot);
  const outputBase = path.resolve(outputRoot);

  return async function assetsStageHandler({ stage, inputs = {}, artifacts = {} } = {}) {
    if (stage?.type && stage.type !== 'assets') {
      return {
        status: 'fail', outputs: {}, warnings: [],
        details: { reason: 'unexpected_stage_type', expected: 'assets', actual: stage.type }
      };
    }

    const rendered = findArtifact('pages.rendered', inputs, artifacts);
    if (!isObject(rendered) || !isObject(rendered.pages)) {
      return { status: 'fail', outputs: {}, warnings: [], details: { reason: 'pages_rendered_artifact_required' } };
    }

    let entries;
    try {
      entries = normalizeSources(findArtifact('assets.sources', inputs, artifacts, sources));
    } catch (error) {
      return failure(error);
    }

    const prepared = [];
    const warnings = [];
    for (const asset of entries) {
      try {
        let chosenRelative = asset.source;
        let chosenAbsolute = path.resolve(sourceBase, asset.source);
        let usedFallback = false;
        if (!(await exists(chosenAbsolute))) {
          if (asset.fallback) {
            chosenRelative = asset.fallback;
            chosenAbsolute = path.resolve(sourceBase, asset.fallback);
            usedFallback = true;
          }
        }

        if (!(await exists(chosenAbsolute))) {
          if (asset.required) {
            throw new SiteGenerationAssetsHandlerError(`Required asset not found: ${asset.id}`, 'ASSET_NOT_FOUND', { id: asset.id });
          }
          warnings.push(`optional_asset_missing:${asset.id}`);
          prepared.push({ ...asset, status: 'missing', used_fallback: false, bytes: 0 });
          continue;
        }

        const data = await fileSystem.readFile(chosenAbsolute);
        const targetAbsolute = path.resolve(outputBase, asset.target);
        await fileSystem.mkdir(path.dirname(targetAbsolute), { recursive: true });
        await fileSystem.writeFile(targetAbsolute, data);
        if (usedFallback) warnings.push(`asset_fallback_used:${asset.id}`);

        prepared.push({
          id: asset.id,
          source: chosenRelative,
          target: asset.target,
          required: asset.required,
          metadata: asset.metadata,
          status: 'prepared',
          used_fallback: usedFallback,
          bytes: Number(data?.byteLength ?? data?.length ?? 0)
        });
      } catch (error) {
        return failure(error, asset.id);
      }
    }

    return {
      status: warnings.length ? 'warn' : 'pass',
      outputs: {
        'assets.prepared': {
          assets: prepared,
          asset_count: prepared.filter((entry) => entry.status === 'prepared').length,
          missing_count: prepared.filter((entry) => entry.status === 'missing').length,
          output_root: outputBase
        }
      },
      warnings,
      details: {
        prepared: prepared.filter((entry) => entry.status === 'prepared').length,
        missing: prepared.filter((entry) => entry.status === 'missing').length,
        fallbacks: prepared.filter((entry) => entry.used_fallback).length
      }
    };
  };
}
