const VERSION=1;
const SCHEMES=new Set(['system','light','dark']);
const MODES=new Set(['public','webmaster']);
const DEFAULTS={version:VERSION,language:'fr',scheme:'system',density:'normal',accent:'blue',viewMode:'public',personalization:true,telemetry:null,firstVisitCompleted:false};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>v===undefined?undefined:structuredClone(v);
const clean=v=>String(v??'').trim();

function language(value){
  const normalized=clean(value)||DEFAULTS.language;
  if(!/^[a-z]{2,3}(?:-[A-Za-z]{2})?$/.test(normalized))throw new VisitorPreferencesError('Invalid language','INVALID_LANGUAGE',{value});
  const [base,region]=normalized.split('-');
  return region?`${base.toLowerCase()}-${region.toUpperCase()}`:base.toLowerCase();
}
function slug(value,name,fallback){
  const normalized=clean(value)||fallback;
  if(!/^[a-z0-9][a-z0-9_-]*$/i.test(normalized))throw new VisitorPreferencesError(`Invalid ${name}`,'INVALID_PREFERENCE',{name,value});
  return normalized;
}
function normalizeKnown(name,value){
  if(name==='language')return language(value);
  if(name==='scheme'){if(!SCHEMES.has(value))throw new VisitorPreferencesError('Invalid scheme','INVALID_SCHEME',{value});return value;}
  if(name==='density')return slug(value,'density',DEFAULTS.density);
  if(name==='accent')return slug(value,'accent',DEFAULTS.accent);
  if(name==='viewMode'){if(!MODES.has(value))throw new VisitorPreferencesError('Invalid viewMode','INVALID_VIEW_MODE',{value});return value;}
  if(name==='personalization'||name==='firstVisitCompleted')return Boolean(value);
  if(name==='telemetry')return value==null?null:Boolean(value);
  if(name==='version')return VERSION;
  return clone(value);
}
function read(storage,key){
  if(!storage)return null;
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
  if(!storage)return false;
  try{
    if(typeof storage.set==='function')return storage.set(key,value)!==false;
    if(typeof storage.setItem==='function'){storage.setItem(String(key),JSON.stringify(value));return true;}
  }catch{}
  return false;
}

export class VisitorPreferencesError extends Error{
  constructor(message,code='VISITOR_PREFERENCES_ERROR',details=null){super(message);this.name='VisitorPreferencesError';this.code=code;this.details=details;}
}

export class VisitorPreferences{
  constructor({storage,key='visitor',defaults=null}={}){
    this.storage=storage;this.key=String(key??'visitor');
    this.defaults={...DEFAULTS,...(plain(defaults)?defaults:{})};
    const stored=read(storage,this.key);
    this.state=this.#normalize({...this.defaults,...(plain(stored)?stored:{})});
  }
  get(name,fallback=null){return Object.hasOwn(this.state,name)?clone(this.state[name]):fallback;}
  getAll(){return clone(this.state);}
  set(name,value){
    const key=clean(name);if(!key)throw new VisitorPreferencesError('Preference name is required','PREFERENCE_NAME_REQUIRED');
    this.state[key]=normalizeKnown(key,value);this.state.version=VERSION;this.persist();return this;
  }
  replace(value,{merge=false}={}){
    if(!plain(value))throw new VisitorPreferencesError('Preferences snapshot must be an object','INVALID_SNAPSHOT');
    this.state=this.#normalize(merge?{...this.state,...value}:{...this.defaults,...value});this.persist();return this;
  }
  completeFirstVisit(value={}){
    if(!plain(value))throw new VisitorPreferencesError('First-visit values must be an object','INVALID_SNAPSHOT');
    this.replace({...value,firstVisitCompleted:true},{merge:true});return this;
  }
  needsFirstVisit(){return !Boolean(this.state.firstVisitCompleted);}
  themePatch(){return{scheme:this.get('scheme',null),density:this.get('density',null),accent:this.get('accent',null)};}
  webmasterPatch(){return{mode:this.get('viewMode','public')};}
  consents(){return{personalization:Boolean(this.state.personalization),telemetry:this.state.telemetry==null?null:Boolean(this.state.telemetry)};}
  reset({persist=true}={}){this.state=this.#normalize(this.defaults);if(persist)this.persist();return this;}
  persist(){return write(this.storage,this.key,this.state);}
  reload(){const stored=read(this.storage,this.key);if(plain(stored))this.state=this.#normalize({...this.defaults,...stored});return this;}
  #normalize(value){
    const out={};for(const[k,v]of Object.entries(value))out[k]=normalizeKnown(k,v);
    out.version=VERSION;
    for(const[k,v]of Object.entries(DEFAULTS))if(!Object.hasOwn(out,k))out[k]=clone(v);
    return out;
  }
}
