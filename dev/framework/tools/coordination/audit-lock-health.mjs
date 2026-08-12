import { pathToFileURL } from 'node:url';
import { loadLocks } from './check-lock-overlaps.mjs';

export const LOCK_STATUSES = Object.freeze(new Set([
  'reserved','in_progress','blocked','review','done','released'
]));
export const OCCUPIED_LOCK_STATUSES = Object.freeze(new Set([
  'reserved','in_progress','blocked','review'
]));

const clean=value=>String(value??'').trim();
const scopes=lock=>Array.isArray(lock?.file_scope)?lock.file_scope.map(clean).filter(Boolean):[];
const isObject=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const finite=value=>Number.isFinite(Number(value))?Number(value):null;

function parseTime(value) {
  if (value==null||value==='') return null;
  const ms=Date.parse(String(value));
  return Number.isFinite(ms)?ms:null;
}
function issue(code,severity,lock,details={}) {
  return {
    code,severity,
    task_id:clean(lock?.task_id)||null,
    file:lock?.__file??null,
    ...details
  };
}
function latestLifecycleTime(lock) {
  const fields=['completed_at','released_at','review_at','started_at','reserved_at'];
  for (const field of fields) {
    const value=parseTime(lock?.[field]);
    if (value!=null) return {field,value};
  }
  return null;
}
function normalizeNow(clock) {
  const raw=typeof clock==='function'?clock():Date.now();
  if (raw instanceof Date) return raw.getTime();
  const numeric=finite(raw);
  if (numeric!=null) return numeric;
  const parsed=parseTime(raw);
  if (parsed!=null) return parsed;
  throw new TypeError('clock() must return a timestamp, Date or parseable date string');
}

export function auditLock(lock,{clock=()=>Date.now(),staleAfterMs=6*60*60*1000}={}) {
  const errors=[];
  const warnings=[];
  if (!isObject(lock)) {
    errors.push(issue('INVALID_LOCK','error',lock));
    return {errors,warnings};
  }

  const taskId=clean(lock.task_id);
  const agent=clean(lock.agent);
  const status=clean(lock.status);
  const branch=clean(lock.branch);
  const scopeList=scopes(lock);

  if (!taskId) errors.push(issue('TASK_ID_REQUIRED','error',lock));
  if (!agent) errors.push(issue('AGENT_REQUIRED','error',lock));
  if (!LOCK_STATUSES.has(status)) errors.push(issue('UNKNOWN_STATUS','error',lock,{status:status||null}));
  if (!Array.isArray(lock.file_scope)) errors.push(issue('FILE_SCOPE_REQUIRED','error',lock));
  else if (!scopeList.length) errors.push(issue('FILE_SCOPE_EMPTY','error',lock));

  const seenScopes=new Set();
  for (const scope of scopeList) {
    if (seenScopes.has(scope)) warnings.push(issue('DUPLICATE_SCOPE','warning',lock,{scope}));
    seenScopes.add(scope);
  }

  if (OCCUPIED_LOCK_STATUSES.has(status) && !branch) {
    errors.push(issue('OCCUPIED_BRANCH_REQUIRED','error',lock,{status}));
  }
  if (status==='review' && lock.pr==null) {
    warnings.push(issue('REVIEW_WITHOUT_PR','warning',lock));
  }
  if (status==='done' && parseTime(lock.completed_at)==null) {
    warnings.push(issue('DONE_WITHOUT_COMPLETED_AT','warning',lock));
  }
  if (status==='released' && parseTime(lock.released_at)==null) {
    warnings.push(issue('RELEASED_WITHOUT_RELEASED_AT','warning',lock));
  }

  const lifecycle=['reserved_at','started_at','review_at','completed_at','released_at'];
  const parsed={};
  for (const field of lifecycle) {
    if (lock[field]==null||lock[field]==='') continue;
    const value=parseTime(lock[field]);
    if (value==null) errors.push(issue('INVALID_TIMESTAMP','error',lock,{field,value:lock[field]}));
    else parsed[field]=value;
  }
  const ordered=['reserved_at','started_at','review_at','completed_at'];
  let previous=null;
  for (const field of ordered) {
    if (parsed[field]==null) continue;
    if (previous && parsed[field] < previous.value) {
      errors.push(issue('TIMESTAMP_ORDER','error',lock,{earlier:previous.field,later:field}));
    }
    previous={field,value:parsed[field]};
  }
  if (parsed.reserved_at!=null && parsed.released_at!=null && parsed.released_at < parsed.reserved_at) {
    errors.push(issue('TIMESTAMP_ORDER','error',lock,{earlier:'reserved_at',later:'released_at'}));
  }

  if (OCCUPIED_LOCK_STATUSES.has(status)) {
    const latest=latestLifecycleTime(lock);
    const threshold=Math.max(0,finite(staleAfterMs)??0);
    if (latest && threshold>0) {
      const age=normalizeNow(clock)-latest.value;
      if (age>threshold) warnings.push(issue('STALE_OCCUPIED_LOCK','warning',lock,{
        status,age_ms:age,latest_field:latest.field,latest_at:new Date(latest.value).toISOString()
      }));
    }
  }

  return {errors,warnings};
}

export function auditLocks(locks,options={}) {
  const input=Array.isArray(locks)?locks:[];
  const errors=[];
  const warnings=[];
  const byTask=new Map();
  const occupiedByBranch=new Map();

  for (const lock of input) {
    const local=auditLock(lock,options);
    errors.push(...local.errors);
    warnings.push(...local.warnings);

    const taskId=clean(lock?.task_id);
    if (taskId) {
      const previous=byTask.get(taskId);
      if (previous) errors.push(issue('DUPLICATE_TASK_ID','error',lock,{
        other_file:previous.__file??null
      }));
      else byTask.set(taskId,lock);
    }

    const status=clean(lock?.status);
    const branch=clean(lock?.branch);
    if (branch && OCCUPIED_LOCK_STATUSES.has(status)) {
      const previous=occupiedByBranch.get(branch);
      if (previous && clean(previous.task_id)!==taskId) {
        warnings.push(issue('SHARED_OCCUPIED_BRANCH','warning',lock,{
          branch,other_task_id:clean(previous.task_id)||null,other_file:previous.__file??null
        }));
      } else if (!previous) occupiedByBranch.set(branch,lock);
    }
  }

  return {
    ok:errors.length===0,
    total_locks:input.length,
    occupied_locks:input.filter(lock=>OCCUPIED_LOCK_STATUSES.has(clean(lock?.status))).length,
    errors,
    warnings
  };
}

export async function auditLockDirectory(directory,options={}) {
  const loaded=await loadLocks(directory);
  const report=auditLocks(loaded.locks,options);
  const parseErrors=loaded.errors.map(entry=>({
    code:'LOCK_PARSE_ERROR',severity:'error',file:entry.file,error:entry.error,task_id:null
  }));
  return {
    ...report,
    ok:report.ok&&parseErrors.length===0,
    parse_errors:parseErrors,
    errors:[...parseErrors,...report.errors]
  };
}

export async function runCli(argv=process.argv.slice(2)) {
  const [directory]=argv;
  if (!directory) {
    console.error('Usage: node audit-lock-health.mjs <locks-directory>');
    return 1;
  }
  const report=await auditLockDirectory(directory);
  console.log(JSON.stringify(report,null,2));
  return report.ok?0:2;
}

const isMain=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if (isMain) {
  runCli().then(code=>{process.exitCode=code;}).catch(error=>{
    console.error(error?.stack??error); process.exitCode=1;
  });
}
