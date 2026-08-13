const VALID_MODES = new Set(['machine', 'human', 'hybrid']);

export class SiteGenerationHandlerRegistryError extends Error {
  constructor(message, code = 'SITE_GENERATION_HANDLER_REGISTRY_ERROR', details = {}) {
    super(message);
    this.name = 'SiteGenerationHandlerRegistryError';
    this.code = code;
    this.details = details;
  }
}

function assertFunction(handler) {
  if (typeof handler !== 'function') {
    throw new SiteGenerationHandlerRegistryError('Handler must be a function', 'INVALID_HANDLER');
  }
}

function assertKey(value, kind) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new SiteGenerationHandlerRegistryError(`${kind} must be a non-empty string`, 'INVALID_HANDLER_KEY', { kind });
  }
  return value.trim();
}

function assertChecklist(checklist) {
  if (!checklist || checklist.schema !== 'nlab.site-generation-checklist' || checklist.version !== 1 || !Array.isArray(checklist.stages)) {
    throw new SiteGenerationHandlerRegistryError('Unsupported checklist contract', 'UNSUPPORTED_CHECKLIST');
  }
  for (const stage of checklist.stages) {
    if (!stage || typeof stage.id !== 'string' || typeof stage.type !== 'string' || !VALID_MODES.has(stage.mode)) {
      throw new SiteGenerationHandlerRegistryError('Checklist contains an invalid stage', 'INVALID_STAGE', {
        stageId: stage?.id ?? null
      });
    }
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export class SiteGenerationHandlerRegistry {
  constructor() {
    this.byStageId = new Map();
    this.byType = new Map();
  }

  registerStage(stageId, handler, metadata = {}, { replace = false } = {}) {
    const key = assertKey(stageId, 'stageId');
    assertFunction(handler);
    if (this.byStageId.has(key) && !replace) {
      throw new SiteGenerationHandlerRegistryError(`Handler already registered for stage ${key}`, 'DUPLICATE_STAGE_HANDLER', { stageId: key });
    }
    this.byStageId.set(key, { handler, metadata: clone(metadata) ?? {} });
    return this;
  }

  registerType(type, handler, metadata = {}, { replace = false } = {}) {
    const key = assertKey(type, 'type');
    assertFunction(handler);
    if (this.byType.has(key) && !replace) {
      throw new SiteGenerationHandlerRegistryError(`Handler already registered for type ${key}`, 'DUPLICATE_TYPE_HANDLER', { type: key });
    }
    this.byType.set(key, { handler, metadata: clone(metadata) ?? {} });
    return this;
  }

  unregisterStage(stageId) {
    this.byStageId.delete(assertKey(stageId, 'stageId'));
    return this;
  }

  unregisterType(type) {
    this.byType.delete(assertKey(type, 'type'));
    return this;
  }

  resolve(stage) {
    if (!stage || typeof stage.id !== 'string' || typeof stage.type !== 'string') {
      throw new SiteGenerationHandlerRegistryError('Stage id and type are required', 'INVALID_STAGE');
    }
    const stageEntry = this.byStageId.get(stage.id);
    if (stageEntry) {
      return { source: 'stage_id', key: stage.id, handler: stageEntry.handler, metadata: clone(stageEntry.metadata) };
    }
    const typeEntry = this.byType.get(stage.type);
    if (typeEntry) {
      return { source: 'type', key: stage.type, handler: typeEntry.handler, metadata: clone(typeEntry.metadata) };
    }
    return null;
  }

  inspect(checklist) {
    assertChecklist(checklist);
    const stages = checklist.stages.map((stage) => {
      const resolved = this.resolve(stage);
      let status;
      if (resolved) status = 'handler_available';
      else if (stage.mode === 'machine') status = 'handler_missing';
      else status = 'decision_or_handler_required';

      return {
        id: stage.id,
        type: stage.type,
        mode: stage.mode,
        required: Boolean(stage.required),
        status,
        resolution: resolved ? { source: resolved.source, key: resolved.key, metadata: resolved.metadata } : null
      };
    });

    const missingMachineStageIds = stages
      .filter((stage) => stage.mode === 'machine' && stage.status === 'handler_missing')
      .map((stage) => stage.id);
    const humanOrHybridPendingStageIds = stages
      .filter((stage) => stage.status === 'decision_or_handler_required')
      .map((stage) => stage.id);

    return {
      schema: 'nlab.site-generation-handler-registry-report',
      version: 1,
      checklist: { name: checklist.name, stage_count: checklist.stages.length },
      ready_for_machine_stages: missingMachineStageIds.length === 0,
      missing_machine_stage_ids: missingMachineStageIds,
      human_or_hybrid_pending_stage_ids: humanOrHybridPendingStageIds,
      registered: {
        stage_ids: [...this.byStageId.keys()].sort(),
        types: [...this.byType.keys()].sort()
      },
      stages
    };
  }

  buildHandlers(checklist, { requireMachineCoverage = true } = {}) {
    const report = this.inspect(checklist);
    if (requireMachineCoverage && !report.ready_for_machine_stages) {
      throw new SiteGenerationHandlerRegistryError('Missing handlers for machine stages', 'MISSING_MACHINE_HANDLERS', {
        stageIds: report.missing_machine_stage_ids
      });
    }

    const handlers = {};
    for (const stage of checklist.stages) {
      const resolved = this.resolve(stage);
      if (resolved) handlers[stage.id] = resolved.handler;
    }
    return handlers;
  }
}

export function createSiteGenerationHandlerRegistry() {
  return new SiteGenerationHandlerRegistry();
}
