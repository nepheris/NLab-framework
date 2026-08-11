import { deepMerge } from '../themes/theme-engine.js';

const px = (value) => `${Math.round(value)}px`;

export class ThemeWorkshop {
  constructor({ root = document, engine, storage = null, storageKey = 'theme-workshop', selector = '[data-theme-editable]' } = {}) {
    if (!engine) throw new Error('ThemeWorkshop requires a ThemeEngine');
    this.root = root;
    this.engine = engine;
    this.storage = storage;
    this.storageKey = storageKey;
    this.selector = selector;
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
  lock(id, value = true) { value ? this.componentLocks.add(id) : this.componentLocks.delete(id); this.#syncHandle(id); return this; }
  lockAll() { for (const el of this.#elements()) this.componentLocks.add(this.#id(el)); this.mountHandles(); return this; }
  unlockAll() { this.componentLocks.clear(); this.mountHandles(); return this; }
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
  exportJSON() { return JSON.stringify({ version:1, workshop:this.sessionPatch, locks:[...this.componentLocks], theme:JSON.parse(this.engine.exportJSON()) }, null, 2); }
  importJSON(input) {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    if (data.theme) this.engine.importJSON(data.theme);
    this.sessionPatch = data.workshop ?? {};
    this.componentLocks = new Set(data.locks ?? []);
    this.applySession(); this.#persist(); return this;
  }
  resetSession() { this.sessionPatch = {}; this.componentLocks.clear(); this.#persist(); this.applySession(); this.mountHandles(); return this; }

  mountHandles() {
    this.unmountHandles();
    if (!this.unlocked) return this;
    for (const el of this.#elements()) {
      const id = this.#id(el);
      const handle = document.createElement('button');
      handle.type = 'button'; handle.className = 'nlab-theme-handle'; handle.dataset.for = id;
      handle.textContent = this.isLocked(id) ? '🔒' : '↕';
      handle.title = this.isLocked(id) ? `Déverrouiller ${id}` : `Redimensionner ${id}`;
      handle.style.cssText = 'position:absolute;z-index:2000;right:6px;bottom:6px;cursor:ns-resize;';
      const computed = getComputedStyle(el); if (computed.position === 'static') el.style.position = 'relative';
      el.append(handle); this.handles.set(id, handle);
      handle.addEventListener('click', (event) => { if (this.isLocked(id)) { event.preventDefault(); this.lock(id, false); } });
      handle.addEventListener('pointerdown', (event) => this.#startResize(event, el, id));
    }
    return this;
  }

  unmountHandles() { for (const handle of this.handles.values()) handle.remove(); this.handles.clear(); return this; }

  mountColorPicker(container, tokens = ['accent','bg','fg']) {
    if (!container) return;
    container.replaceChildren();
    for (const token of tokens) {
      const label = document.createElement('label'); label.textContent = token;
      const input = document.createElement('input'); input.type = 'color';
      const current = this.sessionPatch.tokens?.[token] ?? this.engine.resolve().tokens?.[token];
      if (/^#[0-9a-f]{6}$/i.test(current ?? '')) input.value = current;
      input.addEventListener('input', () => this.setToken(token, input.value));
      label.append(input); container.append(label);
    }
  }

  #startResize(event, el, id) {
    if (this.isLocked(id)) return;
    event.preventDefault();
    const startY = event.clientY; const startHeight = el.getBoundingClientRect().height;
    const move = (next) => { const height = Math.max(24, startHeight + next.clientY - startY); el.style.height = px(height); this.setComponent(id, { height:px(height) }, { apply:false }); };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); this.#persist(); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }
  #elements() { return [...this.root.querySelectorAll(this.selector)]; }
  #id(el) { return el.dataset.themeId || el.id || `component-${this.#elements().indexOf(el)}`; }
  #syncHandle(id) { const handle = this.handles.get(id); if (handle) handle.textContent = this.isLocked(id) ? '🔒' : '↕'; }
  #persist() { this.storage?.set(this.storageKey, this.sessionPatch); }
}
