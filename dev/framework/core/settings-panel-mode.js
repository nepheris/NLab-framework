const MODES = Object.freeze(['classic', 'advanced']);
const MODE_SET = new Set(MODES);
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const SENSITIVE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function failure(code, message) {
  const error = new Error(message);
  error.name = 'SettingsPanelModeError';
  error.code = code;
  throw error;
}

function normalizeMode(value) {
  const mode = String(value ?? 'classic').trim().toLowerCase();
  if (!MODE_SET.has(mode)) failure('INVALID_MODE', `Unsupported settings mode: ${mode}`);
  return mode;
}

function normalizeId(value) {
  const id = String(value ?? '').trim().toLowerCase();
  if (!id || id.length > 160 || !ID_PATTERN.test(id)) failure('INVALID_ID', `Invalid settings item id: ${String(value)}`);
  return id;
}

function cloneJson(value, seen = new Set(), path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) failure('NON_FINITE_NUMBER', `Non-finite number at ${path}`);
    return value;
  }
  if (typeof value !== 'object') failure('UNSUPPORTED_VALUE', `Unsupported value at ${path}`);
  if (seen.has(value)) failure('CYCLE', `Cyclic value at ${path}`);
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item, index) => cloneJson(item, seen, `${path}[${index}]`));
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) failure('UNSUPPORTED_OBJECT', `Unsupported object at ${path}`);
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (SENSITIVE_KEYS.has(key)) failure('SENSITIVE_KEY', `Sensitive key ${key} at ${path}`);
      Object.defineProperty(out, key, { value: cloneJson(value[key], seen, `${path}.${key}`), enumerable: true, configurable: true, writable: true });
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

function normalizeItem(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) failure('INVALID_ITEM', 'Settings item must be an object');
  return {
    id: normalizeId(input.id),
    label: input.label == null ? null : String(input.label),
    level: normalizeMode(input.level ?? input.mode ?? 'classic'),
    visible: input.visible !== false,
    enabled: input.enabled !== false,
    group: input.group == null ? null : normalizeId(input.group),
    metadata: input.metadata == null ? {} : cloneJson(input.metadata)
  };
}

function cloneItem(item) {
  return { ...item, metadata: cloneJson(item.metadata) };
}

export class SettingsPanelMode {
  constructor({ mode = 'classic', items = [], onChange = null } = {}) {
    this.mode = normalizeMode(mode);
    this.items = new Map();
    this.overrides = new Map();
    this.onChange = typeof onChange === 'function' ? onChange : null;
    if (!Array.isArray(items)) failure('INVALID_ITEMS', 'items must be an array');
    for (const item of items) this.register(item);
  }

  #emit(reason) {
    const snapshot = this.snapshot();
    try { this.onChange?.(snapshot, reason); } catch {}
    return snapshot;
  }

  register(input, { replace = false } = {}) {
    const item = normalizeItem(input);
    if (this.items.has(item.id) && !replace) failure('ITEM_EXISTS', `Settings item already exists: ${item.id}`);
    this.items.set(item.id, item);
    return cloneItem(item);
  }

  unregister(id) {
    const key = normalizeId(id);
    this.overrides.delete(key);
    return this.items.delete(key);
  }

  setMode(mode) {
    this.mode = normalizeMode(mode);
    return this.#emit('mode');
  }

  toggle() {
    return this.setMode(this.mode === 'classic' ? 'advanced' : 'classic');
  }

  setEnabled(id, enabled = true) {
    const key = normalizeId(id);
    const item = this.items.get(key);
    if (!item) failure('ITEM_NOT_FOUND', `Unknown settings item: ${key}`);
    item.enabled = Boolean(enabled);
    return cloneItem(item);
  }

  setVisible(id, visible = true) {
    const key = normalizeId(id);
    const item = this.items.get(key);
    if (!item) failure('ITEM_NOT_FOUND', `Unknown settings item: ${key}`);
    item.visible = Boolean(visible);
    return cloneItem(item);
  }

  setOverride(id, mode, visible) {
    const key = normalizeId(id);
    if (!this.items.has(key)) failure('ITEM_NOT_FOUND', `Unknown settings item: ${key}`);
    const targetMode = normalizeMode(mode);
    if (visible == null) {
      const record = this.overrides.get(key);
      if (record) {
        delete record[targetMode];
        if (!Object.keys(record).length) this.overrides.delete(key);
      }
      return this.get(key);
    }
    const record = this.overrides.get(key) ?? {};
    record[targetMode] = Boolean(visible);
    this.overrides.set(key, record);
    return this.get(key);
  }

  #isVisible(item, mode = this.mode) {
    if (!item.visible) return false;
    const override = this.overrides.get(item.id)?.[mode];
    if (typeof override === 'boolean') return override;
    if (mode === 'advanced') return true;
    return item.level === 'classic';
  }

  get(id, { mode = this.mode } = {}) {
    let key;
    try { key = normalizeId(id); } catch { return null; }
    const item = this.items.get(key);
    if (!item) return null;
    const targetMode = normalizeMode(mode);
    return { ...cloneItem(item), effectiveVisible: this.#isVisible(item, targetMode), effectiveMode: targetMode };
  }

  list({ mode = this.mode, visibleOnly = false, group = null } = {}) {
    const targetMode = normalizeMode(mode);
    const groupId = group == null ? null : normalizeId(group);
    return [...this.items.values()]
      .filter((item) => groupId == null || item.group === groupId)
      .map((item) => ({ ...cloneItem(item), effectiveVisible: this.#isVisible(item, targetMode), effectiveMode: targetMode }))
      .filter((item) => !visibleOnly || item.effectiveVisible)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  descriptor() {
    const items = this.list();
    const visible = items.filter((item) => item.effectiveVisible);
    return {
      kind: 'settings-panel-mode',
      mode: this.mode,
      modes: MODES.map((mode) => ({
        id: mode,
        label: mode === 'classic' ? 'Classique' : 'Avancé',
        active: mode === this.mode,
        ariaPressed: mode === this.mode
      })),
      items,
      visibleCount: visible.length,
      hiddenCount: items.length - visible.length
    };
  }

  snapshot() {
    return {
      mode: this.mode,
      items: this.list({ mode: this.mode }).map(({ effectiveVisible, effectiveMode, ...item }) => item),
      overrides: Object.fromEntries([...this.overrides.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, value]) => [id, { ...value }]))
    };
  }
}

export const SETTINGS_PANEL_MODES = MODES;
