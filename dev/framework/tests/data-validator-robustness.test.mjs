import assert from 'node:assert/strict';
import { DataValidator, DataValidatorError } from '../core/data-validator.js';

const registry = {
  providers:{ local:{ type:'memory' } },
  collections:{
    categories:{ provider:'local', source:'categories', idField:'code', requiredFields:['label'] },
    recipes:{
      provider:'local', source:'recipes', idField:'id', requiredFields:['name'],
      relations:[
        { field:'category_code', target:'categories', required:true, onMissing:'warn' },
        { field:'related_ids', target:'recipes', cardinality:'many', onMissing:'keep' }
      ]
    }
  }
};

const datasets = {
  categories:[{ code:'CAT1', label:'Entrée' }],
  recipes:[
    { id:'R1', name:'Soupe', category_code:'CAT1', related_ids:['R2'] },
    { id:'R2', name:'Salade', category_code:'MISSING', related_ids:[] }
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

const validator = new DataValidator({ provider });
await validator.init();
let report = validator.validateRegistry();
assert.equal(report.valid, true);
assert.equal(report.errors, 0);
assert.equal(report.checked, 2);

report = await validator.validateRecord('recipes', datasets.recipes[0]);
assert.equal(report.valid, true);
assert.equal(report.errors, 0);
assert.equal(report.warnings, 0);
assert.equal(calls.get('categories'), 1);
assert.equal(calls.get('recipes'), 1);

report = await validator.validateRecord('recipes', datasets.recipes[1]);
assert.equal(report.valid, true, 'onMissing=warn must stay non-blocking');
assert.equal(report.warnings, 1);
assert.equal(report.issues[0].code, 'REFERENCE_NOT_FOUND');
assert.equal(report.issues[0].details.policy, 'warn');
assert.equal(calls.get('categories'), 1, 'target index must be cached');

validator.clearIndexes('categories');
await validator.validateRecord('recipes', datasets.recipes[0]);
assert.equal(calls.get('categories'), 2, 'targeted clear must rebuild the index');
assert.equal(validator.clearIndexes(), validator);

// Les propriétés héritées ne sont jamais des collections.
await assert.rejects(
  validator.validateRecord('constructor', {}),
  (error) => error instanceof DataValidatorError && error.code === 'UNKNOWN_COLLECTION'
);

// Mauvaise cardinalité de valeur : issue structurée, pas exception implicite.
report = await validator.validateRecord('recipes', { id:'R3', name:'Test', category_code:'CAT1', related_ids:'R1' });
assert.equal(report.valid, false);
assert.ok(report.issues.some((issue) => issue.code === 'INVALID_CARDINALITY'));

// Structure de registre invalide : rapport déterministe.
const malformedRegistry = structuredClone(registry);
malformedRegistry.collections.recipes.requiredFields = 'name';
malformedRegistry.collections.recipes.relations = [
  { field:'x', target:'missing', cardinality:'sometimes', onMissing:'ignore', targetField:'' }
];
malformedRegistry.collections.recipes.provider = 'ghost';
const malformed = new DataValidator({
  provider:{ registry:malformedRegistry, async getCollection(){ return []; } }
});
await malformed.init();
report = malformed.validateRegistry();
assert.equal(report.valid, false);
for (const code of ['UNKNOWN_PROVIDER','INVALID_REQUIRED_FIELDS','INVALID_RELATION_CARDINALITY','INVALID_MISSING_POLICY','INVALID_TARGET_FIELD','UNKNOWN_RELATION_TARGET']) {
  assert.ok(report.issues.some((issue) => issue.code === code), `missing registry issue ${code}`);
}

// Collection provider non-array : erreur structurée en direct, rapport dans validateAll().
const badDataValidator = new DataValidator({
  provider:{
    registry:{ collections:{ items:{ provider:'local', source:'items', idField:'id' } } },
    async getCollection(){ return { id:'X' }; }
  }
});
await badDataValidator.init();
await assert.rejects(
  badDataValidator.validateCollection('items'),
  (error) => error.code === 'INVALID_COLLECTION_DATA'
);
report = await badDataValidator.validateAll();
assert.equal(report.valid, false);
assert.equal(report.collections.items.issues[0].code, 'INVALID_COLLECTION_DATA');

// Provider sans getCollection : erreur explicite.
const noGetter = new DataValidator({ provider:{ registry:{ collections:{ items:{ provider:'local', source:'items', idField:'id' } } } } });
await noGetter.init();
await assert.rejects(noGetter.validateCollection('items'), (error) => error.code === 'GET_COLLECTION_REQUIRED');

// Une clé cible dupliquée produit une issue de validation au lieu de faire fuiter DataIndexError.
const duplicateTargetRegistry = {
  collections:{
    categories:{ provider:'local', source:'categories', idField:'code' },
    items:{ provider:'local', source:'items', idField:'id', relations:[{ field:'category_code', target:'categories', onMissing:'error' }] }
  }
};
const duplicateTargetData = {
  categories:[{ code:'DUP' }, { code:'DUP' }],
  items:[{ id:'I1', category_code:'DUP' }]
};
const duplicateTargetValidator = new DataValidator({
  provider:{ registry:duplicateTargetRegistry, async getCollection(name){ return duplicateTargetData[name]; } }
});
await duplicateTargetValidator.init();
report = await duplicateTargetValidator.validateRecord('items', duplicateTargetData.items[0]);
assert.equal(report.valid, false);
assert.equal(report.issues[0].code, 'DUPLICATE_TARGET_KEY');
assert.equal(report.issues[0].details.firstIndex, 0);
assert.equal(report.issues[0].details.recordIndex, 1);

// IDs dupliqués dans la collection principale restent détectés.
const duplicateIds = {
  collections:{ items:{ provider:'local', source:'items', idField:'id' } }
};
const duplicateIdValidator = new DataValidator({
  provider:{ registry:duplicateIds, async getCollection(){ return [{ id:'A' }, { id:'A' }]; } }
});
await duplicateIdValidator.init();
report = await duplicateIdValidator.validateCollection('items');
assert.equal(report.valid, false);
assert.ok(report.issues.some((issue) => issue.code === 'DUPLICATE_ID'));

console.log('data validator robustness tests: ok');
