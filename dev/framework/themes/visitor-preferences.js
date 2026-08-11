export class VisitorPreferences {
  constructor({ allowed = {}, storage = null, storageKey = 'visitor-theme' } = {}) {
    this.allowed = allowed;
    this.storage = storage;
    this.storageKey = storageKey;
    this.values = storage?.get(storageKey, {}) ?? {};
  }

  set(key, value) {
    if (this.allowed[key] === false) throw new Error(`Preference not allowed: ${key}`);
    this.values[key] = value;
    this.storage?.set(this.storageKey, this.values);
    return this;
  }

  get(key, fallback = null) { return this.values[key] ?? fallback; }
  themePatch() {
    const patch = {};
    if (this.values.scheme) patch.scheme = this.values.scheme;
    if (this.values.density) patch.density = this.values.density;
    if (this.values.accent) patch.tokens = { ...(patch.tokens ?? {}), accent: this.values.accent };
    return patch;
  }
  reset() { this.values = {}; this.storage?.remove?.(this.storageKey); return this; }
}
