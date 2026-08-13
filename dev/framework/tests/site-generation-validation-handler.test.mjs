import assert from 'node:assert/strict';

import { createValidationStageHandler } from '../tools/site/handlers/validation-handler.mjs';
import { createSiteGenerationHandlerRegistry } from '../tools/site/site-generation-handler-registry.mjs';
import { runSiteGeneration } from '../tools/site/run-site-generation.mjs';

const registryDefinition = {
  providers: {
    json: { type: 'json-static' }
  },
  collections: {
    groups: {
      provider: 'json',
      source: 'groups.json',
      idField: 'id',
      requiredFields: ['label']
    },
    items: {
      provider: 'json',
      source: 'items.json',
      idField: 'id',
      requiredFields: ['name', 'group_id'],
      relations: [
        {
          field: 'group_id',
          target: 'groups',
          targetField: 'id',
          cardinality: 'one',
          required: true,
          onMissing: 'warn'
        }
      ]
    }
  }
};

function dependencyWithLoaded(collections) {
  return {
    'generation.data-load': {
      id: 'generation.data-load',
      status: 'pass',
      outputs: {
        'data.loaded': {
          collections,
          collection_names: Object.keys(collections),
          record_counts: Object.fromEntries(Object.entries(collections).map(([name, rows]) => [name, rows.length])),
          total_records: Object.values(collections).reduce((sum, rows) => sum + rows.length, 0)
        }
      }
    }
  };
}

const validCollections = {
  groups: [
    { id: 'g1', label: 'Group 1' },
    { id: 'g2', label: 'Group 2' }
  ],
  items: [
    { id: 'i1', name: 'Item 1', group_id: 'g1' },
    { id: 'i2', name: 'Item 2', group_id: 'g2' }
  ]
};

{
  const handler = createValidationStageHandler({ registry: registryDefinition });
  const result = await handler({
    stage: { id: 'generation.validation', type: 'validation' },
    dependencies: dependencyWithLoaded(validCollections)
  });

  assert.equal(result.status, 'pass');
  assert.equal(result.outputs['validation.report'].valid, true);
  assert.equal(result.outputs['validation.report'].checked, 4);
  assert.equal(result.details.errors, 0);
  assert.equal(result.details.warnings, 0);
}

{
  const collections = structuredClone(validCollections);
  delete collections.items[0].name;
  const handler = createValidationStageHandler({ registry: registryDefinition });
  const result = await handler({
    stage: { id: 'generation.validation', type: 'validation' },
    dependencies: dependencyWithLoaded(collections)
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.outputs['validation.report'].valid, false);
  assert.equal(result.details.errors > 0, true);
  assert.equal(
    result.outputs['validation.report'].issues.some((issue) => issue.code === 'MISSING_REQUIRED_FIELD'),
    true
  );
}

{
  const collections = structuredClone(validCollections);
  collections.items[0].group_id = 'missing-group';
  const handler = createValidationStageHandler({ registry: registryDefinition });
  const result = await handler({
    stage: { id: 'generation.validation', type: 'validation' },
    dependencies: dependencyWithLoaded(collections)
  });

  assert.equal(result.status, 'warn');
  assert.equal(result.outputs['validation.report'].valid, true);
  assert.equal(result.details.errors, 0);
  assert.equal(result.details.warnings, 1);
  assert.deepEqual(result.warnings, ['validation_warnings:1']);
}

{
  const collections = structuredClone(validCollections);
  collections.items[0].group_id = 'missing-group';
  const handler = createValidationStageHandler({ registry: registryDefinition, failOnWarnings: true });
  const result = await handler({
    stage: { id: 'generation.validation', type: 'validation' },
    dependencies: dependencyWithLoaded(collections)
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'validation_issues');
}

{
  const handler = createValidationStageHandler({ registry: registryDefinition, collections: ['items', 'items'] });
  const result = await handler({
    stage: { id: 'generation.validation', type: 'validation' },
    dependencies: dependencyWithLoaded(validCollections)
  });

  assert.equal(result.status, 'pass');
  assert.equal(result.outputs['validation.report'].scope, 'selected');
  assert.deepEqual(result.details.selected_collections, ['items']);
  assert.equal(result.outputs['validation.report'].checked, 2);
}

{
  const handler = createValidationStageHandler({ registry: registryDefinition });
  const result = await handler({
    stage: { id: 'generation.validation', type: 'validation' },
    dependencies: {}
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'data_loaded_dependency_required');
}

{
  const handler = createValidationStageHandler({ registry: registryDefinition });
  const result = await handler({
    stage: { id: 'generation.render', type: 'render' },
    dependencies: dependencyWithLoaded(validCollections)
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'unexpected_stage_type');
}

{
  const checklist = {
    schema: 'nlab.site-generation-checklist',
    version: 1,
    name: 'Validation handler integration test',
    stages: [
      {
        id: 'generation.data-load',
        type: 'data-load',
        label: 'Load source data',
        mode: 'machine',
        required: true,
        depends_on: [],
        inputs: [],
        outputs: ['data.loaded'],
        success_criteria: ['Data loaded'],
        on_failure: 'stop'
      },
      {
        id: 'generation.validation',
        type: 'validation',
        label: 'Validate data',
        mode: 'machine',
        required: true,
        depends_on: ['generation.data-load'],
        inputs: ['data.loaded'],
        outputs: ['validation.report'],
        success_criteria: ['Data valid'],
        on_failure: 'stop'
      }
    ]
  };

  const handlers = createSiteGenerationHandlerRegistry();
  handlers.registerType('data-load', async () => ({
    status: 'pass',
    outputs: dependencyWithLoaded(validCollections)['generation.data-load'].outputs
  }));
  handlers.registerType('validation', createValidationStageHandler({ registry: registryDefinition }));

  const report = await runSiteGeneration(checklist, {
    handlers: handlers.buildHandlers(checklist)
  });

  assert.equal(report.ok, true);
  assert.equal(report.stages[0].status, 'pass');
  assert.equal(report.stages[1].status, 'pass');
  assert.equal(report.stages[1].outputs['validation.report'].checked, 4);
}

console.log('site-generation-validation-handler.test.mjs: OK');
