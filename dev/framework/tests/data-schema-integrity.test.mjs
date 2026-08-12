import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';

const dataUrl=new URL('../data/',import.meta.url);
const names=(await readdir(dataUrl)).filter(name=>name.endsWith('.schema.json')).sort();
assert.equal(names.length>0,true,'dev/framework/data must contain JSON Schema files');

const schemas=[];
const ids=new Map();

function decodePointerToken(token){return token.replace(/~1/g,'/').replace(/~0/g,'~');}
function resolvePointer(document,fragment,context){
  if(fragment===''||fragment==='#')return document;
  assert.match(fragment,/^#\//,`${context}: only JSON Pointer fragments are supported, got ${fragment}`);
  let value=document;
  for(const token of fragment.slice(2).split('/').map(decodePointerToken)){
    assert.ok(value&&typeof value==='object'&&Object.hasOwn(value,token),`${context}: unresolved JSON Pointer token ${token}`);
    value=value[token];
  }
  return value;
}
function collectRefs(value,out=[]){
  if(Array.isArray(value)){for(const item of value)collectRefs(item,out);return out;}
  if(!value||typeof value!=='object')return out;
  if(typeof value.$ref==='string')out.push(value.$ref);
  for(const child of Object.values(value))collectRefs(child,out);
  return out;
}
function splitRef(ref){
  const index=ref.indexOf('#');
  return index<0?{path:ref,fragment:''}:{path:ref.slice(0,index),fragment:ref.slice(index)};
}
function isRemote(ref){return /^[a-z][a-z0-9+.-]*:/i.test(ref);}

for(const name of names){
  const url=new URL(name,dataUrl);
  const text=await readFile(url,'utf8');
  let schema;
  assert.doesNotThrow(()=>{schema=JSON.parse(text);},`${name}: must contain valid JSON`);
  assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema',`${name}: must declare JSON Schema Draft 2020-12`);
  assert.equal(typeof schema.$id,'string',`${name}: $id must be a string`);
  assert.equal(schema.$id.trim().length>0,true,`${name}: $id must not be blank`);
  assert.equal(ids.has(schema.$id),false,`${name}: duplicate $id ${schema.$id} also used by ${ids.get(schema.$id)}`);
  ids.set(schema.$id,name);
  schemas.push({name,url,schema});
}

for(const {name,url,schema} of schemas){
  for(const ref of collectRefs(schema)){
    assert.equal(typeof ref,'string');
    assert.equal(ref.trim().length>0,true,`${name}: blank $ref is not allowed`);
    if(ref.startsWith('#')){
      resolvePointer(schema,ref,`${name} -> ${ref}`);
      continue;
    }
    if(isRemote(ref))continue;

    const {path,fragment}=splitRef(ref);
    assert.equal(path.length>0,true,`${name}: relative $ref path must not be blank`);
    const targetUrl=new URL(path,url);
    await assert.doesNotReject(()=>access(targetUrl),`${name}: relative $ref target ${path} must exist`);
    const target=JSON.parse(await readFile(targetUrl,'utf8'));
    if(fragment)resolvePointer(target,fragment,`${name} -> ${ref}`);
  }
}

const preflightOutput=schemas.find(entry=>entry.name==='live-preflight-output.schema.json');
if(preflightOutput){
  const refs=collectRefs(preflightOutput.schema);
  assert.equal(refs.includes('live-preflight-report.schema.json'),true);
  assert.equal(refs.includes('live-preflight-error.schema.json'),true);
}

console.log(`data schema integrity tests: ok (${schemas.length} schemas)`);
