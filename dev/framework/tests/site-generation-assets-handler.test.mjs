import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAssetsStageHandler } from '../tools/site/handlers/assets-handler.mjs';
import { runSiteGeneration } from '../tools/site/run-site-generation.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nlab-assets-handler-'));
const sourceRoot = path.join(root, 'source');
const outputRoot = path.join(root, 'output');
await fs.mkdir(path.join(sourceRoot, 'img'), { recursive: true });
await fs.writeFile(path.join(sourceRoot, 'img', 'logo.svg'), '<svg>logo</svg>');
await fs.writeFile(path.join(sourceRoot, 'img', 'fallback.svg'), '<svg>fallback</svg>');

const pagesRendered = {
  pages: { home: { id: 'home', content: '<h1>Home</h1>' } },
  page_ids: ['home'],
  page_count: 1
};

const handler = createAssetsStageHandler({
  sourceRoot,
  outputRoot,
  sources: [
    { id: 'logo', source: 'img/logo.svg', target: 'assets/logo.svg' },
    { id: 'hero', source: 'img/missing.svg', fallback: 'img/fallback.svg', target: 'assets/hero.svg' },
    { id: 'optional', source: 'img/nope.svg', target: 'assets/nope.svg', required: false }
  ]
});

let result = await handler({
  stage: { id: 'generation.assets', type: 'assets' },
  inputs: { 'pages.rendered': pagesRendered }
});
assert.equal(result.status, 'warn');
assert.equal(result.outputs['assets.prepared'].asset_count, 2);
assert.equal(result.outputs['assets.prepared'].missing_count, 1);
assert.equal(result.details.fallbacks, 1);
assert.equal(result.warnings.includes('asset_fallback_used:hero'), true);
assert.equal(result.warnings.includes('optional_asset_missing:optional'), true);
assert.equal(await fs.readFile(path.join(outputRoot, 'assets', 'logo.svg'), 'utf8'), '<svg>logo</svg>');
assert.equal(await fs.readFile(path.join(outputRoot, 'assets', 'hero.svg'), 'utf8'), '<svg>fallback</svg>');

const artifactHandler = createAssetsStageHandler({ sourceRoot, outputRoot });
result = await artifactHandler({
  stage: { id: 'generation.assets', type: 'assets' },
  inputs: {
    'pages.rendered': pagesRendered,
    'assets.sources': [{ id: 'logo2', source: 'img/logo.svg', target: 'assets/logo2.svg' }]
  }
});
assert.equal(result.status, 'pass');
assert.equal(result.outputs['assets.prepared'].asset_count, 1);

const requiredMissing = createAssetsStageHandler({
  sourceRoot,
  outputRoot,
  sources: [{ id: 'required', source: 'img/absent.svg', target: 'assets/absent.svg' }]
});
result = await requiredMissing({
  stage: { type: 'assets' },
  inputs: { 'pages.rendered': pagesRendered }
});
assert.equal(result.status, 'fail');
assert.equal(result.details.error.code, 'ASSET_NOT_FOUND');

const duplicateTarget = createAssetsStageHandler({
  sourceRoot,
  outputRoot,
  sources: [
    { id: 'a', source: 'img/logo.svg', target: 'assets/shared.svg' },
    { id: 'b', source: 'img/fallback.svg', target: 'assets/shared.svg' }
  ]
});
result = await duplicateTarget({ stage: { type: 'assets' }, inputs: { 'pages.rendered': pagesRendered } });
assert.equal(result.status, 'fail');
assert.equal(result.details.error.code, 'DUPLICATE_ASSET_TARGET');

const unsafe = createAssetsStageHandler({
  sourceRoot,
  outputRoot,
  sources: [{ id: 'bad', source: '../secret', target: 'assets/secret' }]
});
result = await unsafe({ stage: { type: 'assets' }, inputs: { 'pages.rendered': pagesRendered } });
assert.equal(result.status, 'fail');
assert.equal(result.details.error.code, 'UNSAFE_ASSET_PATH');

result = await handler({ stage: { type: 'routes' }, inputs: { 'pages.rendered': pagesRendered } });
assert.equal(result.status, 'fail');
assert.equal(result.details.reason, 'unexpected_stage_type');

result = await handler({ stage: { type: 'assets' }, inputs: {} });
assert.equal(result.status, 'fail');
assert.equal(result.details.reason, 'pages_rendered_artifact_required');

const pipelineOutput = path.join(root, 'pipeline-output');
const pipelineHandler = createAssetsStageHandler({
  sourceRoot,
  outputRoot: pipelineOutput,
  sources: [{ id: 'logo', source: 'img/logo.svg', target: 'assets/logo.svg' }]
});
const checklist = {
  schema: 'nlab.site-generation-checklist',
  version: 1,
  name: 'assets integration',
  stages: [
    {
      id: 'generation.render', type: 'render', label: 'render', mode: 'machine', required: true,
      depends_on: [], inputs: [], outputs: ['pages.rendered'], success_criteria: ['rendered'], on_failure: 'stop'
    },
    {
      id: 'generation.assets', type: 'assets', label: 'assets', mode: 'machine', required: true,
      depends_on: ['generation.render'], inputs: ['pages.rendered', 'assets.sources'], outputs: ['assets.prepared'],
      success_criteria: ['prepared'], on_failure: 'stop'
    }
  ]
};
const report = await runSiteGeneration(checklist, {
  handlers: {
    'generation.render': () => ({ status: 'pass', outputs: { 'pages.rendered': pagesRendered } }),
    'generation.assets': pipelineHandler
  }
});
assert.equal(report.ok, true);
assert.equal(report.stages.find((stage) => stage.id === 'generation.assets').status, 'pass');
assert.equal(await fs.readFile(path.join(pipelineOutput, 'assets', 'logo.svg'), 'utf8'), '<svg>logo</svg>');

await fs.rm(root, { recursive: true, force: true });
console.log('site generation assets handler tests: ok');
