const KEY=/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const FORBIDDEN=new Set(['__proto__','prototype','constructor']);

export class SessionConfigError extends Error {
  constructor(message,code='SESSION_CONFIG_ERROR',details=null){super(message);this.name='SessionConfigError';this.code=code;this.details=details;}
}

function moduleKey(value){const key=String(value??'').trim();if(!KEY.test(key))throw new SessionConfigError('Invalid module key','INVALID_KEY',{value});return key;}
function jsonClone(value,path='$',seen=new WeakSet()){
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'){if(!Number.isFinite(value))throw new SessionConfigError('Non-finite numbers are not allowed','INVALID_NUMBER',{path});return value;}
  if(Array.isArray(value)){if(seen.has(value))throw new SessionConfigError('Cyclic configuration','CYCLIC_CONFIG',{path});seen.add(value);return value.map((entry,index)=>jsonClone(entry,`${path}[${index}]`,seen));}
  if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){if(seen.has(value))throw new SessionConfigError('Cyclic configuration','CYCLIC_CONFIG',{path});seen.add(value);const out={};for(const key of Object.keys(value).sort()){if(FORBIDDEN.has(key))throw new SessionConfigError('Unsafe configuration key','UNSAFE_KEY',{path,key});Object.defineProperty(out,key,{value:jsonClone(value[key],`${path}.${key}`,seen),enumerable:true,writable:true,configurable:true});}return out;}
  throw new SessionConfigError('Configuration must be JSON-like','INVALID_CONFIG',{path,type:typeof value});
}
function stable(value){return JSON.stringify(jsonClone(value));}
function metadata(value){if(value==null)return {};return jsonClone(value,'$.metadata');}

export class SessionConfigRegistry {
  constructor({version=1,clock=()=>Date.now(),onChange=null}={}){this.version=Number.isInteger(version)&&version>0?version:1;this.clock=typeof clock==='function'?clock:()=>Date.now();this.entries=new Map();this.listeners=new Set();if(typeof onChange==='function')this.listeners.add(onChange);}
  subscribe(listener){if(typeof listener!=='function')throw new SessionConfigError('listener must be a function','INVALID_LISTENER');this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  has(key){try{return this.entries.has(moduleKey(key));}catch{return false;}}
  get(key){const entry=this.entries.get(moduleKey(key));return entry?jsonClone(entry):null;}
  list(){return [...this.entries.keys()].sort().map((key)=>this.get(key));}
  publish(key,config,{reference=true,metadata:meta={}}={}){
    const id=moduleKey(key);const normalized=jsonClone(config,'$.config');const fingerprint=stable(normalized);const current=this.entries.get(id);const changed=!current||current.fingerprint!==fingerprint;const revision=changed?(current?.revision??0)+1:(current?.revision??1);const next={key:id,revision,reference:Boolean(reference),validatedAt:this.clock(),fingerprint,config:normalized,metadata:metadata(meta)};this.entries.set(id,next);this.#emit(current?'update':'publish',next);return jsonClone(next);
  }
  setReference(key,reference=true){const id=moduleKey(key);const current=this.entries.get(id);if(!current)throw new SessionConfigError('Unknown module key','UNKNOWN_KEY',{key:id});const next={...current,reference:Boolean(reference),validatedAt:this.clock()};this.entries.set(id,next);this.#emit('reference',next);return jsonClone(next);}
  remove(key){const id=moduleKey(key);const current=this.entries.get(id);if(!current)return false;this.entries.delete(id);this.#emit('remove',current);return true;}
  clear(){this.entries.clear();this.#emit('clear',null);}
  payload({referencesOnly=false}={}){const modules={};for(const entry of this.list()){if(referencesOnly&&!entry.reference)continue;Object.defineProperty(modules,entry.key,{value:{revision:entry.revision,reference:entry.reference,validatedAt:entry.validatedAt,config:entry.config,metadata:entry.metadata},enumerable:true,writable:true,configurable:true});}return {schema:'nlab.session-config',version:this.version,exportedAt:this.clock(),modules};}
  exportText(options={}){return JSON.stringify(this.payload(options),null,2);}
  importPayload(payload,{replace=false}={}){
    const source=jsonClone(payload,'$');if(source.schema!=='nlab.session-config')throw new SessionConfigError('Unsupported session config schema','INVALID_SCHEMA',{schema:source.schema});if(!Number.isInteger(source.version)||source.version<1)throw new SessionConfigError('Invalid session config version','INVALID_VERSION',{version:source.version});if(!source.modules||typeof source.modules!=='object'||Array.isArray(source.modules))throw new SessionConfigError('modules object is required','INVALID_MODULES');
    const staged=[];for(const [key,value] of Object.entries(source.modules)){const id=moduleKey(key);if(!value||typeof value!=='object'||Array.isArray(value)||!('config'in value))throw new SessionConfigError('Invalid module entry','INVALID_MODULE_ENTRY',{key:id});staged.push([id,value]);}
    if(replace)this.entries.clear();
    for(const [id,value] of staged)this.publish(id,value.config,{reference:value.reference!==false,metadata:value.metadata??{}});
    this.#emit('import',null);return this.list();
  }
  importText(text,options={}){let payload;try{payload=JSON.parse(String(text));}catch(error){throw new SessionConfigError('Invalid JSON text','INVALID_JSON',{cause:error?.message});}return this.importPayload(payload,options);}
  #emit(type,entry){const event={type,entry:entry?jsonClone(entry):null,size:this.entries.size};for(const listener of [...this.listeners])listener(jsonClone(event));}
}
