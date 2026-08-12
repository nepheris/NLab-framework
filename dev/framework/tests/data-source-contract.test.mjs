import assert from 'node:assert/strict';
import { DataSource, DataSourceError } from '../core/data-source.js';

const options = { cache: true, nested: { retries: 2 }, list: [{ enabled: true }] };
const metadata = { label: 'Recipes', nested: { owner: 'nLab' } };
const source = new DataSource({
  id: ' recipes ',
  type: ' json ',
  location: '/data/recipes.json',
  options,
  metadata
});

assert.equal(source.id, 'recipes');
assert.equal(source.type, 'json');
assert.equal(source.location, '/data/recipes.json');
assert.deepEqual(source.options, { cache: true, nested: { retries: 2 }, list: [{ enabled: true }] });
assert.deepEqual(source.metadata, { label: 'Recipes', nested: { owner: 'nLab' } });

options.cache = false;
options.nested.retries = 99;
options.list[0].enabled = false;
metadata.label = 'Mutated';
metadata.nested.owner = 'mutated';
assert.equal(source.options.cache, true);
assert.equal(source.options.nested.retries, 2);
assert.equal(source.options.list[0].enabled, true);
assert.equal(source.metadata.label, 'Recipes');
assert.equal(source.metadata.nested.owner, 'nLab');

const json = source.toJSON();
assert.deepEqual(json, {
  id: 'recipes',
  type: 'json',
  location: '/data/recipes.json',
  options: { cache: true, nested: { retries: 2 }, list: [{ enabled: true }] },
  metadata: { label: 'Recipes', nested: { owner: 'nLab' } }
});
assert.notEqual(json.options, source.options);
assert.notEqual(json.options.nested, source.options.nested);
assert.notEqual(json.options.list, source.options.list);
assert.notEqual(json.metadata, source.metadata);
json.options.nested.retries = 50;
json.options.list[0].enabled = false;
json.metadata.nested.owner = 'changed';
assert.equal(source.options.nested.retries, 2);
assert.equal(source.options.list[0].enabled, true);
assert.equal(source.metadata.nested.owner, 'nLab');

const nullable = new DataSource({ id: 'x', type: 'memory', options: null, metadata: null });
assert.deepEqual(nullable.options, {});
assert.deepEqual(nullable.metadata, {});
assert.equal(nullable.location, null);

// Location reste volontairement libre pour compatibilité historique.
const location = { url: '/data.json' };
const objectLocation = new DataSource({ id: 'loc', type: 'custom', location });
assert.equal(objectLocation.location, location);
assert.equal(objectLocation.toJSON().location, location);

const date = new Date('2026-01-01T00:00:00Z');
const customConfig = new DataSource({ id: 'custom', type: 'memory', options: { date } });
assert.equal(customConfig.options.date, date);

const circular = {};
circular.self = circular;
assert.throws(
  () => new DataSource({ id: 'circular', type: 'json', options: circular }),
  (error) => error instanceof DataSourceError && error.code === 'CIRCULAR_CONFIG'
);

for (const [factory, code] of [
  [() => new DataSource(), 'INVALID_ID'],
  [() => new DataSource({ id: '', type: 'json' }), 'INVALID_ID'],
  [() => new DataSource({ id: 12, type: 'json' }), 'INVALID_ID'],
  [() => new DataSource({ id: 'x', type: '   ' }), 'INVALID_TYPE'],
  [() => new DataSource({ id: 'x', type: 7 }), 'INVALID_TYPE'],
  [() => new DataSource({ id: 'x', type: 'json', options: [] }), 'INVALID_OPTIONS'],
  [() => new DataSource({ id: 'x', type: 'json', metadata: 'bad' }), 'INVALID_METADATA']
]) {
  assert.throws(factory, (error) => error instanceof DataSourceError && error.code === code);
}

const customError = new DataSourceError('boom', 'CUSTOM', { id: 1 });
assert.equal(customError.name, 'DataSourceError');
assert.equal(customError.code, 'CUSTOM');
assert.deepEqual(customError.details, { id: 1 });

console.log('DataSource tests: OK');
