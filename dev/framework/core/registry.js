export class FrameworkRegistry {
  constructor() {
    this.namespaces = new Map();
  }

  namespace(name) {
    if (!this.namespaces.has(name)) this.namespaces.set(name, new Map());
    return this.namespaces.get(name);
  }

  register(namespace, id, value, { replace = false } = {}) {
    const bucket = this.namespace(namespace);
    if (!replace && bucket.has(id)) throw new Error(`Registry entry already exists: ${namespace}/${id}`);
    bucket.set(id, value);
    return value;
  }

  get(namespace, id, fallback = null) {
    return this.namespace(namespace).get(id) ?? fallback;
  }

  has(namespace, id) { return this.namespace(namespace).has(id); }
  remove(namespace, id) { return this.namespace(namespace).delete(id); }
  list(namespace) { return [...this.namespace(namespace).entries()].map(([id, value]) => ({ id, value })); }
  clear(namespace = null) { if (namespace) this.namespaces.delete(namespace); else this.namespaces.clear(); }
}

export const REGISTRY_NAMESPACES = Object.freeze([
  'services', 'components', 'wiz', 'providers', 'adapters', 'renderers', 'icons', 'themes', 'help'
]);
