const TYPE = 'nlab.session-config-storage';
const VERSION = 1;
const KEY_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,159}$/i;
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);

function storageError(code, message, cause = null) {
  const error = new Error(message);
  error.name = 'SessionConfigStorageError';
  error.code = code;
  if (cause != null) error.cause = cause;
  return error;
}

function cloneJson(value, { path = '$', depth = 0, seen = new Set() } = {}) {
  if (depth > 64) throw storageError('MAX_DEPTH', `JSON value exceeds depth 64 at ${path}`);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw storageError('NON_FINITE_NUMBER', `Non-finite number at ${path}`);
    return value;
  }
  if (typeof value !== 'object') throw storageError('UNSUPPORTED_VALUE', `Unsupported JSON value at ${path}`);
  if (seen.has(value)) throw storageError('CYCLE', `Cyclic JSON value at ${path}`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry, index) => cloneJson(entry, { path: `${path}[${index}]`, depth: depth + 1, seen }));
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw storageError('UNSUPPORTED_OBJECT', `Unsupported object at ${path}`);
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (FORBIDDEN.has(key)) throw storageError('SENSITIVE_KEY', `Sensitive key ${key} at ${path}`);
      Object.defineProperty(out, key, {
        value: cloneJson(value[key], { path: `${path}.${key}`, depth: depth + 1, seen }),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

function normalizeKey(value) {
  const key = String(value ?? 'session-config').trim();
  if (!KEY_PATTERN.test(key)) throw storageError('INVALID_KEY', `Invalid storage key: ${key}`);
  return key;
}

function assertRegistry(registry) {
  if (!registry || typeof registry.payload !== 'function' || typeof registry.importPayload !== 'function') {
    throw storageError('INVALID_REGISTRY', 'registry must expose payload() and importPayload()');
  }
  return registry;
}

function assertStorage(storage) {
  if (!storage || typeof storage !== 'object') throw storageError('INVALID_STORAGE', 'storage provider is required');
  const browserStorageLike = typeof storage.get === 'function' && typeof storage.set === 'function' && typeof storage.remove === 'function';
  const webStorageLike = typeof storage.getItem === 'function' && typeof storage.setItem === 'function' && typeof storage.removeItem === 'function';
  if (!browserStorageLike && !webStorageLike) throw storageError('INVALID_STORAGE', 'storage must expose get/set/remove or getItem/setItem/removeItem');
  return { provider: storage, kind: browserStorageLike ? 'browser-storage' : 'web-storage' };
}

function readProvider(adapter, key) {
  try {
    if (adapter.kind === 'browser-storage') {
      const value = adapter.provider.get(key, null);
      return { found: value != null, value };
    }
    const raw = adapter.provider.getItem(key);
    if (raw == null) return { found: false, value: null };
    return { found: true, value: JSON.parse(String(raw)) };
  } catch (cause) {
    throw storageError('READ_FAILED', `Unable to read session config storage key: ${key}`, cause);
  }
}

function writeProvider(adapter, key, value) {
  try {
    if (adapter.kind === 'browser-storage') {
      if (adapter.provider.set(key, value) !== true) throw storageError('WRITE_FAILED', `Storage provider rejected key: ${key}`);
      return true;
    }
    adapter.provider.setItem(key, JSON.stringify(value));
    return true;
  } catch (cause) {
    if (cause?.name === 'SessionConfigStorageError') throw cause;
    throw storageError('WRITE_FAILED', `Unable to write session config storage key: ${key}`, cause);
  }
}

function removeProvider(adapter, key) {
  try {
    if (adapter.kind === 'browser-storage') return adapter.provider.remove(key) === true;
    adapter.provider.removeItem(key);
    return true;
  } catch (cause) {
    throw storageError('REMOVE_FAILED', `Unable to remove session config storage key: ${key}`, cause);
  }
}

function validateEnvelope(value) {
  const envelope = cloneJson(value);
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) throw storageError('INVALID_ENVELOPE', 'Stored session config must be an object');
  if (envelope.type !== TYPE) throw storageError('UNSUPPORTED_TYPE', `Unsupported storage envelope type: ${String(envelope.type)}`);
  if (envelope.version !== VERSION) throw storageError('UNSUPPORTED_VERSION', `Unsupported storage envelope version: ${String(envelope.version)}`);
  if (!Number.isFinite(envelope.savedAt) || envelope.savedAt < 0) throw storageError('INVALID_SAVED_AT', 'Stored session config savedAt must be a finite timestamp');
  if (!envelope.payload || typeof envelope.payload !== 'object' || Array.isArray(envelope.payload)) throw storageError('INVALID_PAYLOAD', 'Stored session config payload must be an object');
  return envelope;
}

export class SessionConfigStorage {
  constructor({ registry, storage, key = 'session-config', autoSave = false, clock = () => Date.now(), onEvent = null } = {}) {
    this.registry = assertRegistry(registry);
    this.storage = assertStorage(storage);
    this.key = normalizeKey(key);
    this.clock = typeof clock === 'function' ? clock : () => Date.now();
    this.onEvent = typeof onEvent === 'function' ? onEvent : null;
    this.unsubscribe = null;
    this.suspendAutoSave = 0;
    this.lastSavedAt = null;
    this.lastLoadedAt = null;
    this.lastError = null;
    if (autoSave) this.startAutoSave();
  }

  #emit(type, result) {
    const event = { type, key: this.key, result: cloneJson(result) };
    try { this.onEvent?.(event); } catch {}
  }

  #failure(code, error, operation) {
    const result = { ok: false, code, operation, key: this.key, error: error?.message ?? String(error) };
    this.lastError = { code, operation, message: result.error };
    this.#emit('error', result);
    return result;
  }

  save({ referencesOnly = false } = {}) {
    try {
      const payload = cloneJson(this.registry.payload({ referencesOnly: Boolean(referencesOnly) }), { path: '$.payload' });
      const savedAt = Number(this.clock());
      if (!Number.isFinite(savedAt) || savedAt < 0) throw storageError('INVALID_CLOCK', 'clock() must return a finite non-negative timestamp');
      const envelope = { type: TYPE, version: VERSION, savedAt, payload };
      writeProvider(this.storage, this.key, envelope);
      this.lastSavedAt = savedAt;
      this.lastError = null;
      const result = { ok: true, operation: 'save', key: this.key, savedAt, referencesOnly: Boolean(referencesOnly) };
      this.#emit('save', result);
      return result;
    } catch (cause) {
      return this.#failure(cause?.code ?? 'SAVE_FAILED', cause, 'save');
    }
  }

  load({ replace = true } = {}) {
    try {
      const stored = readProvider(this.storage, this.key);
      if (!stored.found) {
        const result = { ok: false, code: 'NOT_FOUND', operation: 'load', key: this.key };
        this.#emit('miss', result);
        return result;
      }
      const envelope = validateEnvelope(stored.value);
      this.suspendAutoSave += 1;
      let imported;
      try {
        imported = this.registry.importPayload(cloneJson(envelope.payload), { replace: Boolean(replace) });
      } finally {
        this.suspendAutoSave -= 1;
      }
      const loadedAt = Number(this.clock());
      if (!Number.isFinite(loadedAt) || loadedAt < 0) throw storageError('INVALID_CLOCK', 'clock() must return a finite non-negative timestamp');
      this.lastLoadedAt = loadedAt;
      this.lastError = null;
      const result = {
        ok: true,
        operation: 'load',
        key: this.key,
        savedAt: envelope.savedAt,
        loadedAt,
        replace: Boolean(replace),
        entries: Array.isArray(imported) ? imported.length : null
      };
      this.#emit('load', result);
      return result;
    } catch (cause) {
      return this.#failure(cause?.code ?? 'LOAD_FAILED', cause, 'load');
    }
  }

  remove() {
    try {
      const removed = removeProvider(this.storage, this.key);
      this.lastError = null;
      const result = { ok: true, operation: 'remove', key: this.key, removed };
      this.#emit('remove', result);
      return result;
    } catch (cause) {
      return this.#failure(cause?.code ?? 'REMOVE_FAILED', cause, 'remove');
    }
  }

  startAutoSave() {
    if (this.unsubscribe) return false;
    if (typeof this.registry.subscribe !== 'function') throw storageError('AUTOSAVE_UNSUPPORTED', 'registry does not expose subscribe()');
    this.unsubscribe = this.registry.subscribe(() => {
      if (this.suspendAutoSave === 0) this.save();
    });
    this.#emit('autosave-start', { ok: true, key: this.key });
    return true;
  }

  stopAutoSave() {
    if (!this.unsubscribe) return false;
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    try { unsubscribe(); } catch {}
    this.#emit('autosave-stop', { ok: true, key: this.key });
    return true;
  }

  status() {
    return {
      key: this.key,
      provider: this.storage.kind,
      autoSave: Boolean(this.unsubscribe),
      lastSavedAt: this.lastSavedAt,
      lastLoadedAt: this.lastLoadedAt,
      lastError: this.lastError ? { ...this.lastError } : null
    };
  }

  destroy() {
    this.stopAutoSave();
    return true;
  }
}

export const SESSION_CONFIG_STORAGE_TYPE = TYPE;
export const SESSION_CONFIG_STORAGE_VERSION = VERSION;
