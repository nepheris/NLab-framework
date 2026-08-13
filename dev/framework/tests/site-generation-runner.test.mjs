import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runSiteGeneration,
  SiteGenerationRunnerError
} from '../tools/site/run-site-generation.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(here, 'fixtures', 'site-generation-checklist.json');
const checklist = JSON.parse(await fs.readFile(fixturePath, 'utf8'));

const handlers = {};
for (const stage of checklist.stages) {
  if (stage.mode !== 'human') {
    handlers[stage.id] = ({ stage: current }) => ({
      status: 'pass',
      outputs: Object.fromEntries(current.outputs.map((name) => [name, `${name}:ok`]))
    });
  }
}

let report = await runSiteGeneration(checklist, {
  handlers,
  decisions: {
    'generation.comparison': { status: 'pass', details: { reviewer: 'HUMAN' } }
  },
  clock: () => '2026-08-13T05:32:00+02:00'
});

assert.equal(report.schema, 'nlab.site-generation-run-report');
assert.equal(report.version, 1);
assert.equal(report.generated_at, '2026-08-13T05:32:00+02:00');
assert.equal(report.ok, true);
assert.equal(report.halted, false);
assert.equal(report.stages.length, checklist.stages.length);
assert.equal(report.blocking_stage_ids.length, 0);
assert.equal(report.skipped_required_stage_ids.length, 0);
assert.equal(report.stages.at(-1).id, 'generation.report');

report = await runSiteGeneration(checklist, {
  handlers: {
    ...handlers,
    'generation.validation': () => ({ status: 'fail', details: { reason: 'schema failure' } })
  },
  decisions: { 'generation.comparison': 'pass' }
});

assert.equal(report.ok, false);
assert.equal(report.halted, true);
assert.equal(report.halt_stage, 'generation.validation');
assert.deepEqual(report.blocking_stage_ids, ['generation.validation']);
assert.equal(report.stages.find((stage) => stage.id === 'generation.relations').status, 'skipped');
assert.equal(report.stages.find((stage) => stage.id === 'generation.report').status, 'skipped');

const optionalWarningChecklist = structuredClone(checklist);
const comparison = optionalWarningChecklist.stages.find((stage) => stage.id === 'generation.comparison');
comparison.on_failure = 'warn';
report = await runSiteGeneration(optionalWarningChecklist, {
  handlers,
  decisions: { 'generation.comparison': { status: 'fail' } }
});
assert.equal(report.ok, true);
assert.equal(report.stages.find((stage) => stage.id === 'generation.comparison').status, 'warn');
assert.equal(report.warnings.some((warning) => warning.message === 'failure_downgraded_by_policy'), true);

const humanOnlyHandlers = { ...handlers };
delete humanOnlyHandlers['generation.preview'];
report = await runSiteGeneration(checklist, {
  handlers: humanOnlyHandlers,
  decisions: { 'generation.comparison': 'pass' }
});
assert.equal(report.ok, false);
assert.equal(report.halt_stage, 'generation.preview');
assert.equal(report.stages.find((stage) => stage.id === 'generation.preview').status, 'blocked');
assert.equal(
  report.stages.find((stage) => stage.id === 'generation.preview').details.reason,
  'explicit_decision_required'
);

const missingMachineHandler = { ...handlers };
delete missingMachineHandler['generation.validation'];
report = await runSiteGeneration(checklist, {
  handlers: missingMachineHandler,
  decisions: { 'generation.comparison': 'pass' }
});
assert.equal(report.ok, false);
assert.equal(report.halt_stage, 'generation.validation');
assert.equal(
  report.stages.find((stage) => stage.id === 'generation.validation').details.reason,
  'handler_required'
);

await assert.rejects(
  () => runSiteGeneration({
    ...checklist,
    stages: [...checklist.stages, {
      ...checklist.stages[0],
      id: 'generation.invalid',
      depends_on: ['generation.unknown']
    }]
  }),
  (error) => error instanceof SiteGenerationRunnerError && error.code === 'UNKNOWN_DEPENDENCY'
);

const cyclic = structuredClone(checklist);
cyclic.stages[0].depends_on = ['generation.report'];
await assert.rejects(
  () => runSiteGeneration(cyclic),
  (error) => error instanceof SiteGenerationRunnerError && error.code === 'DEPENDENCY_CYCLE'
);

console.log('site generation runner tests: ok');
