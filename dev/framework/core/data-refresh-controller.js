const clone = (value) => value === undefined ? undefined : structuredClone(value);
const text = (value) => String(value ?? '').trim();

export class DataRefreshError extends Error {
  constructor(message, code = 'DATA_REFRESH_ERROR', details = null) {
    super(message);
    this.name = 'DataRefreshError';
    this.code = code;
    this.details = details;
  }
}

function collectionName(value) {
  const name = text(value);
  if (!name) throw new DataRefreshError('collectionName is required', 'COLLECTION_REQUIRED');
  return name;
}

function fingerprint(value) {
  const seen = new WeakSet();
  const normalize = (entry) => {
    if (entry === null || typeof entry !== 'object') return entry;
    if (seen.has(entry)) throw new DataRefreshError('Cyclic data cannot be fingerprinted', 'CYCLIC_DATA');
    seen.add(entry);
    if (Array.isArray(entry)) return entry.map(normalize);
    const out = {};
    for (const key of Object.keys(entry).sort()) out[key] = normalize(entry[key]);
    return out;
  };
  return JSON.stringify(normalize(value));
}

export class DataRefreshController {
  constructor({ provider, clock = () => Date.now(), fingerprintFn = fingerprint, onChange = null } = {}) {
    if (!provider || typeof provider.getCollection !== 'function') {
      throw new DataRefreshError('provider.getCollection() is required', 'PROVIDER_REQUIRED');
    }
    this.provider = provider;
    this.clock = typeof clock === 'function' ? clock : () => Date.now();
    this.fingerprintFn = typeof fingerprintFn === 'function' ? fingerprintFn : fingerprint;
    this.listeners = new Set();
    if (typeof onChange === 'function') this.listeners.add(onChange);
    this.states = new Map();
    this.inflight = new Map();
    this.epochs = new Map();
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new DataRefreshError('listener must be a function', 'INVALID_LISTENER');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  status(name) {
    const key = collectionName(name);
    return clone(this.states.get(key) ?? this.#initialState(key));
  }

  listStatus() {
    return [...this.states.keys()].sort().map((name) => this.status(name));
  }

  invalidate(name, { reason = 'external-change', clearProviderCache = true } = {}) {
    const key = collectionName(name);
    const epoch = (this.epochs.get(key) ?? 0) + 1;
    this.epochs.set(key, epoch);
    if (clearProviderCache && typeof this.provider.clearCache === 'function') this.provider.clearCache(key);
    const current = this.states.get(key) ?? this.#initialState(key);
    const next = { ...current, stale: true, invalidatedAt: this.clock(), invalidationReason: text(reason) || 'external-change', epoch };
    this.states.set(key, next);
    this.#emit('invalidate', key, next);
    return clone(next);
  }

  async refresh(name, { reason = 'manual', force = true, coalesce = true } = {}) {
    const key = collectionName(name);
    if (coalesce && this.inflight.has(key)) return this.inflight.get(key);
    const epoch = this.epochs.get(key) ?? 0;
    const current = this.states.get(key) ?? this.#initialState(key);
    const loading = { ...current, loading: true, error: null, lastAttemptAt: this.clock(), lastReason: text(reason) || 'manual', epoch };
    this.states.set(key, loading);
    this.#emit('loading', key, loading);

    let task;
    task = (async () => {
      try {
        const records = await this.provider.getCollection(key, { refresh: Boolean(force) });
        if (!Array.isArray(records)) throw new DataRefreshError('Provider collection result must be an array', 'INVALID_COLLECTION_RESULT', { collectionName: key });
        const resultFingerprint = this.fingerprintFn(records);
        const now = this.clock();
        const currentEpoch = this.epochs.get(key) ?? 0;
        const previous = this.states.get(key) ?? loading;
        const superseded = currentEpoch !== epoch;
        const changed = previous.fingerprint == null || previous.fingerprint !== resultFingerprint;
        const revision = changed ? (previous.revision ?? 0) + 1 : (previous.revision ?? 0);
        const next = {
          ...previous,
          loading: false,
          stale: superseded,
          error: null,
          fingerprint: resultFingerprint,
          revision,
          size: records.length,
          changed,
          superseded,
          updatedAt: superseded ? previous.updatedAt : now,
          lastSuccessAt: now,
          epoch: currentEpoch,
          data: clone(records)
        };
        this.states.set(key, next);
        this.#emit(superseded ? 'superseded' : 'ready', key, next);
        return clone(next);
      } catch (error) {
        const currentEpoch = this.epochs.get(key) ?? epoch;
        const previous = this.states.get(key) ?? loading;
        const normalized = error instanceof DataRefreshError ? error : new DataRefreshError(error?.message ?? String(error), 'REFRESH_FAILED', { cause: error });
        const next = {
          ...previous,
          loading: false,
          stale: true,
          error: { name: normalized.name, code: normalized.code, message: normalized.message },
          lastFailureAt: this.clock(),
          epoch: currentEpoch
        };
        this.states.set(key, next);
        this.#emit('error', key, next);
        throw normalized;
      } finally {
        if (this.inflight.get(key) === task) this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, task);
    return task;
  }

  async refreshAll(names = null, options = {}) {
    const source = names == null ? (await this.provider.listCollections?.() ?? []) : names;
    if (!Array.isArray(source)) throw new DataRefreshError('names must be an array', 'INVALID_COLLECTION_LIST');
    const unique = [...new Set(source.map(collectionName))];
    const settled = await Promise.allSettled(unique.map((name) => this.refresh(name, options)));
    return settled.map((result, index) => result.status === 'fulfilled'
      ? { name: unique[index], ok: true, status: result.value }
      : { name: unique[index], ok: false, error: { code: result.reason?.code ?? 'REFRESH_FAILED', message: result.reason?.message ?? String(result.reason) } });
  }

  data(name, fallback = null) {
    const state = this.status(name);
    return state.data == null ? clone(fallback) : clone(state.data);
  }

  clear(name = null) {
    if (name == null) {
      this.states.clear();
      this.epochs.clear();
      if (typeof this.provider.clearCache === 'function') this.provider.clearCache();
      this.#emit('clear-all', null, null);
      return;
    }
    const key = collectionName(name);
    this.states.delete(key);
    this.epochs.delete(key);
    if (typeof this.provider.clearCache === 'function') this.provider.clearCache(key);
    this.#emit('clear', key, null);
  }

  #initialState(name) {
    return { name, loading: false, stale: true, revision: 0, size: 0, fingerprint: null, changed: false, superseded: false, error: null, data: null, epoch: this.epochs.get(name) ?? 0, updatedAt: null, invalidatedAt: null, invalidationReason: null, lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastReason: null };
  }

  #emit(type, name, state) {
    const event = { type, name, status: state == null ? null : clone(state) };
    for (const listener of [...this.listeners]) listener(clone(event));
  }
}
