import { clamp } from './layout.js';

export class FloatingPanelState {
  constructor({ x = 24, y = 24, width = 390, height = 320, locked = false, minimized = false, docked = null, pinned = false } = {}) {
    Object.assign(this, { x, y, width, height, locked, minimized, docked, pinned });
  }

  move(x, y, viewport = { width: Infinity, height: Infinity }) {
    if (this.locked || this.pinned || this.docked) return this;
    this.x = clamp(x, 0, Math.max(0, viewport.width - this.width));
    this.y = clamp(y, 0, Math.max(0, viewport.height - this.height));
    return this;
  }

  resize(width, height, viewport = { width: Infinity, height: Infinity }) {
    if (this.locked || this.docked) return this;
    this.width = clamp(width, 280, Math.max(280, viewport.width - this.x));
    this.height = clamp(height, 180, Math.max(180, viewport.height - this.y));
    return this;
  }

  toggleLock() { this.locked = !this.locked; return this; }
  toggleMinimize() { this.minimized = !this.minimized; return this; }
  togglePin() { this.pinned = !this.pinned; return this; }
  dock(target = 'right') { this.docked = target; return this; }
  undock() { this.docked = null; return this; }
  toJSON() { return { x:this.x, y:this.y, width:this.width, height:this.height, locked:this.locked, minimized:this.minimized, docked:this.docked, pinned:this.pinned }; }
}

export function mountFloatingPanel(element, { state = new FloatingPanelState(), storage = null, storageKey = null, onChange = null } = {}) {
  if (!element || !globalThis.document) return { state, destroy() {} };
  element.classList.add('nlab-floating-panel');
  const bar = element.querySelector('[data-panel-bar]') ?? element.firstElementChild;
  const resizeHandle = element.querySelector('[data-panel-resize]');
  let drag = null;

  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });
  const save = () => {
    if (storage && storageKey) storage.set(storageKey, state.toJSON());
    onChange?.(state.toJSON());
  };
  const render = () => {
    element.style.left = `${state.x}px`; element.style.top = `${state.y}px`;
    element.style.width = `${state.width}px`; element.style.height = state.minimized ? 'auto' : `${state.height}px`;
    element.dataset.locked = String(state.locked);
    element.dataset.pinned = String(state.pinned);
    element.dataset.minimized = String(state.minimized);
    element.dataset.docked = state.docked ?? '';
    if (bar) bar.style.cursor = state.locked || state.pinned || state.docked ? 'default' : 'move';
    if (state.docked) {
      const map = {
        left: { left:'0px', top:'0px', width:'min(420px, 100vw)', height:'100vh' },
        right: { left:'auto', right:'0px', top:'0px', width:'min(420px, 100vw)', height:'100vh' },
        top: { left:'0px', top:'0px', width:'100vw', height:'min(420px, 100vh)' },
        bottom: { left:'0px', top:'auto', bottom:'0px', width:'100vw', height:'min(420px, 100vh)' }
      };
      Object.assign(element.style, map[state.docked] ?? {});
    } else { element.style.right = ''; element.style.bottom = ''; }
  };

  const pointerMove = (event) => {
    if (!drag) return;
    if (drag.type === 'move') state.move(drag.x + event.clientX - drag.startX, drag.y + event.clientY - drag.startY, viewport());
    else state.resize(drag.width + event.clientX - drag.startX, drag.height + event.clientY - drag.startY, viewport());
    render();
  };
  const pointerUp = () => { if (drag) save(); drag = null; };
  const startMove = (event) => { if (state.locked || state.pinned || state.docked || event.target.closest('button,a,input,select,textarea')) return; drag = { type:'move', startX:event.clientX, startY:event.clientY, x:state.x, y:state.y }; };
  const startResize = (event) => { if (state.locked || state.docked) return; event.stopPropagation(); drag = { type:'resize', startX:event.clientX, startY:event.clientY, width:state.width, height:state.height }; };

  bar?.addEventListener('pointerdown', startMove);
  resizeHandle?.addEventListener('pointerdown', startResize);
  window.addEventListener('pointermove', pointerMove);
  window.addEventListener('pointerup', pointerUp);
  render();

  return {
    state,
    render,
    lock(value = true) { state.locked = value; render(); save(); },
    pin(value = true) { state.pinned = value; render(); save(); },
    togglePin() { state.togglePin(); render(); save(); return state.pinned; },
    minimize(value = true) { state.minimized = value; render(); save(); },
    dock(target) { state.dock(target); render(); save(); },
    undock() { state.undock(); render(); save(); },
    reset(next = new FloatingPanelState()) { Object.assign(state, next); render(); save(); },
    destroy() { bar?.removeEventListener('pointerdown', startMove); resizeHandle?.removeEventListener('pointerdown', startResize); window.removeEventListener('pointermove', pointerMove); window.removeEventListener('pointerup', pointerUp); }
  };
}
