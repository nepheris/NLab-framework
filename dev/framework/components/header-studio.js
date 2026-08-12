const PROFILE_VERSION = 1;
const POSITIONS = new Set(['start', 'center', 'end', 'menu']);
const LABEL_MODES = new Set(['auto', 'icon', 'short', 'long']);
const COLLAPSE_MODES = new Set(['keep', 'menu', 'hide']);
const BLOCKED_HREF_SCHEMES = new Set(['java'+'script', 'da'+'ta', 'vb'+'script']);

const asArray = (value) => Array.isArray(value) ? value : [];
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const positive = (value, fallback) => {
  const number = finite(value);
  return number != null && number > 0 ? number : fallback;
};
const cleanString = (value, fallback = '') => {
  if (value == null) return fallback;
  return String(value).trim();
};
const normalizePosition = (value) => POSITIONS.has(value) ? value : 'end';
const normalizeLabelMode = (value) => LABEL_MODES.has(value) ? value : 'auto';
const normalizeCollapse = (value) => COLLAPSE_MODES.has(value) ? value : 'menu';
const storageLike = (storage) => Boolean(storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function');
const clone = (value) => {
  if (Array.isArray(value)) return value.map(clone);
  if (!isObject(value)) return value;
  const copy = {};
  for (const [key, item] of Object.entries(value)) {
    Object.defineProperty(copy, key, { value:clone(item), enumerable:true, configurable:true, writable:true });
  }
  return copy;
};
const profileName = (value) => cleanString(value) || null;
const safeHref = (value, id) => {
  if (value == null || value === '') return null;
  const href = String(value).trim();
  const schemeCandidate = href.replace(/[\u0000-\u0020\u007f]+/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(schemeCandidate)?.[1]?.toLowerCase() ?? null;
  if (scheme && BLOCKED_HREF_SCHEMES.has(scheme)) throw new TypeError(`Unsafe header href for ${id}`);
  return href;
};

function normalizeItem(item, index) {
  if (!isObject(item)) throw new TypeError(`Header item at index ${index} must be an object`);
  const id = cleanString(item.id);
  if (!id) throw new TypeError(`Header item at index ${index} requires an id`);
  const labels = isObject(item.labels) ? item.labels : {};
  const long = cleanString(labels.long ?? item.label ?? item.longLabel ?? id, id);
  const short = cleanString(labels.short ?? item.shortLabel ?? long, long);
  return {
    ...item,
    id,
    labels:{ short, long },
    visible:item.visible !== false,
    order:Number.isFinite(Number(item.order)) ? Number(item.order) : index,
    position:normalizePosition(item.position),
    labelMode:normalizeLabelMode(item.labelMode),
    collapse:normalizeCollapse(item.collapse),
    group:cleanString(item.group) || null,
    icon:item.icon ?? null,
    href:safeHref(item.href, id),
    disabled:Boolean(item.disabled)
  };
}

export class HeaderStudio {
  constructor({
    items = [],
    labelMode = 'auto',
    compactBreakpoint = 720,
    menuLabel = 'Plus',
    reorderable = true,
    profiles = null,
    profileStorage = null,
    profileStorageKey = 'nlab.header-studio.profiles',
    iconRenderer = null
  } = {}) {
    this.items = asArray(items).map(normalizeItem);
    this.#assertUniqueIds(this.items);
    this.initialItems = this.items.map((item) => clone(item));
    this.labelMode = normalizeLabelMode(labelMode);
    this.compactBreakpoint = positive(compactBreakpoint, 720);
    this.menuLabel = cleanString(menuLabel, 'Plus') || 'Plus';
    this.reorderable = Boolean(reorderable);
    this.iconRenderer = typeof iconRenderer === 'function' ? iconRenderer : null;
    this.profiles = new Map();
    this.activeProfile = null;
    this.profileStorage = profileStorage;
    this.profileStorageKey = String(profileStorageKey ?? 'nlab.header-studio.profiles');
    this.lastError = null;
    this._cleanup = [];
    this.registerProfiles(profiles);
  }

  item(id) {
    const found = this.items.find((item) => item.id === id);
    return found ? clone(found) : null;
  }

  orderedItems() {
    return [...this.items].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  }

  setVisible(id, visible = true) {
    const item = this.#item(id);
    if (item) { item.visible = Boolean(visible); this.#dirty(); }
    return this;
  }

  toggleVisible(id) {
    const item = this.#item(id);
    if (item) { item.visible = !item.visible; this.#dirty(); }
    return this;
  }

  setPosition(id, position) {
    const item = this.#item(id);
    if (item) { item.position = normalizePosition(position); this.#dirty(); }
    return this;
  }

  setItemLabelMode(id, mode) {
    const item = this.#item(id);
    if (item) { item.labelMode = normalizeLabelMode(mode); this.#dirty(); }
    return this;
  }

  setLabelMode(mode) {
    this.labelMode = normalizeLabelMode(mode);
    this.#dirty();
    return this;
  }

  setCompactBreakpoint(value) {
    this.compactBreakpoint = positive(value, this.compactBreakpoint);
    this.#dirty();
    return this;
  }

  reorder(ids) {
    const ordered = this.orderedItems();
    const byId = new Map(ordered.map((item) => [item.id, item]));
    const seen = new Set();
    const requested = [];
    for (const raw of asArray(ids)) {
      const id = String(raw);
      if (!byId.has(id) || seen.has(id)) continue;
      seen.add(id);
      requested.push(byId.get(id));
    }
    const next = [...requested, ...ordered.filter((item) => !seen.has(item.id))];
    next.forEach((item, index) => { item.order = index; });
    this.#dirty();
    return this;
  }

  moveItem(id, targetIndex) {
    const ordered = this.orderedItems();
    const from = ordered.findIndex((item) => item.id === id);
    const target = finite(targetIndex);
    if (from < 0 || target == null) return this;
    const [item] = ordered.splice(from, 1);
    ordered.splice(Math.max(0, Math.min(ordered.length, Math.trunc(target))), 0, item);
    ordered.forEach((entry, index) => { entry.order = index; });
    this.#dirty();
    return this;
  }

  resetItems() {
    this.items = this.initialItems.map((item) => clone(item));
    this.activeProfile = null;
    return this;
  }

  itemState() {
    return this.orderedItems().map((item) => ({
      id:item.id,
      visible:item.visible,
      order:item.order,
      position:item.position,
      labelMode:item.labelMode,
      collapse:item.collapse
    }));
  }

  applyItemState(state) {
    const order = [];
    for (const entry of asArray(state)) {
      if (!isObject(entry)) continue;
      const item = this.#item(cleanString(entry.id));
      if (!item) continue;
      if ('visible' in entry) item.visible = Boolean(entry.visible);
      if ('position' in entry) item.position = normalizePosition(entry.position);
      if ('labelMode' in entry) item.labelMode = normalizeLabelMode(entry.labelMode);
      if ('collapse' in entry) item.collapse = normalizeCollapse(entry.collapse);
      if (Number.isFinite(Number(entry.order))) order.push({ id:item.id, order:Number(entry.order) });
    }
    if (order.length) {
      order.sort((a, b) => a.order - b.order);
      this.reorder(order.map((entry) => entry.id));
    }
    this.#dirty();
    return this;
  }

  resolve({ width = null } = {}) {
    const numericWidth = finite(width);
    const compact = numericWidth != null && numericWidth > 0 && numericWidth <= this.compactBreakpoint;
    const zones = { start:[], center:[], end:[], menu:[] };
    for (const item of this.orderedItems()) {
      if (!item.visible) continue;
      if (compact && item.collapse === 'hide') continue;
      const position = compact && item.position !== 'menu' && item.collapse === 'menu' ? 'menu' : item.position;
      zones[position].push(this.#resolvedItem(item, compact));
    }
    return {
      mode:compact ? 'compact' : 'full',
      width:numericWidth,
      labelMode:this.labelMode,
      compactBreakpoint:this.compactBreakpoint,
      zones,
      visibleCount:Object.values(zones).reduce((total, entries) => total + entries.length, 0)
    };
  }

  snapshotProfile() {
    return {
      version:PROFILE_VERSION,
      labelMode:this.labelMode,
      compactBreakpoint:this.compactBreakpoint,
      menuLabel:this.menuLabel,
      items:this.itemState()
    };
  }

  registerProfile(name, profile = this.snapshotProfile()) {
    const normalized = profileName(name);
    const validation = this.#validateProfile(profile);
    if (!normalized || !validation.ok) {
      this.lastError = !normalized
        ? { code:'INVALID_PROFILE_NAME', stage:'profile', message:'Profile name is required.' }
        : validation.error;
      return this;
    }
    this.profiles.set(normalized, clone(profile));
    this.lastError = null;
    return this;
  }

  registerProfiles(profiles) {
    if (profiles instanceof Map) {
      for (const [name, profile] of profiles.entries()) this.registerProfile(name, profile);
    } else if (isObject(profiles)) {
      for (const [name, profile] of Object.entries(profiles)) this.registerProfile(name, profile);
    }
    return this;
  }

  profileNames() {
    return [...this.profiles.keys()].sort((a, b) => a.localeCompare(b));
  }

  profileState(name) {
    const profile = this.profiles.get(profileName(name));
    return profile ? clone(profile) : null;
  }

  removeProfile(name) {
    const normalized = profileName(name);
    if (normalized) {
      this.profiles.delete(normalized);
      if (this.activeProfile === normalized) this.activeProfile = null;
    }
    return this;
  }

  applyProfile(profileOrName) {
    const name = typeof profileOrName === 'string' ? profileName(profileOrName) : null;
    const profile = name ? this.profiles.get(name) : profileOrName;
    const validation = this.#validateProfile(profile);
    if (!validation.ok) { this.lastError = validation.error; return this; }
    const copy = clone(profile);
    if ('labelMode' in copy) this.labelMode = normalizeLabelMode(copy.labelMode);
    if ('compactBreakpoint' in copy) this.compactBreakpoint = positive(copy.compactBreakpoint, this.compactBreakpoint);
    if ('menuLabel' in copy) this.menuLabel = cleanString(copy.menuLabel, this.menuLabel) || this.menuLabel;
    if (Array.isArray(copy.items)) this.applyItemState(copy.items);
    this.activeProfile = name;
    this.lastError = null;
    return this;
  }

  serializeProfiles(space = 0) {
    return JSON.stringify(Object.fromEntries([...this.profiles.entries()].map(([name, profile]) => [name, clone(profile)])), null, space);
  }

  importProfiles(value, { merge = true } = {}) {
    let parsed = value;
    if (typeof value === 'string') {
      try { parsed = JSON.parse(value); }
      catch (error) {
        this.lastError = { code:'INVALID_PROFILE_JSON', stage:'profile', message:error?.message ?? 'Invalid profile JSON.' };
        return this;
      }
    }
    if (!isObject(parsed)) {
      this.lastError = { code:'INVALID_PROFILES', stage:'profile', message:'Profiles payload must be an object.' };
      return this;
    }
    const staged = new Map(merge ? this.profiles : []);
    for (const [name, profile] of Object.entries(parsed)) {
      const normalized = profileName(name);
      const validation = this.#validateProfile(profile);
      if (!normalized || !validation.ok) {
        this.lastError = !normalized
          ? { code:'INVALID_PROFILE_NAME', stage:'profile', message:'Profile name is required.' }
          : validation.error;
        return this;
      }
      staged.set(normalized, clone(profile));
    }
    this.profiles = staged;
    this.lastError = null;
    return this;
  }

  saveProfiles({ storage = this.profileStorage, key = this.profileStorageKey } = {}) {
    if (!storageLike(storage)) {
      this.lastError = { code:'PROFILE_STORAGE_UNAVAILABLE', stage:'profile', message:'Storage must implement getItem/setItem.' };
      return false;
    }
    try {
      storage.setItem(String(key), this.serializeProfiles());
      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError = { code:'PROFILE_STORAGE_WRITE_FAILED', stage:'profile', message:error?.message ?? String(error) };
      return false;
    }
  }

  loadProfiles({ storage = this.profileStorage, key = this.profileStorageKey, merge = true } = {}) {
    if (!storageLike(storage)) {
      this.lastError = { code:'PROFILE_STORAGE_UNAVAILABLE', stage:'profile', message:'Storage must implement getItem/setItem.' };
      return this;
    }
    try {
      const raw = storage.getItem(String(key));
      if (raw == null || raw === '') { this.lastError = null; return this; }
      return this.importProfiles(raw, { merge });
    } catch (error) {
      this.lastError = { code:'PROFILE_STORAGE_READ_FAILED', stage:'profile', message:error?.message ?? String(error) };
      return this;
    }
  }

  render(container, {
    width = container?.clientWidth,
    onAction = null,
    onReorder = null,
    document:documentRef = container?.ownerDocument ?? globalThis.document
  } = {}) {
    this.destroy();
    if (!container || !documentRef || typeof documentRef.createElement !== 'function') return null;
    const state = this.resolve({ width });
    const root = documentRef.createElement('header');
    root.className = `nlab-header-studio nlab-header-studio--${state.mode}`;
    root.setAttribute?.('data-header-mode', state.mode);

    for (const zoneName of ['start', 'center', 'end']) {
      const zone = documentRef.createElement('div');
      zone.className = `nlab-header-studio__zone nlab-header-studio__zone--${zoneName}`;
      zone.setAttribute?.('data-header-zone', zoneName);
      for (const item of state.zones[zoneName]) zone.append?.(this.#renderItem(documentRef, item, { onAction, onReorder, container, width }));
      root.append?.(zone);
    }

    if (state.zones.menu.length) {
      const details = documentRef.createElement('details');
      details.className = 'nlab-header-studio__menu';
      const summary = documentRef.createElement('summary');
      summary.textContent = this.menuLabel;
      summary.setAttribute?.('aria-label', this.menuLabel);
      details.append?.(summary);
      const menu = documentRef.createElement('div');
      menu.className = 'nlab-header-studio__menu-items';
      menu.setAttribute?.('role', 'menu');
      for (const item of state.zones.menu) menu.append?.(this.#renderItem(documentRef, item, { onAction, onReorder, container, width, inMenu:true }));
      details.append?.(menu);
      root.append?.(details);
    }

    container.replaceChildren?.(root);
    return { state, root, destroy:() => this.destroy() };
  }

  destroy() {
    for (const cleanup of this._cleanup.splice(0)) {
      try { cleanup(); } catch {}
    }
    return this;
  }

  #resolvedItem(item, compact) {
    const mode = item.labelMode === 'auto' ? this.labelMode : item.labelMode;
    const effective = mode === 'auto' ? (compact ? 'short' : 'long') : mode;
    const text = effective === 'icon' ? '' : effective === 'short' ? item.labels.short : item.labels.long;
    return {
      id:item.id,
      text,
      title:item.labels.long,
      icon:item.icon,
      labelMode:effective,
      position:item.position,
      group:item.group,
      href:item.href,
      disabled:item.disabled,
      order:item.order
    };
  }

  #renderItem(documentRef, item, { onAction, onReorder, container, width, inMenu = false }) {
    const node = item.href ? documentRef.createElement('a') : documentRef.createElement('button');
    if (!item.href) node.type = 'button';
    else node.href = item.href;
    node.className = 'nlab-header-studio__item';
    node.setAttribute?.('data-header-item', item.id);
    if (item.group) node.setAttribute?.('data-header-group', item.group);
    if (inMenu) node.setAttribute?.('role', 'menuitem');
    node.title = item.title;
    node.disabled = Boolean(item.disabled);
    if (item.disabled && item.href) node.setAttribute?.('aria-disabled', 'true');

    if (item.icon != null) {
      const iconHost = documentRef.createElement('span');
      iconHost.className = 'nlab-header-studio__icon';
      const rendered = this.iconRenderer?.(item.icon, item, documentRef);
      if (rendered && typeof rendered === 'object') iconHost.append?.(rendered);
      else iconHost.textContent = rendered == null ? String(item.icon) : String(rendered);
      iconHost.setAttribute?.('aria-hidden', 'true');
      node.append?.(iconHost);
    }
    if (item.text) {
      const label = documentRef.createElement('span');
      label.className = 'nlab-header-studio__label';
      label.textContent = item.text;
      node.append?.(label);
    } else node.setAttribute?.('aria-label', item.title);

    const activate = (event) => {
      if (item.disabled) { event?.preventDefault?.(); return; }
      if (typeof onAction === 'function') onAction({ id:item.id, item:clone(item), event });
    };
    node.addEventListener?.('click', activate);
    this._cleanup.push(() => node.removeEventListener?.('click', activate));

    if (this.reorderable) {
      node.draggable = true;
      const start = (event) => {
        event.dataTransfer?.setData?.('text/plain', item.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      };
      const over = (event) => { event.preventDefault?.(); };
      const drop = (event) => {
        event.preventDefault?.();
        const sourceId = event.dataTransfer?.getData?.('text/plain');
        if (!sourceId || sourceId === item.id) return;
        const ordered = this.orderedItems();
        const target = ordered.findIndex((entry) => entry.id === item.id);
        this.moveItem(sourceId, target);
        if (typeof onReorder === 'function') onReorder(this.itemState());
        this.render(container, { width, onAction, onReorder, document:documentRef });
      };
      node.addEventListener?.('dragstart', start);
      node.addEventListener?.('dragover', over);
      node.addEventListener?.('drop', drop);
      this._cleanup.push(() => {
        node.removeEventListener?.('dragstart', start);
        node.removeEventListener?.('dragover', over);
        node.removeEventListener?.('drop', drop);
      });
    }
    return node;
  }

  #item(id) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  #dirty() {
    this.activeProfile = null;
  }

  #assertUniqueIds(items) {
    const seen = new Set();
    for (const item of items) {
      if (seen.has(item.id)) throw new TypeError(`Duplicate header item id: ${item.id}`);
      seen.add(item.id);
    }
  }

  #validateProfile(profile) {
    if (!isObject(profile)) return { ok:false, error:{ code:'INVALID_PROFILE', stage:'profile', message:'Profile must be an object.' } };
    if ('version' in profile && Number(profile.version) !== PROFILE_VERSION) {
      return { ok:false, error:{ code:'UNSUPPORTED_PROFILE_VERSION', stage:'profile', message:`Unsupported profile version: ${String(profile.version)}` } };
    }
    if ('items' in profile && !Array.isArray(profile.items)) {
      return { ok:false, error:{ code:'INVALID_PROFILE_ITEMS', stage:'profile', message:'Profile items must be an array.' } };
    }
    return { ok:true, error:null };
  }
}
