import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schema=JSON.parse(await readFile(new URL('../data/site-generation-checklist.schema.json',import.meta.url),'utf8'));
const fixtureText=await readFile(new URL('./fixtures/site-generation-checklist.json',import.meta.url),'utf8');
const fixture=JSON.parse(fixtureText);

assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.$id,'https://nlab.dev/schemas/site-generation-checklist.schema.json');
assert.equal(schema.properties.schema.const,'nlab.site-generation-checklist');
assert.equal(schema.properties.version.const,1);
assert.equal(schema.additionalProperties,false);
assert.equal(/recettes?\s+du\s+c[œo]ur|recipe/i.test(JSON.stringify(schema)),false);
assert.equal(/recettes?\s+du\s+c[œo]ur|recipe/i.test(fixtureText),false);

assert.equal(fixture.schema,'nlab.site-generation-checklist');
assert.equal(fixture.version,1);
assert.equal(typeof fixture.name,'string');
assert.equal(fixture.name.length>0,true);
assert.equal(Array.isArray(fixture.stages),true);
assert.equal(fixture.stages.length,11);

const allowedTypes=schema.$defs.stage.properties.type.enum;
const expectedTypes=['preflight','data-load','validation','relations','render','assets','routes','output','preview','comparison','report'];
assert.deepEqual(allowedTypes,expectedTypes);
assert.deepEqual(fixture.stages.map(stage=>stage.type),expectedTypes);

const stageById=new Map();
for(const stage of fixture.stages){
  assert.match(stage.id,/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/);
  assert.equal(stageById.has(stage.id),false,`duplicate stage id ${stage.id}`);
  stageById.set(stage.id,stage);
  assert.equal(typeof stage.label,'string');
  assert.equal(stage.label.trim().length>0,true);
  assert.equal(['machine','human','hybrid'].includes(stage.mode),true);
  assert.equal(typeof stage.required,'boolean');
  assert.equal(Array.isArray(stage.depends_on),true);
  assert.equal(new Set(stage.depends_on).size,stage.depends_on.length);
  assert.equal(Array.isArray(stage.inputs),true);
  assert.equal(Array.isArray(stage.outputs),true);
  assert.equal(Array.isArray(stage.success_criteria)&&stage.success_criteria.length>0,true);
  assert.equal(stage.success_criteria.every(value=>typeof value==='string'&&value.trim()),true);
  assert.equal(['stop','warn','continue'].includes(stage.on_failure),true);
}

for(const stage of fixture.stages){
  for(const dep of stage.depends_on){
    assert.equal(stageById.has(dep),true,`${stage.id} depends on unknown ${dep}`);
    assert.notEqual(dep,stage.id,`${stage.id} cannot depend on itself`);
  }
}

const visiting=new Set();
const visited=new Set();
function visit(id){
  if(visited.has(id))return;
  assert.equal(visiting.has(id),false,`cycle detected at ${id}`);
  visiting.add(id);
  for(const dep of stageById.get(id).depends_on)visit(dep);
  visiting.delete(id);
  visited.add(id);
}
for(const id of stageById.keys())visit(id);
assert.equal(visited.size,fixture.stages.length);

const position=new Map(fixture.stages.map((stage,index)=>[stage.id,index]));
for(const stage of fixture.stages){
  for(const dep of stage.depends_on)assert.equal(position.get(dep)<position.get(stage.id),true,`${dep} must precede ${stage.id} in reference checklist`);
}

assert.deepEqual(stageById.get('generation.output').depends_on,['generation.assets','generation.routes']);
assert.equal(stageById.get('generation.preview').depends_on.includes('generation.output'),true);
assert.equal(stageById.get('generation.comparison').required,false);
assert.equal(stageById.get('generation.comparison').mode,'human');
assert.equal(stageById.get('generation.comparison').on_failure,'warn');
assert.equal(stageById.get('generation.report').required,true);
assert.equal(stageById.get('generation.report').outputs.includes('generation.report'),true);

const requiredStages=fixture.stages.filter(stage=>stage.required);
assert.equal(requiredStages.every(stage=>stage.on_failure==='stop'),true,'reference checklist must stop on required stage failure');
assert.equal(fixture.metadata.business_domain,null);

console.log('site generation checklist tests: ok');
