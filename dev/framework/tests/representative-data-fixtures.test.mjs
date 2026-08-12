import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonDataProvider } from '../providers/json-data-provider.js';
import { DataResolver } from '../core/data-resolver.js';

const fixtureDir=new URL('./fixtures/data/',import.meta.url);
const fixtureNames=['registry.json','groups.json','tags.json','items.json'];
const payloads=new Map();
const fixtureTexts=[];
for(const name of fixtureNames){
  const text=await readFile(new URL(name,fixtureDir),'utf8');
  fixtureTexts.push(text);
  payloads.set(name,JSON.parse(text));
}

const joined=fixtureTexts.join('\n');
assert.equal(/recettes?\s+du\s+c[œo]ur|recipe/i.test(joined),false,'representative fixtures must remain generic and synthetic');

const registry=payloads.get('registry.json');
assert.equal(registry.version,'1.0.0');
assert.deepEqual(Object.keys(registry.providers),['fixture-json']);
assert.equal(registry.providers['fixture-json'].type,'json-static');
assert.deepEqual(Object.keys(registry.collections),['groups','tags','items']);

for(const [name,definition] of Object.entries(registry.collections)){
  assert.equal(typeof definition.provider,'string',`${name}.provider`);
  assert.equal(typeof definition.source,'string',`${name}.source`);
  assert.equal(typeof definition.idField,'string',`${name}.idField`);
  assert.equal(definition.provider,'fixture-json');
  assert.equal(payloads.has(definition.source),true,`${name} source ${definition.source} must exist as a fixture`);
  assert.equal(Array.isArray(definition.requiredFields),true);
  assert.equal(new Set(definition.requiredFields).size,definition.requiredFields.length);
}

const itemRelations=registry.collections.items.relations;
assert.equal(itemRelations.length,2);
assert.deepEqual(itemRelations.map(relation=>relation.cardinality),['one','many']);
assert.deepEqual(itemRelations.map(relation=>relation.target),['groups','tags']);
assert.equal(itemRelations[0].required,true);
assert.equal(itemRelations[0].onMissing,'error');
assert.equal(itemRelations[1].required,false);
assert.equal(itemRelations[1].onMissing,'warn');

const groups=payloads.get('groups.json');
const tagsPayload=payloads.get('tags.json');
const items=payloads.get('items.json');
assert.equal(Array.isArray(groups),true,'groups fixture exercises array payload form');
assert.equal(Array.isArray(tagsPayload.records),true,'tags fixture exercises {records:[]} payload form');
assert.equal(Array.isArray(items),true);
assert.equal(items.length,3);

const groupCodes=new Set(groups.map(group=>group.code));
const tagIds=new Set(tagsPayload.records.map(tag=>tag.id));
for(const item of items){
  assert.equal(typeof item.uid,'string');
  assert.equal(typeof item.name,'string');
  assert.equal(groupCodes.has(item.groupCode),true,`${item.uid} must reference an existing required group`);
  assert.equal(Array.isArray(item.tagIds),true);
}
assert.equal(items.some(item=>item.tagIds.includes('TAG-MISSING')),true,'fixture must exercise optional missing-reference warning');
assert.equal(tagIds.has('TAG-MISSING'),false);

const fetchCounts=new Map();
const fetchFn=async url=>{
  const parsed=new URL(url);
  const name=path.posix.basename(parsed.pathname);
  fetchCounts.set(name,(fetchCounts.get(name)??0)+1);
  if(!payloads.has(name))return {ok:false,status:404,json:async()=>null};
  return {ok:true,status:200,json:async()=>structuredClone(payloads.get(name))};
};

const provider=new JsonDataProvider({
  registry:structuredClone(registry),
  baseUrl:'https://fixtures.invalid/data/',
  fetchFn,
  cache:true
});
await provider.init();
assert.equal(provider.type,'json-static');
assert.deepEqual(await provider.listCollections(),['groups','tags','items']);

const providerGroups=await provider.getCollection('groups');
assert.deepEqual(providerGroups,groups);
assert.equal(fetchCounts.get('groups.json'),1);
await provider.getCollection('groups');
assert.equal(fetchCounts.get('groups.json'),1,'cached collection should not refetch');
await provider.getCollection('groups',{refresh:true});
assert.equal(fetchCounts.get('groups.json'),2,'refresh should bypass cache');

const providerTags=await provider.getCollection('tags');
assert.deepEqual(providerTags,tagsPayload.records);
assert.equal(fetchCounts.get('tags.json'),1);

const item200=await provider.getRecord('items','ITEM-200');
assert.equal(item200?.name,'Sample Two');
assert.equal(fetchCounts.get('items.json'),1);
assert.equal((await provider.getRecord('items','ITEM-404')),null);
assert.equal(fetchCounts.get('items.json'),1,'getRecord should reuse cached collection');

const resolver=new DataResolver({provider,registry:provider.registry});
await resolver.init();
const resolved=await resolver.resolveCollection('items');
assert.equal(resolved.length,3);

const first=resolved.find(entry=>entry.data.uid==='ITEM-100');
assert.equal(first.resolved.groupCode.label,'Alpha Group');
assert.deepEqual(first.resolved.tagIds.map(tag=>tag?.id),['TAG-1','TAG-2']);
assert.deepEqual(first.issues,[]);

const second=resolved.find(entry=>entry.data.uid==='ITEM-200');
assert.equal(second.resolved.groupCode.label,'Beta Group');
assert.deepEqual(second.resolved.tagIds.map(tag=>tag?.id??null),['TAG-3',null]);
assert.deepEqual(second.issues,[{
  level:'warning',
  code:'REFERENCE_NOT_FOUND',
  field:'tagIds',
  target:'tags',
  value:'TAG-MISSING'
}]);

const third=resolved.find(entry=>entry.data.uid==='ITEM-300');
assert.equal(third.resolved.groupCode.code,'GRP-A');
assert.deepEqual(third.resolved.tagIds,[]);
assert.deepEqual(third.issues,[]);

assert.equal(fetchCounts.get('groups.json'),2,'resolver should reuse provider cache for target groups');
assert.equal(fetchCounts.get('tags.json'),1,'resolver should reuse provider cache for target tags');
assert.equal(fetchCounts.get('items.json'),1,'resolver should reuse provider cache for source items');

await provider.close();
assert.equal(provider.cache.size,0);

// Ensure fixture directory remains repository-relative and portable.
const fixturePath=fileURLToPath(fixtureDir);
assert.equal(path.isAbsolute(fixturePath),true);
assert.equal(fixturePath.includes('fixtures'),true);

console.log('representative data fixture tests: ok');
