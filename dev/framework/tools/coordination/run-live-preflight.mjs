import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { findLockConflicts, loadLocks } from './check-lock-overlaps.mjs';
import { auditLocks } from './audit-lock-health.mjs';
import { PreflightGateEvaluator } from '../../core/preflight-gate-evaluator.js';

const plain=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clean=value=>String(value??'').trim();
const EXPLICIT_BLOCKERS=new Set(['blocked_human','blocked_external']);
const CLI_USAGE='node run-live-preflight.mjs <preflight.json> <locks-directory> [overrides.json]';

export const LIVE_PREFLIGHT_ERROR_SCHEMA='nlab.live-preflight-error';
export const LIVE_PREFLIGHT_ERROR_VERSION=1;

export class LivePreflightRunnerError extends Error {
  constructor(message,code='LIVE_PREFLIGHT_RUNNER_ERROR',details=null){
    super(message);this.name='LivePreflightRunnerError';this.code=code;this.details=details;
  }
}

async function readJson(file,label){
  let text;
  try{text=await fs.readFile(file,'utf8');}
  catch(error){throw new LivePreflightRunnerError(`Unable to read ${label}`,'READ_FAILED',{file,cause:error?.message??String(error)});}
  try{return JSON.parse(text);}
  catch(error){throw new LivePreflightRunnerError(`Invalid JSON in ${label}`,'INVALID_JSON',{file,cause:error?.message??String(error)});}
}
function taskStatesFromLocks(locks){
  const states={};
  for(const lock of locks){
    const id=String(lock?.task_id??'').trim();
    if(id) Object.defineProperty(states,id,{value:lock,enumerable:true,writable:true,configurable:true});
  }
  return states;
}
function nowIso(clock){
  const raw=typeof clock==='function'?clock():Date.now();
  const ms=raw instanceof Date?raw.getTime():Number(raw);
  if(!Number.isFinite(ms))throw new LivePreflightRunnerError('clock must return a finite timestamp or Date','INVALID_CLOCK');
  return new Date(ms).toISOString();
}
function validateOverrides(preflight,overrides){
  if(overrides==null)return;
  if(!plain(overrides))throw new LivePreflightRunnerError('Overrides must be an object','INVALID_OVERRIDES');
  const gates=Array.isArray(preflight?.gates)?preflight.gates:[];
  const byId=new Map(gates.map(gate=>[clean(gate?.gate_id),gate]).filter(([id])=>id));
  for(const [rawGateId,override] of Object.entries(overrides)){
    const gateId=clean(rawGateId);
    const gate=byId.get(gateId);
    if(!gate)throw new LivePreflightRunnerError('Override references an unknown gate','UNKNOWN_OVERRIDE_GATE',{gateId});
    const targetStatus=clean(typeof override==='string'?override:override?.status);
    const snapshotStatus=clean(gate.status);
    if(EXPLICIT_BLOCKERS.has(snapshotStatus)&&targetStatus&&targetStatus!==snapshotStatus){
      const reason=clean(plain(override)?override.reason:'');
      if(!reason)throw new LivePreflightRunnerError('Lifting a human/external blocker requires an explicit reason','OVERRIDE_REASON_REQUIRED',{gateId,snapshotStatus,targetStatus});
    }
  }
}
function exitCodeForError(error){return error?.code==='ACTIVE_LOCK_OVERLAP'?2:1;}
export function livePreflightErrorPayload(error,{exitCode=exitCodeForError(error)}={}){
  const normalized=error instanceof Error?error:new Error(String(error));
  return {
    schema:LIVE_PREFLIGHT_ERROR_SCHEMA,
    version:LIVE_PREFLIGHT_ERROR_VERSION,
    ok:false,
    exit_code:exitCode,
    error:{
      name:normalized.name||'Error',
      code:normalized.code??'LIVE_PREFLIGHT_ERROR',
      message:normalized.message||String(error),
      details:normalized.details??null
    }
  };
}

export async function runLivePreflight({
  preflightFile,
  locksDirectory,
  overridesFile=null,
  overrides=null,
  clock=()=>Date.now(),
  staleAfterMs=6*60*60*1000
}={}){
  if(!preflightFile)throw new LivePreflightRunnerError('preflightFile is required','PREFLIGHT_FILE_REQUIRED');
  if(!locksDirectory)throw new LivePreflightRunnerError('locksDirectory is required','LOCKS_DIRECTORY_REQUIRED');

  const preflight=await readJson(preflightFile,'preflight file');
  const loaded=await loadLocks(locksDirectory);
  if(loaded.errors.length){
    throw new LivePreflightRunnerError('Lock registry contains invalid JSON','LOCK_REGISTRY_PARSE_FAILED',{errors:loaded.errors});
  }
  const health=auditLocks(loaded.locks,{clock,staleAfterMs});
  if(!health.ok){
    throw new LivePreflightRunnerError('Lock registry health check failed','LOCK_REGISTRY_INVALID',{health});
  }
  const conflicts=findLockConflicts(loaded.locks);
  if(conflicts.length){
    throw new LivePreflightRunnerError('Active lock scopes overlap','ACTIVE_LOCK_OVERLAP',{conflicts});
  }

  let effectiveOverrides=overrides;
  if(overridesFile){
    const document=await readJson(overridesFile,'overrides file');
    effectiveOverrides=plain(document?.overrides)?document.overrides:document;
  }
  validateOverrides(preflight,effectiveOverrides);

  const evaluator=new PreflightGateEvaluator({
    taskStates:taskStatesFromLocks(loaded.locks),
    overrides:effectiveOverrides
  });
  const evaluation=evaluator.evaluate(preflight);
  return {
    schema:'nlab.live-preflight-report',
    version:1,
    generated_at:nowIso(clock),
    source:{
      preflight_file:String(preflightFile),
      locks_directory:String(locksDirectory),
      overrides_file:overridesFile?String(overridesFile):null
    },
    coordination:{active_lock_overlaps:0},
    lock_health:{
      ok:health.ok,
      total_locks:health.total_locks,
      occupied_locks:health.occupied_locks,
      warnings:health.warnings
    },
    evaluation,
    ready_for_real_integration:evaluation.summary.ready_for_real_integration
  };
}

export async function runCli(argv=process.argv.slice(2)){
  const [preflightFile,locksDirectory,overridesFile]=argv;
  if(!preflightFile||!locksDirectory){
    const error=new LivePreflightRunnerError('preflightFile and locksDirectory are required','USAGE',{usage:CLI_USAGE});
    const payload=livePreflightErrorPayload(error,{exitCode:1});
    console.error(JSON.stringify(payload,null,2));
    return payload.exit_code;
  }
  try{
    const report=await runLivePreflight({preflightFile,locksDirectory,overridesFile:overridesFile??null});
    console.log(JSON.stringify(report,null,2));
    return report.ready_for_real_integration?0:2;
  }catch(error){
    const payload=livePreflightErrorPayload(error);
    console.error(JSON.stringify(payload,null,2));
    return payload.exit_code;
  }
}

const isMain=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isMain)runCli().then(code=>{process.exitCode=code;});
