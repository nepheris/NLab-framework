const GATE_STATUSES = new Set(['pass','ready','in_progress','pending','blocked_human','blocked_external']);
const BLOCKING = new Set(['in_progress','pending','blocked_human','blocked_external']);
const LOCK_MAP = Object.freeze({
  done:'pass',
  completed:'pass',
  complete:'pass',
  review:'in_progress',
  reserved:'in_progress',
  in_progress:'in_progress',
  blocked:'pending',
  free:'pending'
});
const RANK = Object.freeze({
  pass:0,
  ready:1,
  pending:2,
  in_progress:3,
  blocked_external:4,
  blocked_human:5
});
const clone = value => value === undefined ? undefined : structuredClone(value);
const plain = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clean = value => String(value ?? '').trim();

export class PreflightGateEvaluatorError extends Error {
  constructor(message, code='PREFLIGHT_GATE_EVALUATOR_ERROR', details=null) {
    super(message); this.name='PreflightGateEvaluatorError'; this.code=code; this.details=details;
  }
}

function normalizeGateStatus(value, fallback='pending') {
  const status=clean(value).toLowerCase();
  return GATE_STATUSES.has(status) ? status : fallback;
}
function tasksOf(gate) {
  const out=[];
  if (clean(gate?.coordination_task)) out.push(clean(gate.coordination_task));
  if (Array.isArray(gate?.coordination_tasks)) {
    for (const item of gate.coordination_tasks) {
      const id=clean(item); if (id && !out.includes(id)) out.push(id);
    }
  }
  return out;
}
function taskState(source, taskId) {
  if (!source) return null;
  let value=null;
  if (source instanceof Map) value=source.get(taskId);
  else if (plain(source)) value=source[taskId];
  if (value == null) return null;
  if (typeof value === 'string') return {status:clean(value).toLowerCase()};
  if (plain(value)) return { ...clone(value), status:clean(value.status).toLowerCase() };
  return null;
}
function mappedTaskStatus(value) {
  const status=clean(value?.status).toLowerCase();
  return LOCK_MAP[status] ?? null;
}
function strongest(statuses, fallback='pending') {
  if (!statuses.length) return fallback;
  return statuses.reduce((best,current)=>(RANK[current]??99)>(RANK[best]??99)?current:best, statuses[0]);
}
function overrideFor(overrides, gateId) {
  if (!overrides) return null;
  let value=null;
  if (overrides instanceof Map) value=overrides.get(gateId);
  else if (plain(overrides)) value=overrides[gateId];
  if (value == null) return null;
  if (typeof value === 'string') return {status:value, reason:null};
  if (plain(value)) return {status:value.status, reason:clean(value.reason)||null};
  return null;
}
function assertChecklist(checklist) {
  if (!plain(checklist)) throw new PreflightGateEvaluatorError('Preflight checklist must be an object','INVALID_CHECKLIST');
  if (!Array.isArray(checklist.gates)) throw new PreflightGateEvaluatorError('Preflight checklist gates must be an array','INVALID_GATES');
  const ids=new Set();
  for (const gate of checklist.gates) {
    if (!plain(gate)) throw new PreflightGateEvaluatorError('Each gate must be an object','INVALID_GATE');
    const id=clean(gate.gate_id);
    if (!id) throw new PreflightGateEvaluatorError('gate_id is required','GATE_ID_REQUIRED');
    if (ids.has(id)) throw new PreflightGateEvaluatorError('Duplicate gate_id','DUPLICATE_GATE_ID',{gateId:id});
    ids.add(id);
  }
  return checklist;
}

export class PreflightGateEvaluator {
  constructor({ taskStates=null, overrides=null }={}) {
    this.taskStates=taskStates; this.overrides=overrides;
  }

  evaluate(checklist, {taskStates=this.taskStates, overrides=this.overrides}={}) {
    const source=assertChecklist(checklist);
    const warnings=[];
    const gates=source.gates.map(gate=>this.#evaluateGate(gate,{taskStates,overrides,warnings}));
    const required=gates.filter(g=>g.required_for_real_integration !== false);
    const blocking=required.filter(g=>BLOCKING.has(g.effective_status));
    const counts=Object.fromEntries([...GATE_STATUSES].map(status=>[status,gates.filter(g=>g.effective_status===status).length]));
    return {
      metadata: clone(source.metadata ?? {}),
      policy: clone(source.policy ?? {}),
      gates,
      summary:{
        total:gates.length,
        required:required.length,
        counts,
        blocking_gate_ids:blocking.map(g=>g.gate_id),
        ready_for_real_integration:blocking.length===0,
        preparation_work_allowed_now:source.decision?.preparation_work_allowed_now !== false
      },
      warnings
    };
  }

  #evaluateGate(gate,{taskStates,overrides,warnings}) {
    const result=clone(gate);
    const gateId=clean(gate.gate_id);
    const snapshot=normalizeGateStatus(gate.status);
    const taskIds=tasksOf(gate);
    const taskDetails=[];
    const mapped=[];
    for (const taskId of taskIds) {
      const state=taskState(taskStates,taskId);
      if (!state) {
        taskDetails.push({task_id:taskId,found:false,status:null,mapped_status:null});
        warnings.push({code:'TASK_STATE_MISSING',gate_id:gateId,task_id:taskId});
        continue;
      }
      const mappedStatus=mappedTaskStatus(state);
      taskDetails.push({task_id:taskId,found:true,status:state.status||null,mapped_status:mappedStatus,agent:state.agent??null,branch:state.branch??null});
      if (mappedStatus) mapped.push(mappedStatus);
      else warnings.push({code:'UNKNOWN_TASK_STATUS',gate_id:gateId,task_id:taskId,status:state.status||null});
    }

    let effective=snapshot;
    let source='snapshot';
    const incompleteTaskState = taskIds.length > 0 && taskDetails.some(item => !item.found || !item.mapped_status);
    if (mapped.length) {
      effective=strongest(mapped,snapshot);
      source='coordination';
      if (incompleteTaskState) {
        effective=strongest([effective, snapshot], snapshot);
        source='coordination-incomplete';
      }
    }
    if (snapshot==='blocked_human'||snapshot==='blocked_external') {
      effective=snapshot;
      source='snapshot-blocker';
    }

    const override=overrideFor(overrides,gateId);
    if (override) {
      const status=normalizeGateStatus(override.status,'');
      if (!status) throw new PreflightGateEvaluatorError('Invalid gate override status','INVALID_OVERRIDE_STATUS',{gateId,status:override.status});
      effective=status; source='override';
    }

    return {
      ...result,
      snapshot_status:snapshot,
      effective_status:effective,
      status_source:source,
      coordination_tasks:taskIds,
      coordination_state:taskDetails,
      override_reason:override?.reason??null
    };
  }

  assertReady(checklist, options={}) {
    const report=this.evaluate(checklist,options);
    if (!report.summary.ready_for_real_integration) {
      throw new PreflightGateEvaluatorError('Preflight contains blocking required gates','PREFLIGHT_BLOCKED',{
        blockingGateIds:[...report.summary.blocking_gate_ids]
      });
    }
    return report;
  }

  static gateStatuses(){ return [...GATE_STATUSES]; }
  static lockStatusMap(){ return {...LOCK_MAP}; }
}
