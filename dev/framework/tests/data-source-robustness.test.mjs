import assert from 'node:assert/strict';
import { DataSource, DataSourceError } from '../core/data-source.js';

const options = {
  headers:{ Accept:'application/json' },
  retries:[1, 2],
  nested:{ enabled:true }
};
const metadata = { owner:'demo', tags:['public'] };

const source = new DataSource({
  id:'  recipes  ',
  type:'  json-static ',
  location:'  data/recipes.json  ',
  options,
  metadata
});

assert.equal(source.id, 'recipes');
assert.equal(source.type, 'json-static');
assert.equal(source.location, 'data/recipes.json');
assert.deepEqual(source.options, options);
assert.deepEqual(source.metadata, metadata);

// Les entrées sont détachées de la configuration interne.
options.headers.Accept = 'text/plain';
options.retries.push(3);
metadata.tags.push('mutated');
assert.equal(source.options.headers.Accept, 'application/json');
assert.deepEqual(source.options.retries, [1, 2]);
assert.deepEqual(source.metadata.tags, ['public']);

// toJSON() retourne également un snapshot détaché et sérialisable.
const snapshot = source.toJSON();
snapshot.options.headers.Accept = 'text/csv';
snapshot.metadata.tags.push('snapshot');
assert.equal(source.options.headers.Accept, 'application/json');
assert.deepEqual(source.metadata.tags, ['public']);
assert.doesNotThrow(() => JSON.stringify(source.toJSON()));

const fromUrl = new DataSource({
  id:'api', type:'http', location:new URL('https://example.test/data.json'), options:null, metadata:null
});
assert.equal(fromUrl.location, 'https://example.test/data.json');
assert.deepEqual(fromUrl.options, {});
assert.deepEqual(fromUrl.metadata, {});

const nullProto = Object.create(null);
nullProto.nested = { value:1 };
const nullProtoSource = new DataSource({ id:'np', type:'memory', options:nullProto });
nullProto.nested.value = 2;
assert.equal(nullProtoSource.options.nested.value, 1);

assert.throws(() => new DataSource(), (error) => error instanceof DataSourceError && error.code === 'INVALID_ID');
assert.throws(() => new DataSource({ id:'x', type:' ' }), (error) => error.code === 'INVALID_TYPE');
assert.throws(() => new DataSource({ id:'x', type:'y', location:{ path:'x' } }), (error) => error.code === 'INVALID_LOCATION');
assert.throws(() => new DataSource({ id:'x', type:'y', options:[] }), (error) => error.code === 'INVALID_OPTIONS');
assert.throws(() => new DataSource({ id:'x', type:'y', metadata:'bad' }), (error) => error.code === 'INVALID_METADATA');

const circular = {};
circular.self = circular;
assert.throws(
  () => new DataSource({ id:'x', type:'y', options:circular }),
  (error) => error.code === 'CIRCULAR_CONFIG'
);

console.log('data source robustness tests: ok');
