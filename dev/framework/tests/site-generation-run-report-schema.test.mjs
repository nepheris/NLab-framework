import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSiteGeneration } from '../tools/site/run-site-generation.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(here, '../data/site-generation-run-report.schema.json');
const fixturePath = path.join(here, 'fixtures/site-generation-checklist.json');

const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
const checklist = JSON.parse(await fs.readFile(fixturePath, 'utf8'));

assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.$id, 'https://nlab.dev/schemas/site-generation-run-report.schema.json');
assert.equal(schema.properties.schema.const, 'nlab.site-generation-run-report');
assert.equal(schema.properties.version.const, 1);
assert.deepEqual(
  schema.$defs.stageResult.properties.status.enum,
  ['pass', 'warn', 'fail', 'blocked', 'skipped']
);
assert.deepEqual(
  schema.$defs.stageResult.properties.mode.enum,
  ['machine', 'human', 'hybrid']
);

const machineHandlers = {};
for (const stage of checklist.stages) {
  if (stage.mode === 'machine') {
    machineHandlers[stage.id] = async () => ({
      status: 'pass',
      outputs: Object.fromEntries(stage.outputs.map((key) => [key, true]))
    });
  }
}

const decisions = {};
for (const stage of checklist.stages) {
  if (stage.mode === 'human' || stage.mode === 'hybrid') {
    decisions[stage.id] = {
      status: 'pass',
      outputs: Object.fromEntries(stage.outputs.map((key) => [key, true]))
    };
  }
}

const report = await runSiteGeneration(checklist, {
  handlers: machineHandlers,
  decisions,
  clock: () => '2026-08-13T04:01:00.000Z'
});

assert.equal(report.schema, 'nlab.site-generation-run-report');
assert.equal(report.version, 1);
assert.equal(report.ok, true);
assert.equal(report.halted, false);
assert.equal(report.halt_stage, null);
assert.equal(report.checklist.stage_count, checklist.stages.length);
assert.equal(report.stages.length, checklist.stages.length);
assert.deepEqual(report.blocking_stage_ids, []);
assert.deepEqual(report.skipped_required_stage_ids, []);

for (const result of report.stages) {
  assert.ok(schema.$defs.stageResult.properties.status.enum.includes(result.status));
  assert.ok(schema.$defs.stageResult.properties.mode.enum.includes(result.mode));
  assert.equal(typeof result.required, 'boolean');
  assert.equal(typeof result.outputs, 'object');
  assert.ok(Array.isArray(result.warnings));
  if (result.status === 'skipped') {
    assert.equal(typeof result.reason, 'string');
  } else {
    assert.ok(['pass', 'warn', 'fail', 'blocked'].includes(result.raw_status));
    assert.ok(Object.hasOwn(result, 'details'));
  }
}

const blockedChecklist = {
  ...checklist,
  stages: checklist.stages.slice(0, 2)
};
const blocked = await runSiteGeneration(blockedChecklist, {
  decisions: {
    'generation.preflight': { status: 'blocked', details: { reason: 'human_gate' } }
  },
  clock: () => '2026-08-13T04:02:00.000Z'
});

assert.equal(blocked.ok, false);
assert.equal(blocked.halted, true);
assert.equal(blocked.halt_stage, 'generation.preflight');
assert.deepEqual(blocked.blocking_stage_ids, ['generation.preflight']);
assert.deepEqual(blocked.skipped_required_stage_ids, ['generation.data-load']);
assert.equal(blocked.stages[1].status, 'skipped');
assert.equal(blocked.stages[1].reason, 'halted_by:generation.preflight');

console.log('site generation run report schema tests: ok');
