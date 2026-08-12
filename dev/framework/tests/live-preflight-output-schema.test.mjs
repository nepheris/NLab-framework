import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const outputUrl=new URL('../data/live-preflight-output.schema.json',import.meta.url);
const output=JSON.parse(await readFile(outputUrl,'utf8'));

assert.equal(output.$schema,'https://json-schema.org/draft/2020-12/schema');
assert.equal(output.$id,'https://nlab.dev/schemas/live-preflight-output.schema.json');
assert.equal(Array.isArray(output.oneOf),true);
assert.equal(output.oneOf.length,2);
assert.deepEqual(output.oneOf.map(branch=>branch.$ref),[
  'live-preflight-report.schema.json',
  'live-preflight-error.schema.json'
]);

const branches=[];
for(const branch of output.oneOf){
  assert.deepEqual(Object.keys(branch),['$ref']);
  const targetUrl=new URL(branch.$ref,outputUrl);
  const target=JSON.parse(await readFile(targetUrl,'utf8'));
  branches.push({ref:branch.$ref,targetUrl,target});
  assert.equal(target.$schema,'https://json-schema.org/draft/2020-12/schema');
  assert.equal(typeof target.$id,'string');
  assert.equal(target.$id.length>0,true);
  assert.equal(target.type,'object');
  assert.equal(target.additionalProperties,false);
  assert.equal(typeof target.properties?.schema?.const,'string');
  assert.equal(target.properties.schema.const.length>0,true);
  assert.equal(target.properties?.version?.const,1);
}

const discriminators=branches.map(({target})=>target.properties.schema.const);
assert.deepEqual(discriminators,[
  'nlab.live-preflight-report',
  'nlab.live-preflight-error'
]);
assert.equal(new Set(discriminators).size,branches.length,'oneOf branches need distinct schema discriminators');
assert.equal(new Set(branches.map(({target})=>target.$id)).size,branches.length,'oneOf branches need distinct schema IDs');

function branchFor(value){
  return branches.filter(({target})=>target.properties.schema.const===value?.schema);
}
const successSample={schema:'nlab.live-preflight-report',version:1};
const errorSample={schema:'nlab.live-preflight-error',version:1,ok:false,exit_code:1};
const unknownSample={schema:'nlab.live-preflight-unknown',version:1};
assert.equal(branchFor(successSample).length,1);
assert.equal(branchFor(errorSample).length,1);
assert.equal(branchFor(unknownSample).length,0);

const success=branches.find(({target})=>target.properties.schema.const===successSample.schema)?.target;
const error=branches.find(({target})=>target.properties.schema.const===errorSample.schema)?.target;
assert.ok(success);
assert.ok(error);
assert.equal(success.required.includes('ready_for_real_integration'),true);
assert.equal(success.required.includes('evaluation'),true);
assert.deepEqual(error.required,['schema','version','ok','exit_code','error']);
assert.equal(error.properties.ok.const,false);
assert.deepEqual(error.properties.exit_code.enum,[1,2]);

console.log('live preflight output schema tests: ok');
