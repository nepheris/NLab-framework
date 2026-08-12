import { QRPresetCodec } from './qr-preset-codec.js';

function normalizeError(error) {
  return {
    name: String(error?.name ?? 'Error'),
    message: String(error?.message ?? error ?? 'Storage operation failed')
  };
}

function resolveGlobalStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export class QRPresetStorage {
  constructor({ storage = undefined, key = 'nlab.qr.presets.v1', codec = new QRPresetCodec() } = {}) {
    this.storage = storage === undefined ? resolveGlobalStorage() : storage;
    this.key = String(key ?? '').trim() || 'nlab.qr.presets.v1';
    this.codec = codec;
  }

  isAvailable() {
    return Boolean(this.storage
      && typeof this.storage.getItem === 'function'
      && typeof this.storage.setItem === 'function'
      && typeof this.storage.removeItem === 'function');
  }

  save(presets = [], { activeId = null, meta = {}, space = 0 } = {}) {
    if (!this.isAvailable()) return { ok:false, reason:'unavailable', key:this.key, error:null };
    let json;
    try {
      json = this.codec.exportCollection(presets, { activeId, meta, space });
    } catch (error) {
      return { ok:false, reason:'invalid-data', key:this.key, error:normalizeError(error), issues:[...(error?.issues ?? [])] };
    }
    try {
      this.storage.setItem(this.key, json);
      return { ok:true, reason:null, key:this.key, bytes:new TextEncoder().encode(json).byteLength, json };
    } catch (error) {
      return { ok:false, reason:'storage-error', key:this.key, error:normalizeError(error) };
    }
  }

  load() {
    if (!this.isAvailable()) return { ok:false, found:false, reason:'unavailable', key:this.key, document:null, error:null };
    let raw;
    try {
      raw = this.storage.getItem(this.key);
    } catch (error) {
      return { ok:false, found:false, reason:'storage-error', key:this.key, document:null, error:normalizeError(error) };
    }
    if (raw == null || raw === '') return { ok:true, found:false, reason:null, key:this.key, document:null, error:null };
    try {
      const document = this.codec.importCollection(raw);
      return { ok:true, found:true, reason:null, key:this.key, document, error:null };
    } catch (error) {
      return { ok:false, found:true, reason:'invalid-data', key:this.key, document:null, error:normalizeError(error), issues:[...(error?.issues ?? [])] };
    }
  }

  clear() {
    if (!this.isAvailable()) return { ok:false, reason:'unavailable', key:this.key, error:null };
    try {
      this.storage.removeItem(this.key);
      return { ok:true, reason:null, key:this.key, error:null };
    } catch (error) {
      return { ok:false, reason:'storage-error', key:this.key, error:normalizeError(error) };
    }
  }
}
