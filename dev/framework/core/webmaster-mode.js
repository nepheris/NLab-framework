const MODES=new Set(['public','webmaster']);
const FEATURES=['ids','infoTest','help','tools','diagnostics'];
const DEFAULTS={public:Object.fromEntries(FEATURES.map(key=>[key,false])),webmaster:Object.fromEntries(FEATURES.map(key=>[key,true]))};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>v===undefined?undefined:structuredClone(v);
const clean=v=>String(v??'').trim();
const featureKey=value=>{const key=clean(value);if(!FEATURES.includes(key))throw new WebmasterModeError('Unknown webmaster feature','UNKNOWN_FEATURE',{feature:value});return key;};
function readStorage(storage,key){if(!storage||!key)return null;try{if(typeof storage.get==='function')return storage.get(key,null);if(typeof storage.getItem==='function'){const raw=storage.getItem(String(key));if(raw==null||raw==='')return null;try{return JSON.parse(raw)}catch{return null}}}catch{}return null;}
function writeStorage(storage,key,value){if(!storage||!key)return false;try{if(typeof storage.set==='function')return storage.set(key,value)!==false;if(typeof storage.setItem==='function'){storage.setItem(String(key),JSON.stringify(value));return true}}catch{}return false;}
export class WebmasterModeError extends Error{constructor(message,code='WEBMASTER_MODE_ERROR',details=null){super(message);this.name='WebmasterModeError';this.code=code;this.details=details;}}
export class WebmasterMode{
  constructor({mode='public',overrides=null,storage=null,storageKey='nlab.webmaster-mode',hydrate=true,onChange=null}={}){this.storage=storage;this.storageKey=clean(storageKey)||'nlab.webmaster-mode';this.listeners=new Set();if(typeof onChange==='function')this.listeners.add(onChange);this.mode='public';this.overrides={};this.replace({mode,overrides},{persist:false,emit:false});if(hydrate)this.hydrate({emit:false});}
  static modes(){return [...MODES]}
  static features(){return [...FEATURES]}
  setMode(mode,{resetOverrides=false,persist=true}={}){if(!MODES.has(mode))throw new WebmasterModeError('Invalid webmaster mode','INVALID_MODE',{mode});const changed=this.mode!==mode||resetOverrides;this.mode=mode;if(resetOverrides)this.overrides={};if(changed)this.#changed('mode',persist);return this;}
  toggle(options={}){return this.setMode(this.mode==='public'?'webmaster':'public',options);}
  setFeature(feature,enabled,{persist=true}={}){const key=featureKey(feature);const value=Boolean(enabled);if(this.overrides[key]===value)return this;this.overrides[key]=value;this.#changed('feature',persist);return this;}
  clearFeature(feature,{persist=true}={}){const key=featureKey(feature);if(!Object.hasOwn(this.overrides,key))return this;delete this.overrides[key];this.#changed('feature',persist);return this;}
  clearOverrides({persist=true}={}){if(!Object.keys(this.overrides).length)return this;this.overrides={};this.#changed('feature',persist);return this;}
  isEnabled(feature){const key=featureKey(feature);return Object.hasOwn(this.overrides,key)?Boolean(this.overrides[key]):DEFAULTS[this.mode][key];}
  features(){return Object.fromEntries(FEATURES.map(key=>[key,this.isEnabled(key)]));}
  snapshot(){return {mode:this.mode,overrides:clone(this.overrides),features:this.features()};}
  attributes(){const f=this.features();return {'data-view-mode':this.mode,'data-webmaster':String(this.mode==='webmaster'),...Object.fromEntries(Object.entries(f).map(([key,value])=>[`data-feature-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}`,String(value)]))};}
  replace(value,{persist=true,emit=true}={}){if(!plain(value))throw new WebmasterModeError('Mode snapshot must be an object','INVALID_SNAPSHOT');const mode=value.mode??this.mode;if(!MODES.has(mode))throw new WebmasterModeError('Invalid webmaster mode','INVALID_MODE',{mode});const overrides=plain(value.overrides)?value.overrides:{};const next={};for(const[key,val]of Object.entries(overrides)){const normalized=featureKey(key);next[normalized]=Boolean(val);}const changed=this.mode!==mode||JSON.stringify(this.overrides)!==JSON.stringify(next);this.mode=mode;this.overrides=next;if(changed&&emit)this.#changed('replace',persist);else if(changed&&persist)this.persist();return this;}
  hydrate({emit=true}={}){const stored=readStorage(this.storage,this.storageKey);if(stored&&plain(stored))this.replace(stored,{persist:false,emit});return this;}
  persist(){return writeStorage(this.storage,this.storageKey,{mode:this.mode,overrides:clone(this.overrides)});}
  subscribe(listener,{immediate=false}={}){if(typeof listener!=='function')throw new TypeError('listener must be a function');this.listeners.add(listener);if(immediate)listener({type:'snapshot',snapshot:this.snapshot()});return()=>this.listeners.delete(listener);}
  #changed(type,persist){if(persist)this.persist();const event={type,snapshot:this.snapshot()};for(const listener of [...this.listeners])listener(clone(event));}
}
