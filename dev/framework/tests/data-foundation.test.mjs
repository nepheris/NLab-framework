import assert from 'node:assert/strict';
import { DataSource } from '../core/data-source.js';
import { DataAdapter } from '../core/data-adapter.js';
import { DataIndex } from '../core/data-index.js';
import { DataRuntimeRegistry } from '../core/data-runtime-registry.js';

const source = new DataSource({ id: 'demo', type: 'json', location: 'demo.json' });
assert.equal(source.toJSON().id, 'demo');

const adapter = new DataAdapter();
assert.equal(await adapter.canHandle(source), false);

const indexer = new DataIndex();
const index = indexer.build('items', [{ id: 'A' }, { id: 'B' }], 'id');
assert.equal(index.get('B').id, 'B');
assert.throws(() => indexer.build('dup', [{ id: 'A' }, { id: 'A' }], 'id'));

const registry = new DataRuntimeRegistry();
registry.registerProvider('demo', (options) => ({ type: 'demo', options }));
registry.registerAdapter('demo', (options) => ({ type: 'demo', options }));
assert.equal(registry.createProvider('demo', { ok: true }).options.ok, true);
assert.equal(registry.createAdapter('demo', { ok: true }).options.ok, true);

console.log('foundation data tests: ok');
