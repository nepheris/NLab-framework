const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const primitive=v=>v===null||['string','number','boolean'].includes(typeof v);
function validate(value,path='root',seen=new WeakSet()){
  if(primitive(value)){if(typeof value==='number'&&!Number.isFinite(value))throw new WorkshopHistoryError('State number must be finite','INVALID_STATE',{path,value});return;}
  if(Array.isArray(value)||plain(value)){
    if(seen.has(value))throw new WorkshopHistoryError('State must not be circular','INVALID_STATE',{path});seen.add(value);
    if(Array.isArray(value))value.forEach((item,index)=>validate(item,`${path}[${index}]`,seen));else for(const[key,item]of Object.entries(value))validate(item,`${path}.${key}`,seen);
    seen.delete(value);return;
  }
  throw new WorkshopHistoryError('State must be JSON-like','INVALID_STATE',{path,type:typeof value});
}
function clone(value){validate(value);return structuredClone(value)}
function equal(a,b){
  if(Object.is(a,b))return true;if(typeof a!==typeof b)return false;
  if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)return false;return a.every((v,i)=>equal(v,b[i]));}
  if(plain(a)){if(!plain(b))return false;const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();if(ak.length!==bk.length||ak.some((k,i)=>k!==bk[i]))return false;return ak.every(k=>equal(a[k],b[k]));}
  return false;
}
const label=v=>String(v??'change').trim()||'change';
export class WorkshopHistoryError extends Error{constructor(message,code='WORKSHOP_HISTORY_ERROR',details=null){super(message);this.name='WorkshopHistoryError';this.code=code;this.details=details;}}
export class WorkshopHistory{
  constructor({initial=null,limit=100,onChange=null}={}){this.limit=Math.max(1,Math.trunc(Number(limit)||100));this.current=clone(initial);this.baseline=clone(initial);this.past=[];this.future=[];this.onChange=typeof onChange==='function'?onChange:null;}
  get(){return clone(this.current)}
  baselineState(){return clone(this.baseline)}
  status(){return {canUndo:this.past.length>0,canRedo:this.future.length>0,undoCount:this.past.length,redoCount:this.future.length,limit:this.limit,nextUndo:this.past.at(-1)?.label??null,nextRedo:this.future.at(-1)?.label??null,dirty:!equal(this.current,this.baseline)};}
  commit(next,{label:changeLabel='change'}={}){const value=clone(next);if(equal(this.current,value))return false;this.past.push({label:label(changeLabel),before:clone(this.current)});this.#trim();this.current=value;this.future=[];this.#emit('commit',changeLabel);return true;}
  transaction(mutator,{label:changeLabel='transaction'}={}){if(typeof mutator!=='function')throw new TypeError('transaction mutator must be a function');const draft=clone(this.current),result=mutator(draft);if(result&&typeof result.then==='function')throw new WorkshopHistoryError('Async transactions are not supported','ASYNC_TRANSACTION_UNSUPPORTED');return this.commit(result===undefined?draft:result,{label:changeLabel});}
  undo(){const entry=this.past.pop();if(!entry)return false;this.future.push({label:entry.label,state:clone(this.current)});this.current=clone(entry.before);this.#emit('undo',entry.label);return true;}
  redo(){const entry=this.future.pop();if(!entry)return false;this.past.push({label:entry.label,before:clone(this.current)});this.#trim();this.current=clone(entry.state);this.#emit('redo',entry.label);return true;}
  reset({recordHistory=true,label:changeLabel='reset'}={}){if(recordHistory)return this.commit(this.baseline,{label:changeLabel});if(equal(this.current,this.baseline))return false;this.current=clone(this.baseline);this.past=[];this.future=[];this.#emit('reset',changeLabel);return true;}
  markBaseline(next=this.current,{clearHistory=false}={}){this.baseline=clone(next);if(clearHistory){this.past=[];this.future=[];}this.#emit('baseline','baseline');return this;}
  replace(next,{baseline=false,clearHistory=true,label:changeLabel='replace'}={}){const value=clone(next);const changed=!equal(this.current,value);this.current=value;if(baseline)this.baseline=clone(value);if(clearHistory){this.past=[];this.future=[];}if(changed||baseline||clearHistory)this.#emit('replace',changeLabel);return this;}
  clearHistory(){this.past=[];this.future=[];return this;}
  snapshot(){return {current:clone(this.current),baseline:clone(this.baseline),status:this.status()};}
  #trim(){if(this.past.length>this.limit)this.past.splice(0,this.past.length-this.limit)}
  #emit(type,changeLabel){this.onChange?.({type,label:label(changeLabel),state:clone(this.current),status:this.status()});}
}
