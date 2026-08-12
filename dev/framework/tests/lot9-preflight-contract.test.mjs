import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PreflightGateEvaluator } from '../core/preflight-gate-evaluator.js';

const checklistUrl=new URL('../doc/roadmap/lot9-preflight.machine.json',import.meta.url);
const checklist=JSON.parse(await readFile(checklistUrl,'utf8'));
const gateById=new Map(checklist.gates.map(gate=>[gate.gate_id,gate]));
const blockingStatuses=new Set(['in_progress','pending','blocked_human','blocked_external']);

assert.equal(checklist.metadata?.document_id,'NLAB-WEB-FRAMEWORK-LOT9-PREFLIGHT');
assert.equal(checklist.metadata?.task_id,'9-PREFLIGHT-MACHINE-CHECKLIST');
assert.equal(checklist.metadata?.agent,'C');
assert.equal(checklist.policy?.canonical_work_branch,'New');
assert.equal(checklist.policy?.status_is_snapshot,true);
assert.equal(checklist.policy?.live_status_source,'dev/framework/doc/roadmap/coordination/locks/');
assert.equal(checklist.policy?.runtime_changes_allowed_by_this_task,false);
assert.equal(checklist.policy?.demo_changes_allowed_by_this_task,false);
assert.equal(checklist.policy?.roadmap_md_changes_allowed_by_this_task,false);

assert.deepEqual(checklist.status_enum,PreflightGateEvaluator.gateStatuses());
assert.equal(Array.isArray(checklist.gates),true);
assert.equal(checklist.gates.length,11);
assert.equal(new Set(checklist.gates.map(gate=>gate.gate_id)).size,checklist.gates.length);
for(const gate of checklist.gates){
  assert.match(gate.gate_id,/^P9-\d{3}$/);
  assert.equal(checklist.status_enum.includes(gate.status),true,`${gate.gate_id} has unknown status ${gate.status}`);
  assert.equal(Array.isArray(gate.acceptance)&&gate.acceptance.length>0,true,`${gate.gate_id} needs acceptance criteria`);
  assert.equal(gate.acceptance.every(item=>typeof item==='string'&&item.trim().length>0),true,`${gate.gate_id} has blank acceptance criteria`);
}

const expectedSnapshotBlockers=checklist.gates
  .filter(gate=>gate.required_for_real_integration!==false&&blockingStatuses.has(gate.status))
  .map(gate=>gate.gate_id);
assert.deepEqual(checklist.decision?.blocking_gates_snapshot,expectedSnapshotBlockers);
assert.equal(checklist.decision?.real_lot9_integration_ready,false);
assert.equal(checklist.decision?.preparation_work_allowed_now,true);
assert.equal(Array.isArray(checklist.decision?.safe_parallel_work)&&checklist.decision.safe_parallel_work.length>0,true);

for(const id of ['P9-009','P9-010']){
  const gate=gateById.get(id);
  assert.equal(gate?.required_for_real_integration,true);
  assert.equal(gate?.status,'ready');
  assert.equal(checklist.decision.blocking_gates_snapshot.includes(id),false);
}
assert.equal(gateById.get('P9-007')?.status,'blocked_human');
assert.equal(gateById.get('P9-008')?.status,'blocked_external');

const discipline=gateById.get('P9-011');
assert.equal(discipline?.required_for_real_integration,false);
assert.equal(discipline?.status,'pass');
assert.equal(discipline?.acceptance.some(item=>item.includes('file_scope')&&item.toLowerCase().includes('overlap')),true);

const evaluator=new PreflightGateEvaluator();
const report=evaluator.evaluate(checklist);
assert.deepEqual(report.summary.blocking_gate_ids,expectedSnapshotBlockers);
assert.equal(report.summary.ready_for_real_integration,false);
assert.equal(report.summary.preparation_work_allowed_now,true);
assert.equal(report.gates.find(gate=>gate.gate_id==='P9-009')?.effective_status,'ready');
assert.equal(report.gates.find(gate=>gate.gate_id==='P9-010')?.effective_status,'ready');
assert.equal(report.gates.find(gate=>gate.gate_id==='P9-007')?.effective_status,'blocked_human');
assert.equal(report.gates.find(gate=>gate.gate_id==='P9-008')?.effective_status,'blocked_external');

const taskGateIds=checklist.gates
  .filter(gate=>gate.coordination_task||Array.isArray(gate.coordination_tasks))
  .map(gate=>gate.gate_id);
for(const gateId of taskGateIds){
  assert.equal(report.warnings.some(warning=>warning.code==='TASK_STATE_MISSING'&&warning.gate_id===gateId),true,`${gateId} should declare missing live task state in snapshot-only evaluation`);
}

assert.equal(checklist.dictionnaire_donnees?.version,'1.0.0');
assert.equal(typeof checklist.dictionnaire_donnees?.description,'string');
assert.equal(checklist.dictionnaire_donnees.description.length>0,true);

console.log('lot9 preflight contract tests: ok');
