import assert from 'node:assert/strict';

import { RendererWiz } from '../wiz/renderer-wiz.js';
import { createRenderStageHandler } from '../tools/site/handlers/render-handler.mjs';
import { runSiteGeneration } from '../tools/site/run-site-generation.mjs';

function resolvedFixture() {
  return {
    collections: {
      groups: [
        { data: { id: 'g1', name: 'Group 1', description: 'First' }, resolved: {}, issues: [] },
        { data: { id: 'g2', name: 'Group 2', description: 'Second' }, resolved: {}, issues: [] }
      ],
      items: [
        {
          data: { id: 'i1', name: 'Item 1', group_id: 'g1' },
          resolved: { group_id: { id: 'g1', name: 'Group 1' } },
          issues: []
        }
      ]
    },
    collection_names: ['groups', 'items'],
    record_counts: { groups: 2, items: 1 },
    total_records: 3
  };
}

const config = {
  pages: [
    {
      id: 'groups-cards',
      collection: 'groups',
      renderer: 'cards',
      source: 'data',
      options: { titleField: 'name', textField: 'description' }
    },
    {
      id: 'items-list',
      collection: 'items',
      renderer: 'list',
      source: 'enriched',
      options: { titleField: 'name' }
    }
  ]
};

{
  const handler = createRenderStageHandler({ renderer: new RendererWiz(), config });
  const result = await handler({
    stage: { id: 'generation.render', type: 'render' },
    inputs: { 'data.resolved': resolvedFixture() }
  });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.outputs['pages.rendered'].page_ids, ['groups-cards', 'items-list']);
  assert.equal(result.outputs['pages.rendered'].page_count, 2);
  assert.equal(result.outputs['pages.rendered'].total_records, 3);
  assert.match(result.outputs['pages.rendered'].pages['groups-cards'].content, /Group 1/);
  assert.match(result.outputs['pages.rendered'].pages['groups-cards'].content, /First/);
  assert.match(result.outputs['pages.rendered'].pages['items-list'].content, /Item 1/);
  assert.equal(result.details.renderer_component, 'RendererWiz');
  assert.equal(result.details.renderer_nlab_id, null);
}

{
  const handler = createRenderStageHandler({ renderer: new RendererWiz() });
  const result = await handler({
    stage: { id: 'generation.render', type: 'render' },
    artifacts: {
      'data.resolved': resolvedFixture(),
      'render.config': { pages: [{ id: 'groups-table', collection: 'groups', renderer: 'table', source: 'data' }] }
    }
  });

  assert.equal(result.status, 'pass');
  assert.match(result.outputs['pages.rendered'].pages['groups-table'].content, /^<table>/);
}

{
  const handler = createRenderStageHandler({ renderer: new RendererWiz(), config: {
    pages: [{ id: 'bad-renderer', collection: 'groups', renderer: 'does-not-exist' }]
  } });
  const result = await handler({
    stage: { id: 'generation.render', type: 'render' },
    inputs: { 'data.resolved': resolvedFixture() }
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.error.code, 'UNKNOWN_RENDERER');
  assert.equal(result.details.page_id, 'bad-renderer');
}

{
  const handler = createRenderStageHandler({ renderer: new RendererWiz(), config: {
    pages: [{ id: 'missing', collection: 'unknown', renderer: 'list' }]
  } });
  const result = await handler({
    stage: { id: 'generation.render', type: 'render' },
    inputs: { 'data.resolved': resolvedFixture() }
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.error.code, 'RESOLVED_COLLECTION_REQUIRED');
}

{
  const handler = createRenderStageHandler({ renderer: new RendererWiz(), config: {
    pages: [
      { id: 'duplicate', collection: 'groups', renderer: 'list' },
      { id: 'duplicate', collection: 'items', renderer: 'list' }
    ]
  } });
  const result = await handler({
    stage: { id: 'generation.render', type: 'render' },
    inputs: { 'data.resolved': resolvedFixture() }
  });

  assert.equal(result.status, 'fail');
  assert.equal(result.details.error.code, 'DUPLICATE_PAGE_ID');
}

{
  const handler = createRenderStageHandler({ renderer: new RendererWiz(), config });
  const result = await handler({ stage: { id: 'generation.assets', type: 'assets' } });
  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'unexpected_stage_type');
}

{
  const handler = createRenderStageHandler({ renderer: new RendererWiz(), config });
  const result = await handler({ stage: { id: 'generation.render', type: 'render' } });
  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'data_resolved_artifact_required');
}

{
  const checklist = {
    schema: 'nlab.site-generation-checklist',
    version: 1,
    name: 'Render handler integration',
    stages: [
      {
        id: 'generation.render',
        type: 'render',
        label: 'Render pages',
        mode: 'machine',
        required: true,
        depends_on: [],
        inputs: ['data.resolved', 'render.config'],
        outputs: ['pages.rendered'],
        success_criteria: ['Pages render'],
        on_failure: 'stop'
      }
    ]
  };

  const report = await runSiteGeneration(checklist, {
    artifacts: {
      'data.resolved': resolvedFixture(),
      'render.config': config
    },
    handlers: {
      'generation.render': createRenderStageHandler({ renderer: new RendererWiz() })
    }
  });

  assert.equal(report.ok, true);
  assert.equal(report.stages[0].status, 'pass');
  assert.equal(report.stages[0].outputs['pages.rendered'].page_count, 2);
}

console.log('site-generation-render-handler.test.mjs: OK');
