import assert from 'node:assert/strict';
import { DataRuntimeRegistry } from '../core/data-runtime-registry.js';

const registry = new DataRuntimeRegistry();
assert.equal(registry.size(), 0);
assert.deepEqual(registry.listProviders(), []);
assert.deepEqual(registry.listAdapters(), []);

const providerFactory = (options) => ({ kind: 'provider', options });
const adapterFactory = (options) => ({ kind: 'adapter', options });
assert.equal(registry.registerProvider(' json ', providerFactory), registry);
assert.equal(registry.registerAdapter(' json ', adapterFactory), registry);
assert.equal(registry.hasProvider('json'), true);
assert.equal(registry.hasAdapter('json'), true);
assert.equal(registry.size('providers'), 1);
assert.equal(registry.size('adapter'), 1);
assert.equal(registry.size(), 2);
assert.deepEqual(registry.listProviders(), ['json']);
assert.deepEqual(registry.listAdapters(), ['json']);

const providerOptions = { cache: true };
const provider = registry.createProvider(' json ', providerOptions);
providerOptions.cache = false;
assert.deepEqual(provider, { kind: 'provider', options: { cache: true } });
assert.notEqual(provider.options, providerOptions);

const adapter = registry.createAdapter('json', { strict: true });
assert.deepEqual(adapter, { kind: 'adapter', options: { strict: true } });

assert.throws(() => registry.registerProvider('json', () => ({})), /already registered/);
assert.throws(() => registry.registerAdapter('json', () => ({})), /already registered/);
const replacementProvider = () => ({ replacement: true });
registry.registerProvider('json', replacementProvider, { replace: true });
assert.deepEqual(registry.createProvider('json'), { replacement: true });

registry.registerProvider('memory', () => ({ type: 'memory' }));
registry.registerAdapter('csv', () => ({ type: 'csv' }));
assert.equal(registry.size(), 4);
assert.deepEqual(new Set(registry.listProviders()), new Set(['json', 'memory']));
assert.deepEqual(new Set(registry.listAdapters()), new Set(['json', 'csv']));

assert.equal(registry.unregisterProvider('memory'), true);
assert.equal(registry.unregisterProvider('memory'), false);
assert.equal(registry.hasProvider('memory'), false);
assert.equal(registry.unregisterAdapter('csv'), true);
assert.equal(registry.hasAdapter('csv'), false);
assert.equal(registry.size(), 2);

assert.equal(registry.clear('providers'), 1);
assert.equal(registry.size('providers'), 0);
assert.equal(registry.size('adapters'), 1);
assert.equal(registry.clear('adapters'), 1);
assert.equal(registry.size(), 0);
assert.equal(registry.clear(), 0);

registry.registerProvider('one', () => 1);
registry.registerAdapter('two', () => 2);
assert.equal(registry.clear(), 2);
assert.equal(registry.size(), 0);

assert.throws(() => registry.registerProvider('', () => {}), /Provider type/);
assert.throws(() => registry.registerProvider('x', null), /factory/);
assert.throws(() => registry.registerAdapter(' ', () => {}), /Adapter type/);
assert.throws(() => registry.registerAdapter('x', 1), /factory/);
assert.throws(() => registry.createProvider('missing'), /Unknown provider/);
assert.throws(() => registry.createAdapter('missing'), /Unknown adapter/);
assert.throws(() => registry.createProvider(5), /Provider type/);
assert.throws(() => registry.createProvider('one', []), /factory options/);
assert.throws(() => registry.size('other'), /Unknown registry kind/);
assert.throws(() => registry.clear('other'), /Unknown registry kind/);

console.log('DataRuntimeRegistry tests: OK');
