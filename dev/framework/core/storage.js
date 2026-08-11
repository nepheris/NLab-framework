export class BrowserStorage {
  constructor(storage = globalThis.localStorage ?? null, { prefix = 'nlab:' } = {}) {
    this.storage = storage;
    this.prefix = prefix;
  }

  key(name) { return `${this.prefix}${name}`; }

  get(name, fallback = null) {
    if (!this.storage) return fallback;
    const raw = this.storage.getItem(this.key(name));
    if (raw == null) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  set(name, value) {
    if (!this.storage) return false;
    this.storage.setItem(this.key(name), JSON.stringify(value));
    return true;
  }

  remove(name) { if (!this.storage) return false; this.storage.removeItem(this.key(name)); return true; }
  clear() {
    if (!this.storage) return;
    for (let i = this.storage.length - 1; i >= 0; i -= 1) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.prefix)) this.storage.removeItem(key);
    }
  }
}
