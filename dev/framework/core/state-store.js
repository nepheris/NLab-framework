const clone = (value) => value === undefined ? undefined : structuredClone(value);

export class StateStore {
  constructor(initialState = {}, { storage = null, storageKey = null } = {}) {
    this.defaults = clone(initialState) ?? {};
    this.state = clone(initialState) ?? {};
    this.storage = storage;
    this.storageKey = storageKey;
    this.listeners = new Map();
    this.#hydrate();
  }

  get(path = null, fallback = undefined) {
    if (!path) return clone(this.state);
    const value = path.split('.').reduce((acc, key) => acc?.[key], this.state);
    return value === undefined ? fallback : clone(value);
  }

  set(path, value, { persist = true } = {}) {
    const keys = path.split('.');
    const last = keys.pop();
    let cursor = this.state;
    for (const key of keys) cursor = cursor[key] ??= {};
    cursor[last] = clone(value);
    this.#notify(path);
    if (persist) this.#persist();
    return this.get(path);
  }

  update(path, updater, options = {}) {
    if (typeof updater !== 'function') throw new Error('updater must be a function');
    return this.set(path, updater(this.get(path)), options);
  }

  reset(path = null, { persist = true } = {}) {
    if (!path) this.state = clone(this.defaults);
    else this.set(path, path.split('.').reduce((acc, key) => acc?.[key], this.defaults), { persist: false });
    this.#notify(path ?? '*');
    if (persist) this.#persist();
  }

  subscribe(path, listener) {
    if (typeof listener !== 'function') throw new Error('listener must be a function');
    const set = this.listeners.get(path) ?? new Set();
    set.add(listener); this.listeners.set(path, set);
    return () => { set.delete(listener); if (!set.size) this.listeners.delete(path); };
  }

  #notify(path) {
    const calls = new Set([...(this.listeners.get(path) ?? []), ...(this.listeners.get('*') ?? [])]);
    for (const listener of calls) listener(this.get(path === '*' ? null : path), path, this.get());
  }

  #hydrate() {
    if (!this.storage || !this.storageKey) return;
    const saved = this.storage.get(this.storageKey, null);
    if (saved && typeof saved === 'object') this.state = { ...this.state, ...saved };
  }

  #persist() {
    if (this.storage && this.storageKey) this.storage.set(this.storageKey, this.state);
  }
}
