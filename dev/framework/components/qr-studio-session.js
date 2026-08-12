import { QRStudioSchema } from './qr-studio-schema.js';

const clone = (value) => value === undefined ? undefined : structuredClone(value);
const plain = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clean = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

export class QRStudioSessionError extends Error {
  constructor(message, code = 'QR_STUDIO_SESSION_ERROR', details = null) {
    super(message);
    this.name = 'QRStudioSessionError';
    this.code = code;
    this.details = details;
  }
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function same(a, b) { return stable(a) === stable(b); }

function normalizePresetForCodec(entry, config) {
  return {
    id: entry.id,
    name: entry.label,
    label: entry.label,
    config: clone(config),
    meta: clone(entry.meta ?? {})
  };
}

export class QRStudioSession {
  constructor({
    schema = new QRStudioSchema(),
    codec = null,
    storage = null,
    generate = null,
    activeId = 'standard',
    autoLoad = true,
    onChange = null
  } = {}) {
    if (!schema?.presets || !schema?.controlPanel) throw new QRStudioSessionError('QR Studio schema is unavailable','SCHEMA_UNAVAILABLE');
    this.schema = schema;
    this.codec = codec;
    this.storage = storage;
    this.generate = typeof generate === 'function' ? generate : null;
    this.onChange = typeof onChange === 'function' ? onChange : null;
    this.entries = new Map();
    this.activeId = null;
    this.generationCount = 0;

    for (const preset of schema.presets()) {
      this.entries.set(preset.id, {
        id:preset.id,
        label:preset.label,
        meta:clone(preset.meta ?? {}),
        canonical:clone(preset.config),
        reference:clone(preset.config),
        draft:clone(preset.config),
        editing:false,
        validated:true,
        generationCount:0,
        lastGeneration:null
      });
    }
    this.select(this.entries.has(activeId) ? activeId : this.entries.keys().next().value, { notify:false });
    if (autoLoad) this.load({ notify:false });
  }

  list() { return [...this.entries.values()].map((entry)=>this.#state(entry)); }

  state(id = this.activeId) { return this.#state(this.#require(id)); }

  active() { return this.state(this.activeId); }

  select(id, { notify = true } = {}) {
    const entry = this.#require(id);
    this.activeId = entry.id;
    if (notify) this.#emit('select', entry.id);
    return this.state(entry.id);
  }

  beginEdit(id = this.activeId) {
    const entry = this.#require(id);
    entry.editing = true;
    this.#emit('edit', entry.id);
    return this.state(entry.id);
  }

  patch(patch, { id = this.activeId, replace = false } = {}) {
    if (!plain(patch)) throw new QRStudioSessionError('QR draft patch must be an object','INVALID_PATCH');
    const entry = this.#require(id);
    entry.draft = replace ? clone(patch) : { ...clone(entry.draft), ...clone(patch) };
    entry.editing = true;
    entry.validated = same(entry.draft, entry.reference);
    this.#emit('patch', entry.id);
    return this.state(entry.id);
  }

  async regenerate({ id = this.activeId, generator = this.generate } = {}) {
    const entry = this.#require(id);
    if (typeof generator !== 'function') return { ok:false, reason:'generator-unavailable', state:this.state(entry.id) };
    const validation = this.#validate(entry, entry.draft);
    if (!validation.valid) return { ok:false, reason:'invalid', issues:validation.errors, state:this.state(entry.id) };
    try {
      const result = await generator(clone(entry.draft), { id:entry.id, label:entry.label, session:this });
      this.generationCount += 1;
      entry.generationCount += 1;
      entry.lastGeneration = { ok:true, number:entry.generationCount, result:clone(result) };
      this.#emit('regenerate', entry.id);
      return { ok:true, result:clone(result), state:this.state(entry.id) };
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      entry.lastGeneration = { ok:false, number:entry.generationCount + 1, error:{name:normalized.name,message:normalized.message} };
      this.#emit('regenerate-error', entry.id);
      return { ok:false, reason:'generation-error', error:clone(entry.lastGeneration.error), state:this.state(entry.id) };
    }
  }

  validate(id = this.activeId, { persist = true } = {}) {
    const entry = this.#require(id);
    const validation = this.#validate(entry, entry.draft);
    if (!validation.valid) return { ok:false, reason:'invalid', issues:validation.errors, state:this.state(entry.id) };
    entry.reference = clone(entry.draft);
    entry.editing = false;
    entry.validated = true;
    const persisted = persist ? this.save() : { ok:true, skipped:true };
    this.#emit('validate', entry.id);
    return { ok:true, persisted, state:this.state(entry.id) };
  }

  reset(id = this.activeId, { to = 'reference' } = {}) {
    const entry = this.#require(id);
    if (!['reference','canonical'].includes(to)) throw new QRStudioSessionError('Reset target must be reference or canonical','INVALID_RESET_TARGET',{to});
    entry.draft = clone(entry[to]);
    entry.editing = false;
    entry.validated = same(entry.draft, entry.reference);
    this.#emit(`reset-${to}`, entry.id);
    return this.state(entry.id);
  }

  controlPanel(id = this.activeId) {
    const entry = this.#require(id);
    const panel = this.schema.controlPanel({ presetId:entry.id });
    return {
      ...clone(panel),
      config:clone(entry.draft),
      state:{ editing:entry.editing, dirty:!same(entry.draft,entry.reference), validated:entry.validated, generationCount:entry.generationCount },
      reference:clone(entry.reference)
    };
  }

  exportJSON({ source = 'reference', space = 2 } = {}) {
    if (!['reference','draft'].includes(source)) throw new QRStudioSessionError('Export source must be reference or draft','INVALID_EXPORT_SOURCE',{source});
    const presets = [...this.entries.values()].map((entry)=>normalizePresetForCodec(entry, entry[source]));
    if (this.codec?.exportCollection) return this.codec.exportCollection(presets, { activeId:this.activeId, meta:{source:'qr-studio-session'}, space });
    return JSON.stringify({ type:'nlab.qr-studio-session', version:1, activeId:this.activeId, presets }, null, space);
  }

  importJSON(input, { persist = true } = {}) {
    let document;
    try {
      document = this.codec?.importCollection ? this.codec.importCollection(input) : (typeof input === 'string' ? JSON.parse(input) : clone(input));
    } catch (error) {
      return { ok:false, reason:'invalid-data', error:{name:error?.name??'Error',message:error?.message??String(error)}, issues:[...(error?.issues??[])] };
    }
    if (!document || !Array.isArray(document.presets)) return { ok:false, reason:'invalid-data', error:{name:'TypeError',message:'presets must be an array'}, issues:[] };
    const staged = new Map();
    for (const preset of document.presets) {
      const entry = this.entries.get(preset?.id);
      if (!entry) return { ok:false, reason:'unknown-preset', id:preset?.id??null };
      const config = clone(preset.config);
      const validation = this.#validate(entry, config);
      if (!validation.valid) return { ok:false, reason:'invalid', id:entry.id, issues:validation.errors };
      staged.set(entry.id, config);
    }
    for (const [id, config] of staged) {
      const entry = this.entries.get(id);
      entry.reference = clone(config);
      entry.draft = clone(config);
      entry.editing = false;
      entry.validated = true;
    }
    if (document.activeId && this.entries.has(document.activeId)) this.activeId = document.activeId;
    const persisted = persist ? this.save() : { ok:true, skipped:true };
    this.#emit('import', this.activeId);
    return { ok:true, persisted, state:this.active() };
  }

  save() {
    if (!this.storage?.save) return { ok:false, reason:'unavailable' };
    const presets = [...this.entries.values()].map((entry)=>normalizePresetForCodec(entry, entry.reference));
    return this.storage.save(presets, { activeId:this.activeId, meta:{source:'qr-studio-session'} });
  }

  load({ notify = true } = {}) {
    if (!this.storage?.load) return { ok:false, reason:'unavailable', found:false };
    const loaded = this.storage.load();
    if (!loaded?.ok || !loaded.found || !loaded.document) return loaded;
    const result = this.importJSON(loaded.document, { persist:false });
    if (notify && result.ok) this.#emit('load', this.activeId);
    return { ...loaded, imported:result.ok, importResult:result };
  }

  snapshot() { return { activeId:this.activeId, generationCount:this.generationCount, presets:this.list() }; }

  #validate(entry, config) {
    if (!plain(config)) return { valid:false, errors:['config must be an object'] };
    if (!this.codec?.validatePreset) return { valid:true, errors:[] };
    try {
      const result = this.codec.validatePreset(normalizePresetForCodec(entry, config));
      return { valid:Boolean(result?.valid), errors:[...(result?.errors??[])] };
    } catch (error) {
      return { valid:false, errors:[error?.message??String(error)] };
    }
  }

  #state(entry) {
    return {
      id:entry.id,
      label:entry.label,
      active:entry.id===this.activeId,
      editing:entry.editing,
      dirty:!same(entry.draft,entry.reference),
      validated:entry.validated,
      generationCount:entry.generationCount,
      lastGeneration:clone(entry.lastGeneration),
      config:clone(entry.draft),
      reference:clone(entry.reference),
      canonical:clone(entry.canonical),
      meta:clone(entry.meta)
    };
  }

  #require(id) {
    const key = clean(id);
    const entry = this.entries.get(key);
    if (!entry) throw new QRStudioSessionError('Unknown QR Studio preset','UNKNOWN_PRESET',{id});
    return entry;
  }

  #emit(type, id) {
    try { this.onChange?.({ type, id, activeId:this.activeId, state:this.state(id) }); } catch {}
  }
}
