const JSON_MIME = 'application/json;charset=utf-8';
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

function finitePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function safeIndent(value, fallback = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(8, Math.floor(number)));
}

function byteLength(text) {
  const value = String(text ?? '');
  if (typeof TextEncoder === 'function') return new TextEncoder().encode(value).byteLength;
  return value.length;
}

function normalizeFilename(value, fallback) {
  const raw = String(value ?? '').trim();
  const basename = (raw || fallback).split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const candidate = basename && basename !== '.' && basename !== '..' ? basename : fallback;
  return /\.json$/i.test(candidate) ? candidate : `${candidate}.json`;
}

function errorSnapshot(error) {
  return {
    name: String(error?.name ?? 'Error'),
    code: error?.code == null ? null : String(error.code),
    message: String(error?.message ?? error ?? 'Unknown error')
  };
}

export class SessionConfigTransferError extends Error {
  constructor(message, code = 'SESSION_CONFIG_TRANSFER_ERROR', details = null) {
    super(message);
    this.name = 'SessionConfigTransferError';
    this.code = code;
    this.details = details;
  }
}

function assertRegistry(registry) {
  if (!registry || typeof registry.payload !== 'function' || typeof registry.importText !== 'function') {
    throw new SessionConfigTransferError(
      'registry must expose payload() and importText()',
      'INVALID_REGISTRY'
    );
  }
  return registry;
}

function assertBundle(bundle) {
  if (!bundle || typeof bundle.serialize !== 'function') {
    throw new SessionConfigTransferError('bundle must expose serialize()', 'INVALID_BUNDLE');
  }
  if (typeof bundle.constructor?.parse !== 'function') {
    throw new SessionConfigTransferError('bundle constructor must expose static parse()', 'INVALID_BUNDLE_PARSER');
  }
  return bundle;
}

export class SessionConfigTransfer {
  constructor({
    registry = null,
    bundle = null,
    clipboard = null,
    downloader = null,
    readText = null,
    maxBytes = DEFAULT_MAX_BYTES,
    filename = null,
    onEvent = null
  } = {}) {
    const supplied = Number(Boolean(registry)) + Number(Boolean(bundle));
    if (supplied !== 1) {
      throw new SessionConfigTransferError(
        'Exactly one of registry or bundle must be provided',
        'INVALID_SOURCE_COUNT',
        { supplied }
      );
    }

    this.mode = registry ? 'registry' : 'bundle';
    this.registry = registry ? assertRegistry(registry) : null;
    this.bundle = bundle ? assertBundle(bundle) : null;
    this.clipboard = clipboard;
    this.downloader = typeof downloader === 'function' ? downloader : null;
    this.readText = typeof readText === 'function' ? readText : null;
    this.maxBytes = finitePositiveInteger(maxBytes, DEFAULT_MAX_BYTES);
    this.filename = normalizeFilename(
      filename,
      this.mode === 'registry' ? 'nlab-session-config.json' : 'nlab-session-config-bundle.json'
    );
    this.onEvent = typeof onEvent === 'function' ? onEvent : null;
    this.lastError = null;
  }

  capabilities() {
    return {
      mode: this.mode,
      copy: Boolean(this.clipboard && typeof this.clipboard.writeText === 'function'),
      download: Boolean(this.downloader),
      importText: true,
      importFile: true,
      maxBytes: this.maxBytes,
      filename: this.filename
    };
  }

  exportText({ referencesOnly = false, indent = 2 } = {}) {
    const spaces = safeIndent(indent);
    if (this.mode === 'registry') {
      return JSON.stringify(this.registry.payload({ referencesOnly: Boolean(referencesOnly) }), null, spaces);
    }
    return this.bundle.serialize({ indent: spaces });
  }

  descriptor({ filename = this.filename, referencesOnly = false, indent = 2 } = {}) {
    const text = this.exportText({ referencesOnly, indent });
    return {
      filename: normalizeFilename(filename, this.filename),
      mime: JSON_MIME,
      text,
      bytes: byteLength(text),
      mode: this.mode,
      referencesOnly: this.mode === 'registry' ? Boolean(referencesOnly) : null
    };
  }

  async copy(options = {}) {
    const descriptor = this.descriptor(options);
    if (!this.clipboard || typeof this.clipboard.writeText !== 'function') {
      return this.#failure('copy', 'clipboard-unavailable', null, { bytes: descriptor.bytes, filename: descriptor.filename });
    }
    try {
      const accepted = await this.clipboard.writeText(descriptor.text);
      if (accepted === false) return this.#failure('copy', 'clipboard-rejected', null, { bytes: descriptor.bytes, filename: descriptor.filename });
      this.lastError = null;
      const result = {
        ok: true,
        operation: 'copy',
        mode: this.mode,
        bytes: descriptor.bytes,
        filename: descriptor.filename
      };
      this.#emit('copy', result);
      return result;
    } catch (error) {
      return this.#failure('copy', 'clipboard-error', error, { bytes: descriptor.bytes, filename: descriptor.filename });
    }
  }

  async download(options = {}) {
    const descriptor = this.descriptor(options);
    if (!this.downloader) {
      return this.#failure('download', 'downloader-unavailable', null, { bytes: descriptor.bytes, filename: descriptor.filename });
    }
    try {
      const accepted = await this.downloader({ ...descriptor });
      if (accepted === false) return this.#failure('download', 'download-rejected', null, { bytes: descriptor.bytes, filename: descriptor.filename });
      this.lastError = null;
      const result = {
        ok: true,
        operation: 'download',
        mode: this.mode,
        bytes: descriptor.bytes,
        filename: descriptor.filename
      };
      this.#emit('download', result);
      return result;
    } catch (error) {
      return this.#failure('download', 'download-error', error, { bytes: descriptor.bytes, filename: descriptor.filename });
    }
  }

  importText(input, { replace = true, source = 'text', name = null } = {}) {
    const text = String(input ?? '');
    const bytes = byteLength(text);
    if (bytes > this.maxBytes) {
      return this.#failure('import', 'too-large', new SessionConfigTransferError(
        `Session configuration exceeds ${this.maxBytes} bytes`,
        'MAX_BYTES',
        { bytes, maxBytes: this.maxBytes }
      ), { bytes, source, name });
    }

    try {
      let imported;
      if (this.mode === 'registry') {
        imported = this.registry.importText(text, { replace: Boolean(replace) });
      } else {
        const Bundle = this.bundle.constructor;
        const parsed = Bundle.parse(text);
        this.bundle = assertBundle(parsed);
        imported = this.bundle.summary?.() ?? this.bundle.toJSON?.() ?? null;
      }
      this.lastError = null;
      const result = {
        ok: true,
        operation: 'import',
        mode: this.mode,
        source,
        name: name == null ? null : String(name),
        bytes,
        replace: this.mode === 'registry' ? Boolean(replace) : true,
        imported
      };
      this.#emit('import', result);
      return result;
    } catch (error) {
      return this.#failure('import', 'invalid-data', error, { bytes, source, name });
    }
  }

  async importFile(file, { replace = true } = {}) {
    if (!file || typeof file !== 'object') {
      return this.#failure('import-file', 'invalid-file', new SessionConfigTransferError(
        'File-like object is required',
        'INVALID_FILE'
      ));
    }

    const declaredSize = Number(file.size);
    if (Number.isFinite(declaredSize) && declaredSize > this.maxBytes) {
      return this.#failure('import-file', 'too-large', new SessionConfigTransferError(
        `Session configuration file exceeds ${this.maxBytes} bytes`,
        'MAX_BYTES',
        { bytes: declaredSize, maxBytes: this.maxBytes }
      ), { bytes: declaredSize, name: file.name ?? null });
    }

    let text;
    try {
      if (this.readText) text = await this.readText(file);
      else if (typeof file.text === 'function') text = await file.text();
      else {
        return this.#failure('import-file', 'reader-unavailable', new SessionConfigTransferError(
          'File reader is unavailable',
          'READER_UNAVAILABLE'
        ), { name: file.name ?? null });
      }
    } catch (error) {
      return this.#failure('import-file', 'read-error', error, { name: file.name ?? null });
    }

    return this.importText(text, {
      replace,
      source: 'file',
      name: file.name ?? null
    });
  }

  snapshot() {
    return {
      ...this.capabilities(),
      lastError: this.lastError ? { ...this.lastError } : null,
      source: this.mode === 'bundle'
        ? (this.bundle.summary?.() ?? null)
        : { entries: this.registry.list?.().length ?? null }
    };
  }

  #failure(operation, reason, error = null, details = null) {
    const normalized = error ? errorSnapshot(error) : null;
    this.lastError = {
      operation,
      reason,
      error: normalized
    };
    const result = {
      ok: false,
      operation,
      reason,
      error: normalized,
      details: details == null ? null : { ...details }
    };
    this.#emit('error', result);
    return result;
  }

  #emit(type, result) {
    try {
      this.onEvent?.({ type, mode: this.mode, result: structuredClone(result) });
    } catch {}
  }
}

export const SESSION_CONFIG_TRANSFER_MIME = JSON_MIME;
export const SESSION_CONFIG_TRANSFER_DEFAULT_MAX_BYTES = DEFAULT_MAX_BYTES;
