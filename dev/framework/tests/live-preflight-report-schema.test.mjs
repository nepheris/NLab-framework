import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runLivePreflight } from '../tools/coordination/run-live-preflight.mjs';
import { PreflightGateEvaluator } from '../core/preflight-gate-evaluator.js';

const schemaUrl=new URL('../data/live-preflight-report.schema.json',import.meta.url);
const schema=JSON.parse(await readFile(schemaUrl,'utf8'));

assert.equal(schema.$schema,'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.$id,'https://nlab.dev/schemas/live-preflight-report.schema.json');
assert.equal(schema.type,'object');
assert.equal(schema.additionalProperties,false);
assert.deepEqual(schema.required,[
  'schema','version','generated_at','source','coordination','lock_health','evaluation','ready_for_real_integration'
]);
assert.equal(schema.properties.schema.const,'nlab.live-preflight-report');
assert.equal(schema.properties.version.const,1);
assert.deepEqual(schema.$defs.gateStatus.enum,PreflightGateEvaluator.gateStatuses());
assert.equal(schema.properties.coordination.properties.active_lock_overlaps.const,0);
assert.equal(schema.properties.lock_health.properties.ok.const,true);

function resolvePointer(document,ref){
  assert.match(ref,/^#\//,`Only local JSON pointers are expected, got ${ref}`);
  return ref.slice(2).split('/').reduce((value,segment)=>{
    const key=segment.replace(/~1/g,'/').replace(/~0/g,'~');
    return value?.[key];
  },document);
}
function walk(value){
  if(Array.isArray(value)){for(const item of value)walk(item);return;}
  if(!value||typeof value!=='object')return;
  if(typeof value.$ref==='string')assert.ok(resolvePointer(schema,value.$ref),`Unresolved schema ref ${value.$ref}`);
  for(const child of Object.values(value))walk(child);
}
walk(schema);

const temp=await mkdtemp(path.join(os.tmpdir(),'nlab-preflight-schema-'));
try{
  const locksDirectory=path.join(temp,'locks');
  await mkdir(locksDirectory);
  const preflightFile=path.join(temp,'preflight.json');
  await writeFile(preflightFile,JSON.stringify({
    metadata:{document_id:'SCHEMA-SAMPLE'},
    policy:{status_is_snapshot:true},
    gates:[
      {gate_id:'P1',required_for_real_integration:true,status:'ready',acceptance:['ready sample']},
      {gate_id:'P2',required_for_real_integration:false,status:'pass',acceptance:['pass sample']}
    ],
    decision:{preparation_work_allowed_now:true}
  }));

  const report=await runLivePreflight({
    preflightFile,
    locksDirectory,
    clock:()=>Date.parse('2026-08-12T18:00:00Z')
  });

  assert.deepEqual(Object.keys(report).sort(),[...schema.required].sort());
  assert.equal(report.schema,schema.properties.schema.const);
  assert.equal(report.version,schema.properties.version.const);
  assert.match(report.generated_at,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.deepEqual(Object.keys(report.source).sort(),[...schema.properties.source.required].sort());
  assert.equal(typeof report.source.preflight_file,'string');
  assert.equal(typeof report.source.locks_directory,'string');
  assert.equal(report.source.overrides_file,null);
  assert.deepEqual(Object.keys(report.coordination),['active_lock_overlaps']);
  assert.equal(report.coordination.active_lock_overlaps,0);
  assert.deepEqual(Object.keys(report.lock_health).sort(),[...schema.properties.lock_health.required].sort());
  assert.equal(report.lock_health.ok,true);
  assert.equal(Number.isInteger(report.lock_health.total_locks),true);
  assert.equal(Number.isInteger(report.lock_health.occupied_locks),true);
  assert.equal(Array.isArray(report.lock_health.warnings),true);

  assert.deepEqual(Object.keys(report.evaluation).sort(),[...schema.properties.evaluation.required].sort());
  assert.equal(Array.isArray(report.evaluation.gates),true);
  assert.equal(Array.isArray(report.evaluation.warnings),true);
  assert.deepEqual(Object.keys(report.evaluation.summary).sort(),[...schema.properties.evaluation.properties.summary.required].sort());
  assert.deepEqual(Object.keys(report.evaluation.summary.counts).sort(),[...schema.properties.evaluation.properties.summary.properties.counts.required].sort());
  assert.equal(report.evaluation.summary.ready_for_real_integration,true);
  assert.equal(report.ready_for_real_integration,report.evaluation.summary.ready_for_real_integration);

  const allowedStatuses=new Set(schema.$defs.gateStatus.enum);
  const allowedSources=new Set(schema.properties.evaluation.properties.gates.items.properties.status_source.enum);
  for(const gate of report.evaluation.gates){
    for(const key of schema.properties.evaluation.properties.gates.items.required)assert.ok(Object.hasOwn(gate,key),`Generated gate misses ${key}`);
    assert.equal(allowedStatuses.has(gate.snapshot_status),true);
    assert.equal(allowedStatuses.has(gate.effective_status),true);
    assert.equal(allowedSources.has(gate.status_source),true);
    assert.equal(Array.isArray(gate.coordination_tasks),true);
    assert.equal(Array.isArray(gate.coordination_state),true);
  }
} finally {
  await rm(temp,{recursive:true,force:true});
}

console.log('live preflight report schema tests: ok');
