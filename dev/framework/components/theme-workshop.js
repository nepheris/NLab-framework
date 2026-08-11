import { deepMerge } from '../themes/theme-engine.js';
import { createCoreIconRegistry } from '../icons/icon-registry.js';

const px = (value) => `${Math.round(value)}px`;
const clampByte = (value) => Math.max(0, Math.min(255, Number(value) || 0));
const STYLE_KEYS = new Set(['height','minHeight','maxHeight','width','minWidth','maxWidth','padding','paddingTop','paddingRight','paddingBottom','paddingLeft','margin','marginTop','marginRight','marginBottom','marginLeft','gap','borderRadius','borderWidth','borderStyle','borderColor','background','backgroundColor','color','fontFamily','fontSize','fontWeight','lineHeight','opacity','boxShadow']);

function hexToRgb(hex) {
  const value = String(hex || '').replace('#','');
  if (!/^[0-9a-f]{6}$/i.test(value)) return { r:0,g:0,b:0 };
  return { r:parseInt(value.slice(0,2),16), g:parseInt(value.slice(2,4),16), b:parseInt(value.slice(4,6),16) };
}
function rgbToHex(r,g,b) { return `#${[r,g,b].map((v)=>clampByte(v).toString(16).padStart(2,'0')).join('')}`; }
function rgbToHsl(r,g,b) {
  r/=255; g/=255; b/=255; const max=Math.max(r,g,b), min=Math.min(r,g,b); let h=0, s=0; const l=(max+min)/2;
  if(max!==min){ const d=max-min; s=l>.5?d/(2-max-min):d/(max+min); switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;} h/=6; }
  return { h:Math.round(h*360), s:Math.round(s*100), l:Math.round(l*100) };
}
function colorText(hex, mode='hex') {
  const {r,g,b}=hexToRgb(hex); if(mode==='rgb') return `rgb(${r}, ${g}, ${b})`; if(mode==='hsl'){ const {h,s,l}=rgbToHsl(r,g,b); return `hsl(${h} ${s}% ${l}%)`; } return String(hex).toUpperCase();
}
const clone=(value)=>structuredClone(value??{});

export class ThemeWorkshop {
  constructor({ root = document, engine, storage = null, storageKey = 'theme-workshop', selector = '[data-theme-editable]', iconRegistry = createCoreIconRegistry() } = {}) {
    if (!engine) throw new Error('ThemeWorkshop requires a ThemeEngine');
    this.root = root; this.engine = engine; this.storage = storage; this.storageKey = storageKey; this.selector = selector; this.iconRegistry = iconRegistry;
    this.unlocked = false; this.componentLocks = new Set(); this.sessionPatch = storage?.get(storageKey, {}) ?? {}; this.handles = new Map(); this.appliedKeys = new Map();
    this.#normalizeSession();
  }
  setUnlocked(value = true) { this.unlocked=Boolean(value); this.root.documentElement?.toggleAttribute('data-theme-workshop',this.unlocked); this.unlocked?this.mountHandles():this.unmountHandles(); return this; }
  toggleUnlocked(){return this.setUnlocked(!this.unlocked);}
  lock(id,value=true){value?this.componentLocks.add(id):this.componentLocks.delete(id);this.#syncHandle(id);this.#persist();return this;}
  lockAll(){for(const el of this.#elements())this.componentLocks.add(this.#id(el));this.mountHandles();this.#persist();return this;}
  unlockAll(){this.componentLocks.clear();this.mountHandles();this.#persist();return this;}
  isLocked(id){return this.componentLocks.has(id);}

  setToken(name,value,{apply=true}={}){this.sessionPatch.tokens={...(this.sessionPatch.tokens??{}),[name]:value};if(apply)this.applySession();this.#persist();return this;}
  resetToken(name,{apply=true}={}){if(this.sessionPatch.tokens)delete this.sessionPatch.tokens[name];if(apply)this.applySession();this.#persist();return this;}

  setComponent(id,patch,{apply=true}={}) {
    if(this.isLocked(id))return this;
    this.sessionPatch.components=this.sessionPatch.components??{};
    this.sessionPatch.components[id]=deepMerge(this.sessionPatch.components[id]??{},patch);
    if(apply)this.applySession();this.#persist();return this;
  }

  setScoped(target,patch,{scope='instance',type=null,apply=true}={}) {
    const el=this.#resolveElement(target); if(!el)throw new Error('ThemeWorkshop.setScoped: target introuvable');
    const normalized=this.#normalizeScopedPatch(patch);
    if(scope==='global') this.sessionPatch.scopes.global=deepMerge(this.sessionPatch.scopes.global,normalized);
    else if(scope==='type') {
      const key=type||this.#type(el); this.sessionPatch.scopes.types[key]=deepMerge(this.sessionPatch.scopes.types[key]??{},normalized);
    } else if(scope==='instance') {
      const id=this.#id(el); if(this.isLocked(id))return this; this.sessionPatch.scopes.instances[id]=deepMerge(this.sessionPatch.scopes.instances[id]??{},normalized);
    } else throw new Error(`ThemeWorkshop.setScoped: portée inconnue "${scope}"`);
    if(apply)this.applySession();this.#persist();return this;
  }
  setScopedToken(target,name,value,options={}) { return this.setScoped(target,{tokens:{[name]:value}},options); }
  setScopedStyle(target,name,value,options={}) { return this.setScoped(target,{styles:{[name]:value}},options); }

  resetScoped(target,{scope='instance',type=null,property=null,kind='styles',apply=true}={}) {
    const el=this.#resolveElement(target); if(!el)throw new Error('ThemeWorkshop.resetScoped: target introuvable');
    let bucket;
    if(scope==='global') bucket=this.sessionPatch.scopes.global;
    else if(scope==='type') bucket=this.sessionPatch.scopes.types[type||this.#type(el)];
    else bucket=this.sessionPatch.scopes.instances[this.#id(el)];
    if(!bucket)return this;
    if(property) {
      if(bucket[kind])delete bucket[kind][property];
    } else {
      if(scope==='global')this.sessionPatch.scopes.global={tokens:{},styles:{}};
      else if(scope==='type')delete this.sessionPatch.scopes.types[type||this.#type(el)];
      else delete this.sessionPatch.scopes.instances[this.#id(el)];
    }
    if(apply)this.applySession();this.#persist();return this;
  }

  saveProfile(id,{label=id,scope='instance',target=null,patch={}}={}) {
    if(!id)throw new Error('ThemeWorkshop.saveProfile: id requis');
    this.sessionPatch.profiles[id]={id,label,scope,target,patch:clone(this.#normalizeScopedPatch(patch))};this.#persist();return this.sessionPatch.profiles[id];
  }
  applyProfile(id,target=null,{apply=true}={}) {
    const profile=this.sessionPatch.profiles?.[id]; if(!profile)throw new Error(`Profil inconnu: ${id}`);
    const resolvedTarget=target||profile.target; if(!resolvedTarget)throw new Error(`Profil ${id}: cible requise`);
    return this.setScoped(resolvedTarget,profile.patch,{scope:profile.scope,apply});
  }
  removeProfile(id){delete this.sessionPatch.profiles?.[id];this.#persist();return this;}
  listProfiles(){return Object.values(this.sessionPatch.profiles??{}).map(clone);}

  applySession(){
    this.#normalizeSession();
    this.engine.apply(document.documentElement,this.engine.resolve({user:{tokens:this.sessionPatch.tokens??{},density:this.sessionPatch.density,scheme:this.sessionPatch.scheme}}));
    this.#clearApplied();
    for(const el of this.#elements()){
      const id=this.#id(el),type=this.#type(el);
      const legacy=this.#normalizeScopedPatch(this.sessionPatch.components?.[id]??{});
      const patch=deepMerge(this.sessionPatch.scopes.global??{},this.sessionPatch.scopes.types?.[type]??{},this.sessionPatch.scopes.instances?.[id]??{},legacy);
      this.#applyPatch(el,patch);
    }
    return this;
  }
  commitToSite(){this.engine.setSitePatch({tokens:this.sessionPatch.tokens??{},density:this.sessionPatch.density,scheme:this.sessionPatch.scheme});this.engine.save();this.#persist();return this;}
  exportJSON(){return JSON.stringify({version:3,workshop:this.sessionPatch,locks:[...this.componentLocks],theme:JSON.parse(this.engine.exportJSON())},null,2);}
  importJSON(input){const data=typeof input==='string'?JSON.parse(input):input;if(data.theme)this.engine.importJSON(data.theme);this.sessionPatch=data.workshop??{};this.#normalizeSession();this.componentLocks=new Set(data.locks??[]);this.applySession();this.#persist();this.mountHandles();return this;}
  resetSession(){this.sessionPatch={};this.#normalizeSession();this.componentLocks.clear();this.#persist();this.applySession();this.mountHandles();return this;}

  mountHandles(){this.unmountHandles();if(!this.unlocked)return this;for(const el of this.#elements()){const id=this.#id(el),controls=document.createElement('div');controls.className='nlab-theme-edit-controls';controls.dataset.for=id;controls.style.cssText='position:absolute;z-index:2000;right:6px;top:6px;display:flex;gap:4px;';const lock=document.createElement('button');lock.type='button';lock.className='nlab-theme-lock';lock.dataset.action='lock';lock.addEventListener('click',(event)=>{event.preventDefault();event.stopPropagation();this.lock(id,!this.isLocked(id));});controls.append(lock);const resize=document.createElement('button');resize.type='button';resize.className='nlab-theme-resize';resize.dataset.action='resize';resize.innerHTML=this.iconRegistry.render('resize',{title:`Redimensionner ${id}`});resize.title=`Redimensionner ${id}`;resize.style.cssText='position:absolute;right:0;bottom:0;transform:translate(35%,35%);cursor:ns-resize;';resize.addEventListener('pointerdown',(event)=>this.#startResize(event,el,id));const computed=getComputedStyle(el);if(computed.position==='static')el.style.position='relative';el.append(controls,resize);this.handles.set(id,{controls,lock,resize});this.#syncHandle(id);}return this;}
  unmountHandles(){for(const entry of this.handles.values()){entry.controls?.remove();entry.resize?.remove();}this.handles.clear();return this;}
  mountColorPicker(container,tokens=['accent','bg','fg']){
    if(!container)return;container.replaceChildren();
    const labels={accent:'Couleur d’accent',bg:'Background / Couleur de fond',fg:'Couleur du texte',muted:'Texte secondaire',border:'Bordures'};
    const descriptions={accent:'Couleur utilisée pour les éléments mis en avant : liens actifs, citations, contrôles et états accentués.',bg:'Couleur de fond de base du thème.',fg:'Couleur principale du texte.',muted:'Couleur du texte secondaire.',border:'Couleur utilisée pour les bordures et séparateurs.'};
    const modeIcons={hex:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 3 8 21M16 3l-2 18M4 9h16M3 15h16"/></svg>',rgb:'<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="5" fill="currentColor" opacity=".85"/><circle cx="16" cy="9" r="5" fill="currentColor" opacity=".55"/><circle cx="12" cy="16" r="5" fill="currentColor" opacity=".35"/></svg>',hsl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="11" cy="18" r="2" fill="currentColor"/></svg>'};
    for(const token of tokens){const row=document.createElement('div');row.className='nlab-color-control';row.dataset.token=token;const title=document.createElement('strong');title.textContent=labels[token]??token;title.title=descriptions[token]??'';const input=document.createElement('input');input.type='color';input.setAttribute('aria-label',labels[token]??token);const current=this.sessionPatch.tokens?.[token]??this.engine.resolve().tokens?.[token]??'#000000';if(/^#[0-9a-f]{6}$/i.test(current))input.value=current;const mode=document.createElement('div');mode.className='nlab-color-modes';const output=document.createElement('code');output.className='nlab-color-value';let active='hex';const sync=()=>{output.textContent=colorText(input.value,active);for(const b of mode.querySelectorAll('button'))b.dataset.active=String(b.dataset.mode===active);};for(const key of ['hex','rgb','hsl']){const button=document.createElement('button');button.type='button';button.dataset.mode=key;button.innerHTML=`${modeIcons[key]}<span>${key.toUpperCase()}</span>`;button.title=`Afficher la couleur en ${key.toUpperCase()}`;button.addEventListener('click',()=>{active=key;sync();});mode.append(button);}input.addEventListener('input',()=>{this.setToken(token,input.value);sync();});row.append(title,input,mode,output);container.append(row);sync();}
  }

  #normalizeSession(){
    this.sessionPatch=this.sessionPatch&&typeof this.sessionPatch==='object'?this.sessionPatch:{};
    this.sessionPatch.tokens=this.sessionPatch.tokens??{};
    this.sessionPatch.components=this.sessionPatch.components??{};
    this.sessionPatch.scopes=this.sessionPatch.scopes??{};
    this.sessionPatch.scopes.global=this.sessionPatch.scopes.global??{tokens:{},styles:{}};
    this.sessionPatch.scopes.types=this.sessionPatch.scopes.types??{};
    this.sessionPatch.scopes.instances=this.sessionPatch.scopes.instances??{};
    this.sessionPatch.profiles=this.sessionPatch.profiles??{};
  }
  #normalizeScopedPatch(patch){
    if(!patch||typeof patch!=='object')return {tokens:{},styles:{}};
    if(patch.tokens||patch.styles)return {tokens:clone(patch.tokens??{}),styles:clone(patch.styles??{})};
    const styles={}; for(const [key,value] of Object.entries(patch))if(STYLE_KEYS.has(key)||key.startsWith('--'))styles[key]=value;
    return {tokens:{},styles};
  }
  #applyPatch(el,patch){
    const keys=new Set();
    for(const [name,value] of Object.entries(patch.tokens??{})){const key=`--nlab-${name.replaceAll('_','-')}`;el.style.setProperty(key,String(value));keys.add(key);}
    for(const [name,value] of Object.entries(patch.styles??{})){if(name.startsWith('--')||name.includes('-'))el.style.setProperty(name,String(value));else el.style[name]=String(value);keys.add(name);}
    this.appliedKeys.set(el,keys);
  }
  #clearApplied(){for(const [el,keys] of this.appliedKeys){for(const key of keys){if(key.startsWith('--')||key.includes('-'))el.style.removeProperty(key);else el.style[key]='';}}this.appliedKeys.clear();}
  #resolveElement(target){
    if(target instanceof Element)return target;
    if(typeof target==='string'){
      const escaped=globalThis.CSS?.escape?CSS.escape(target):target.replace(/"/g,'\\"');
      return this.root.querySelector(`[data-theme-id="${escaped}"]`)||this.root.getElementById?.(target)||this.root.querySelector(target);
    }
    return null;
  }
  #type(el){if(el.dataset.themeType)return el.dataset.themeType;const semantic=[...el.classList].find((name)=>/^nlab-(header|hero|section|panel|card|table|list|gallery|toolbar|container)$/.test(name));return semantic||el.tagName.toLowerCase();}
  #startResize(event,el,id){if(this.isLocked(id))return;event.preventDefault();event.stopPropagation();const startY=event.clientY,startHeight=el.getBoundingClientRect().height,min=Math.max(40,Number(el.dataset.themeMinHeight)||40),max=Number(el.dataset.themeMaxHeight)||Math.max(window.innerHeight*1.5,1200);const move=(next)=>{const height=Math.max(min,Math.min(max,startHeight+next.clientY-startY));el.style.height=px(height);this.setComponent(id,{height:px(height)},{apply:false});};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);this.#persist();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);}
  #elements(){return [...this.root.querySelectorAll(this.selector)];}
  #id(el){return el.dataset.themeId||el.id||`component-${this.#elements().indexOf(el)}`;}
  #syncHandle(id){const entry=this.handles.get(id);if(!entry)return;const locked=this.isLocked(id);entry.lock.innerHTML=this.iconRegistry.render(locked?'lock':'unlock',{title:locked?`Déverrouiller ${id}`:`Verrouiller ${id}`});entry.lock.title=locked?`Déverrouiller ${id}`:`Verrouiller ${id}`;entry.lock.dataset.locked=String(locked);entry.resize.disabled=locked;entry.resize.dataset.active=String(!locked);}
  #persist(){this.storage?.set(this.storageKey,this.sessionPatch);}
}

export { rgbToHex, hexToRgb, rgbToHsl };
