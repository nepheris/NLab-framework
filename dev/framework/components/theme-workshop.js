import { deepMerge } from '../themes/theme-engine.js';
import { createCoreIconRegistry } from '../icons/icon-registry.js';

const px = (value) => `${Math.round(value)}px`;
const clampByte = (value) => Math.max(0, Math.min(255, Number(value) || 0));

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

export class ThemeWorkshop {
  constructor({ root = document, engine, storage = null, storageKey = 'theme-workshop', selector = '[data-theme-editable]', iconRegistry = createCoreIconRegistry() } = {}) {
    if (!engine) throw new Error('ThemeWorkshop requires a ThemeEngine');
    this.root = root;
    this.engine = engine;
    this.storage = storage;
    this.storageKey = storageKey;
    this.selector = selector;
    this.iconRegistry = iconRegistry;
    this.unlocked = false;
    this.componentLocks = new Set();
    this.sessionPatch = storage?.get(storageKey, {}) ?? {};
    this.handles = new Map();
  }

  setUnlocked(value = true) {
    this.unlocked = Boolean(value);
    this.root.documentElement?.toggleAttribute('data-theme-workshop', this.unlocked);
    this.unlocked ? this.mountHandles() : this.unmountHandles();
    return this;
  }

  toggleUnlocked() { return this.setUnlocked(!this.unlocked); }
  lock(id, value = true) { value ? this.componentLocks.add(id) : this.componentLocks.delete(id); this.#syncHandle(id); this.#persist(); return this; }
  lockAll() { for (const el of this.#elements()) this.componentLocks.add(this.#id(el)); this.mountHandles(); this.#persist(); return this; }
  unlockAll() { this.componentLocks.clear(); this.mountHandles(); this.#persist(); return this; }
  isLocked(id) { return this.componentLocks.has(id); }

  setToken(name, value, { apply = true } = {}) {
    this.sessionPatch.tokens = { ...(this.sessionPatch.tokens ?? {}), [name]: value };
    if (apply) this.applySession();
    this.#persist();
    return this;
  }

  setComponent(id, patch, { apply = true } = {}) {
    if (this.isLocked(id)) return this;
    this.sessionPatch.components = this.sessionPatch.components ?? {};
    this.sessionPatch.components[id] = deepMerge(this.sessionPatch.components[id] ?? {}, patch);
    if (apply) this.applySession();
    this.#persist();
    return this;
  }

  applySession() {
    this.engine.apply(document.documentElement, this.engine.resolve({ user: this.sessionPatch }));
    for (const el of this.#elements()) {
      const id = this.#id(el); const patch = this.sessionPatch.components?.[id];
      if (!patch) continue;
      for (const [key, value] of Object.entries(patch)) {
        if (['height','minHeight','maxHeight','width','minWidth','maxWidth','padding','margin','gap'].includes(key)) el.style[key] = String(value);
      }
    }
    return this;
  }

  commitToSite() { this.engine.setSitePatch(this.sessionPatch); this.engine.save(); this.sessionPatch = {}; this.#persist(); return this; }
  exportJSON() { return JSON.stringify({ version:2, workshop:this.sessionPatch, locks:[...this.componentLocks], theme:JSON.parse(this.engine.exportJSON()) }, null, 2); }
  importJSON(input) {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    if (data.theme) this.engine.importJSON(data.theme);
    this.sessionPatch = data.workshop ?? {};
    this.componentLocks = new Set(data.locks ?? []);
    this.applySession(); this.#persist(); this.mountHandles(); return this;
  }
  resetSession() { this.sessionPatch = {}; this.componentLocks.clear(); this.#persist(); this.applySession(); this.mountHandles(); return this; }

  mountHandles() {
    this.unmountHandles();
    if (!this.unlocked) return this;
    for (const el of this.#elements()) {
      const id = this.#id(el);
      const controls = document.createElement('div');
      controls.className = 'nlab-theme-edit-controls'; controls.dataset.for = id;
      controls.style.cssText = 'position:absolute;z-index:2000;right:6px;top:6px;display:flex;gap:4px;';
      const lock = document.createElement('button');
      lock.type='button'; lock.className='nlab-theme-lock'; lock.dataset.action='lock';
      lock.addEventListener('click',(event)=>{ event.preventDefault(); event.stopPropagation(); this.lock(id,!this.isLocked(id)); });
      controls.append(lock);

      const resize = document.createElement('button');
      resize.type='button'; resize.className='nlab-theme-resize'; resize.dataset.action='resize';
      resize.innerHTML=this.iconRegistry.render('resize',{title:`Redimensionner ${id}`});
      resize.title=`Redimensionner ${id}`;
      resize.style.cssText='position:absolute;right:0;bottom:0;transform:translate(35%,35%);cursor:ns-resize;';
      resize.addEventListener('pointerdown',(event)=>this.#startResize(event,el,id));

      const computed=getComputedStyle(el); if(computed.position==='static') el.style.position='relative';
      el.append(controls,resize); this.handles.set(id,{controls,lock,resize}); this.#syncHandle(id);
    }
    return this;
  }

  unmountHandles() { for (const entry of this.handles.values()) { entry.controls?.remove(); entry.resize?.remove(); } this.handles.clear(); return this; }

  mountColorPicker(container, tokens = ['accent','bg','fg']) {
    if (!container) return;
    container.replaceChildren();
    const labels={ accent:'Couleur d’accent', bg:'Background / Couleur de fond', fg:'Couleur du texte', muted:'Texte secondaire', border:'Bordures' };
    for (const token of tokens) {
      const row=document.createElement('div'); row.className='nlab-color-control'; row.dataset.token=token;
      const title=document.createElement('strong'); title.textContent=labels[token] ?? token;
      const input=document.createElement('input'); input.type='color'; input.setAttribute('aria-label',labels[token] ?? token);
      const current=this.sessionPatch.tokens?.[token] ?? this.engine.resolve().tokens?.[token] ?? '#000000';
      if(/^#[0-9a-f]{6}$/i.test(current)) input.value=current;
      const mode=document.createElement('div'); mode.className='nlab-color-modes';
      const output=document.createElement('code'); output.className='nlab-color-value';
      let active='hex';
      const sync=()=>{ output.textContent=colorText(input.value,active); for(const b of mode.querySelectorAll('button')) b.dataset.active=String(b.dataset.mode===active); };
      for(const key of ['hex','rgb','hsl']) { const button=document.createElement('button'); button.type='button'; button.dataset.mode=key; button.textContent=key.toUpperCase(); button.title=`Afficher la couleur en ${key.toUpperCase()}`; button.addEventListener('click',()=>{active=key;sync();}); mode.append(button); }
      input.addEventListener('input',()=>{ this.setToken(token,input.value); sync(); });
      row.append(title,input,mode,output); container.append(row); sync();
    }
  }

  #startResize(event, el, id) {
    if (this.isLocked(id)) return;
    event.preventDefault(); event.stopPropagation();
    const startY=event.clientY; const startHeight=el.getBoundingClientRect().height;
    const min=Math.max(40,Number(el.dataset.themeMinHeight)||40); const max=Number(el.dataset.themeMaxHeight)||Math.max(window.innerHeight*1.5,1200);
    const move=(next)=>{ const height=Math.max(min,Math.min(max,startHeight+next.clientY-startY)); el.style.height=px(height); this.setComponent(id,{height:px(height)},{apply:false}); };
    const up=()=>{ window.removeEventListener('pointermove',move); window.removeEventListener('pointerup',up); this.#persist(); };
    window.addEventListener('pointermove',move); window.addEventListener('pointerup',up);
  }
  #elements() { return [...this.root.querySelectorAll(this.selector)]; }
  #id(el) { return el.dataset.themeId || el.id || `component-${this.#elements().indexOf(el)}`; }
  #syncHandle(id) {
    const entry=this.handles.get(id); if(!entry) return;
    const locked=this.isLocked(id);
    entry.lock.innerHTML=this.iconRegistry.render(locked?'lock':'unlock',{title:locked?`Déverrouiller ${id}`:`Verrouiller ${id}`});
    entry.lock.title=locked?`Déverrouiller ${id}`:`Verrouiller ${id}`;
    entry.lock.dataset.locked=String(locked);
    entry.resize.disabled=locked; entry.resize.dataset.active=String(!locked);
  }
  #persist() { this.storage?.set(this.storageKey, this.sessionPatch); }
}

export { rgbToHex, hexToRgb, rgbToHsl };
