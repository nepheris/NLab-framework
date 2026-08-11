import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataValidator } from '../core/data-validator.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../data');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, name), 'utf8'));

const collectionSchema = readJson('collection.schema.json');
const registrySchema = readJson('data-registry.schema.json');
const relationSchema = readJson('relation.schema.json');

// Contrats structurels des trois schémas.
assert.equal(collectionSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.deepEqual(collectionSchema.required, ['provider','source','idField']);
assert.equal(collectionSchema.additionalProperties, false);
assert.equal(collectionSchema.properties.relations.items.$ref, 'relation.schema.json');
assert.equal(collectionSchema.properties.requiredFields.uniqueItems, true);

assert.equal(registrySchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.deepEqual(registrySchema.required, ['version','providers','collections']);
assert.equal(registrySchema.additionalProperties, false);
assert.equal(registrySchema.properties.collections.additionalProperties.$ref, 'collection.schema.json');
assert.equal(registrySchema.properties.providers.additionalProperties.additionalProperties, false);

assert.equal(relationSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.deepEqual(relationSchema.required, ['field','target']);
assert.equal(relationSchema.additionalProperties, false);
assert.deepEqual(relationSchema.properties.cardinality.enum, ['one','many']);
assert.deepEqual(relationSchema.properties.onMissing.enum, ['error','warn','keep','null']);

// Validation minimale déterministe des fixtures, sans dépendance npm externe.
const validateRelationShape = (relation) => {
  const issues = [];
  for (const key of relationSchema.required) if (!relation?.[key]) issues.push(`missing:${key}`);
  if (relation?.cardinality != null && !relationSchema.properties.cardinality.enum.includes(relation.cardinality)) issues.push('invalid:cardinality');
  if (relation?.onMissing != null && !relationSchema.properties.onMissing.enum.includes(relation.onMissing)) issues.push('invalid:onMissing');
  for (const key of Object.keys(relation ?? {})) if (!(key in relationSchema.properties)) issues.push(`additional:${key}`);
  return issues;
};

const validateCollectionShape = (collection) => {
  const issues = [];
  for (const key of collectionSchema.required) if (!collection?.[key]) issues.push(`missing:${key}`);
  if (collection?.requiredFields && new Set(collection.requiredFields).size !== collection.requiredFields.length) issues.push('duplicate:requiredFields');
  for (const relation of collection?.relations ?? []) issues.push(...validateRelationShape(relation).map((issue)=>`relation:${issue}`));
  for (const key of Object.keys(collection ?? {})) if (!(key in collectionSchema.properties)) issues.push(`additional:${key}`);
  return issues;
};

const validateRegistryShape = (registry) => {
  const issues = [];
  for (const key of registrySchema.required) if (registry?.[key] == null) issues.push(`missing:${key}`);
  for (const [name, provider] of Object.entries(registry?.providers ?? {})) {
    if (!provider?.type) issues.push(`provider:${name}:missing:type`);
    for (const key of Object.keys(provider ?? {})) if (!['type','options'].includes(key)) issues.push(`provider:${name}:additional:${key}`);
  }
  for (const [name, collection] of Object.entries(registry?.collections ?? {})) {
    issues.push(...validateCollectionShape(collection).map((issue)=>`collection:${name}:${issue}`));
  }
  for (const key of Object.keys(registry ?? {})) if (!(key in registrySchema.properties)) issues.push(`additional:${key}`);
  return issues;
};

const validRegistry = {
  version:'1.0.0',
  providers:{ local:{ type:'json-static', options:{} } },
  collections:{
    categories:{ provider:'local', source:'categories.json', idField:'id', labelField:'label', requiredFields:['label'] },
    items:{
      provider:'local', source:'items.json', idField:'id', requiredFields:['name'],
      relations:[{ field:'category_id', target:'categories', targetField:'id', cardinality:'one', required:true, onMissing:'warn' }]
    }
  }
};
assert.deepEqual(validateRegistryShape(validRegistry), []);

const invalidRegistry = {
  version:'1.0.0',
  providers:{ local:{ options:{}, unexpected:true } },
  collections:{
    items:{
      provider:'local', source:'items.json', idField:'', requiredFields:['name','name'], unexpected:true,
      relations:[{ field:'category_id', target:'categories', cardinality:'several', onMissing:'ignore', extra:true }]
    }
  },
  extra:true
};
const invalidIssues = validateRegistryShape(invalidRegistry);
assert.ok(invalidIssues.includes('provider:local:missing:type'));
assert.ok(invalidIssues.includes('provider:local:additional:unexpected'));
assert.ok(invalidIssues.includes('collection:items:missing:idField'));
assert.ok(invalidIssues.includes('collection:items:duplicate:requiredFields'));
assert.ok(invalidIssues.includes('collection:items:additional:unexpected'));
assert.ok(invalidIssues.includes('collection:items:relation:invalid:cardinality'));
assert.ok(invalidIssues.includes('collection:items:relation:invalid:onMissing'));
assert.ok(invalidIssues.includes('collection:items:relation:additional:extra'));
assert.ok(invalidIssues.includes('additional:extra'));

// Compatibilité avec le validateur runtime : cible connue, cardinalité et références.
const datasets = {
  categories:[{ id:'CAT001', label:'Dessert' }],
  items:[{ id:'REC001', name:'Compote', category_id:'CAT001' }]
};
const provider = {
  registry:validRegistry,
  async getCollection(name){ return datasets[name] ?? []; }
};
const validator = new DataValidator({ provider });
await validator.init();
let report = validator.validateRegistry();
assert.equal(report.valid, true);

report = await validator.validateCollection('items');
assert.equal(report.valid, true);
assert.equal(report.errors, 0);

const brokenTargetRegistry = structuredClone(validRegistry);
brokenTargetRegistry.collections.items.relations[0].target = 'missing-collection';
const brokenTargetValidator = new DataValidator({ provider:{ registry:brokenTargetRegistry, async getCollection(name){ return datasets[name] ?? []; } } });
await brokenTargetValidator.init();
report = brokenTargetValidator.validateRegistry();
assert.equal(report.valid, false);
assert.equal(report.issues[0].code, 'UNKNOWN_RELATION_TARGET');

const missingReferenceDatasets = {
  categories:[{ id:'CAT001', label:'Dessert' }],
  items:[{ id:'REC001', name:'Compote', category_id:'CAT999' }]
};
const missingReferenceValidator = new DataValidator({ provider:{ registry:validRegistry, async getCollection(name){ return missingReferenceDatasets[name] ?? []; } } });
await missingReferenceValidator.init();
report = await missingReferenceValidator.validateCollection('items');
assert.equal(report.valid, true, 'onMissing=warn ne doit pas invalider la collection');
assert.equal(report.warnings, 1);
assert.equal(report.issues[0].code, 'REFERENCE_NOT_FOUND');

console.log('data schema contracts tests: ok');
