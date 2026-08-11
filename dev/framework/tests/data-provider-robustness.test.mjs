import assert from 'node:assert/strict';
import { DataProvider, DataProviderError } from '../core/data-provider.js';
import { JsonDataProvider } from '../providers/json-data-provider.js';

class MemoryProvider extends DataProvider {
  constructor(records, options = {}) {
    super(options);
    this.records = records;
    this.calls = [];
  }
  get type() { return 'memory-test'; }
  get capabilities() { return { ...super.capabilities, query: true }; }
  async listCollections() { return ['items']; }
  async getCollection(name, options = {}) {
    this.calls.push({ name, options });
    return this.records;
  }
}

const sourceOptions = { cache: true };
const provider = new MemoryProvider([
  { id: 1, slug: 'one' },
  { id: 2, slug: 'two' }
], sourceOptions);
sourceOptions.cache = false;
assert.equal(provider.options.cache, true);
assert.equal(provider.type, 'memory-test');
assert.equal(provider.supports('read'), true);
assert.equal(provider.supports('query'), true);
assert.equal(provider.supports('write'), false);
assert.equal(provider.supports('unknown'), false);
assert.equal(provider.supports('  '), false);

assert.equal(await provider.init(), provider);
assert.equal(await provider.close(), provider);
assert.deepEqual(await provider.listCollections(), ['items']);
assert.deepEqual(await provider.getRecord(' items ', 2), { id: 2, slug: 'two' });
assert.equal(provider.calls.at(-1).name, 'items');
assert.equal(provider.calls.at(-1).options.idField, undefined);
assert.deepEqual(await provider.getRecord('items', 'one', { idField: ' slug ' }), { id: 1, slug: 'one' });
assert.equal(provider.calls.at(-1).options.idField, ' slug ');
assert.equal(await provider.getRecord('items', 999), null);

const iterableProvider = new MemoryProvider(new Set([{ id: 'A' }, { id: 'B' }]));
assert.deepEqual(await iterableProvider.getRecord('items', 'B'), { id: 'B' });

class InvalidProvider extends DataProvider {
  async getCollection() { return { id: 1 }; }
}
await assert.rejects(
  () => new InvalidProvider().getRecord('items', 1),
  (error) => error instanceof DataProviderError && error.code === 'INVALID_COLLECTION_RESULT'
);

await assert.rejects(
  () => provider.getRecord('', 1),
  (error) => error.code === 'INVALID_COLLECTION_NAME'
);
await assert.rejects(
  () => provider.getRecord('items', 1, { idField: '' }),
  (error) => error.code === 'INVALID_ID_FIELD'
);
await assert.rejects(() => provider.getRecord('items', 1, []), /options must be an object/);

const abstract = new DataProvider();
await assert.rejects(
  () => abstract.listCollections(),
  (error) => error.code === 'NOT_IMPLEMENTED' && error.details.operation === 'listCollections'
);
await assert.rejects(
  () => abstract.getCollection('items'),
  (error) => error.code === 'NOT_IMPLEMENTED' && error.details.operation === 'getCollection'
);
for (const [operation, call] of [
  ['saveCollection', () => abstract.saveCollection('items', [])],
  ['saveRecord', () => abstract.saveRecord('items', { id: 1 })],
  ['deleteRecord', () => abstract.deleteRecord('items', 1)]
]) {
  await assert.rejects(
    call,
    (error) => error.code === 'READ_ONLY' && error.details.operation === operation && error.details.collectionName === 'items'
  );
}

assert.throws(() => new DataProvider([]), /options must be an object/);

// Compatibilité avec le provider JSON concret existant.
const jsonProvider = new JsonDataProvider({
  registry: {
    collections: {
      recipes: { source: 'recipes.json', idField: 'code' }
    }
  },
  fetchFn: async () => ({
    ok: true,
    async json() { return [{ code: 'REC001', title: 'Soupe' }]; }
  })
});
await jsonProvider.init();
assert.equal(jsonProvider.supports('read'), true);
assert.deepEqual(await jsonProvider.getRecord('recipes', 'REC001'), { code: 'REC001', title: 'Soupe' });
await jsonProvider.close();

console.log('DataProvider tests: OK');
