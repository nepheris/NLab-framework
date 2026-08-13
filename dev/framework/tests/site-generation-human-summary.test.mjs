import assert from 'node:assert/strict';
import {
  buildSiteGenerationHumanSummary,
  formatSiteGenerationHumanSummary,
  SiteGenerationHumanSummaryError
} from '../tools/site/present-site-generation-run.mjs';

const baseStages = [
  { id: 'generation.preflight', type: 'preflight', mode: 'hybrid', required: true, status: 'pass', raw_status: 'pass', outputs: {}, warnings: [], details: null },
  { id: 'generation.data-load', type: 'data-load', mode: 'machine', required: true, status: 'pass', raw_status: 'pass', outputs: {}, warnings: [], details: null },
  { id: 'generation.validation', type: 'validation', mode: 'machine', required: true, status: 'pass', raw_status: 'pass', outputs: {}, warnings: [], details: null },
  { id: 'generation.comparison', type: 'comparison', mode: 'human', required: false, status: 'warn', raw_status: 'warn', outputs: {}, warnings: ['2 differences'], details: { reason: 'review_reference_diff' } }
];

const report = {
  schema: 'nlab.site-generation-run-report',
  version: 1,
  generated_at: '2026-08-13T09:45:00+02:00',
  checklist: { name: 'Generic static site generation', stage_count: 4 },
  ok: true,
  halted: false,
  halt_stage: null,
  blocking_stage_ids: [],
  skipped_required_stage_ids: [],
  warnings: [{ stage_id: 'generation.comparison', message: '2 differences' }],
  stages: baseStages
};

const original = JSON.stringify(report);
const summary = buildSiteGenerationHumanSummary(report);
assert.equal(summary.schema, 'nlab.site-generation-human-summary');
assert.equal(summary.version, 1);
assert.equal(summary.decision, 'GO');
assert.equal(summary.attention_required, true);
assert.equal(summary.counts.blocking, 0);
assert.equal(summary.counts.warnings, 1);
assert.equal(summary.counts.human_attention, 2);
assert.equal(summary.stages[0].label, 'Pré-vol');
assert.equal(summary.stages[3].icon, '🟡');
assert.equal(JSON.stringify(report), original, 'presenter must not mutate report');

const text = formatSiteGenerationHumanSummary(report);
assert.match(text, /🟢 GO — génération réussie/);
assert.match(text, /🟡 Comparaison de référence — ATTENTION/);
assert.match(text, /🟣 Contrôle HUMAN/);
assert.match(text, /2 differences/);

const blocked = structuredClone(report);
blocked.ok = false;
blocked.halted = true;
blocked.halt_stage = 'generation.validation';
blocked.blocking_stage_ids = ['generation.validation'];
blocked.skipped_required_stage_ids = ['generation.output'];
blocked.warnings = [];
blocked.stages = [
  baseStages[0],
  baseStages[1],
  { id: 'generation.validation', type: 'validation', mode: 'machine', required: true, status: 'fail', raw_status: 'fail', outputs: {}, warnings: [], details: { reason: 'schema_validation_failed' } },
  { id: 'generation.output', type: 'output', mode: 'machine', required: true, status: 'skipped', reason: 'halted_by:generation.validation', outputs: {}, warnings: [] }
];

const blockedSummary = buildSiteGenerationHumanSummary(blocked);
assert.equal(blockedSummary.decision, 'NO_GO');
assert.equal(blockedSummary.halt_stage.label, 'Validation des données');
assert.equal(blockedSummary.counts.blocking, 1);
assert.equal(blockedSummary.counts.skipped_required, 1);
assert.match(formatSiteGenerationHumanSummary(blocked), /🔴 NO_GO — génération non validée/);
assert.match(formatSiteGenerationHumanSummary(blocked), /Arrêt : Validation des données/);

const clean = structuredClone(report);
clean.warnings = [];
clean.stages[3] = { ...clean.stages[3], status: 'pass', raw_status: 'pass', warnings: [], details: null };
const cleanSummary = buildSiteGenerationHumanSummary(clean);
assert.equal(cleanSummary.decision, 'GO');
assert.equal(cleanSummary.attention_required, false);
assert.equal(cleanSummary.counts.human_attention, 0);
assert.match(formatSiteGenerationHumanSummary(clean), /Aucun contrôle supplémentaire signalé/);

assert.throws(
  () => buildSiteGenerationHumanSummary({ schema: 'wrong', version: 1, checklist: { name: 'x' }, stages: [] }),
  (error) => error instanceof SiteGenerationHumanSummaryError && error.code === 'UNSUPPORTED_RUN_REPORT'
);

console.log('site generation human summary tests: ok');
