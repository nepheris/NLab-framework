function normalizeType(type, label = 'type') {
  if (typeof type !== 'string' || !type.trim()) throw new Error(`${label} is required`);
  return type.trim();
}

function normalizeOptions(options) {
  if (options == null) return {};
  if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('factory options must be an object');
  return { ...options };
}

export class DataRuntimeRegistry {
  constructor() {
    this.providers = new Map();
    this.adapters = new Map();
  }

  registerProvider(type, factory, { replace = false } = {}) {
    const key = normalizeType(type, 'Provider type');
    if (typeof factory !== 'function') throw new Error('Provider factory is required');
    if (!replace && this.providers.has(key)) throw new Error(`Provider type already registered: ${key}`);
    this.providers.set(key, factory);
    return this;
  }

  registerAdapter(type, factory, { replace = false } = {}) {
    const key = normalizeType(type, 'Adapter type');
    if (typeof factory !== 'function') throw new Error('Adapter factory is required');
    if (!replace && this.adapters.has(key)) throw new Error(`Adapter type already registered: ${key}`);
    this.adapters.set(key, factory);
    return this;
  }

  createProvider(type, options = {}) {
    const key = normalizeType(type, 'Provider type');
    const factory = this.providers.get(key);
    if (!factory) throw new Error(`Unknown provider type: ${key}`);
    return factory(normalizeOptions(options));
  }

  createAdapter(type, options = {}) {
    const key = normalizeType(type, 'Adapter type');
    const factory = this.adapters.get(key);
    if (!factory) throw new Error(`Unknown adapter type: ${key}`);
    return factory(normalizeOptions(options));
  }

  hasProvider(type) {
    return this.providers.has(normalizeType(type, 'Provider type'));
  }

  hasAdapter(type) {
    return this.adapters.has(normalizeType(type, 'Adapter type'));
  }

  unregisterProvider(type) {
    return this.providers.delete(normalizeType(type, 'Provider type'));
  }

  unregisterAdapter(type) {
    return this.adapters.delete(normalizeType(type, 'Adapter type'));
  }

  listProviders() { return [...this.providers.keys()]; }
  listAdapters() { return [...this.adapters.keys()]; }

  size(kind = null) {
    if (kind == null) return this.providers.size + this.adapters.size;
    const normalized = String(kind).trim().toLowerCase();
    if (['provider', 'providers'].includes(normalized)) return this.providers.size;
    if (['adapter', 'adapters'].includes(normalized)) return this.adapters.size;
    throw new Error(`Unknown registry kind: ${kind}`);
  }

  clear(kind = null) {
    if (kind == null) {
      const count = this.size();
      this.providers.clear();
      this.adapters.clear();
      return count;
    }
    const normalized = String(kind).trim().toLowerCase();
    if (['provider', 'providers'].includes(normalized)) {
      const count = this.providers.size;
      this.providers.clear();
      return count;
    }
    if (['adapter', 'adapters'].includes(normalized)) {
      const count = this.adapters.size;
      this.adapters.clear();
      return count;
    }
    throw new Error(`Unknown registry kind: ${kind}`);
  }
}
