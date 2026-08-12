import assert from 'node:assert/strict';
import {
  SessionConfigStorage,
  SESSION_CONFIG_STORAGE_TYPE,
  SESSION_CONFIG_STORAGE_VERSION
} from '../core/session-config-storage.js';

class Registry {
  constructor() { this.modules = {}; this.listeners = new Set(); }
  payload({ referencesOnly = false } = {}) {
    const modules = Object.fromEntries(Object.entries(this.modules).filter(([, value]) => !referencesOnly || value.reference));
    return { schema: 'nlab.session-config', version: 1, exportedAt: 1, modules };
  }
  importPayload(payload, { replace = false } = {}) {
    if (payload.schema !== 'nlab.session-config') throw Object.assign(new Error('bad schema'), { code: 'INVALID_SCHEMA' });
    if (replace) this.modules = {};
    Object.assign(this.modules, payload.modules);
    this.emit('import');
    return Object.keys(this.modules);
  }
  publish(key, config, reference = true) {
    this.modules[key] = { config, reference };
    this.emit('publish');
  }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(type) { for (const listener of [...this.listeners]) listener({ type }); }
}

class BrowserLike {
  constructor() { this.map = new Map(); }
  get(key, fallback = null) { return this.map.has(key) ? structuredClone(this.map.get(key)) : fallback; }
  set(key, value) { this.map.set(key, structuredClone(value)); return true; }
  remove(key) { return this.map.delete(key); }
}

let now = 100;
const events = [];
const registry = new Registry();
const storage = new BrowserLike();
const adapter = new SessionConfigStorage({ registry, storage, key: 'review.session', clock: () => ++now, onEvent: (event) => events.push(event.type) });
registry.publish('theme.main', { mode: 'dark' }, true);
registry.publish('draft.qr', { color: '#000' }, false);
const saved = adapter.save({ referencesOnly: true });
assert.equal(saved.ok, true);
assert.equal(saved.savedAt, 101);
const raw = storage.get('review.session');
assert.equal(raw.type, SESSION_CONFIG_STORAGE_TYPE);
assert.equal(raw.version, SESSION_CONFIG_STORAGE_VERSION);
assert.deepEqual(Object.keys(raw.payload.modules), ['theme.main']);

registry.modules = {};
const loaded = adapter.load();
assert.equal(loaded.ok, true);
assert.equal(loaded.savedAt, 101);
assert.equal(loaded.loadedAt, 102);
assert.deepEqual(Object.keys(registry.modules), ['theme.main']);
assert.equal(adapter.status().provider, 'browser-storage');
assert.equal(adapter.status().lastSavedAt, 101);
assert.equal(adapter.status().lastLoadedAt, 102);

const missing = new SessionConfigStorage({ registry: new Registry(), storage: new BrowserLike() });
assert.equal(missing.load().code, 'NOT_FOUND');

assert.equal(adapter.startAutoSave(), true);
assert.equal(adapter.startAutoSave(), false);
registry.publish('search', { min: 2 }, true);
assert.equal(adapter.status().autoSave, true);
assert.equal(storage.get('review.session').payload.modules.search.config.min, 2);
assert.equal(adapter.stopAutoSave(), true);
assert.equal(adapter.stopAutoSave(), false);

// Loading while auto-save is active must not rewrite the stored envelope.
adapter.startAutoSave();
const beforeReload = storage.get('review.session').savedAt;
const reloadResult = adapter.load();
assert.equal(reloadResult.ok, true);
assert.equal(storage.get('review.session').savedAt, beforeReload);
adapter.stopAutoSave();

const web = new Map();
const webStorage = {
  getItem(key) { return web.has(key) ? web.get(key) : null; },
  setItem(key, value) { web.set(key, value); },
  removeItem(key) { web.delete(key); }
};
const webRegistry = new Registry();
webRegistry.publish('x', { n: 1 }, true);
const webAdapter = new SessionConfigStorage({ registry: webRegistry, storage: webStorage, key: 'raw' });
assert.equal(webAdapter.save().ok, true);
webRegistry.modules = {};
assert.equal(webAdapter.load().ok, true);
assert.equal(webRegistry.modules.x.config.n, 1);
assert.equal(webAdapter.status().provider, 'web-storage');
assert.equal(webAdapter.remove().ok, true);
assert.equal(web.has('raw'), false);

storage.set('review.session', { type: 'other', version: 1, savedAt: 1, payload: {} });
assert.equal(adapter.load().code, 'UNSUPPORTED_TYPE');
storage.set('review.session', { type: SESSION_CONFIG_STORAGE_TYPE, version: 2, savedAt: 1, payload: {} });
assert.equal(adapter.load().code, 'UNSUPPORTED_VERSION');
storage.set('review.session', { type: SESSION_CONFIG_STORAGE_TYPE, version: 1, savedAt: 1, payload: { schema: 'bad' } });
assert.equal(adapter.load().code, 'INVALID_SCHEMA');
assert.equal(adapter.status().lastError.code, 'INVALID_SCHEMA');

const rejecting = { get(){ return null; }, set(){ return false; }, remove(){ return false; } };
const rejectAdapter = new SessionConfigStorage({ registry: new Registry(), storage: rejecting });
assert.equal(rejectAdapter.save().code, 'WRITE_FAILED');

assert.throws(() => new SessionConfigStorage({ registry: {}, storage }), (error) => error.code === 'INVALID_REGISTRY');
assert.throws(() => new SessionConfigStorage({ registry, storage: {} }), (error) => error.code === 'INVALID_STORAGE');
assert.throws(() => new SessionConfigStorage({ registry, storage, key: 'bad key' }), (error) => error.code === 'INVALID_KEY');
const noSubscribe = { payload: () => ({ schema: 'nlab.session-config', version: 1, modules: {} }), importPayload: () => [] };
assert.throws(() => new SessionConfigStorage({ registry: noSubscribe, storage, autoSave: true }), (error) => error.code === 'AUTOSAVE_UNSUPPORTED');

assert.ok(events.includes('save'));
assert.ok(events.includes('load'));
assert.ok(events.includes('autosave-start'));
console.log('session config storage tests: ok');
