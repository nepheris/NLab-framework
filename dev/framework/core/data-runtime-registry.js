export class DataRuntimeRegistry {
  constructor() {
    this.providers = new Map();
    this.adapters = new Map();
  }

  registerProvider(type, factory) {
    if (!type || typeof factory !== 'function') throw new Error('Provider type and factory are required');
    this.providers.set(type, factory);
    return this;
  }

  registerAdapter(type, factory) {
    if (!type || typeof factory !== 'function') throw new Error('Adapter type and factory are required');
    this.adapters.set(type, factory);
    return this;
  }

  createProvider(type, options = {}) {
    const factory = this.providers.get(type);
    if (!factory) throw new Error(`Unknown provider type: ${type}`);
    return factory(options);
  }

  createAdapter(type, options = {}) {
    const factory = this.adapters.get(type);
    if (!factory) throw new Error(`Unknown adapter type: ${type}`);
    return factory(options);
  }

  listProviders() { return [...this.providers.keys()]; }
  listAdapters() { return [...this.adapters.keys()]; }
}
