const ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const EXTENSION_PATTERN = /^[a-z0-9]+(?:[._+-][a-z0-9]+)*$/;
const MAX_ALIASES = 128;
const MAX_TEXT = 128;

const BUILTIN_FORMATS = Object.freeze([
  Object.freeze({ id: 'generic', label: 'Fichier', iconKey: 'file', category: 'file', extensions: Object.freeze([]), mimes: Object.freeze([]) }),
  Object.freeze({ id: 'folder', label: 'Dossier', iconKey: 'folder', category: 'folder', extensions: Object.freeze([]), mimes: Object.freeze([]) }),
  Object.freeze({ id: 'archive', label: 'Archive', iconKey: 'archive', category: 'archive', extensions: Object.freeze(['zip', '7z', 'rar', 'tar', 'tar.gz', 'tgz', 'gz', 'bz2']), mimes: Object.freeze(['application/zip', 'application/x-7z-compressed', 'application/vnd.rar', 'application/x-tar', 'application/gzip', 'application/x-bzip2']) }),
  Object.freeze({ id: 'svg', label: 'SVG', iconKey: 'svg', category: 'image', extensions: Object.freeze(['svg']), mimes: Object.freeze(['image/svg+xml']) }),
  Object.freeze({ id: 'image', label: 'Image', iconKey: 'image', category: 'image', extensions: Object.freeze(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'tif', 'tiff', 'ico']), mimes: Object.freeze(['image/*']) }),
  Object.freeze({ id: 'json', label: 'JSON', iconKey: 'json', category: 'data', extensions: Object.freeze(['json', 'jsonl', 'ndjson']), mimes: Object.freeze(['application/json', 'application/ld+json', 'application/x-ndjson']) }),
  Object.freeze({ id: 'javascript', label: 'JavaScript', iconKey: 'javascript', category: 'code', extensions: Object.freeze(['js', 'mjs', 'cjs']), mimes: Object.freeze(['text/javascript', 'application/javascript']) }),
  Object.freeze({ id: 'python', label: 'Python', iconKey: 'python', category: 'code', extensions: Object.freeze(['py', 'pyw']), mimes: Object.freeze(['text/x-python', 'application/x-python-code']) }),
  Object.freeze({ id: 'bash', label: 'Shell', iconKey: 'bash', category: 'code', extensions: Object.freeze(['sh', 'bash', 'zsh', 'ksh']), mimes: Object.freeze(['application/x-sh', 'text/x-shellscript']) }),
  Object.freeze({ id: 'html', label: 'HTML', iconKey: 'html', category: 'document', extensions: Object.freeze(['html', 'htm', 'xhtml']), mimes: Object.freeze(['text/html', 'application/xhtml+xml']) }),
  Object.freeze({ id: 'pdf', label: 'PDF', iconKey: 'pdf', category: 'document', extensions: Object.freeze(['pdf']), mimes: Object.freeze(['application/pdf']) }),
  Object.freeze({ id: 'word', label: 'Document', iconKey: 'document', category: 'document', extensions: Object.freeze(['doc', 'docx', 'odt']), mimes: Object.freeze(['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text']) }),
  Object.freeze({ id: 'spreadsheet', label: 'Tableur', iconKey: 'spreadsheet', category: 'data', extensions: Object.freeze(['csv', 'tsv', 'xls', 'xlsx', 'ods']), mimes: Object.freeze(['text/csv', 'text/tab-separated-values', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.oasis.opendocument.spreadsheet']) }),
  Object.freeze({ id: 'text', label: 'Texte', iconKey: 'text', category: 'document', extensions: Object.freeze(['txt', 'md', 'markdown', 'log']), mimes: Object.freeze(['text/plain', 'text/markdown']) })
]);

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      Object.defineProperty(out, key, { value: clone(entry), enumerable: true, configurable: true, writable: true });
    }
    return out;
  }
  return value;
}

function normalizeText(value, name) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${name} is required`);
  if (text.length > MAX_TEXT) throw new RangeError(`${name} exceeds ${MAX_TEXT} characters`);
  return text;
}

function normalizeId(value) {
  const id = normalizeText(value, 'format id').toLowerCase();
  if (!ID_PATTERN.test(id)) throw new TypeError(`Invalid format id: ${id}`);
  return id;
}

function normalizeExtension(value) {
  const extension = String(value ?? '').trim().toLowerCase().replace(/^\.+/, '');
  if (!extension || !EXTENSION_PATTERN.test(extension)) throw new TypeError(`Invalid file extension: ${String(value)}`);
  return extension;
}

function normalizeMime(value) {
  const mime = String(value ?? '').trim().toLowerCase().split(';', 1)[0].trim();
  if (!mime || !/^[a-z0-9!#$&^_.+-]+\/(?:\*|[a-z0-9!#$&^_.+-]+)$/.test(mime)) {
    throw new TypeError(`Invalid MIME type: ${String(value)}`);
  }
  return mime;
}

function normalizeAliases(value, normalizer) {
  if (value == null) return [];
  const source = Array.isArray(value) ? value : [value];
  if (source.length > MAX_ALIASES) throw new RangeError(`Format alias list exceeds ${MAX_ALIASES} items`);
  const result = [];
  const seen = new Set();
  for (const entry of source) {
    const normalized = normalizer(entry);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function normalizeDescriptor(input, { builtIn = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Format descriptor must be an object');
  return {
    id: normalizeId(input.id),
    label: normalizeText(input.label, 'format label'),
    iconKey: normalizeText(input.iconKey, 'format iconKey'),
    category: normalizeId(input.category ?? 'file'),
    extensions: normalizeAliases(input.extensions, normalizeExtension),
    mimes: normalizeAliases(input.mimes, normalizeMime),
    builtIn: Boolean(builtIn)
  };
}

function cleanFilename(value) {
  const source = String(value ?? '').trim().split(/[?#]/, 1)[0];
  const normalized = source.replace(/\\/g, '/');
  return normalized.slice(normalized.lastIndexOf('/') + 1).toLowerCase();
}

function normalizeInput(input) {
  if (typeof input === 'string') return { filename: input };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input;
}

export class FileFormatRegistry {
  constructor({ builtins = true, formats = [] } = {}) {
    this._formats = new Map();
    this._extensions = new Map();
    this._mimes = new Map();
    this._wildcardMimes = new Map();
    if (builtins) {
      for (const descriptor of BUILTIN_FORMATS) this._register(descriptor, { builtIn: true, replace: false });
    }
    for (const descriptor of Array.isArray(formats) ? formats : []) this.register(descriptor);
  }

  static builtins() {
    return BUILTIN_FORMATS.map((descriptor) => clone(normalizeDescriptor(descriptor, { builtIn: true })));
  }

  has(id) {
    try { return this._formats.has(normalizeId(id)); } catch { return false; }
  }

  get(id) {
    let key;
    try { key = normalizeId(id); } catch { return null; }
    const descriptor = this._formats.get(key);
    return descriptor ? clone(descriptor) : null;
  }

  list({ category = null } = {}) {
    let normalizedCategory = null;
    if (category != null) normalizedCategory = normalizeId(category);
    return [...this._formats.values()]
      .filter((descriptor) => normalizedCategory == null || descriptor.category === normalizedCategory)
      .map(clone);
  }

  register(descriptor, { replace = false } = {}) {
    return clone(this._register(descriptor, { replace: Boolean(replace), builtIn: false }));
  }

  _register(input, { replace, builtIn }) {
    const descriptor = normalizeDescriptor(input, { builtIn });
    const current = this._formats.get(descriptor.id);
    if (current && !replace) throw new Error(`Format already registered: ${descriptor.id}`);
    if (current?.builtIn && !builtIn) throw new Error(`Built-in format cannot be replaced: ${descriptor.id}`);

    for (const extension of descriptor.extensions) {
      const owner = this._extensions.get(extension);
      if (owner && owner !== descriptor.id && (!current || owner !== current.id)) throw new Error(`File extension already registered: ${extension}`);
    }
    for (const mime of descriptor.mimes) {
      const index = mime.endsWith('/*') ? this._wildcardMimes : this._mimes;
      const owner = index.get(mime);
      if (owner && owner !== descriptor.id && (!current || owner !== current.id)) throw new Error(`MIME type already registered: ${mime}`);
    }

    if (current) this._removeAliases(current);
    this._formats.set(descriptor.id, descriptor);
    for (const extension of descriptor.extensions) this._extensions.set(extension, descriptor.id);
    for (const mime of descriptor.mimes) {
      (mime.endsWith('/*') ? this._wildcardMimes : this._mimes).set(mime, descriptor.id);
    }
    return descriptor;
  }

  _removeAliases(descriptor) {
    for (const extension of descriptor.extensions) if (this._extensions.get(extension) === descriptor.id) this._extensions.delete(extension);
    for (const mime of descriptor.mimes) {
      const index = mime.endsWith('/*') ? this._wildcardMimes : this._mimes;
      if (index.get(mime) === descriptor.id) index.delete(mime);
    }
  }

  unregister(id) {
    const key = normalizeId(id);
    const descriptor = this._formats.get(key);
    if (!descriptor) return false;
    if (descriptor.builtIn) throw new Error(`Built-in format cannot be removed: ${key}`);
    this._removeAliases(descriptor);
    this._formats.delete(key);
    return true;
  }

  resolve(input, { fallback = 'generic' } = {}) {
    const value = normalizeInput(input);
    const explicit = value.format ?? value.formatId ?? value.type;
    if (explicit && this.has(explicit)) return this._resolved(this.get(explicit), 'explicit', normalizeId(explicit));

    const kind = String(value.kind ?? '').trim().toLowerCase();
    if (kind === 'folder' && this.has('folder')) return this._resolved(this.get('folder'), 'kind', 'folder');

    const mimeRaw = value.mime ?? value.contentType;
    if (mimeRaw) {
      let mime = null;
      try { mime = normalizeMime(mimeRaw); } catch { mime = null; }
      if (mime) {
        const exact = this._mimes.get(mime);
        if (exact) return this._resolved(this.get(exact), 'mime', mime);
        const slash = mime.indexOf('/');
        const wildcard = slash > 0 ? `${mime.slice(0, slash)}/*` : null;
        const wildcardOwner = wildcard ? this._wildcardMimes.get(wildcard) : null;
        if (wildcardOwner) return this._resolved(this.get(wildcardOwner), 'mime', wildcard);
      }
    }

    const explicitExtension = value.extension != null ? String(value.extension) : null;
    if (explicitExtension) {
      try {
        const extension = normalizeExtension(explicitExtension);
        const owner = this._extensions.get(extension);
        if (owner) return this._resolved(this.get(owner), 'extension', extension);
      } catch {
        // Fall through to filename/fallback.
      }
    }

    const filename = cleanFilename(value.filename ?? value.name ?? value.path);
    if (filename) {
      const extensions = [...this._extensions.keys()].sort((a, b) => b.length - a.length || a.localeCompare(b));
      for (const extension of extensions) {
        if (filename.endsWith(`.${extension}`)) return this._resolved(this.get(this._extensions.get(extension)), 'extension', extension);
      }
    }

    let fallbackId = 'generic';
    try { fallbackId = normalizeId(fallback); } catch { fallbackId = 'generic'; }
    const descriptor = this.get(fallbackId) ?? this.get('generic') ?? this.list()[0] ?? null;
    return descriptor ? this._resolved(descriptor, 'fallback', fallbackId) : null;
  }

  _resolved(descriptor, matchedBy, matchedValue) {
    return {
      ...clone(descriptor),
      matchedBy,
      matchedValue
    };
  }
}
