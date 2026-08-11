const FALLBACK_BASE = 'http://localhost/';
const text = (value) => value instanceof URL ? value.toString() : String(value ?? '');
const absolute = (value, fallback = FALLBACK_BASE) => new URL(text(value), text(fallback || FALLBACK_BASE)).toString();

export class URLResolver {
  constructor({ baseUrl = null, assetsBase = 'assets/', apiBase = null } = {}) {
    const runtimeBase = globalThis.location?.href ?? FALLBACK_BASE;
    this.baseUrl = absolute(baseUrl ?? runtimeBase, runtimeBase);
    this.assetsBase = assetsBase == null ? 'assets/' : text(assetsBase);
    this.apiBase = apiBase == null || apiBase === '' ? null : text(apiBase);
  }

  resolve(path = '', base = this.baseUrl) {
    const baseUrl = absolute(base ?? this.baseUrl, this.baseUrl);
    return new URL(text(path), baseUrl).toString();
  }

  asset(path = '') {
    return this.resolve(path, this.resolve(this.assetsBase, this.baseUrl));
  }

  api(path = '') {
    if (!this.apiBase) return null;
    return this.resolve(path, this.resolve(this.apiBase, this.baseUrl));
  }

  current({ stripHash = false, stripQuery = false } = {}) {
    let source = this.baseUrl;
    try {
      if (globalThis.location?.href) source = absolute(globalThis.location.href, this.baseUrl);
    } catch {
      source = this.baseUrl;
    }
    const url = new URL(source);
    if (stripHash) url.hash = '';
    if (stripQuery) url.search = '';
    return url.toString();
  }
}
