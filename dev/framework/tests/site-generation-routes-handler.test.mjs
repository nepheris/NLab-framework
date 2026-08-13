import assert from 'node:assert/strict';
import { createRoutesStageHandler } from '../tools/site/handlers/routes-handler.mjs';
import { runSiteGeneration } from '../tools/site/run-site-generation.mjs';

const pagesRendered = {
  pages: {
    home: { id: 'home', content: '<h1>Home</h1>' },
    recipes: { id: 'recipes', content: '<ul></ul>' }
  },
  page_ids: ['home', 'recipes'],
  page_count: 2,
  total_records: 3
};

const config = {
  routes: [
    { id: 'route.home', page_id: 'home', path: '/' },
    { id: 'route.recipes', page_id: 'recipes', path: '/recipes' }
  ]
};

{
  const handler = createRoutesStageHandler({ config });
  const result = await handler({
    stage: { id: 'generation.routes', type: 'routes' },
    inputs: { 'pages.rendered': pagesRendered }
  });
  assert.equal(result.status, 'pass');
  assert.equal(result.outputs['routes.manifest'].route_count, 2);
  assert.deepEqual(result.outputs['routes.manifest'].paths, ['/', '/recipes']);
  assert.equal(result.outputs['routes.manifest'].by_path['/recipes'], 'route.recipes');
}

{
  const handler = createRoutesStageHandler();
  const result = await handler({
    stage: { id: 'generation.routes', type: 'routes' },
    inputs: { 'pages.rendered': pagesRendered, 'routes.config': config }
  });
  assert.equal(result.status, 'pass');
}

{
  const handler = createRoutesStageHandler({
    config: { routes: [
      { id: 'a', page_id: 'home', path: '/same' },
      { id: 'b', page_id: 'recipes', path: '/same' }
    ] }
  });
  const result = await handler({ stage: { type: 'routes' }, inputs: { 'pages.rendered': pagesRendered } });
  assert.equal(result.status, 'fail');
  assert.equal(result.details.error.code, 'DUPLICATE_ROUTE_PATH');
}

{
  const handler = createRoutesStageHandler({ config: { routes: [{ id: 'a', page_id: 'missing', path: '/x' }] } });
  const result = await handler({ stage: { type: 'routes' }, inputs: { 'pages.rendered': pagesRendered } });
  assert.equal(result.status, 'fail');
  assert.equal(result.details.error.code, 'UNKNOWN_ROUTE_PAGE');
}

{
  const handler = createRoutesStageHandler({ config: { routes: [{ id: 'a', page_id: 'home', path: '/../x' }] } });
  const result = await handler({ stage: { type: 'routes' }, inputs: { 'pages.rendered': pagesRendered } });
  assert.equal(result.status, 'fail');
  assert.equal(result.details.error.code, 'INVALID_ROUTE_PATH');
}

{
  const handler = createRoutesStageHandler({ config });
  const result = await handler({ stage: { type: 'render' }, inputs: { 'pages.rendered': pagesRendered } });
  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'unexpected_stage_type');
}

{
  const handler = createRoutesStageHandler({ config });
  const result = await handler({ stage: { type: 'routes' } });
  assert.equal(result.status, 'fail');
  assert.equal(result.details.reason, 'pages_rendered_artifact_required');
}

{
  const checklist = {
    schema: 'nlab.site-generation-checklist',
    version: 1,
    name: 'Routes integration test',
    stages: [
      {
        id: 'generation.render', type: 'render', label: 'Render', mode: 'machine', required: true,
        depends_on: [], inputs: [], outputs: ['pages.rendered'], success_criteria: ['rendered'], on_failure: 'stop'
      },
      {
        id: 'generation.routes', type: 'routes', label: 'Routes', mode: 'machine', required: true,
        depends_on: ['generation.render'], inputs: ['pages.rendered', 'routes.config'], outputs: ['routes.manifest'], success_criteria: ['routes'], on_failure: 'stop'
      }
    ]
  };
  const report = await runSiteGeneration(checklist, {
    artifacts: { 'routes.config': config },
    handlers: {
      'generation.render': () => ({ status: 'pass', outputs: { 'pages.rendered': pagesRendered } }),
      'generation.routes': createRoutesStageHandler()
    }
  });
  assert.equal(report.ok, true);
  assert.equal(report.stages[1].outputs['routes.manifest'].route_count, 2);
}

console.log('site-generation-routes-handler.test.mjs: OK');
