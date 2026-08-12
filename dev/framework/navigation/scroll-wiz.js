const POLICIES=new Set(['always','threshold','never']);
const clean=v=>String(v??'').trim();
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const pos=v=>Math.max(0,finite(v,0));
const clone=v=>v===undefined?undefined:structuredClone(v);

function read(storage,key){
  if(!storage||!key)return null;
  try{
    if(typeof storage.get==='function')return storage.get(key,null);
    if(typeof storage.getItem==='function'){
      const raw=storage.getItem(String(key));if(raw==null||raw==='')return null;
      try{return JSON.parse(raw)}catch{return null}
    }
  }catch{}
  return null;
}
function write(storage,key,value){
  if(!storage||!key)return false;
  try{
    if(typeof storage.set==='function')return storage.set(key,value)!==false;
    if(typeof storage.setItem==='function'){storage.setItem(String(key),JSON.stringify(value));return true}
  }catch{}
  return false;
}

export class ScrollWizError extends Error{
  constructor(message,code='SCROLL_WIZ_ERROR',details=null){super(message);this.name='ScrollWizError';this.code=code;this.details=details;}
}

export class ScrollWiz{
  constructor({storage=null,storageKey='nlab.scroll-wiz',hydrate=true,backToTop='threshold',threshold=480,onChange=null}={}){
    this.storage=storage;this.storageKey=clean(storageKey)||'nlab.scroll-wiz';this.positions=new Map();
    this.backToTop=POLICIES.has(backToTop)?backToTop:'threshold';this.threshold=Math.max(0,finite(threshold,480));
    this.onChange=typeof onChange==='function'?onChange:null;if(hydrate)this.hydrate();
  }
  capture(key,{x=0,y=0,meta=null}={}){
    const id=this.#key(key),value={x:pos(x),y:pos(y),meta:meta==null?null:clone(meta)};
    this.positions.set(id,value);this.persist();this.#emit('capture',id);return clone(value);
  }
  get(key,{fallback={x:0,y:0,meta:null}}={}){
    const id=this.#key(key),value=this.positions.get(id);
    return clone(value??{x:pos(fallback.x),y:pos(fallback.y),meta:fallback.meta==null?null:clone(fallback.meta)});
  }
  has(key){return this.positions.has(this.#key(key));}
  clear(key=null){
    if(key==null)this.positions.clear();else this.positions.delete(this.#key(key));
    this.persist();this.#emit('clear',key==null?null:String(key));return this;
  }
  beforeNavigate(fromKey,position){if(fromKey!=null)this.capture(fromKey,position);return this;}
  restore(toKey,{behavior='auto',fallback}={}){
    const p=this.get(toKey,{fallback});
    return{key:this.#key(toKey),x:p.x,y:p.y,behavior:['auto','smooth','instant'].includes(behavior)?behavior:'auto',found:this.has(toKey),meta:clone(p.meta)};
  }
  transition({fromKey=null,toKey,position={x:0,y:0},behavior='auto',fallback}={}){
    if(fromKey!=null)this.capture(fromKey,position);
    return this.restore(toKey,{behavior,fallback});
  }
  shouldShowBackToTop({y=0,policy=this.backToTop,threshold=this.threshold}={}){
    const p=POLICIES.has(policy)?policy:this.backToTop;
    if(p==='always')return true;if(p==='never')return false;
    return pos(y)>=Math.max(0,finite(threshold,this.threshold));
  }
  backToTopDescriptor({behavior='smooth'}={}){
    return{x:0,y:0,behavior:['auto','smooth','instant'].includes(behavior)?behavior:'smooth'};
  }
  setBackToTop(policy,{threshold=this.threshold,persist=true}={}){
    if(!POLICIES.has(policy))throw new ScrollWizError('Invalid back-to-top policy','INVALID_POLICY',{policy});
    this.backToTop=policy;this.threshold=Math.max(0,finite(threshold,this.threshold));if(persist)this.persist();this.#emit('policy',null);return this;
  }
  snapshot(){return{backToTop:this.backToTop,threshold:this.threshold,positions:Object.fromEntries([...this.positions.entries()].map(([k,v])=>[k,clone(v)]))};}
  hydrate(){
    const value=read(this.storage,this.storageKey);if(!value||typeof value!=='object')return this;
    if(POLICIES.has(value.backToTop))this.backToTop=value.backToTop;
    if(Number.isFinite(Number(value.threshold)))this.threshold=Math.max(0,Number(value.threshold));
    if(value.positions&&typeof value.positions==='object'){
      this.positions.clear();
      for(const[k,v]of Object.entries(value.positions)){
        if(!clean(k)||!v||typeof v!=='object')continue;
        this.positions.set(k,{x:pos(v.x),y:pos(v.y),meta:v.meta==null?null:clone(v.meta)});
      }
    }
    return this;
  }
  persist(){return write(this.storage,this.storageKey,this.snapshot());}
  #key(value){const id=clean(value);if(!id)throw new ScrollWizError('Scroll key is required','KEY_REQUIRED');return id;}
  #emit(type,key){this.onChange?.({type,key,snapshot:this.snapshot()});}
}
