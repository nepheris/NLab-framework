const HUMAN=/^[A-Z][A-Z0-9_-]*-\d{3,}$/;
const TECH=/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const MODES=new Set(['classic','advanced']);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clean=v=>String(v??'').trim();
const clone=v=>v===undefined?undefined:structuredClone(v);

export class DiagnosticIdError extends Error {
  constructor(message,code='DIAGNOSTIC_ID_ERROR',details=null){
    super(message);this.name='DiagnosticIdError';this.code=code;this.details=details;
  }
}

function normalize(entry){
  if(!plain(entry))throw new DiagnosticIdError('Diagnostic entry must be an object','INVALID_ENTRY');
  const humanId=clean(entry.humanId),technicalId=clean(entry.technicalId);
  if(!HUMAN.test(humanId))throw new DiagnosticIdError('Invalid humanId','INVALID_HUMAN_ID',{humanId});
  if(!TECH.test(technicalId))throw new DiagnosticIdError('Invalid technicalId','INVALID_TECHNICAL_ID',{technicalId});
  const test=plain(entry.test)?entry.test:{};
  return {
    humanId,technicalId,
    kind:clean(entry.kind)||'component',
    title:clean(entry.title)||humanId,
    objective:clean(entry.objective??test.objective),
    thingsToTest:clone(Array.isArray(entry.thingsToTest)?entry.thingsToTest:Array.isArray(test.thingsToTest)?test.thingsToTest:[]),
    expectedResult:clean(entry.expectedResult??test.expectedResult),
    metadata:clone(plain(entry.metadata)?entry.metadata:{}),
    files:clone(Array.isArray(entry.files)?entry.files:[]),
    providers:clone(Array.isArray(entry.providers)?entry.providers:[]),
    dependencies:clone(Array.isArray(entry.dependencies)?entry.dependencies:[]),
    configuration:clone(plain(entry.configuration)?entry.configuration:{})
  };
}

export class DiagnosticIdRegistry {
  constructor({entries=[]}={}){this.byHuman=new Map();this.byTechnical=new Map();for(const e of entries)this.register(e)}
  register(entry,{replace=false}={}){
    const n=normalize(entry);
    const h=this.byHuman.get(n.humanId),t=this.byTechnical.get(n.technicalId);
    if(!replace&&(h||t))throw new DiagnosticIdError('Diagnostic id already registered','DUPLICATE_ID',{humanId:n.humanId,technicalId:n.technicalId});
    if(replace&&h&&t&&h!==t)throw new DiagnosticIdError('replace would merge two diagnostic entries','AMBIGUOUS_REPLACE',{humanId:n.humanId,technicalId:n.technicalId,humanMatch:h.technicalId,technicalMatch:t.humanId});
    if(replace){const previous=h??t;if(previous){this.byHuman.delete(previous.humanId);this.byTechnical.delete(previous.technicalId);}}
    this.byHuman.set(n.humanId,n);this.byTechnical.set(n.technicalId,n);return this;
  }
  unregister(ref){const e=this.get(ref);if(e){this.byHuman.delete(e.humanId);this.byTechnical.delete(e.technicalId);}return this;}
  get(ref){const key=clean(ref);const e=this.byHuman.get(key)??this.byTechnical.get(key);return e?clone(e):null;}
  has(ref){return Boolean(this.get(ref))}
  list({kind=null,technicalPrefix=null}={}){
    const k=clean(kind),p=clean(technicalPrefix);
    return [...this.byHuman.values()]
      .filter(e=>(!k||e.kind===k)&&(!p||e.technicalId===p||e.technicalId.startsWith(`${p}.`)))
      .sort((a,b)=>a.humanId.localeCompare(b.humanId,undefined,{numeric:true}))
      .map(clone);
  }
  nextHumanId({prefix='DMO',padding=3}={}){
    const p=clean(prefix).toUpperCase().replace(/[^A-Z0-9_-]/g,'')||'DMO';
    const width=Math.max(3,Math.trunc(Number(padding)||3));
    const escaped=p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const matcher=new RegExp(`^${escaped}-(\\d+)$`);
    let max=0;
    for(const id of this.byHuman.keys()){const m=matcher.exec(id);if(m)max=Math.max(max,Number(m[1]));}
    return `${p}-${String(max+1).padStart(width,'0')}`;
  }
  attributes(ref){
    const e=this.get(ref);if(!e)throw new DiagnosticIdError('Unknown diagnostic id','UNKNOWN_ID',{ref});
    return {'data-test-id':e.humanId,'data-technical-id':e.technicalId,'data-test-kind':e.kind};
  }
  describe(ref,{mode='classic'}={}){
    const e=this.get(ref);if(!e)throw new DiagnosticIdError('Unknown diagnostic id','UNKNOWN_ID',{ref});
    const normalizedMode=MODES.has(mode)?mode:'classic';
    const base={humanId:e.humanId,technicalId:e.technicalId,kind:e.kind,title:e.title,objective:e.objective,thingsToTest:clone(e.thingsToTest),expectedResult:e.expectedResult};
    if(normalizedMode==='classic')return base;
    return {...base,files:clone(e.files),providers:clone(e.providers),dependencies:clone(e.dependencies),configuration:clone(e.configuration),metadata:clone(e.metadata)};
  }
  resolveMany(refs=[]){return refs.map(ref=>this.get(ref)).filter(Boolean)}
  snapshot(){return this.list().map(clone)}
}
