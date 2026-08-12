import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const schemaUrl=new URL('../data/site-workspace.schema.json',import.meta.url);
const text=await readFile(schemaUrl,'utf8');
const schema=JSON.parse(text);

assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.$id,'https://nlab.dev/schemas/site-workspace.schema.json');
assert.equal(schema.properties.schema.const,'nlab.site-workspace');
assert.equal(schema.properties.version.const,1);
assert.deepEqual(schema.required,['schema','version','root','directories','framework']);
assert.equal(schema.additionalProperties,false);
assert.equal(/recettes|recipe/i.test(text),false,'generic workspace schema must not embed Recettes-du-Coeur business vocabulary');

const directories=schema.properties.directories;
assert.deepEqual(directories.required,['atelier','data','assets','config','web']);
assert.equal(directories.additionalProperties,false);

const expected={
  atelier:{path:'atelier/',mutable:true,generated:false,publishable:false},
  data:{path:'data/',mutable:true,generated:false,publishable:false},
  assets:{path:'assets/',mutable:true,generated:false,publishable:false},
  config:{path:'config/',mutable:true,generated:false,publishable:false},
  web:{path:'web/',mutable:false,generated:true,publishable:true}
};
const seenPaths=new Set();
for(const [role,contract] of Object.entries(expected)){
  const node=directories.properties[role];
  assert.equal(Array.isArray(node.allOf),true,`${role} must compose the generic directory definition`);
  assert.equal(node.allOf[0].$ref,'#/$defs/directory');
  const constants=node.allOf[1].properties;
  for(const [key,value] of Object.entries(contract))assert.equal(constants[key].const,value,`${role}.${key}`);
  assert.equal(seenPaths.has(contract.path),false,`${contract.path} must be unique`);
  seenPaths.add(contract.path);
}

const directoryDef=schema.$defs.directory;
assert.equal(directoryDef.type,'object');
assert.equal(directoryDef.additionalProperties,false);
assert.deepEqual(directoryDef.required,['path','purpose','mutable','generated','publishable']);

const framework=schema.properties.framework;
assert.equal(framework.additionalProperties,false);
assert.deepEqual(framework.required,['strategy','business_logic_allowed']);
assert.deepEqual(framework.properties.strategy.enum,['external','synchronized','embedded-readonly']);
assert.equal(framework.properties.business_logic_allowed.const,false);

const rootPattern=new RegExp(schema.properties.root.pattern);
for(const valid of ['Sites/example/','sites/my-site/','workspace/'])assert.equal(rootPattern.test(valid),true,`${valid} should be a valid relative workspace root`);
for(const invalid of ['/absolute/','../escape/','Sites/../escape/','Sites\\windows\\'])assert.equal(rootPattern.test(invalid),false,`${invalid} should be rejected as a workspace root`);

const sample={
  schema:'nlab.site-workspace',
  version:1,
  root:'Sites/example/',
  directories:Object.fromEntries(Object.entries(expected).map(([role,contract])=>[role,{...contract,purpose:`${role} role`} ])),
  framework:{strategy:'external',path:null,business_logic_allowed:false}
};
assert.equal(sample.directories.web.generated,true);
assert.equal(sample.directories.web.publishable,true);
assert.equal(sample.directories.web.mutable,false);
assert.equal(Object.values(sample.directories).filter(entry=>entry.publishable).length,1,'only web/ is publishable by the base contract');
assert.equal(sample.framework.business_logic_allowed,false);

console.log('site workspace contract tests: ok');
