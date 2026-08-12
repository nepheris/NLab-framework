import { clamp } from './layout.js';

const DOCKS = new Set(['left','right','top','bottom']);
const MIN_WIDTH = 280;
const MIN_HEIGHT = 180;
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const nonNegative = (value, fallback) => Math.max(0, finite(value, fallback));
const atLeast = (value, minimum, fallback) => Math.max(minimum, finite(value, fallback));
const dockValue = (value) => DOCKS.has(value) ? value : null;
const bool = (value, fallback=false) => value == null ? fallback : Boolean(value);
const viewportValue = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : Infinity;
const snapshot = (state) => state.toJSON();

function storageRead(storage, key) {
  if (!storage || key == null) return null;
  try {
    if (typeof storage.get === 'function') return storage.get(key, null);
    if (typeof storage.getItem === 'function') {
      const raw = storage.getItem(String(key));
      if (raw == null || raw === '') return null;
      try { return JSON.parse(raw); } catch { return null; }
    }
  } catch {}
  return null;
}

function storageWrite(storage, key, value) {
  if (!storage || key == null) return false;
  try {
    if (typeof storage.set === 'function') return storage.set(key, value) !== false;
    if (typeof storage.setItem === 'function') { storage.setItem(String(key), JSON.stringify(value)); return true; }
  } catch {}
  return false;
}

export class FloatingPanelState {
  constructor({ x=24, y=24, width=390, height=320, locked=false, minimized=false, docked=null, pinned=false, open=true }={}) {
    this.x=nonNegative(x,24);
    this.y=nonNegative(y,24);
    this.width=atLeast(width,MIN_WIDTH,390);
    this.height=atLeast(height,MIN_HEIGHT,320);
    this.locked=bool(locked);
    this.minimized=bool(minimized);
    this.docked=dockValue(docked);
    this.pinned=bool(pinned);
    this.open=bool(open,true);
  }
  apply(value={}) {
    const next = value instanceof FloatingPanelState ? value.toJSON() : value;
    if (!next || typeof next !== 'object' || Array.isArray(next)) return this;
    if ('x' in next) this.x=nonNegative(next.x,this.x);
    if ('y' in next) this.y=nonNegative(next.y,this.y);
    if ('width' in next) this.width=atLeast(next.width,MIN_WIDTH,this.width);
    if ('height' in next) this.height=atLeast(next.height,MIN_HEIGHT,this.height);
    if ('locked' in next) this.locked=Boolean(next.locked);
    if ('minimized' in next) this.minimized=Boolean(next.minimized);
    if ('docked' in next) this.docked=dockValue(next.docked);
    if ('pinned' in next) this.pinned=Boolean(next.pinned);
    if ('open' in next) this.open=Boolean(next.open);
    return this;
  }
  hydrate(value={}) { return this.apply(value); }
  move(x,y,viewport={width:Infinity,height:Infinity}) {
    if(this.locked||this.docked||this.pinned)return this;
    const vw=viewportValue(viewport?.width), vh=viewportValue(viewport?.height);
    this.x=clamp(finite(x,this.x),0,Math.max(0,vw-this.width));
    this.y=clamp(finite(y,this.y),0,Math.max(0,vh-this.height));
    return this;
  }
  resize(width,height,viewport={width:Infinity,height:Infinity}) {
    if(this.locked||this.docked)return this;
    const vw=viewportValue(viewport?.width), vh=viewportValue(viewport?.height);
    const maxWidth=Math.max(MIN_WIDTH,vw-this.x), maxHeight=Math.max(MIN_HEIGHT,vh-this.y);
    this.width=clamp(finite(width,this.width),MIN_WIDTH,maxWidth);
    this.height=clamp(finite(height,this.height),MIN_HEIGHT,maxHeight);
    return this;
  }
  toggleLock(){this.locked=!this.locked;return this;}
  toggleMinimize(){this.minimized=!this.minimized;return this;}
  togglePin(){this.pinned=!this.pinned;return this;}
  dock(target='right'){this.docked=dockValue(target);return this;}
  undock(){this.docked=null;return this;}
  setOpen(value=true){this.open=Boolean(value);return this;}
  close(){this.open=false;return this;}
  reopen(){this.open=true;return this;}
  toJSON(){return {x:this.x,y:this.y,width:this.width,height:this.height,locked:this.locked,minimized:this.minimized,docked:this.docked,pinned:this.pinned,open:this.open};}
}

export function mountFloatingPanel(element,{
  state=new FloatingPanelState(), storage=null, storageKey=null, hydrate=true,
  onChange=null, onClose=null, document:documentRef=element?.ownerDocument??globalThis.document,
  window:windowRef=globalThis.window
}={}){
  const current = state instanceof FloatingPanelState ? state : new FloatingPanelState(state);
  if (hydrate) current.hydrate(storageRead(storage,storageKey));
  let destroyed=false, drag=null;
  const noop={
    state:current,render(){return this;},
    lock(value=true){current.locked=Boolean(value);return this;},
    pin(value=true){current.pinned=Boolean(value);return this;},
    minimize(value=true){current.minimized=Boolean(value);return this;},
    dock(target='right'){current.dock(target);return this;},
    undock(){current.undock();return this;},
    open(){current.reopen();return this;},
    close(){current.close();return this;},
    reset(next=new FloatingPanelState()){current.apply(next instanceof FloatingPanelState?next.toJSON():next);return this;},
    destroy(){destroyed=true;}
  };
  if(!element||!documentRef||!windowRef?.addEventListener)return noop;
  element.classList?.add?.('nlab-floating-panel');
  const bar=element.querySelector?.('[data-panel-bar]')??element.firstElementChild??null;
  const resizeHandle=element.querySelector?.('[data-panel-resize]')??null;
  const actionNodes=[...(element.querySelectorAll?.('[data-panel-action]')??[])];
  const viewport=()=>({width:viewportValue(windowRef.innerWidth),height:viewportValue(windowRef.innerHeight)});
  const save=()=>{const value=snapshot(current);storageWrite(storage,storageKey,value);onChange?.(value);};
  const clearDockStyles=()=>{for(const key of ['left','right','top','bottom','width','height']) element.style[key]='';};
  const render=()=>{
    if(destroyed)return;
    element.hidden=!current.open;
    clearDockStyles();
    element.style.left=`${current.x}px`;element.style.top=`${current.y}px`;element.style.width=`${current.width}px`;element.style.height=current.minimized?'auto':`${current.height}px`;
    element.dataset.locked=String(current.locked);element.dataset.minimized=String(current.minimized);element.dataset.pinned=String(current.pinned);element.dataset.docked=current.docked??'';element.dataset.open=String(current.open);
    const body=element.querySelector?.('.nlab-floating-panel__body');if(body)body.hidden=current.minimized;
    if(current.docked){const map={left:{left:'0px',top:'0px',width:'min(420px,100vw)',height:'100vh'},right:{left:'auto',right:'0px',top:'0px',width:'min(420px,100vw)',height:'100vh'},top:{left:'0px',top:'0px',width:'100vw',height:'min(420px,100vh)'},bottom:{left:'0px',top:'auto',bottom:'0px',width:'100vw',height:'min(420px,100vh)'}};Object.assign(element.style,map[current.docked]);}
    for(const node of actionNodes){const action=node.getAttribute?.('data-panel-action')??node.dataset?.panelAction;let pressed=null;if(action==='lock')pressed=current.locked;if(action==='pin')pressed=current.pinned;if(action==='minimize')pressed=current.minimized;if(pressed!=null)node.setAttribute?.('aria-pressed',String(pressed));}
    bar?.setAttribute?.('aria-label',bar.getAttribute?.('aria-label')||'Déplacer le panneau');
    resizeHandle?.setAttribute?.('aria-label',resizeHandle.getAttribute?.('aria-label')||'Redimensionner le panneau');
  };
  const commit=()=>{render();save();};
  const pointerMove=(event)=>{if(!drag)return;if(drag.type==='move')current.move(drag.x+event.clientX-drag.startX,drag.y+event.clientY-drag.startY,viewport());else current.resize(drag.width+event.clientX-drag.startX,drag.height+event.clientY-drag.startY,viewport());render();};
  const pointerUp=()=>{if(drag)save();drag=null;};
  const isInteractive=(target)=>Boolean(target?.closest?.('button,a,input,select,textarea,[data-panel-no-drag],[data-panel-action]'));
  const startMove=(event)=>{if(isInteractive(event.target)||current.locked||current.docked||current.pinned)return;event.preventDefault?.();drag={type:'move',startX:event.clientX,startY:event.clientY,x:current.x,y:current.y};};
  const startResize=(event)=>{if(current.locked||current.docked)return;event.preventDefault?.();event.stopPropagation?.();drag={type:'resize',startX:event.clientX,startY:event.clientY,width:current.width,height:current.height};};
  const actionHandlers=[];
  const runAction=(action)=>{
    if(action==='lock')current.toggleLock();else if(action==='pin')current.togglePin();else if(action==='minimize')current.toggleMinimize();else if(action==='undock')current.undock();else if(action==='close'){current.close();onClose?.(snapshot(current));}else if(action==='open')current.reopen();else if(action?.startsWith('dock-'))current.dock(action.slice(5));else return false;
    commit();return true;
  };
  for(const node of actionNodes){const handler=(event)=>{const action=node.getAttribute?.('data-panel-action')??node.dataset?.panelAction;if(runAction(action))event.preventDefault?.();};node.addEventListener?.('click',handler);actionHandlers.push([node,handler]);}
  bar?.addEventListener?.('pointerdown',startMove);resizeHandle?.addEventListener?.('pointerdown',startResize);windowRef.addEventListener('pointermove',pointerMove);windowRef.addEventListener('pointerup',pointerUp);render();
  return {
    state:current,render,
    lock(value=true){current.locked=Boolean(value);commit();return this;},
    pin(value=true){current.pinned=Boolean(value);commit();return this;},
    minimize(value=true){current.minimized=Boolean(value);commit();return this;},
    dock(target='right'){current.dock(target);commit();return this;},
    undock(){current.undock();commit();return this;},
    open(){current.reopen();commit();return this;},
    close(){if(current.open){current.close();onClose?.(snapshot(current));commit();}return this;},
    reset(next=new FloatingPanelState()){current.apply(next instanceof FloatingPanelState?next.toJSON():next);commit();return this;},
    destroy(){if(destroyed)return;destroyed=true;bar?.removeEventListener?.('pointerdown',startMove);resizeHandle?.removeEventListener?.('pointerdown',startResize);windowRef.removeEventListener?.('pointermove',pointerMove);windowRef.removeEventListener?.('pointerup',pointerUp);for(const[node,handler]of actionHandlers)node.removeEventListener?.('click',handler);drag=null;}
  };
}
