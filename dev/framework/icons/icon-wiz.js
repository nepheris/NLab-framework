const STATES=new Set(['default','hover','active','inactive','success','warning','danger','locked','unlocked']);
const BASE_IDS=['info','help','close','reset','lock','unlock','pin','visibility','settings','refresh','navigation','save','print','download','upload','files','media','qr','share','links','theme','filter','search','resize'];
const CORE={
  info:'info',help:'help',close:'close',reset:'reset',lock:{default:'lock',locked:'lock',unlocked:'unlock'},unlock:{default:'unlock',locked:'lock',unlocked:'unlock'},pin:'pin',visibility:'eye',settings:'settings',refresh:'refresh',navigation:'chevronRight',download:'download',theme:'palette',filter:'filter',search:'search',resize:'resize',media:'image',
  save:{default:'export',substitute:true},print:{default:'export',substitute:true},upload:{default:'export',substitute:true},files:{default:'copy',substitute:true},qr:{default:'responsive',substitute:true},share:{default:'export',substitute:true},links:{default:'chevronRight',substitute:true}
};
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clean=v=>String(v??'').trim();
const normalizeState=v=>STATES.has(v)?v:'default';
const clone=v=>v===undefined?undefined:structuredClone(v);
function normalizeEntry(value){
  if(typeof value==='string'&&clean(value))return {default:clean(value),substitute:false};
  if(!plain(value))throw new TypeError('Icon pack entry must be a string or object');
  const out={substitute:Boolean(value.substitute)};
  for(const state of STATES){const id=clean(value[state]);if(id)out[state]=id;}
  const fallback=clean(value.default??value.id);if(fallback)out.default=fallback;
  if(!out.default&&!Object.keys(out).some(k=>STATES.has(k)))throw new TypeError('Icon pack entry requires a physical icon id');
  return out;
}
function normalizePack(pack={}){if(!plain(pack))throw new TypeError('Icon pack must be an object');const out={};for(const[id,value]of Object.entries(pack)){const key=clean(id);if(!key)continue;out[key]=normalizeEntry(value);}return out;}
export class IconWiz{
  constructor({registry=null,packs=null,activePack='core',fallback='help'}={}){this.registry=registry;this.packs=new Map([['core',normalizePack(CORE)]]);this.activePack='core';this.fallback=clean(fallback)||'help';if(packs)for(const[name,pack]of Object.entries(packs))this.registerPack(name,pack);this.usePack(activePack);}
  static states(){return [...STATES]}
  static semanticIds(){return [...BASE_IDS]}
  registerPack(name,pack,{extend='core'}={}){const key=clean(name);if(!key)throw new TypeError('Pack name is required');const base=this.packs.get(clean(extend))??{};this.packs.set(key,{...clone(base),...normalizePack(pack)});return this;}
  removePack(name){const key=clean(name);if(key&&key!=='core'){this.packs.delete(key);if(this.activePack===key)this.activePack='core';}return this;}
  usePack(name){const key=clean(name);this.activePack=this.packs.has(key)?key:'core';return this;}
  packNames(){return [...this.packs.keys()].sort()}
  hasSemantic(id,{pack=this.activePack}={}){return Boolean(this.packs.get(pack)?.[clean(id)]??this.packs.get('core')?.[clean(id)])}
  resolve(id,{state='default',pack=this.activePack,fallback=this.fallback}={}){
    const semanticId=clean(id);const normalizedState=normalizeState(state);const sourcePack=this.packs.has(pack)?pack:'core';const entry=this.packs.get(sourcePack)?.[semanticId]??this.packs.get('core')?.[semanticId]??this.packs.get(sourcePack)?.[fallback]??this.packs.get('core')?.[fallback]??null;
    if(!entry)return {semanticId,state:normalizedState,pack:sourcePack,physicalId:null,available:false,substitute:false,fallbackUsed:true};
    let physicalId=entry[normalizedState]??entry.default??null;
    if(normalizedState==='locked'&&!entry.locked)physicalId=this.packs.get(sourcePack)?.lock?.default??this.packs.get('core')?.lock?.default??physicalId;
    if(normalizedState==='unlocked'&&!entry.unlocked)physicalId=this.packs.get(sourcePack)?.unlock?.default??this.packs.get('core')?.unlock?.default??physicalId;
    const available=physicalId?Boolean(this.registry?.has?.(physicalId)??this.registry?.get?.(physicalId)):false;
    return {semanticId,state:normalizedState,pack:sourcePack,physicalId,available,substitute:Boolean(entry.substitute),fallbackUsed:!this.hasSemantic(semanticId,{pack:sourcePack})};
  }
  classes(id,options={}){const r=this.resolve(id,options);return ['nlab-icon-wiz',`nlab-icon-wiz--${r.semanticId||'unknown'}`,`nlab-icon-wiz--${r.state}`,r.substitute?'nlab-icon-wiz--substitute':null].filter(Boolean)}
  render(id,{state='default',pack=this.activePack,title=null,className='',document:doc=null}={}){
    const resolved=this.resolve(id,{state,pack});const classes=[...this.classes(id,{state,pack}),className].filter(Boolean).join(' ');
    if(doc?.createElement){const host=doc.createElement('span');host.className=classes;host.setAttribute?.('data-icon-id',resolved.semanticId);host.setAttribute?.('data-icon-state',resolved.state);host.setAttribute?.('data-icon-physical',resolved.physicalId??'');if(title)host.setAttribute?.('aria-label',String(title));else host.setAttribute?.('aria-hidden','true');const rendered=this.registry?.render?.(resolved.physicalId,{title,className:'nlab-icon'});if(rendered!=null)host.textContent=String(rendered);return {node:host,resolved};}
    const html=this.registry?.render?.(resolved.physicalId,{title,className:['nlab-icon',classes].filter(Boolean).join(' ')})??'';return {html,resolved};
  }
  audit({pack=this.activePack,ids=BASE_IDS}={}){const rows=ids.map(id=>this.resolve(id,{pack}));return {pack:this.packs.has(pack)?pack:'core',total:rows.length,available:rows.filter(r=>r.available).length,missing:rows.filter(r=>!r.available).map(r=>r.semanticId),substitutes:rows.filter(r=>r.substitute).map(r=>({semanticId:r.semanticId,physicalId:r.physicalId})),rows};}
}
export { CORE as CORE_SEMANTIC_ICON_PACK };
