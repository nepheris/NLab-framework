import assert from 'node:assert/strict';
import {
  SiteGenerationHandlerRegistryError,
  createSiteGenerationHandlerRegistry
} from '../tools/site/site-generation-handler-registry.mjs';

const checklist = {
  schema: 'nlab.site-generation-checklist',
  version: 1,
  name: 'Registry test',
  stages: [
    { id: 'generation.preflight', type: 'preflight', mode: 'hybrid', required: true },
    { id: 'generation.data-load', type: 'data-load', mode: 'machine', required: true },
    { id: 'generation.validation', type: 'validation', mode: 'machine', required: true },
    { id: 'generation.comparison', type: 'comparison', mode: 'human', required: false }
  ]
};

const noop = async () => ({ status: 'pass' });
const dataHandler = async () => ({ status: 'pass', outputs: { records: 4 } });
const overrideHandler = async () => ({ status: 'pass', outputs: { override: true } });

const registry = createSiteGenerationHandlerRegistry();
registry.registerType('data-load', dataHandler, { capability: 'data-runtime' });
registry.registerType('validation', noop, { capability: 'schema-validation' });

const initial = registry.inspect(checklist);
assert.equal(initial.schema, 'nlab.site-generation-handler-registry-report');
assert.equal(initial.ready_for_machine_stages, true);
assert.deepEqual(initial.missing_machine_stage_ids, []);
assert.deepEqual(initial.human_or_hybrid_pending_stage_ids, [
  'generation.preflight',
  'generation.comparison'
]);
assert.equal(initial.stages.find((item) => item.id === 'generation.data-load').resolution.source, 'type');

registry.registerStage('generation.data-load', overrideHandler, { reason: 'site-specific adapter' });
const overridden = registry.resolve(checklist.stages[1]);
assert.equal(overridden.source, 'stage_id');
assert.equal(overridden.handler, overrideHandler);

const handlers = registry.buildHandlers(checklist);
assert.equal(handlers['generation.data-load'], overrideHandler);
assert.equal(handlers['generation.validation'], noop);
assert.equal(Object.hasOwn(handlers, 'generation.preflight'), false);

const incomplete = createSiteGenerationHandlerRegistry().registerType('data-load', dataHandler);
const missing = incomplete.inspect(checklist);
assert.equal(missing.ready_for_machine_stages, false);
assert.deepEqual(missing.missing_machine_stage_ids, ['generation.validation']);
assert.throws(
  () => incomplete.buildHandlers(checklist),
  (error) => error instanceof SiteGenerationHandlerRegistryError && error.code === 'MISSING_MACHINE_HANDLERS'
);
const partialHandlers = incomplete.buildHandlers(checklist, { requireMachineCoverage: false });
assert.equal(partialHandlers['generation.data-load'], dataHandler);

assert.throws(
  () => registry.registerType('validation', noop),
  (error) => error.code === 'DUPLICATE_TYPE_HANDLER'
);
registry.registerType('validation', dataHandler, {}, { replace: true });
assert.equal(registry.resolve(checklist.stages[2]).handler, dataHandler);
registry.unregisterType('validation');
assert.equal(registry.resolve(checklist.stages[2]), null);

assert.throws(
  () => registry.registerStage('', noop),
  (error) => error.code === 'INVALID_HANDLER_KEY'
);
assert.throws(
  () => registry.registerType('render', null),
  (error) => error.code === 'INVALID_HANDLER'
);

console.log('site-generation-handler-registry.test.mjs: OK');
