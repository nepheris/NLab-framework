import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runLivePreflight, LivePreflightRunnerError, runCli } from '../tools/coordination/run-live-preflight.mjs';

const temp=await fs.mkdtemp(path.join(os.tmpdir(),'nlab-live-preflight-'));
const locks=path.join(temp,'locks');
await fs.mkdir(locks);
const preflightFile=path.join(temp,'preflight.json');
const overridesFile=path.join(temp,'overrides.json');
const clock=()=>Date.parse('2026-08-12T19:00:00Z');

try{
  await fs.writeFile(preflightFile,JSON.stringify({
    metadata:{document_id:'P'},
    gates:[
      {gate_id:'P1',required_for_real_integration:true,status:'in_progress',coordination_task:'T1'},
      {gate_id:'P2',required_for_real_integration:true,status:'blocked_human'}
    ],
    decision:{preparation_work_allowed_now:true}
  }));
  await fs.writeFile(path.join(locks,'T1.json'),JSON.stringify({
    task_id:'T1',agent:'B',status:'done',branch:'agent-b/t1',
    file_scope:['x.js'],reserved_at:'2026-08-12T18:00:00Z',completed_at:'2026-08-12T18:30:00Z'
  }));

  let report=await runLivePreflight({preflightFile,locksDirectory:locks,clock,staleAfterMs:24*60*60*1000});
  assert.equal(report.schema,'nlab.live-preflight-report');
  assert.equal(report.coordination.active_lock_overlaps,0);
  assert.equal(report.evaluation.gates[0].effective_status,'pass');
  assert.equal(report.evaluation.gates[1].effective_status,'blocked_human');
  assert.equal(report.ready_for_real_integration,false);
  assert.equal(report.lock_health.ok,true);

  await assert.rejects(
    ()=>runLivePreflight({preflightFile,locksDirectory:locks,overrides:{P404:'pass'},clock}),
    error=>error instanceof LivePreflightRunnerError&&error.code==='UNKNOWN_OVERRIDE_GATE'&&error.details.gateId==='P404'
  );
  await assert.rejects(
    ()=>runLivePreflight({preflightFile,locksDirectory:locks,overrides:{P2:'pass'},clock}),
    error=>error instanceof LivePreflightRunnerError&&error.code==='OVERRIDE_REASON_REQUIRED'
  );
  await assert.rejects(
    ()=>runLivePreflight({preflightFile,locksDirectory:locks,overrides:{P2:{status:'pass',reason:'   '}},clock}),
    error=>error instanceof LivePreflightRunnerError&&error.code==='OVERRIDE_REASON_REQUIRED'
  );

  await fs.writeFile(overridesFile,JSON.stringify({overrides:{P2:{status:'pass',reason:'human approved'}}}));
  report=await runLivePreflight({preflightFile,locksDirectory:locks,overridesFile,clock});
  assert.equal(report.ready_for_real_integration,true);
  assert.equal(report.evaluation.gates[1].status_source,'override');

  await fs.writeFile(path.join(locks,'bad.json'),JSON.stringify({
    task_id:'BAD',agent:'A',status:'mystery',branch:'x',file_scope:['y.js']
  }));
  await assert.rejects(
    ()=>runLivePreflight({preflightFile,locksDirectory:locks,clock}),
    error=>error instanceof LivePreflightRunnerError&&error.code==='LOCK_REGISTRY_INVALID'
  );
  await fs.rm(path.join(locks,'bad.json'));

  const conflictA=path.join(locks,'C1.json');
  const conflictB=path.join(locks,'C2.json');
  await fs.writeFile(conflictA,JSON.stringify({
    task_id:'C1',agent:'A',status:'in_progress',branch:'agent-a/c1',file_scope:['shared.js'],
    reserved_at:'2026-08-12T18:00:00Z',started_at:'2026-08-12T18:05:00Z'
  }));
  await fs.writeFile(conflictB,JSON.stringify({
    task_id:'C2',agent:'B',status:'reserved',branch:'agent-b/c2',file_scope:['shared.js'],
    reserved_at:'2026-08-12T18:10:00Z'
  }));
  await assert.rejects(
    ()=>runLivePreflight({preflightFile,locksDirectory:locks,clock}),
    error=>error instanceof LivePreflightRunnerError&&error.code==='ACTIVE_LOCK_OVERLAP'&&error.details.conflicts.length===1
  );

  const originalLog=console.log,originalError=console.error;
  console.log=()=>{};console.error=()=>{};
  try{
    assert.equal(await runCli([preflightFile,locks]),2);
  }finally{console.log=originalLog;console.error=originalError;}
  await fs.rm(conflictA);await fs.rm(conflictB);

  console.log=()=>{};console.error=()=>{};
  try{
    assert.equal(await runCli([preflightFile,locks]),2);
    assert.equal(await runCli([preflightFile,locks,overridesFile]),0);
    assert.equal(await runCli([]),1);
  }finally{console.log=originalLog;console.error=originalError;}
}finally{
  await fs.rm(temp,{recursive:true,force:true});
}
console.log('live preflight runner tests: ok');
