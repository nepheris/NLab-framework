const CANONICAL_TABS = Object.freeze([
  Object.freeze({ id:'test', label:'Test' }),
  Object.freeze({ id:'technical', label:'Technique' }),
  Object.freeze({ id:'dependencies', label:'Dépendances' }),
  Object.freeze({ id:'state', label:'État' }),
  Object.freeze({ id:'configuration', label:'Configuration' })
]);

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const text = (value) => String(value ?? '').trim();

function normalizeTab(input, index = 0) {
  const raw = typeof input === 'string' ? { id:input, label:input } : input;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new TypeError(`tabs[${index}] must be an object or string`);
  const id = text(raw.id);
  if (!SAFE_ID.test(id)) throw new TypeError(`tabs[${index}].id is invalid`);
  return {
    id,
    label: text(raw.label) || id,
    visible: raw.visible !== false,
    enabled: raw.enabled !== false,
    badge: raw.badge == null || raw.badge === '' ? null : String(raw.badge),
    metadata: raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata) ? { ...raw.metadata } : {}
  };
}

function cloneTab(tab) {
  return { ...tab, metadata:{...tab.metadata} };
}

export class InspectorTabs {
  constructor({ tabs = CANONICAL_TABS, activeId = null, onChange = null } = {}) {
    if (!Array.isArray(tabs)) throw new TypeError('tabs must be an array');
    this.tabs = [];
    this.onChange = typeof onChange === 'function' ? onChange : null;
    const seen = new Set();
    tabs.forEach((tab,index)=>{
      const normalized = normalizeTab(tab,index);
      if (seen.has(normalized.id)) throw new TypeError(`duplicate tab id: ${normalized.id}`);
      seen.add(normalized.id);
      this.tabs.push(normalized);
    });
    this.activeId = null;
    const requested = text(activeId);
    if (requested && this.#isActivatable(requested)) this.activeId = requested;
    else this.activeId = this.#firstActivatableId();
  }

  list({ visibleOnly = false } = {}) {
    return this.tabs.filter((tab)=>!visibleOnly || tab.visible).map(cloneTab);
  }

  active() {
    const tab = this.tabs.find((entry)=>entry.id === this.activeId);
    return tab ? cloneTab(tab) : null;
  }

  activate(id, { emit = true, source = 'api' } = {}) {
    const target = text(id);
    if (!this.#isActivatable(target)) return { changed:false, activeId:this.activeId, reason:'unavailable' };
    const changed = target !== this.activeId;
    this.activeId = target;
    if (emit && changed) this.#emit('activate', source);
    return { changed, activeId:this.activeId, reason:null };
  }

  setVisible(id, visible = true, { emit = true } = {}) {
    const tab = this.#find(id);
    if (!tab) return false;
    const next = Boolean(visible);
    const changed = tab.visible !== next;
    tab.visible = next;
    this.#repairActive();
    if (emit && changed) this.#emit('visibility', 'api');
    return changed;
  }

  setEnabled(id, enabled = true, { emit = true } = {}) {
    const tab = this.#find(id);
    if (!tab) return false;
    const next = Boolean(enabled);
    const changed = tab.enabled !== next;
    tab.enabled = next;
    this.#repairActive();
    if (emit && changed) this.#emit('enabled', 'api');
    return changed;
  }

  setBadge(id, badge = null, { emit = true } = {}) {
    const tab = this.#find(id);
    if (!tab) return false;
    const next = badge == null || badge === '' ? null : String(badge);
    const changed = tab.badge !== next;
    tab.badge = next;
    if (emit && changed) this.#emit('badge', 'api');
    return changed;
  }

  snapshot() {
    return { activeId:this.activeId, tabs:this.list() };
  }

  #find(id) { return this.tabs.find((tab)=>tab.id === text(id)) ?? null; }
  #isActivatable(id) { const tab=this.#find(id); return Boolean(tab?.visible && tab?.enabled); }
  #firstActivatableId() { return this.tabs.find((tab)=>tab.visible && tab.enabled)?.id ?? null; }
  #repairActive() { if (!this.#isActivatable(this.activeId)) this.activeId=this.#firstActivatableId(); }
  #emit(action, source) { this.onChange?.({ action, source, ...this.snapshot() }); }
}

export const INSPECTOR_CANONICAL_TABS = CANONICAL_TABS;
