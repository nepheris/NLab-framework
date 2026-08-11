import assert from 'node:assert/strict';
import { DataResolver, DataResolverError } from '../core/data-resolver.js';

const registry = {
  collections: {
    categories: { idField:'code' },
    recipes: {
      idField:'id',
      relations:[
        { field:'category_code', target:'categories', onMissing:'warn' },
        { field:'related_ids', target:'recipes', cardinality:'many', onMissing:'keep' }
      ]
    }
  }
};

const datasets = {
  categories:[{ code:'CAT1', label:'Entrée' }],
  recipes:[
    { id:'R1', category_code:'CAT1', related_ids:['R2','RX'] },
    { id:'R2', category_code:'CATX', related_ids:[] }
  ]
};
const calls = new Map();
const provider = {
  registry,
  async getCollection(name) {
    calls.set(name, (calls.get(name) ?? 0) + 1);
    return datasets[name];
  }
};

const resolver = new DataResolver({ provider });
await resolver.init();
let result = await resolver.resolveRecord('recipes', datasets.recipes[0]);
assert.equal(result.resolved.category_code.label, 'Entrée');
assert.equal(result.resolved.related_ids[0].id, 'R2');
assert.equal(result.resolved.related_ids[1], 'RX');
assert.equal(result.issues.length, 1);
assert.equal(result.issues[0].code, 'REFERENCE_NOT_FOUND');
assert.equal(calls.get('categories'), 1);
assert.equal(calls.get('recipes'), 1);

await resolver.resolveRecord('recipes', datasets.recipes[1]);
assert.equal(calls.get('categories'), 1, 'cached index must be reused');
resolver.clearIndexes('categories');
await resolver.resolveRecord('recipes', datasets.recipes[0]);
assert.equal(calls.get('categories'), 2, 'targeted clear must force rebuild');

assert.throws(() => resolver.resolveRecord('constructor', {}), /Unknown collection|Promise/);
await assert.rejects(resolver.resolveRecord('constructor', {}), (error) => error.code === 'UNKNOWN_COLLECTION');
await assert.rejects(resolver.resolveRecord('recipes', null), (error) => error.code === 'INVALID_RECORD');

const badCollectionResolver = new DataResolver({
  provider:{ registry:{ collections:{ items:{ idField:'id' } } }, async getCollection(){ return { id:'X' }; } }
});
await badCollectionResolver.init();
await assert.rejects(badCollectionResolver.resolveCollection('items'), (error) => error.code === 'INVALID_COLLECTION_DATA');

const invalidRelationResolver = new DataResolver({
  provider:{
    registry:{ collections:{ items:{ idField:'id', relations:[{ field:'x', target:'items', cardinality:'sometimes' }] } } },
    async getCollection(){ return []; }
  }
});
await invalidRelationResolver.init();
await assert.rejects(invalidRelationResolver.resolveRecord('items', { id:'1' }), (error) => error.code === 'INVALID_CARDINALITY');

const invalidPolicyResolver = new DataResolver({
  provider:{
    registry:{ collections:{ items:{ idField:'id', relations:[{ field:'x', target:'items', onMissing:'ignore' }] } } },
    async getCollection(){ return []; }
  }
});
await invalidPolicyResolver.init();
await assert.rejects(invalidPolicyResolver.resolveRecord('items', { id:'1', x:'missing' }), (error) => error.code === 'INVALID_MISSING_POLICY');

const noGetter = new DataResolver({ provider:{ registry:{ collections:{ items:{ idField:'id' } } } } });
await noGetter.init();
await assert.rejects(noGetter.resolveCollection('items'), (error) => error instanceof DataResolverError && error.code === 'GET_COLLECTION_REQUIRED');

console.log('data resolver robustness tests: ok');
