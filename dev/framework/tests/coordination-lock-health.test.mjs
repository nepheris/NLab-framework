import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  auditLock,
  auditLocks,
  auditLockDirectory,
  LOCK_STATUSES,
  OCCUPIED_LOCK_STATUSES
} from '../tools/coordination/audit-lock-health.mjs';

const now=Date.parse('2026-08-12T19:00:00+02:00');
const clock=()=>now;
const healthy={
  task_id:'T-OK',agent:'A',status:'in_progress',branch:'agent-a/ok',
  file_scope:['dev/framework/core/ok.js'],
  reserved_at:'2026-08-12T18:00:00+02:00',
  started_at:'2026-08-12T18:05:00+02:00'
};
let report=auditLock(healthy,{clock,staleAfterMs:2*60*60*1000});
assert.deepEqual(report,{errors:[],warnings:[]});

report=auditLock({...healthy,status:'done',completed_at:'2026-08-12T18:30:00+02:00'},{clock});
assert.equal(report.errors.length,0);
assert.equal(report.warnings.length,0);

report=auditLock({...healthy,status:'done',completed_at:null},{clock});
assert.equal(report.warnings.some(x=>x.code==='DONE_WITHOUT_COMPLETED_AT'),true);

report=auditLock({...healthy,branch:'',file_scope:[]},{clock});
assert.equal(report.errors.some(x=>x.code==='OCCUPIED_BRANCH_REQUIRED'),true);
assert.equal(report.errors.some(x=>x.code==='FILE_SCOPE_EMPTY'),true);

report=auditLock({...healthy,status:'mystery'},{clock});
assert.equal(report.errors.some(x=>x.code==='UNKNOWN_STATUS'),true);

report=auditLock({...healthy,file_scope:['a.js','a.js']},{clock});
assert.equal(report.warnings.some(x=>x.code==='DUPLICATE_SCOPE'),true);

report=auditLock({...healthy,reserved_at:'2026-08-12T19:00:00+02:00',started_at:'2026-08-12T18:00:00+02:00'},{clock});
assert.equal(report.errors.some(x=>x.code==='TIMESTAMP_ORDER'),true);

report=auditLock({...healthy,reserved_at:'2026-08-12T08:00:00+02:00',started_at:null},{clock,staleAfterMs:6*60*60*1000});
assert.equal(report.warnings.some(x=>x.code==='STALE_OCCUPIED_LOCK'),true);

const aggregate=auditLocks([
  {...healthy,__file:'a.json'},
  {...healthy,__file:'b.json',branch:'agent-a/other'},
  {task_id:'T-2',agent:'B',status:'review',branch:'shared',file_scope:['x.js'],reserved_at:'2026-08-12T18:00:00+02:00',__file:'c.json'},
  {task_id:'T-3',agent:'C',status:'reserved',branch:'shared',file_scope:['y.js'],reserved_at:'2026-08-12T18:30:00+02:00',__file:'d.json'}
],{clock,staleAfterMs:24*60*60*1000});
assert.equal(aggregate.ok,false);
assert.equal(aggregate.errors.some(x=>x.code==='DUPLICATE_TASK_ID'),true);
assert.equal(aggregate.warnings.some(x=>x.code==='SHARED_OCCUPIED_BRANCH'),true);
assert.equal(aggregate.warnings.some(x=>x.code==='REVIEW_WITHOUT_PR'),true);

const temp=await fs.mkdtemp(path.join(os.tmpdir(),'nlab-lock-health-'));
try {
  await fs.writeFile(path.join(temp,'ok.json'),JSON.stringify(healthy));
  let directory=await auditLockDirectory(temp,{clock,staleAfterMs:24*60*60*1000});
  assert.equal(directory.ok,true);
  assert.equal(directory.total_locks,1);

  await fs.writeFile(path.join(temp,'broken.json'),'{broken');
  directory=await auditLockDirectory(temp,{clock});
  assert.equal(directory.ok,false);
  assert.equal(directory.parse_errors.some(x=>x.code==='LOCK_PARSE_ERROR'),true);
} finally {
  await fs.rm(temp,{recursive:true,force:true});
}

assert.equal(LOCK_STATUSES.has('done'),true);
assert.equal(OCCUPIED_LOCK_STATUSES.has('review'),true);
console.log('coordination lock health tests: ok');
