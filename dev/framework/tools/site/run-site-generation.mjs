const RESULT_STATUSES = new Set(['pass', 'warn', 'fail', 'blocked', 'skipped']);
const STAGE_MODES = new Set(['machine', 'human', 'hybrid']);
const FAILURE_POLICIES = new Set(['stop', 'warn', 'continue']);

export class SiteGenerationRunnerError extends Error {
  constructor(message, code = 'SITE_GENERATION_RUNNER_ERROR', details = {}) {
    super(message);
    this.name = 'SiteGenerationRunnerError';
    this.code = code;
    this.details = details;
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function assertObject(value, label, code) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SiteGenerationRunnerError(`${label} must be an object`, code);
  }
}

function assertChecklist(checklist) {
  if (!checklist || typeof checklist !== 'object') {
    throw new SiteGenerationRunnerError('Checklist must be an object', 'INVALID_CHECKLIST');
  }
  if (checklist.schema !== 'nlab.site-generation-checklist' || checklist.version !== 1) {
    throw new SiteGenerationRunnerError('Unsupported checklist contract', 'UNSUPPORTED_CHECKLIST');
  }
  if (!Array.isArray(checklist.stages) || checklist.stages.length === 0) {
    throw new SiteGenerationRunnerError('Checklist stages are required', 'INVALID_CHECKLIST');
  }

  const ids = new Set();
  for (const stage of checklist.stages) {
    if (!stage || typeof stage !== 'object' || typeof stage.id !== 'string' || !stage.id) {
      throw new SiteGenerationRunnerError('Stage id is required', 'INVALID_STAGE');
    }
    if (ids.has(stage.id)) {
      throw new SiteGenerationRunnerError(`Duplicate stage ${stage.id}`, 'DUPLICATE_STAGE', { stageId: stage.id });
    }
    ids.add(stage.id);
    if (!STAGE_MODES.has(stage.mode)) {
      throw new SiteGenerationRunnerError(`Invalid mode for ${stage.id}`, 'INVALID_STAGE_MODE', { stageId: stage.id });
    }
    if (!FAILURE_POLICIES.has(stage.on_failure)) {
      throw new SiteGenerationRunnerError(`Invalid failure policy for ${stage.id}`, 'INVALID_FAILURE_POLICY', { stageId: stage.id });
    }
    if (!Array.isArray(stage.depends_on)) {
      throw new SiteGenerationRunnerError(`depends_on must be an array for ${stage.id}`, 'INVALID_DEPENDENCIES', { stageId: stage.id });
    }
  }

  for (const stage of checklist.stages) {
    for (const dependency of stage.depends_on) {
      if (!ids.has(dependency)) {
        throw new SiteGenerationRunnerError(`Unknown dependency ${dependency}`, 'UNKNOWN_DEPENDENCY', {
          stageId: stage.id,
          dependency
        });
      }
    }
  }
}

function orderStages(stages) {
  const byId = new Map(stages.map((stage) => [stage.id, stage]));
  const state = new Map();
  const ordered = [];

  function visit(id, stack = []) {
    const current = state.get(id);
    if (current === 2) return;
    if (current === 1) {
      throw new SiteGenerationRunnerError('Checklist dependency cycle', 'DEPENDENCY_CYCLE', {
        cycle: [...stack, id]
      });
    }
    state.set(id, 1);
    const stage = byId.get(id);
    for (const dependency of stage.depends_on) visit(dependency, [...stack, id]);
    state.set(id, 2);
    ordered.push(stage);
  }

  for (const stage of stages) visit(stage.id);
  return ordered;
}

function normalizeResult(raw, stage) {
  const value = typeof raw === 'string' ? { status: raw } : raw;
  if (!value || typeof value !== 'object' || !RESULT_STATUSES.has(value.status) || value.status === 'skipped') {
    throw new SiteGenerationRunnerError(`Invalid result for ${stage.id}`, 'INVALID_STAGE_RESULT', { stageId: stage.id });
  }
  return {
    status: value.status,
    outputs: clone(value.outputs ?? {}),
    warnings: Array.isArray(value.warnings) ? value.warnings.map(String) : [],
    details: clone(value.details ?? null)
  };
}

function selectDeclaredInputs(stage, artifacts) {
  const names = Array.isArray(stage.inputs) ? stage.inputs : [];
  const selected = {};
  for (const name of names) {
    if (typeof name === 'string' && Object.prototype.hasOwnProperty.call(artifacts, name)) {
      selected[name] = clone(artifacts[name]);
    }
  }
  return selected;
}

export async function runSiteGeneration(checklist, {
  handlers = {},
  decisions = {},
  context = {},
  artifacts = {},
  clock = () => new Date().toISOString()
} = {}) {
  assertChecklist(checklist);
  assertObject(artifacts, 'artifacts', 'INVALID_ARTIFACTS');
  const ordered = orderStages(checklist.stages);
  const results = [];
  const resultById = new Map();
  const artifactStore = clone(artifacts);
  let halted = false;
  let haltStage = null;

  for (const stage of ordered) {
    const dependencyResults = stage.depends_on.map((id) => resultById.get(id));
    const dependencyBlocked = dependencyResults.some((result) =>
      !result || ['fail', 'blocked', 'skipped'].includes(result.status)
    );

    if (halted || dependencyBlocked) {
      const entry = {
        id: stage.id,
        type: stage.type,
        mode: stage.mode,
        required: Boolean(stage.required),
        status: 'skipped',
        reason: halted ? `halted_by:${haltStage}` : 'dependency_not_satisfied',
        outputs: {},
        warnings: []
      };
      results.push(entry);
      resultById.set(stage.id, entry);
      continue;
    }

    let rawResult;
    const handler = handlers[stage.id] ?? handlers[stage.type];
    if (typeof handler === 'function') {
      rawResult = await handler({
        stage: clone(stage),
        context: clone(context),
        dependencies: clone(Object.fromEntries(
          stage.depends_on.map((id) => [id, resultById.get(id)])
        )),
        artifacts: clone(artifactStore),
        inputs: selectDeclaredInputs(stage, artifactStore)
      });
    } else if (Object.prototype.hasOwnProperty.call(decisions, stage.id)) {
      rawResult = decisions[stage.id];
    } else if (stage.mode === 'human' || stage.mode === 'hybrid') {
      rawResult = { status: 'blocked', details: { reason: 'explicit_decision_required' } };
    } else {
      rawResult = { status: 'fail', details: { reason: 'handler_required' } };
    }

    const normalized = normalizeResult(rawResult, stage);
    let effectiveStatus = normalized.status;
    const warnings = [...normalized.warnings];

    if (effectiveStatus === 'fail' && stage.on_failure === 'warn') {
      effectiveStatus = 'warn';
      warnings.push('failure_downgraded_by_policy');
    }

    const entry = {
      id: stage.id,
      type: stage.type,
      mode: stage.mode,
      required: Boolean(stage.required),
      status: effectiveStatus,
      raw_status: normalized.status,
      outputs: normalized.outputs,
      warnings,
      details: normalized.details
    };
    results.push(entry);
    resultById.set(stage.id, entry);

    if (effectiveStatus === 'pass' || effectiveStatus === 'warn') {
      Object.assign(artifactStore, clone(normalized.outputs));
    }

    if (
      (effectiveStatus === 'fail' || effectiveStatus === 'blocked') &&
      stage.required &&
      stage.on_failure === 'stop'
    ) {
      halted = true;
      haltStage = stage.id;
    }
  }

  const blockingStageIds = results
    .filter((result) => result.required && ['fail', 'blocked'].includes(result.status))
    .map((result) => result.id);
  const skippedRequiredStageIds = results
    .filter((result) => result.required && result.status === 'skipped')
    .map((result) => result.id);
  const warnings = results.flatMap((result) =>
    result.warnings.map((message) => ({ stage_id: result.id, message }))
  );

  return {
    schema: 'nlab.site-generation-run-report',
    version: 1,
    generated_at: clock(),
    checklist: {
      name: checklist.name,
      stage_count: checklist.stages.length
    },
    ok: blockingStageIds.length === 0 && skippedRequiredStageIds.length === 0,
    halted,
    halt_stage: haltStage,
    blocking_stage_ids: blockingStageIds,
    skipped_required_stage_ids: skippedRequiredStageIds,
    warnings,
    stages: results
  };
}
