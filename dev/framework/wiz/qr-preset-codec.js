const DOCUMENT_TYPE = 'nlab.qr-presets';
const DOCUMENT_VERSION = 1;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const QR_TYPES = new Set(['url', 'text', 'email', 'mail', 'tel', 'phone', 'telephone', 'wifi', 'wi-fi', 'contact', 'vcard']);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneJson(value, path = '$', depth = 0, seen = new WeakSet()) {
  if (depth > 32) throw new TypeError(`${path}: JSON nesting is too deep`);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path}: number must be finite`);
    return value;
  }
  if (Array.isArray(value)) return value.map((entry, index) => cloneJson(entry, `${path}[${index}]`, depth + 1, seen));
  if (!isPlainObject(value)) throw new TypeError(`${path}: value must be JSON-compatible`);
  if (seen.has(value)) throw new TypeError(`${path}: circular reference`);
  seen.add(value);
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    if (typeof entry === 'function' || typeof entry === 'symbol' || typeof entry === 'bigint') {
      throw new TypeError(`${path}.${key}: value must be JSON-compatible`);
    }
    output[key] = cloneJson(entry, `${path}.${key}`, depth + 1, seen);
  }
  seen.delete(value);
  return output;
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizedType(config) {
  return String(config?.type ?? 'url').trim().toLowerCase();
}

function validateConfig(config) {
  const errors = [];
  if (!isPlainObject(config)) return ['config must be a plain object'];

  const type = normalizedType(config);
  if (!QR_TYPES.has(type)) errors.push(`config.type is unsupported: ${type}`);

  if (type === 'text' && !nonEmpty(config.text ?? config.value)) errors.push('text preset requires config.text or config.value');
  if ((type === 'email' || type === 'mail') && !nonEmpty(config.email ?? config.address)) errors.push('email preset requires config.email or config.address');
  if (['tel', 'phone', 'telephone'].includes(type) && !nonEmpty(config.phone ?? config.tel ?? config.number)) errors.push('phone preset requires config.phone, config.tel or config.number');
  if (type === 'wifi' || type === 'wi-fi') {
    const wifi = isPlainObject(config.wifi) ? config.wifi : config;
    if (!nonEmpty(wifi.ssid ?? wifi.name)) errors.push('wifi preset requires an SSID');
  }
  if (type === 'contact' || type === 'vcard') {
    const contact = isPlainObject(config.contact) ? config.contact : config;
    const fullName = contact.name ?? contact.fullName;
    const hasSplitName = nonEmpty(contact.firstName ?? contact.givenName) || nonEmpty(contact.lastName ?? contact.familyName);
    if (!nonEmpty(fullName) && !hasSplitName) errors.push('contact preset requires a name');
  }

  const range = (key, min, max) => {
    if (config[key] == null) return;
    const number = Number(config[key]);
    if (!Number.isFinite(number) || number < min || number > max) errors.push(`config.${key} must be between ${min} and ${max}`);
  };
  range('width', 64, 4096);
  range('margin', 0, 64);
  range('logoSize', 0.10, 0.32);
  range('logoRadius', 0, 256);

  if (config.errorCorrectionLevel != null && !['L', 'M', 'Q', 'H'].includes(String(config.errorCorrectionLevel).toUpperCase())) {
    errors.push('config.errorCorrectionLevel must be L, M, Q or H');
  }
  if (config.format != null && !['svg', 'png'].includes(String(config.format).toLowerCase())) {
    errors.push('config.format must be svg or png');
  }

  return errors;
}

function issueError(message, issues) {
  const error = new TypeError(message);
  error.issues = [...issues];
  return error;
}

export class QRPresetCodec {
  static get documentType() { return DOCUMENT_TYPE; }
  static get version() { return DOCUMENT_VERSION; }

  validatePreset(preset) {
    const errors = [];
    if (!isPlainObject(preset)) return { valid: false, errors: ['preset must be a plain object'] };

    const id = String(preset.id ?? '').trim();
    if (!ID_PATTERN.test(id)) errors.push('id must match [A-Za-z0-9][A-Za-z0-9._-]{0,79}');
    if (preset.name != null && !nonEmpty(String(preset.name))) errors.push('name must be non-empty when provided');
    if (preset.label != null && !nonEmpty(String(preset.label))) errors.push('label must be non-empty when provided');
    if (preset.tags != null && (!Array.isArray(preset.tags) || preset.tags.some((tag) => !nonEmpty(String(tag))))) errors.push('tags must be an array of non-empty values');
    errors.push(...validateConfig(preset.config));

    try { cloneJson(preset.config, '$.config'); } catch (error) { errors.push(error.message); }
    if (preset.meta != null) {
      try { cloneJson(preset.meta, '$.meta'); } catch (error) { errors.push(error.message); }
    }

    return { valid: errors.length === 0, errors };
  }

  normalizePreset(preset) {
    const validation = this.validatePreset(preset);
    if (!validation.valid) throw issueError('Invalid QR preset', validation.errors);

    const id = String(preset.id).trim();
    const name = String(preset.name ?? preset.label ?? id).trim();
    const normalized = {
      id,
      name,
      config: cloneJson(preset.config, '$.config')
    };
    if (preset.label != null) normalized.label = String(preset.label).trim();
    if (preset.description != null) normalized.description = String(preset.description);
    if (Array.isArray(preset.tags)) normalized.tags = preset.tags.map((tag) => String(tag).trim());
    if (preset.meta != null) normalized.meta = cloneJson(preset.meta, '$.meta');
    return normalized;
  }

  exportCollection(presets = [], { activeId = null, meta = {}, space = 2 } = {}) {
    if (!Array.isArray(presets)) throw new TypeError('presets must be an array');
    const normalized = presets.map((preset) => this.normalizePreset(preset));
    const ids = new Set();
    for (const preset of normalized) {
      if (ids.has(preset.id)) throw issueError('Invalid QR preset collection', [`duplicate preset id: ${preset.id}`]);
      ids.add(preset.id);
    }

    const normalizedActiveId = activeId == null || String(activeId).trim() === '' ? null : String(activeId).trim();
    if (normalizedActiveId != null && !ids.has(normalizedActiveId)) {
      throw issueError('Invalid QR preset collection', [`activeId does not exist: ${normalizedActiveId}`]);
    }

    const doc = {
      type: DOCUMENT_TYPE,
      version: DOCUMENT_VERSION,
      presets: normalized,
      activeId: normalizedActiveId,
      meta: cloneJson(meta, '$.meta')
    };
    const numericSpace = Number(space);
    const indent = Number.isFinite(numericSpace) ? Math.max(0, Math.min(8, Math.floor(numericSpace))) : 2;
    return JSON.stringify(doc, null, indent);
  }

  importCollection(input) {
    let parsed;
    if (typeof input === 'string') {
      try { parsed = JSON.parse(input); } catch (error) { throw issueError('Invalid QR preset JSON', [error.message]); }
    } else {
      parsed = input;
    }
    if (!isPlainObject(parsed)) throw issueError('Invalid QR preset document', ['document must be a plain object']);

    const errors = [];
    if (parsed.type !== DOCUMENT_TYPE) errors.push(`document.type must be ${DOCUMENT_TYPE}`);
    if (parsed.version !== DOCUMENT_VERSION) errors.push(`document.version must be ${DOCUMENT_VERSION}`);
    if (!Array.isArray(parsed.presets)) errors.push('document.presets must be an array');
    if (parsed.meta != null && !isPlainObject(parsed.meta)) errors.push('document.meta must be an object');
    if (errors.length) throw issueError('Invalid QR preset document', errors);

    const normalized = [];
    const ids = new Set();
    for (let index = 0; index < parsed.presets.length; index += 1) {
      try {
        const preset = this.normalizePreset(parsed.presets[index]);
        if (ids.has(preset.id)) errors.push(`duplicate preset id: ${preset.id}`);
        ids.add(preset.id);
        normalized.push(preset);
      } catch (error) {
        for (const issue of error.issues ?? [error.message]) errors.push(`presets[${index}]: ${issue}`);
      }
    }

    const activeId = parsed.activeId == null || String(parsed.activeId).trim() === '' ? null : String(parsed.activeId).trim();
    if (activeId != null && !ids.has(activeId)) errors.push(`activeId does not exist: ${activeId}`);
    let meta = {};
    try { meta = cloneJson(parsed.meta ?? {}, '$.meta'); } catch (error) { errors.push(error.message); }
    if (errors.length) throw issueError('Invalid QR preset document', errors);

    return {
      type: DOCUMENT_TYPE,
      version: DOCUMENT_VERSION,
      presets: normalized,
      activeId,
      meta
    };
  }
}
