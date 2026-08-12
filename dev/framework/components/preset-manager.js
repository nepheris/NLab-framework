const clone = (value) => structuredClone(value ?? {});

function slug(value = 'preset') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'preset';
}

export class PresetManager {
  constructor({ namespace = 'default', storage = null, storageKey = null, canonical = [], presets = [] } = {}) {
    this.namespace = namespace;
    this.storage = storage;
    this.storageKey = storageKey ?? `presets:${namespace}`;
    this.canonical = new Map();
    this.presets = new Map();
    this.activeId = null;

    for (const preset of canonical) this.registerCanonical(preset);
    for (const preset of presets) this.upsert(preset, { persist: false });
    this.load();
  }

  registerCanonical(preset) {
    const normalized = this.#normalize(preset, { canonical: true });
    this.canonical.set(normalized.id, normalized);
    if (!this.presets.has(normalized.id)) this.presets.set(normalized.id, clone(normalized));
    return clone(normalized);
  }

  list({ includeCanonical = true } = {}) {
    return [...this.presets.values()]
      .filter((preset) => includeCanonical || !preset.canonical)
      .map(clone);
  }

  get(id) {
    const preset = this.presets.get(id);
    return preset ? clone(preset) : null;
  }

  getActive() { return this.activeId ? this.get(this.activeId) : null; }

  setActive(id) {
    if (!this.presets.has(id)) throw new Error(`Unknown preset: ${id}`);
    this.activeId = id;
    this.#persist();
    return this.get(id);
  }

  create({ label = 'Nouveau preset', settings = {}, meta = {} } = {}) {
    const base = slug(label);
    let id = `${this.namespace}.${base}`;
    let index = 2;
    while (this.presets.has(id)) id = `${this.namespace}.${base}-${index++}`;
    const preset = this.#normalize({ id, label, settings, meta, validated: false, canonical: false });
    this.presets.set(id, preset);
    this.activeId = id;
    this.#persist();
    return clone(preset);
  }

  duplicate(id, { label = null } = {}) {
    const source = this.#require(id);
    return this.create({ label: label ?? `${source.label} copie`, settings: source.settings, meta: source.meta });
  }

  rename(id, label) {
    const preset = this.#require(id);
    this.#assertMutable(preset);
    preset.label = String(label || '').trim() || preset.label;
    preset.updatedAt = new Date().toISOString();
    this.#persist();
    return clone(preset);
  }

  update(id, settings, { replace = false } = {}) {
    const preset = this.#require(id);
    this.#assertMutable(preset);
    preset.settings = replace ? clone(settings) : { ...clone(preset.settings), ...clone(settings) };
    preset.validated = false;
    preset.updatedAt = new Date().toISOString();
    this.#persist();
    return clone(preset);
  }

  validate(id, value = true) {
    const preset = this.#require(id);
    this.#assertMutable(preset);
    preset.validated = Boolean(value);
    preset.validatedAt = preset.validated ? new Date().toISOString() : null;
    preset.updatedAt = new Date().toISOString();
    this.#persist();
    return clone(preset);
  }

  reset(id) {
    const canonical = this.canonical.get(id);
    if (!canonical) throw new Error(`No canonical preset registered for: ${id}`);
    this.presets.set(id, clone(canonical));
    this.activeId = id;
    this.#persist();
    return this.get(id);
  }

  remove(id) {
    const preset = this.#require(id);
    this.#assertMutable(preset);
    this.presets.delete(id);
    if (this.activeId === id) this.activeId = null;
    this.#persist();
    return true;
  }

  upsert(preset, { persist = true } = {}) {
    const normalized = this.#normalize(preset);
    const existing = this.presets.get(normalized.id);
    if (existing?.canonical && !normalized.canonical) throw new Error(`Cannot overwrite canonical preset: ${normalized.id}`);
    this.presets.set(normalized.id, normalized);
    if (persist) this.#persist();
    return clone(normalized);
  }

  exportJSON(space = 2) {
    return JSON.stringify({
      version: 1,
      type: 'nlab-preset-collection',
      namespace: this.namespace,
      activeId: this.activeId,
      presets: this.list(),
    }, null, space);
  }

  importJSON(input, { replace = false } = {}) {
    const data = this.#parseCollection(input);
    const staged = replace
      ? new Map([...this.canonical.entries()].map(([id, preset]) => [id, clone(preset)]))
      : new Map([...this.presets.entries()].map(([id, preset]) => [id, clone(preset)]));
    const importedIds = new Set();

    for (const preset of data.presets) {
      if (preset?.canonical) continue;
      const normalized = this.#normalize({ ...preset, canonical: false }, { canonical: false });
      if (importedIds.has(normalized.id)) throw new Error(`Duplicate imported preset: ${normalized.id}`);
      importedIds.add(normalized.id);
      if (staged.get(normalized.id)?.canonical) throw new Error(`Cannot overwrite canonical preset: ${normalized.id}`);
      staged.set(normalized.id, normalized);
    }

    let nextActiveId = replace ? null : this.activeId;
    if (data.activeId != null && data.activeId !== '') {
      if (!staged.has(data.activeId)) throw new Error(`Unknown active preset in collection: ${data.activeId}`);
      nextActiveId = data.activeId;
    } else if (nextActiveId && !staged.has(nextActiveId)) {
      nextActiveId = null;
    }

    this.presets = staged;
    this.activeId = nextActiveId;
    this.#persist();
    return this.list();
  }

  save() { this.#persist(); return this; }

  load() {
    const saved = this.storage?.get?.(this.storageKey, null);
    if (!saved) return this;
    for (const preset of saved.presets ?? []) {
      if (preset.canonical) continue;
      this.upsert({ ...preset, canonical: false }, { persist: false });
    }
    if (saved.activeId && this.presets.has(saved.activeId)) this.activeId = saved.activeId;
    return this;
  }

  #parseCollection(input) {
    const data = typeof input === 'string' ? JSON.parse(input) : clone(input);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new TypeError('Preset collection must be an object');
    if (data.type !== 'nlab-preset-collection') throw new Error('Unsupported preset collection');
    if (data.version !== undefined && data.version !== 1) throw new Error(`Unsupported preset collection version: ${data.version}`);
    if (data.namespace && data.namespace !== this.namespace) throw new Error(`Preset namespace mismatch: ${data.namespace}`);
    if (!Array.isArray(data.presets)) throw new TypeError('Preset collection presets must be an array');
    if (data.activeId != null && typeof data.activeId !== 'string') throw new TypeError('Preset collection activeId must be a string or null');
    return data;
  }

  #normalize(preset, { canonical = Boolean(preset?.canonical) } = {}) {
    if (!preset || typeof preset !== 'object') throw new TypeError('Preset must be an object');
    const id = String(preset.id || '').trim();
    if (!id) throw new Error('Preset id is required');
    const now = new Date().toISOString();
    return {
      id,
      label: String(preset.label || id),
      settings: clone(preset.settings),
      meta: clone(preset.meta),
      canonical: Boolean(canonical),
      validated: Boolean(preset.validated ?? canonical),
      createdAt: preset.createdAt ?? now,
      updatedAt: preset.updatedAt ?? now,
      validatedAt: preset.validatedAt ?? (canonical ? now : null),
    };
  }

  #require(id) {
    const preset = this.presets.get(id);
    if (!preset) throw new Error(`Unknown preset: ${id}`);
    return preset;
  }

  #assertMutable(preset) {
    if (preset.canonical) throw new Error(`Canonical preset is immutable: ${preset.id}`);
  }

  #persist() {
    this.storage?.set?.(this.storageKey, {
      version: 1,
      namespace: this.namespace,
      activeId: this.activeId,
      presets: this.list({ includeCanonical: false }),
    });
  }
}
