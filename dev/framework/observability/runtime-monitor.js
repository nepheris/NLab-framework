export class RuntimeMonitor {
  constructor({ eventBus = null, maxErrors = 100 } = {}) { this.eventBus=eventBus; this.maxErrors=maxErrors; this.marks=new Map(); this.metrics=new Map(); this.errors=[]; }
  start(name){ this.marks.set(name,globalThis.performance?.now?.() ?? Date.now()); return this; }
  end(name,{ meta={} }={}){ const start=this.marks.get(name); if(start==null)return null; const duration=(globalThis.performance?.now?.() ?? Date.now())-start; this.marks.delete(name); const metric={ name,duration,meta,timestamp:Date.now() }; this.metrics.set(name,metric); this.eventBus?.emit?.('monitor:metric',metric); return metric; }
  count(name,delta=1){ const current=this.metrics.get(name)?.value ?? 0; const metric={ name,value:current+delta,timestamp:Date.now() }; this.metrics.set(name,metric); return metric.value; }
  capture(error,context={}){ const item={ message:error?.message??String(error), stack:error?.stack??null, context,timestamp:Date.now() }; this.errors.push(item); if(this.errors.length>this.maxErrors)this.errors.shift(); this.eventBus?.emit?.('monitor:error',item); return item; }
  snapshot(){ return { metrics:Object.fromEntries(this.metrics), errors:[...this.errors] }; }
  clear(){ this.marks.clear(); this.metrics.clear(); this.errors=[]; }
}
