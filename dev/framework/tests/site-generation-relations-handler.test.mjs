import assert from 'node:assert/strict';

import { createRelationsStageHandler } from '../tools/site/handlers/relations-handler.mjs';
import { runSiteGeneration } from '../tools/site/run-site-generation.mjs';

const registry = {
  collections: {
    groups: {
      provider: 'json-static',
      source: 'groups.json',
      idField: 'id'
    },
    items: {
      provider: 'json-static',
      source: 'items.json',
      idField: 'id',
      relations: [
        {
          field: 'group_id',
          target: 'groups',
          targetField: 'id',
          cardinality: 'one',
          onMissing: 'warn'
        }
      ]
    }
  }
};

const loaded = {
  collections: {
    groups: [
      { id: 'g1', label: 'Group 1' },
      { id: 'g2', label: 'Group 2' }
    ],
    items: [
      { id: 'i1', group_id: 'g1' },
      { id: 'i2', group_id: 'g2' }
    ]
  }
};

{
  const handler = createRelationsStageHandler({ registry });
  const result = await handler({
    stage: { id: 'generation.relations', type: 'relations' },
    inputs: { 'data.loaded': structuredClone(loaded) }
  });

  assert.equal(result.status, 'pass');
  assert.equal(result.outputs['data.resolved'].total_records, 4);
  assert.equal(result.outputs['relations.report'].warnings, 0);
  assert.equal(
    result.outputs['data.resolved'].collections.items[0].resolved.group_id.label,
    'Group 1'
  );
}

{
  const warningLoaded = structuredClone(loaded);
  warningLoaded.collections.items.push({ id: 'i3', group_id: 'missing' });
  const handler = createRelationsStageHandler({ registry });
  const result = await handler({
    stage: { id: 'generation.relations', type: 'relations' },
    artifacts: { 'data.loaded': warningLoaded }
  });

  assert.equal(result.status, 'warn');
  assert.equal(result.outputs['relations.report'].warnings, 1);
  assert.equal(result.outputs['relations.report'].issues[0].code, 'REFERENCE_NOT_FOUND');
}

{
  const warningLoaded = structuredClone(loaded);
  warningLoaded.collections.items.push({ id: 'i3', group_id: 'missing' });
  const handler = createRelationsStageHandler({ registry, failOnWarnings: true });
  const result = await handler({
    stage: { id: 'generation.relations', type: 'relations' },
    artifacts: { 'data.loaded': warningLoaded }
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'relation_issues');
}

{
  const strictRegistry = structuredClone(registry);
  strictRegistry.collections.items.relations[0].onMissing = 'error';
  const strictLoaded = structuredClone(loaded);
  strictLoaded.collections.items.push({ id: 'i3', group_id: 'missing' });
  const handler = createRelationsStageHandler({ registry: strictRegistry });
  const result = await handler({
    stage: { id: 'generation.relations', type: 'relations' },
    inputs: { 'data.loaded': strictLoaded }
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.collection, 'items');
  assert.equal(result.details.error.code, 'REFERENCE_NOT_FOUND');
}

{
  const handler = createRelationsStageHandler({ registry, collections: ['items', 'items'] });
  const result = await handler({
    stage: { id: 'generation.relations', type: 'relations' },
    inputs: { 'data.loaded': structuredClone(loaded) }
  });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.outputs['data.resolved'].collection_names, ['items']);
  assert.equal(result.outputs['data.resolved'].total_records, 2);
}

{
  const handler = createRelationsStageHandler({ registry });
  const result = await handler({
    stage: { id: 'generation.relations', type: 'relations' }
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'data_loaded_artifact_required');
}

{
  const handler = createRelationsStageHandler({ registry });
  const result = await handler({
    stage: { id: 'generation.render', type: 'render' },
    inputs: { 'data.loaded': structuredClone(loaded) }
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'unexpected_stage_type');
}

{
  const checklist = {
    schema: 'nlab.site-generation-checklist',
    version: 1,
    name: 'Relations integration test',
    stages: [
      {
        id: 'generation.data-load',
        type: 'data-load',
        label: 'Load',
        mode: 'machine',
        required: true,
        depends_on: [],
        inputs: [],
        outputs: ['data.loaded'],
        success_criteria: [],
        on_failure: 'stop'
      },
      {
        id: 'generation.validation',
        type: 'validation',
        label: 'Validate',
        mode: 'machine',
        required: true,
        depends_on: ['generation.data-load'],
        inputs: ['data.loaded'],
        outputs: ['validation.report'],
        success_criteria: [],
        on_failure: 'stop'
      },
      {
        id: 'generation.relations',
        type: 'relations',
        label: 'Relations',
        mode: 'machine',
        required: true,
        depends_on: ['generation.validation'],
        inputs: ['data.loaded'],
        outputs: ['data.resolved', 'relations.report'],
        success_criteria: [],
        on_failure: 'stop'
      }
    ]
  };

  const report = await runSiteGeneration(checklist, {
    handlers: {
      'generation.data-load': () => ({
        status: 'pass',
        outputs: { 'data.loaded': structuredClone(loaded) }
      }),
      'generation.validation': ({ inputs }) => ({
        status: inputs['data.loaded'] ? 'pass' : 'fail',
        outputs: { 'validation.report': { valid: true } }
      }),
      'generation.relations': createRelationsStageHandler({ registry })
    }
  });

  assert.equal(report.ok, true);
  const relationStage = report.stages.find((stage) => stage.id === 'generation.relations');
  assert.equal(relationStage.status, 'pass');
  assert.equal(relationStage.outputs['data.resolved'].collections.items[1].resolved.group_id.id, 'g2');
}

console.log('site-generation-relations-handler.test.mjs: OK');
