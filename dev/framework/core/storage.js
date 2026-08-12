function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export class BrowserStorage {
  constructor(storage = undefined, { prefix = 'nlab:' } = {}) {
    this.storage = storage === undefined ? defaultStorage() : storage;
    this.prefix = String(prefix ?? 'nlab:');
  }

  key(name) {
    return `${this.prefix}${String(name ?? '')}`;
  }

  get(name, fallback = null) {
    if (!this.storage || typeof this.storage.getItem !== 'function') return fallback;
    try {
      const raw = this.storage.getItem(this.key(name));
      if (raw == null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  set(name, value) {
    if (!this.storage || typeof this.storage.setItem !== 'function') return false;
    try {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) return false;
      this.storage.setItem(this.key(name), serialized);
      return true;
    } catch {
      return false;
    }
  }

  remove(name) {
    if (!this.storage || typeof this.storage.removeItem !== 'function') return false;
    try {
      this.storage.removeItem(this.key(name));
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    if (!this.storage) return;
    let length;
    try {
      length = Number(this.storage.length) || 0;
    } catch {
      return;
    }

    for (let i = length - 1; i >= 0; i -= 1) {
      let key;
      try {
        key = this.storage.key?.(i);
      } catch {
        continue;
      }
      if (!key?.startsWith(this.prefix)) continue;
      try {
        this.storage.removeItem?.(key);
      } catch {
        // Best-effort cleanup: continue with remaining namespace keys.
      }
    }
  }
}
