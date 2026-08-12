import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PreflightGateEvaluator } from '../core/preflight-gate-evaluator.js';

const checklistUrl=new URL('../doc/roadmap/lot9-preflight.machine.json',import.meta.url);
const locksUrl=new URL('../doc/roadmap/coordination/locks/',import.meta.url);
const checklist=JSON.parse(await readFile(checklistUrl,'utf8'));
const lockFiles=(await readdir(locksUrl)).filter(name=>name.endsWith('.json')).sort();

const byTask=new Map();
const duplicateTasks=[];
for(const file of lockFiles){
  const url=new URL(file,locksUrl);
  const lock=JSON.parse(await readFile(url,'utf8'));
  const taskId=String(lock?.task_id??'').trim();
  if(!taskId)continue;
  if(byTask.has(taskId))duplicateTasks.push({task_id:taskId,files:[byTask.get(taskId).file,file]});
  else byTask.set(taskId,{file,lock});
}
assert.deepEqual(duplicateTasks,[],'coordination task IDs must be unique across lock files');

const referenced=[];
for(const gate of checklist.gates){
  if(gate.coordination_task)referenced.push({gate_id:gate.gate_id,task_id:String(gate.coordination_task)});
  if(Array.isArray(gate.coordination_tasks))for(const taskId of gate.coordination_tasks)referenced.push({gate_id:gate.gate_id,task_id:String(taskId)});
}
assert.equal(referenced.length>0,true,'Lot 9 checklist must contain coordination task references');
assert.equal(new Set(referenced.map(item=>`${item.gate_id}:${item.task_id}`)).size,referenced.length,'gate/task references must not be duplicated');

const knownLockStatuses=new Set(['reserved','in_progress','blocked','review','done','released']);
const taskStates={};
for(const ref of referenced){
  const entry=byTask.get(ref.task_id);
  assert.ok(entry,`${ref.gate_id} references missing lock task ${ref.task_id}`);
  assert.equal(entry.lock.task_id,ref.task_id,`${entry.file} task_id must match the referenced ID`);
  assert.equal(typeof entry.lock.agent,'string',`${entry.file} must identify an agent`);
  assert.equal(entry.lock.agent.trim().length>0,true,`${entry.file} agent must not be blank`);
  assert.equal(knownLockStatuses.has(entry.lock.status),true,`${entry.file} uses unknown status ${entry.lock.status}`);
  assert.equal(Array.isArray(entry.lock.file_scope)&&entry.lock.file_scope.length>0,true,`${entry.file} must have a non-empty file_scope`);
  taskStates[ref.task_id]=entry.lock;
}

const evaluator=new PreflightGateEvaluator({taskStates});
const report=evaluator.evaluate(checklist);
for(const ref of referenced){
  assert.equal(report.warnings.some(warning=>warning.code==='TASK_STATE_MISSING'&&warning.gate_id===ref.gate_id&&warning.task_id===ref.task_id),false,`${ref.gate_id}/${ref.task_id} must resolve from live locks`);
  const gate=report.gates.find(item=>item.gate_id===ref.gate_id);
  assert.ok(gate,`${ref.gate_id} must be present in evaluator report`);
  const state=gate.coordination_state.find(item=>item.task_id===ref.task_id);
  assert.equal(state?.found,true,`${ref.task_id} must be marked found`);
  assert.equal(state?.status,entryStatus(ref.task_id),`${ref.task_id} status must come from its lock`);
}

function entryStatus(taskId){return byTask.get(taskId)?.lock?.status??null;}

assert.equal(report.gates.find(gate=>gate.gate_id==='P9-007')?.effective_status,'blocked_human','HUMAN blocker must remain explicit despite its technical lock state');
assert.equal(report.gates.find(gate=>gate.gate_id==='P9-008')?.effective_status,'blocked_external','external blocker has no technical lock override');

console.log('lot9 preflight lock reference tests: ok');
