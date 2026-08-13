import assert from 'node:assert/strict';

import { JsonDataProvider } from '../providers/json-data-provider.js';
import { createDataLoadStageHandler } from '../tools/site/handlers/data-load-handler.mjs';
import { createSiteGenerationHandlerRegistry } from '../tools/site/site-generation-handler-registry.mjs';
import { runSiteGeneration } from '../tools/site/run-site-generation.mjs';

function createFetch(payloads) {
  return async (url) => {
    if (!Object.prototype.hasOwnProperty.call(payloads, url)) {
      return { ok: false, status: 404, async json() { return null; } };
    }
    return {
      ok: true,
      status: 200,
      async json() { return structuredClone(payloads[url]); }
    };
  };
}

function createProvider() {
  return new JsonDataProvider({
    registry: {
      collections: {
        groups: { source: 'groups.json' },
        items: { source: 'items.json' }
      }
    },
    baseUrl: 'https://example.test/data/',
    fetchFn: createFetch({
      'https://example.test/data/groups.json': [
        { id: 'g1', label: 'Group 1' },
        { id: 'g2', label: 'Group 2' }
      ],
      'https://example.test/data/items.json': [
        { id: 'i1', group_id: 'g1' },
        { id: 'i2', group_id: 'g2' },
        { id: 'i3', group_id: 'g1' }
      ]
    })
  });
}

{
  const provider = createProvider();
  const handler = createDataLoadStageHandler({ provider });
  const result = await handler({ stage: { id: 'generation.data-load', type: 'data-load' } });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.outputs['data.loaded'].collection_names, ['groups', 'items']);
  assert.deepEqual(result.outputs['data.loaded'].record_counts, { groups: 2, items: 3 });
  assert.equal(result.outputs['data.loaded'].total_records, 5);
  assert.equal(result.details.provider_type, 'json-static');
  assert.equal(result.details.collection_count, 2);
}

{
  const provider = createProvider();
  const handler = createDataLoadStageHandler({ provider, collections: ['items', 'items'] });
  const result = await handler({ stage: { id: 'generation.data-load', type: 'data-load' } });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.outputs['data.loaded'].collection_names, ['items']);
  assert.equal(result.outputs['data.loaded'].total_records, 3);
}

{
  const provider = new JsonDataProvider({
    registry: { collections: { missing: { source: 'missing.json' } } },
    baseUrl: 'https://example.test/data/',
    fetchFn: createFetch({})
  });
  const handler = createDataLoadStageHandler({ provider });
  const result = await handler({ stage: { id: 'generation.data-load', type: 'data-load' } });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'data_load_failed');
  assert.equal(result.details.collection, 'missing');
  assert.equal(result.details.error.code, 'LOAD_FAILED');
}

{
  const provider = createProvider();
  const handler = createDataLoadStageHandler({ provider });
  const result = await handler({ stage: { id: 'generation.render', type: 'render' } });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'unexpected_stage_type');
}

{
  const checklist = {
    schema: 'nlab.site-generation-checklist',
    version: 1,
    name: 'Data-load handler integration test',
    stages: [
      {
        id: 'generation.data-load',
        type: 'data-load',
        label: 'Load source data',
        mode: 'machine',
        required: true,
        depends_on: [],
        inputs: ['data.registry', 'data.sources'],
        outputs: ['data.loaded'],
        success_criteria: ['Collections are loaded'],
        on_failure: 'stop'
      }
    ]
  };

  const registry = createSiteGenerationHandlerRegistry();
  registry.registerType('data-load', createDataLoadStageHandler({ provider: createProvider() }), {
    capability: 'data.load'
  });

  const coverage = registry.inspect(checklist);
  assert.equal(coverage.ready_for_machine_stages, true);
  assert.deepEqual(coverage.missing_machine_stage_ids, []);

  const report = await runSiteGeneration(checklist, {
    handlers: registry.buildHandlers(checklist)
  });

  assert.equal(report.ok, true);
  assert.equal(report.stages[0].status, 'pass');
  assert.equal(report.stages[0].outputs['data.loaded'].total_records, 5);
}

console.log('site-generation-data-load-handler.test.mjs: OK');
