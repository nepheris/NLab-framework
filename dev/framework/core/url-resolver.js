export class URLResolver {
  constructor({ baseUrl = null, assetsBase = 'assets/', apiBase = null } = {}) {
    this.baseUrl = baseUrl ?? globalThis.location?.href ?? 'http://localhost/';
    this.assetsBase = assetsBase;
    this.apiBase = apiBase;
  }

  resolve(path = '', base = this.baseUrl) {
    return new URL(path, base).toString();
  }

  asset(path = '') {
    return this.resolve(path, this.resolve(this.assetsBase, this.baseUrl));
  }

  api(path = '') {
    if (!this.apiBase) return null;
    return this.resolve(path, this.resolve(this.apiBase, this.baseUrl));
  }

  current({ stripHash = false, stripQuery = false } = {}) {
    const url = new URL(globalThis.location?.href ?? this.baseUrl);
    if (stripHash) url.hash = '';
    if (stripQuery) url.search = '';
    return url.toString();
  }
}
