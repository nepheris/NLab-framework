import assert from 'node:assert/strict';
import { PreflightGateEvaluator, PreflightGateEvaluatorError } from '../core/preflight-gate-evaluator.js';

const checklist={
  metadata:{document_id:'TEST'},
  policy:{status_is_snapshot:true},
  gates:[
    {gate_id:'P1',required_for_real_integration:true,status:'in_progress',coordination_task:'T-DONE'},
    {gate_id:'P2',required_for_real_integration:true,status:'in_progress',coordination_tasks:['T-DONE','T-REVIEW']},
    {gate_id:'P3',required_for_real_integration:true,status:'blocked_human',coordination_task:'T-DONE'},
    {gate_id:'P4',required_for_real_integration:false,status:'ready'},
    {gate_id:'P5',required_for_real_integration:true,status:'in_progress',coordination_task:'T-MISSING'},
    {gate_id:'P6',required_for_real_integration:true,status:'in_progress',coordination_tasks:['T-DONE','T-MISSING']},
    {gate_id:'P7',required_for_real_integration:true,status:'ready'}
  ],
  decision:{preparation_work_allowed_now:true}
};
const tasks={
  'T-DONE':{status:'done',agent:'B'},
  'T-REVIEW':{status:'review',agent:'C'}
};
const evaluator=new PreflightGateEvaluator({taskStates:tasks});
const report=evaluator.evaluate(checklist);

assert.equal(report.gates[0].effective_status,'pass');
assert.equal(report.gates[0].status_source,'coordination');
assert.equal(report.gates[1].effective_status,'in_progress');
assert.equal(report.gates[2].effective_status,'blocked_human');
assert.equal(report.gates[2].status_source,'snapshot-blocker');
assert.equal(report.gates[3].effective_status,'ready');
assert.equal(report.gates[4].effective_status,'in_progress');
assert.equal(report.gates[5].effective_status,'in_progress');
assert.equal(report.gates[5].status_source,'coordination-incomplete');
assert.equal(report.gates[6].effective_status,'ready');
assert.equal(report.warnings.some(w=>w.code==='TASK_STATE_MISSING'&&w.task_id==='T-MISSING'),true);
assert.deepEqual(report.summary.blocking_gate_ids,['P2','P3','P5','P6']);
assert.equal(report.summary.ready_for_real_integration,false);
assert.equal(report.summary.preparation_work_allowed_now,true);
assert.equal(PreflightGateEvaluator.lockStatusMap().review,'in_progress');

const overridden=evaluator.evaluate(checklist,{overrides:{
  P2:{status:'pass',reason:'review consolidated'},
  P3:{status:'pass',reason:'human validation recorded'},
  P5:{status:'pass',reason:'task superseded'},
  P6:{status:'pass',reason:'missing task resolved externally'}
}});
assert.equal(overridden.summary.ready_for_real_integration,true);
assert.equal(overridden.gates[6].effective_status,'ready');
assert.equal(overridden.gates[2].status_source,'override');
assert.equal(overridden.gates[2].override_reason,'human validation recorded');

assert.throws(()=>evaluator.evaluate(checklist,{overrides:{P1:'wat'}}),error=>
  error instanceof PreflightGateEvaluatorError && error.code==='INVALID_OVERRIDE_STATUS'
);
assert.throws(()=>evaluator.evaluate({gates:[{gate_id:'X',status:'pass'},{gate_id:'X',status:'pass'}]}),error=>
  error instanceof PreflightGateEvaluatorError && error.code==='DUPLICATE_GATE_ID'
);
assert.throws(()=>evaluator.assertReady(checklist),error=>
  error instanceof PreflightGateEvaluatorError && error.code==='PREFLIGHT_BLOCKED'
);

const mapEvaluator=new PreflightGateEvaluator({taskStates:new Map([['T-DONE','done'],['T-REVIEW','review']])});
assert.equal(mapEvaluator.evaluate(checklist).gates[0].effective_status,'pass');
assert.equal(mapEvaluator.evaluate(checklist).gates[1].effective_status,'in_progress');

console.log('preflight gate evaluator tests: ok');
