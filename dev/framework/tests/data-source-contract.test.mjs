import assert from 'node:assert/strict';
import { DataSource } from '../core/data-source.js';

const options = { cache: true };
const metadata = { label: 'Recipes' };
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
assert.deepEqual(source.options, { cache: true });
assert.deepEqual(source.metadata, { label: 'Recipes' });

options.cache = false;
metadata.label = 'Mutated';
assert.equal(source.options.cache, true);
assert.equal(source.metadata.label, 'Recipes');

const json = source.toJSON();
assert.deepEqual(json, {
  id: 'recipes',
  type: 'json',
  location: '/data/recipes.json',
  options: { cache: true },
  metadata: { label: 'Recipes' }
});
assert.notEqual(json.options, source.options);
assert.notEqual(json.metadata, source.metadata);
json.options.cache = false;
json.metadata.label = 'Changed';
assert.equal(source.options.cache, true);
assert.equal(source.metadata.label, 'Recipes');

const nullable = new DataSource({ id: 'x', type: 'memory', options: null, metadata: null });
assert.deepEqual(nullable.options, {});
assert.deepEqual(nullable.metadata, {});
assert.equal(nullable.location, null);

const location = { url: '/data.json' };
const objectLocation = new DataSource({ id: 'loc', type: 'custom', location });
assert.equal(objectLocation.location, location);
assert.equal(objectLocation.toJSON().location, location);

assert.throws(() => new DataSource(), /DataSource id/);
assert.throws(() => new DataSource({ id: '', type: 'json' }), /id is required/);
assert.throws(() => new DataSource({ id: 12, type: 'json' }), /id must be a string/);
assert.throws(() => new DataSource({ id: 'x', type: '   ' }), /type is required/);
assert.throws(() => new DataSource({ id: 'x', type: 7 }), /type must be a string/);
assert.throws(() => new DataSource({ id: 'x', type: 'json', options: [] }), /options must be an object/);
assert.throws(() => new DataSource({ id: 'x', type: 'json', metadata: 'bad' }), /metadata must be an object/);

console.log('DataSource tests: OK');
