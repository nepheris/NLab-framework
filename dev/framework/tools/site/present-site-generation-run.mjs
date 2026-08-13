const STATUS_META = Object.freeze({
  pass: { icon: '🟢', label: 'OK', severity: 'success' },
  warn: { icon: '🟡', label: 'ATTENTION', severity: 'warning' },
  fail: { icon: '🔴', label: 'ÉCHEC', severity: 'error' },
  blocked: { icon: '⛔', label: 'BLOQUÉ', severity: 'blocked' },
  skipped: { icon: '⚪', label: 'NON EXÉCUTÉ', severity: 'muted' }
});

const STAGE_LABELS_FR = Object.freeze({
  preflight: 'Pré-vol',
  'data-load': 'Chargement des données',
  validation: 'Validation des données',
  relations: 'Relations',
  render: 'Rendu des pages',
  assets: 'Assets',
  routes: 'Routes',
  output: 'Assemblage web',
  preview: 'Preview',
  comparison: 'Comparaison de référence',
  report: 'Rapport final'
});

export class SiteGenerationHumanSummaryError extends Error {
  constructor(message, code = 'SITE_GENERATION_HUMAN_SUMMARY_ERROR', details = {}) {
    super(message);
    this.name = 'SiteGenerationHumanSummaryError';
    this.code = code;
    this.details = details;
  }
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function assertReport(report) {
  if (!report || typeof report !== 'object') {
    throw new SiteGenerationHumanSummaryError('Run report must be an object', 'INVALID_RUN_REPORT');
  }
  if (report.schema !== 'nlab.site-generation-run-report' || report.version !== 1) {
    throw new SiteGenerationHumanSummaryError('Unsupported run report contract', 'UNSUPPORTED_RUN_REPORT');
  }
  if (!report.checklist || typeof report.checklist.name !== 'string' || !Array.isArray(report.stages)) {
    throw new SiteGenerationHumanSummaryError('Run report is structurally incomplete', 'INVALID_RUN_REPORT');
  }
  for (const stage of report.stages) {
    if (!stage || typeof stage.id !== 'string' || !STATUS_META[stage.status]) {
      throw new SiteGenerationHumanSummaryError('Run report contains an invalid stage result', 'INVALID_STAGE_RESULT', {
        stageId: stage?.id ?? null,
        status: stage?.status ?? null
      });
    }
  }
}

function stageLabel(stage) {
  return STAGE_LABELS_FR[stage.type] ?? stage.id;
}

function normalizeWarning(warning) {
  if (typeof warning === 'string') return { stage_id: null, message: warning };
  if (!warning || typeof warning !== 'object') return { stage_id: null, message: String(warning) };
  return {
    stage_id: typeof warning.stage_id === 'string' ? warning.stage_id : null,
    message: String(warning.message ?? '')
  };
}

export function buildSiteGenerationHumanSummary(report) {
  assertReport(report);

  const stages = report.stages.map((stage) => {
    const meta = STATUS_META[stage.status];
    return {
      id: stage.id,
      type: stage.type,
      mode: stage.mode,
      label: stageLabel(stage),
      status: stage.status,
      status_label: meta.label,
      icon: meta.icon,
      severity: meta.severity,
      required: Boolean(stage.required),
      reason: stage.reason ?? stage.details?.reason ?? null,
      warnings: Array.isArray(stage.warnings) ? stage.warnings.map(String) : []
    };
  });

  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const warningEntries = Array.isArray(report.warnings) ? report.warnings.map(normalizeWarning) : [];
  const blockingIds = Array.isArray(report.blocking_stage_ids) ? [...report.blocking_stage_ids] : [];
  const skippedIds = Array.isArray(report.skipped_required_stage_ids) ? [...report.skipped_required_stage_ids] : [];

  const humanAttentionItems = [];
  for (const warning of warningEntries) {
    humanAttentionItems.push({
      kind: 'warning',
      stage_id: warning.stage_id,
      label: warning.stage_id ? stageById.get(warning.stage_id)?.label ?? warning.stage_id : 'Avertissement',
      message: warning.message
    });
  }
  for (const stage of stages) {
    if (!['human', 'hybrid'].includes(stage.mode)) continue;
    if (stage.status === 'pass') continue;
    humanAttentionItems.push({
      kind: 'human-stage',
      stage_id: stage.id,
      label: stage.label,
      message: stage.reason || `${stage.status_label.toLowerCase()} — contrôle humain requis`
    });
  }

  const decision = report.ok === true ? 'GO' : 'NO_GO';
  const attentionRequired = report.ok !== true || humanAttentionItems.length > 0;
  const haltStage = report.halt_stage ? stageById.get(report.halt_stage) ?? null : null;

  return {
    schema: 'nlab.site-generation-human-summary',
    version: 1,
    source: {
      schema: report.schema,
      version: report.version,
      generated_at: report.generated_at ?? null
    },
    checklist_name: report.checklist.name,
    decision,
    decision_icon: decision === 'GO' ? '🟢' : '🔴',
    attention_required: attentionRequired,
    halted: Boolean(report.halted),
    halt_stage: haltStage ? { id: haltStage.id, label: haltStage.label } : null,
    counts: {
      stages: stages.length,
      blocking: blockingIds.length,
      skipped_required: skippedIds.length,
      warnings: warningEntries.length,
      human_attention: humanAttentionItems.length
    },
    blocking_stages: blockingIds.map((id) => ({
      id,
      label: stageById.get(id)?.label ?? id
    })),
    skipped_required_stages: skippedIds.map((id) => ({
      id,
      label: stageById.get(id)?.label ?? id
    })),
    human_attention_items: humanAttentionItems,
    stages,
    raw_report: clone(report)
  };
}

export function formatSiteGenerationHumanSummary(summaryOrReport) {
  const summary = summaryOrReport?.schema === 'nlab.site-generation-human-summary'
    ? clone(summaryOrReport)
    : buildSiteGenerationHumanSummary(summaryOrReport);

  const lines = [
    `GÉNÉRATION — ${summary.checklist_name}`,
    '',
    'État général',
    `${summary.decision_icon} ${summary.decision}${summary.decision === 'GO' ? ' — génération réussie' : ' — génération non validée'}`
  ];

  if (summary.halt_stage) {
    lines.push(`Arrêt : ${summary.halt_stage.label} (${summary.halt_stage.id})`);
  }

  lines.push('', 'Étapes');
  for (const stage of summary.stages) {
    const suffix = stage.reason ? ` — ${stage.reason}` : '';
    lines.push(`${stage.icon} ${stage.label} — ${stage.status_label}${suffix}`);
  }

  lines.push(
    '',
    `Blocages : ${summary.counts.blocking}`,
    `Étapes requises non exécutées : ${summary.counts.skipped_required}`,
    `Warnings : ${summary.counts.warnings}`
  );

  if (summary.human_attention_items.length > 0) {
    lines.push('', '🟣 Contrôle HUMAN');
    for (const item of summary.human_attention_items) {
      lines.push(`→ ${item.label}: ${item.message}`);
    }
  } else {
    lines.push('', '🟣 Contrôle HUMAN', '→ Aucun contrôle supplémentaire signalé par ce run.');
  }

  return lines.join('\n');
}
