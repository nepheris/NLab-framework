function normalizeKey(value, label) {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

export class FrameworkRegistry {
  constructor() {
    this.namespaces = new Map();
  }

  namespace(name) {
    const key = normalizeKey(name, 'namespace');
    if (!this.namespaces.has(key)) this.namespaces.set(key, new Map());
    return this.namespaces.get(key);
  }

  register(namespace, id, value, { replace = false } = {}) {
    const namespaceKey = normalizeKey(namespace, 'namespace');
    const idKey = normalizeKey(id, 'id');
    const bucket = this.namespace(namespaceKey);
    if (!replace && bucket.has(idKey)) throw new Error(`Registry entry already exists: ${namespaceKey}/${idKey}`);
    bucket.set(idKey, value);
    return value;
  }

  get(namespace, id, fallback = null) {
    const namespaceKey = normalizeKey(namespace, 'namespace');
    const idKey = normalizeKey(id, 'id');
    const bucket = this.namespaces.get(namespaceKey);
    if (!bucket || !bucket.has(idKey)) return fallback;
    return bucket.get(idKey);
  }

  has(namespace, id) {
    const namespaceKey = normalizeKey(namespace, 'namespace');
    const idKey = normalizeKey(id, 'id');
    return this.namespaces.get(namespaceKey)?.has(idKey) ?? false;
  }

  remove(namespace, id) {
    const namespaceKey = normalizeKey(namespace, 'namespace');
    const idKey = normalizeKey(id, 'id');
    const bucket = this.namespaces.get(namespaceKey);
    if (!bucket) return false;
    const removed = bucket.delete(idKey);
    if (!bucket.size) this.namespaces.delete(namespaceKey);
    return removed;
  }

  list(namespace) {
    const namespaceKey = normalizeKey(namespace, 'namespace');
    const bucket = this.namespaces.get(namespaceKey);
    if (!bucket) return [];
    return [...bucket.entries()].map(([id, value]) => ({ id, value }));
  }

  namespaceNames() {
    return [...this.namespaces.keys()];
  }

  size(namespace = null) {
    if (namespace == null) {
      let total = 0;
      for (const bucket of this.namespaces.values()) total += bucket.size;
      return total;
    }
    return this.namespaces.get(normalizeKey(namespace, 'namespace'))?.size ?? 0;
  }

  clear(namespace = null) {
    if (namespace == null) {
      const count = this.size();
      this.namespaces.clear();
      return count;
    }
    const namespaceKey = normalizeKey(namespace, 'namespace');
    const count = this.namespaces.get(namespaceKey)?.size ?? 0;
    this.namespaces.delete(namespaceKey);
    return count;
  }
}

export const REGISTRY_NAMESPACES = Object.freeze([
  'services', 'components', 'wiz', 'providers', 'adapters', 'renderers', 'icons', 'themes', 'help'
]);
