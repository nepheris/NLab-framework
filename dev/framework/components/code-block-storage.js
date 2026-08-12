const DOCUMENT_TYPE = 'nlab.code-block-state';
const DOCUMENT_VERSION = 1;

function resolveGlobalStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

function normalizeError(error) {
  return { name:String(error?.name ?? 'Error'), message:String(error?.message ?? error ?? 'Storage operation failed') };
}

function normalizeState(input) {
  if (!input || typeof input !== 'object') throw new TypeError('CodeBlock state must be an object');
  const value = String(input.value ?? '');
  const language = String(input.language ?? 'text').trim() || 'text';
  const filename = String(input.filename ?? 'export.txt').trim() || 'export.txt';
  const theme = input.theme === 'dark' ? 'dark' : 'light';
  const highlighted = Boolean(input.highlighted);
  const numericScale = Number(input.fontScale);
  const fontScale = Number.isFinite(numericScale) ? Math.max(70, Math.min(160, numericScale)) : 100;
  return { value, language, filename, theme, highlighted, fontScale };
}

export class CodeBlockStorage {
  constructor({ storage = undefined, key = 'nlab.code-block.state.v1' } = {}) {
    this.storage = storage === undefined ? resolveGlobalStorage() : storage;
    this.key = String(key ?? '').trim() || 'nlab.code-block.state.v1';
  }

  isAvailable() {
    return Boolean(this.storage && typeof this.storage.getItem === 'function' && typeof this.storage.setItem === 'function' && typeof this.storage.removeItem === 'function');
  }

  snapshot(block) {
    return normalizeState(block);
  }

  serialize(block, { meta = {} } = {}) {
    const state = this.snapshot(block);
    const safeMeta = meta && typeof meta === 'object' && !Array.isArray(meta) ? JSON.parse(JSON.stringify(meta)) : {};
    return JSON.stringify({ type:DOCUMENT_TYPE, version:DOCUMENT_VERSION, state, meta:safeMeta });
  }

  parse(raw) {
    let document;
    try { document = typeof raw === 'string' ? JSON.parse(raw) : raw; }
    catch (error) { throw new TypeError(`Invalid CodeBlock state JSON: ${error.message}`); }
    if (!document || typeof document !== 'object' || Array.isArray(document)) throw new TypeError('Invalid CodeBlock state document');
    if (document.type !== DOCUMENT_TYPE) throw new TypeError(`CodeBlock state type must be ${DOCUMENT_TYPE}`);
    if (document.version !== DOCUMENT_VERSION) throw new TypeError(`CodeBlock state version must be ${DOCUMENT_VERSION}`);
    return { type:DOCUMENT_TYPE, version:DOCUMENT_VERSION, state:normalizeState(document.state), meta:document.meta && typeof document.meta === 'object' && !Array.isArray(document.meta) ? document.meta : {} };
  }

  save(block, options = {}) {
    if (!this.isAvailable()) return { ok:false, reason:'unavailable', key:this.key, error:null };
    let json;
    try { json = this.serialize(block, options); }
    catch (error) { return { ok:false, reason:'invalid-state', key:this.key, error:normalizeError(error) }; }
    try {
      this.storage.setItem(this.key, json);
      return { ok:true, reason:null, key:this.key, json };
    } catch (error) {
      return { ok:false, reason:'storage-error', key:this.key, error:normalizeError(error) };
    }
  }

  load(block = null, { apply = true } = {}) {
    if (!this.isAvailable()) return { ok:false, found:false, reason:'unavailable', key:this.key, document:null, error:null };
    let raw;
    try { raw = this.storage.getItem(this.key); }
    catch (error) { return { ok:false, found:false, reason:'storage-error', key:this.key, document:null, error:normalizeError(error) }; }
    if (raw == null || raw === '') return { ok:true, found:false, reason:null, key:this.key, document:null, error:null };
    let document;
    try { document = this.parse(raw); }
    catch (error) { return { ok:false, found:true, reason:'invalid-state', key:this.key, document:null, error:normalizeError(error) }; }
    if (apply && block) {
      try { this.apply(block, document.state); }
      catch (error) { return { ok:false, found:true, reason:'apply-error', key:this.key, document, error:normalizeError(error) }; }
    }
    return { ok:true, found:true, reason:null, key:this.key, document, error:null };
  }

  apply(block, state) {
    if (!block || typeof block !== 'object') throw new TypeError('CodeBlock instance is required');
    const normalized = normalizeState(state);
    if (typeof block.setLanguage === 'function') block.setLanguage(normalized.language); else block.language = normalized.language;
    if (typeof block.setFilename === 'function') block.setFilename(normalized.filename); else block.filename = normalized.filename;
    if (typeof block.setValue === 'function') block.setValue(normalized.value); else block.value = normalized.value;
    if (typeof block.setTheme === 'function') block.setTheme(normalized.theme); else block.theme = normalized.theme;
    if (typeof block.setHighlighted === 'function') block.setHighlighted(normalized.highlighted); else block.highlighted = normalized.highlighted;
    if (typeof block.setFontScale === 'function') block.setFontScale(normalized.fontScale); else block.fontScale = normalized.fontScale;
    return normalized;
  }

  clear() {
    if (!this.isAvailable()) return { ok:false, reason:'unavailable', key:this.key, error:null };
    try { this.storage.removeItem(this.key); return { ok:true, reason:null, key:this.key, error:null }; }
    catch (error) { return { ok:false, reason:'storage-error', key:this.key, error:normalizeError(error) }; }
  }
}
