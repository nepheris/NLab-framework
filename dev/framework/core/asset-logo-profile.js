const TYPE = 'nlab.asset-logo-profile';
const VERSION = 1;
const VARIANTS = ['original', 'color-transparent', 'color-background', 'monochrome', 'favicon'];
const VARIANT_SET = new Set(VARIANTS);
const BACKGROUNDS = new Set(['light', 'dark']);
const SHAPES = new Set(['square', 'rounded']);
const IMAGE_MIME = /^image\/[a-z0-9.+-]+$/i;
const SENSITIVE = new Set(['__proto__', 'prototype', 'constructor']);

function fail(code, message) {
  const value = new Error(message);
  value.name = 'AssetLogoProfileError';
  value.code = code;
  throw value;
}

function cloneJson(value, seen = new Set(), path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('NON_FINITE_NUMBER', `Non-finite number at ${path}`);
    return value;
  }
  if (typeof value !== 'object') fail('UNSUPPORTED_VALUE', `Unsupported value at ${path}`);
  if (seen.has(value)) fail('CYCLE', `Cyclic value at ${path}`);
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((entry, index) => cloneJson(entry, seen, `${path}[${index}]`));
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) fail('UNSUPPORTED_OBJECT', `Unsupported object at ${path}`);
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (SENSITIVE.has(key)) fail('SENSITIVE_KEY', `Sensitive key ${key} at ${path}`);
      Object.defineProperty(out, key, {
        value: cloneJson(value[key], seen, `${path}.${key}`), enumerable: true, configurable: true, writable: true
      });
    }
    return out;
  } finally { seen.delete(value); }
}

function normalizeKind(value) {
  const kind = String(value ?? '').trim().toLowerCase();
  if (!VARIANT_SET.has(kind)) fail('INVALID_VARIANT', `Unsupported logo variant: ${kind}`);
  return kind;
}

function normalizeSource(value) {
  const source = String(value ?? '').trim();
  if (!source || source.length > 4096) fail('INVALID_SOURCE', 'Asset source is required');
  const compact = source.replace(/[\u0000-\u0020]+/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact)?.[1]?.toLowerCase() ?? null;
  if (scheme && !['http', 'https', 'data'].includes(scheme)) fail('UNSAFE_SOURCE', `Unsupported asset source scheme: ${scheme}`);
  if (scheme === 'data' && !/^data:image\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*(?:;base64)?,/i.test(compact)) {
    fail('UNSAFE_SOURCE', 'Only data:image sources are accepted');
  }
  return source;
}

function normalizeMime(value) {
  if (value == null || String(value).trim() === '') return null;
  const mime = String(value).trim().toLowerCase().split(';')[0];
  if (!IMAGE_MIME.test(mime)) fail('INVALID_MIME', `Invalid image MIME: ${mime}`);
  return mime;
}

function normalizeDimension(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0 || n > 32768) fail('INVALID_DIMENSION', `Invalid asset dimension: ${String(value)}`);
  return n;
}

function normalizeSizes(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) fail('INVALID_SIZES', 'sizes must be an array');
  return [...new Set(value.map((item) => normalizeDimension(item)))].sort((a, b) => a - b);
}

function normalizeVariant(kind, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('INVALID_DESCRIPTOR', 'Asset variant descriptor must be an object');
  const width = normalizeDimension(input.width);
  const height = normalizeDimension(input.height);
  const sizes = normalizeSizes(input.sizes);
  const descriptor = {
    kind,
    source: normalizeSource(input.source ?? input.url ?? input.path),
    mime: normalizeMime(input.mime),
    width,
    height,
    transparent: kind === 'color-transparent' ? true : Boolean(input.transparent),
    recolorable: kind === 'monochrome' ? true : Boolean(input.recolorable),
    background: input.background == null ? null : String(input.background),
    foreground: input.foreground == null ? null : String(input.foreground),
    sizes,
    metadata: input.metadata == null ? {} : cloneJson(input.metadata)
  };
  if (kind === 'color-background' && !descriptor.background) fail('BACKGROUND_REQUIRED', 'color-background variant requires background');
  if (kind === 'favicon' && !sizes.length && width == null && height == null) fail('FAVICON_SIZE_REQUIRED', 'favicon requires sizes or dimensions');
  return descriptor;
}

function cloneVariant(value) {
  return value ? { ...value, sizes: [...value.sizes], metadata: cloneJson(value.metadata) } : null;
}

function normalizeEnumList(value, allowed, fallback, code) {
  const input = value == null ? fallback : value;
  if (!Array.isArray(input)) fail(code, `${code.toLowerCase()} must be an array`);
  const out = [];
  for (const raw of input) {
    const key = String(raw).trim().toLowerCase();
    if (!allowed.has(key)) fail(code, `Unsupported value: ${key}`);
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

export class AssetLogoProfile {
  constructor({ id = 'logo', variants = {} } = {}) {
    this.id = String(id ?? '').trim() || 'logo';
    if (this.id.length > 160) fail('INVALID_ID', 'Profile id is too long');
    this._variants = new Map();
    if (!variants || typeof variants !== 'object' || Array.isArray(variants)) fail('INVALID_VARIANTS', 'variants must be an object');
    for (const [kind, descriptor] of Object.entries(variants)) this.setVariant(kind, descriptor);
  }

  static parse(input) {
    let payload;
    try { payload = typeof input === 'string' ? JSON.parse(input) : cloneJson(input); }
    catch (cause) {
      if (cause?.name === 'AssetLogoProfileError') throw cause;
      fail('INVALID_JSON', cause?.message ?? String(cause));
    }
    if (payload?.type !== TYPE) fail('UNSUPPORTED_TYPE', `Unsupported profile type: ${String(payload?.type)}`);
    if (payload?.version !== VERSION) fail('UNSUPPORTED_VERSION', `Unsupported profile version: ${String(payload?.version)}`);
    return new AssetLogoProfile({ id: payload.id, variants: payload.variants ?? {} });
  }

  setVariant(kind, descriptor) {
    const key = normalizeKind(kind);
    const value = normalizeVariant(key, descriptor);
    this._variants.set(key, value);
    return cloneVariant(value);
  }

  removeVariant(kind) {
    return this._variants.delete(normalizeKind(kind));
  }

  hasVariant(kind) {
    try { return this._variants.has(normalizeKind(kind)); } catch { return false; }
  }

  getVariant(kind) {
    let key;
    try { key = normalizeKind(kind); } catch { return null; }
    return cloneVariant(this._variants.get(key));
  }

  listVariants() {
    return VARIANTS.filter((kind) => this._variants.has(kind)).map((kind) => cloneVariant(this._variants.get(kind)));
  }

  previewMatrix({ variants = null, backgrounds = ['light', 'dark'], shapes = ['square', 'rounded'] } = {}) {
    const selected = variants == null
      ? VARIANTS.filter((kind) => this._variants.has(kind))
      : [...new Set(variants.map(normalizeKind))].filter((kind) => this._variants.has(kind));
    const bg = normalizeEnumList(backgrounds, BACKGROUNDS, ['light', 'dark'], 'INVALID_BACKGROUND');
    const shape = normalizeEnumList(shapes, SHAPES, ['square', 'rounded'], 'INVALID_SHAPE');
    const out = [];
    for (const kind of selected) {
      for (const background of bg) {
        for (const currentShape of shape) {
          out.push({
            id: `${kind}:${background}:${currentShape}`,
            variant: kind,
            background,
            shape: currentShape,
            asset: cloneVariant(this._variants.get(kind))
          });
        }
      }
    }
    return out;
  }

  audit() {
    const present = VARIANTS.filter((kind) => this._variants.has(kind));
    const missing = VARIANTS.filter((kind) => !this._variants.has(kind));
    const warnings = [];
    if (!this._variants.has('original')) warnings.push({ code: 'MISSING_ORIGINAL', variant: 'original' });
    const mono = this._variants.get('monochrome');
    if (mono && !mono.recolorable) warnings.push({ code: 'MONOCHROME_NOT_RECOLORABLE', variant: 'monochrome' });
    const favicon = this._variants.get('favicon');
    if (favicon && !favicon.sizes.length && favicon.width == null && favicon.height == null) warnings.push({ code: 'FAVICON_SIZE_UNKNOWN', variant: 'favicon' });
    return {
      complete: missing.length === 0,
      usable: this._variants.has('original'),
      present,
      missing,
      warnings
    };
  }

  snapshot() {
    return {
      id: this.id,
      variants: Object.fromEntries(this.listVariants().map((item) => [item.kind, item]))
    };
  }

  toJSON() {
    return { type: TYPE, version: VERSION, ...this.snapshot() };
  }

  serialize({ indent = 2 } = {}) {
    const safe = Math.max(0, Math.min(8, Math.floor(Number(indent) || 0)));
    return JSON.stringify(this.toJSON(), null, safe);
  }
}

export const ASSET_LOGO_VARIANTS = Object.freeze([...VARIANTS]);
export const ASSET_LOGO_PREVIEW_BACKGROUNDS = Object.freeze([...BACKGROUNDS]);
export const ASSET_LOGO_PREVIEW_SHAPES = Object.freeze([...SHAPES]);
export const ASSET_LOGO_PROFILE_TYPE = TYPE;
export const ASSET_LOGO_PROFILE_VERSION = VERSION;
