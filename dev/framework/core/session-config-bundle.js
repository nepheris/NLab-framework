const TYPE = 'nlab.session-config-bundle';
const VERSION = 1;
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const SENSITIVE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_DEPTH = 64;
const MAX_ENTRIES = 512;
const MAX_ID_LENGTH = 160;
const MAX_LABEL_LENGTH = 512;

function fail(code, message) {
  const error = new Error(message);
  error.name = 'SessionConfigBundleError';
  error.code = code;
  throw error;
}

function normalizeId(value, label, { nullable = false } = {}) {
  if (value == null || String(value).trim() === '') {
    if (nullable) return null;
    fail('INVALID_ID', `${label} is required`);
  }
  const text = String(value).trim().toLowerCase();
  if (text.length > MAX_ID_LENGTH || !ID_PATTERN.test(text)) {
    fail('INVALID_ID', `Invalid ${label}: ${String(value)}`);
  }
  return text;
}

function normalizeLabel(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > MAX_LABEL_LENGTH) fail('INVALID_LABEL', `Label exceeds ${MAX_LABEL_LENGTH} characters`);
  return text;
}

function cloneJson(value, { path = '$', depth = 0, seen = new Set() } = {}) {
  if (depth > MAX_DEPTH) fail('MAX_DEPTH', `JSON value exceeds depth ${MAX_DEPTH} at ${path}`);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('NON_FINITE_NUMBER', `Non-finite number at ${path}`);
    return value;
  }
  if (typeof value !== 'object') fail('UNSUPPORTED_VALUE', `Unsupported JSON value at ${path}`);
  if (seen.has(value)) fail('CYCLE', `Cyclic JSON value at ${path}`);
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return value.map((entry, index) => cloneJson(entry, {
        path: `${path}[${index}]`, depth: depth + 1, seen
      }));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      fail('UNSUPPORTED_OBJECT', `Unsupported object prototype at ${path}`);
    }

    const output = {};
    for (const key of Object.keys(value).sort()) {
      if (SENSITIVE_KEYS.has(key)) fail('SENSITIVE_KEY', `Sensitive key ${key} at ${path}`);
      Object.defineProperty(output, key, {
        value: cloneJson(value[key], { path: `${path}.${key}`, depth: depth + 1, seen }),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function normalizeRevision(value, fallback = 1) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > Number.MAX_SAFE_INTEGER) return fallback;
  return number;
}

function normalizeEntry(input, { preserveRevision = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    fail('INVALID_ENTRY', 'Session configuration entry must be an object');
  }
  return {
    moduleId: normalizeId(input.moduleId, 'moduleId'),
    presetId: normalizeId(input.presetId, 'presetId', { nullable: true }),
    label: normalizeLabel(input.label),
    revision: preserveRevision ? normalizeRevision(input.revision, 1) : 1,
    reference: Boolean(input.reference),
    config: cloneJson(input.config, { path: '$.config' }),
    metadata: input.metadata == null ? {} : cloneJson(input.metadata, { path: '$.metadata' })
  };
}

function cloneEntry(entry) {
  return {
    moduleId: entry.moduleId,
    presetId: entry.presetId,
    label: entry.label,
    revision: entry.revision,
    reference: entry.reference,
    config: cloneJson(entry.config),
    metadata: cloneJson(entry.metadata)
  };
}

export const SESSION_CONFIG_BUNDLE_TYPE = TYPE;
export const SESSION_CONFIG_BUNDLE_VERSION = VERSION;

export class SessionConfigBundle {
  constructor({ sessionId = 'session', entries = [] } = {}) {
    this.sessionId = normalizeId(sessionId, 'sessionId');
    this._entries = new Map();
    if (!Array.isArray(entries)) fail('INVALID_ENTRIES', 'entries must be an array');
    if (entries.length > MAX_ENTRIES) fail('MAX_ENTRIES', `Bundle exceeds ${MAX_ENTRIES} entries`);
    for (const input of entries) {
      const entry = normalizeEntry(input, { preserveRevision: true });
      if (this._entries.has(entry.moduleId)) fail('DUPLICATE_MODULE', `Duplicate moduleId: ${entry.moduleId}`);
      this._entries.set(entry.moduleId, entry);
    }
  }

  static parse(input) {
    let payload;
    try {
      payload = typeof input === 'string' ? JSON.parse(input) : cloneJson(input);
    } catch (error) {
      if (error?.name === 'SessionConfigBundleError') throw error;
      fail('INVALID_JSON', `Invalid session configuration JSON: ${error?.message ?? String(error)}`);
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('INVALID_PAYLOAD', 'Bundle payload must be an object');
    if (payload.type !== TYPE) fail('UNSUPPORTED_TYPE', `Unsupported bundle type: ${String(payload.type)}`);
    if (payload.version !== VERSION) fail('UNSUPPORTED_VERSION', `Unsupported bundle version: ${String(payload.version)}`);
    return new SessionConfigBundle({ sessionId: payload.sessionId, entries: payload.entries ?? [] });
  }

  has(moduleId) {
    try { return this._entries.has(normalizeId(moduleId, 'moduleId')); } catch { return false; }
  }

  get(moduleId) {
    let id;
    try { id = normalizeId(moduleId, 'moduleId'); } catch { return null; }
    const entry = this._entries.get(id);
    return entry ? cloneEntry(entry) : null;
  }

  list() {
    return [...this._entries.values()]
      .sort((a, b) => a.moduleId.localeCompare(b.moduleId))
      .map(cloneEntry);
  }

  validate(moduleId, config, {
    presetId = null,
    label = null,
    metadata = {},
    reference = undefined,
    replaceReference = false
  } = {}) {
    const id = normalizeId(moduleId, 'moduleId');
    const current = this._entries.get(id) ?? null;
    if (current?.reference && !replaceReference) {
      fail('REFERENCE_LOCKED', `Validated reference is locked: ${id}`);
    }

    const candidate = normalizeEntry({
      moduleId: id,
      presetId,
      label,
      config,
      metadata,
      reference: reference === undefined ? Boolean(current?.reference) : Boolean(reference)
    });
    candidate.revision = current ? current.revision + 1 : 1;
    this._entries.set(id, candidate);
    return cloneEntry(candidate);
  }

  markReference(moduleId) {
    const id = normalizeId(moduleId, 'moduleId');
    const current = this._entries.get(id);
    if (!current) fail('NOT_FOUND', `Unknown moduleId: ${id}`);
    current.reference = true;
    return cloneEntry(current);
  }

  releaseReference(moduleId) {
    const id = normalizeId(moduleId, 'moduleId');
    const current = this._entries.get(id);
    if (!current) fail('NOT_FOUND', `Unknown moduleId: ${id}`);
    current.reference = false;
    return cloneEntry(current);
  }

  remove(moduleId, { force = false } = {}) {
    const id = normalizeId(moduleId, 'moduleId');
    const current = this._entries.get(id);
    if (!current) return false;
    if (current.reference && !force) fail('REFERENCE_LOCKED', `Validated reference is locked: ${id}`);
    this._entries.delete(id);
    return true;
  }

  clear({ force = false } = {}) {
    if (!force) {
      const locked = this.list().filter((entry) => entry.reference).map((entry) => entry.moduleId);
      if (locked.length) fail('REFERENCE_LOCKED', `Validated references are locked: ${locked.join(', ')}`);
    }
    const count = this._entries.size;
    this._entries.clear();
    return count;
  }

  summary() {
    const entries = this.list();
    return {
      sessionId: this.sessionId,
      count: entries.length,
      references: entries.filter((entry) => entry.reference).length,
      modules: entries.map((entry) => entry.moduleId)
    };
  }

  snapshot() {
    return {
      sessionId: this.sessionId,
      entries: this.list()
    };
  }

  toJSON() {
    return {
      type: TYPE,
      version: VERSION,
      sessionId: this.sessionId,
      entries: this.list()
    };
  }

  serialize({ indent = 2 } = {}) {
    const safeIndent = Math.max(0, Math.min(8, Math.floor(Number(indent) || 0)));
    return JSON.stringify(this.toJSON(), null, safeIndent);
  }

  copyText(options = {}) {
    return this.serialize(options);
  }
}
