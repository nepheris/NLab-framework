const BLOCKED_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

const clone = (value) => {
  if (value === undefined) return undefined;
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parsePath(path) {
  if (typeof path !== 'string' || !path.trim()) throw new Error('state path must be a non-empty string');
  const segments = path.split('.');
  if (segments.some((segment) => !segment)) throw new Error(`invalid state path: ${path}`);
  for (const segment of segments) {
    if (BLOCKED_PATH_SEGMENTS.has(segment)) throw new Error(`unsafe state path segment: ${segment}`);
  }
  return segments;
}

function readPath(source, segments) {
  return segments.reduce((acc, key) => acc?.[key], source);
}

function deepMerge(base, override) {
  if (!isRecord(base) || !isRecord(override)) return clone(override);
  const output = clone(base);
  for (const [key, value] of Object.entries(override)) {
    if (BLOCKED_PATH_SEGMENTS.has(key)) continue;
    output[key] = isRecord(output[key]) && isRecord(value)
      ? deepMerge(output[key], value)
      : clone(value);
  }
  return output;
}

export class StateStore {
  constructor(initialState = {}, { storage = null, storageKey = null } = {}) {
    if (!isRecord(initialState)) throw new TypeError('initialState must be an object');
    this.defaults = clone(initialState);
    this.state = clone(initialState);
    this.storage = storage;
    this.storageKey = storageKey;
    this.listeners = new Map();
    this.#hydrate();
  }

  get(path = null, fallback = undefined) {
    if (path == null || path === '') return clone(this.state);
    let segments;
    try {
      segments = parsePath(path);
    } catch {
      return fallback;
    }
    const value = readPath(this.state, segments);
    return value === undefined ? fallback : clone(value);
  }

  set(path, value, { persist = true } = {}) {
    const segments = parsePath(path);
    this.#write(segments, clone(value));
    this.#notify(path);
    if (persist) this.#persist();
    return this.get(path);
  }

  update(path, updater, options = {}) {
    if (typeof updater !== 'function') throw new Error('updater must be a function');
    return this.set(path, updater(this.get(path)), options);
  }

  reset(path = null, { persist = true } = {}) {
    if (path == null || path === '') {
      this.state = clone(this.defaults);
      this.#notify('*');
      if (persist) this.#persist();
      return this.get();
    }

    const segments = parsePath(path);
    const defaultValue = readPath(this.defaults, segments);
    if (defaultValue === undefined) this.#delete(segments);
    else this.#write(segments, clone(defaultValue));
    this.#notify(path);
    if (persist) this.#persist();
    return this.get(path);
  }

  subscribe(path, listener) {
    if (typeof listener !== 'function') throw new Error('listener must be a function');
    const key = path === '*' ? '*' : parsePath(path).join('.');
    const set = this.listeners.get(key) ?? new Set();
    set.add(listener);
    this.listeners.set(key, set);
    return () => {
      set.delete(listener);
      if (!set.size) this.listeners.delete(key);
    };
  }

  #write(segments, value) {
    let cursor = this.state;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const key = segments[index];
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[segments.at(-1)] = value;
  }

  #delete(segments) {
    let cursor = this.state;
    for (let index = 0; index < segments.length - 1; index += 1) {
      cursor = cursor?.[segments[index]];
      if (!cursor || typeof cursor !== 'object') return false;
    }
    if (!cursor || typeof cursor !== 'object') return false;
    return delete cursor[segments.at(-1)];
  }

  #notify(path) {
    const calls = new Set([
      ...(this.listeners.get(path) ?? []),
      ...(this.listeners.get('*') ?? [])
    ]);
    const current = path === '*' ? this.get() : this.get(path);
    const snapshot = this.get();
    for (const listener of calls) {
      try {
        listener(clone(current), path, clone(snapshot));
      } catch {
        // One consumer must not prevent other listeners or persistence.
      }
    }
  }

  #hydrate() {
    if (!this.storage || !this.storageKey || typeof this.storage.get !== 'function') return;
    try {
      const saved = this.storage.get(this.storageKey, null);
      if (isRecord(saved)) this.state = deepMerge(this.state, saved);
    } catch {
      // Storage is optional; defaults remain authoritative on provider failure.
    }
  }

  #persist() {
    if (!this.storage || !this.storageKey || typeof this.storage.set !== 'function') return false;
    try {
      return this.storage.set(this.storageKey, this.state) !== false;
    } catch {
      return false;
    }
  }
}
