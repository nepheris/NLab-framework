const DOCUMENT_TYPE = 'nlab.inspector-snapshot';
const DOCUMENT_VERSION = 1;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function materialize(value) {
  if (typeof value === 'function') return materialize(value());
  if (value && typeof value === 'object' && typeof value.toJSON === 'function') return materialize(value.toJSON());
  return value;
}

function cloneJson(value, path = '$', depth = 0, seen = new WeakSet()) {
  value = materialize(value);
  if (depth > 32) throw new TypeError(`${path}: JSON nesting is too deep`);
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path}: number must be finite`);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError(`${path}: circular reference`);
    seen.add(value);
    const output = value.map((entry, index) => cloneJson(entry, `${path}[${index}]`, depth + 1, seen));
    seen.delete(value);
    return output;
  }
  if (!isPlainObject(value)) throw new TypeError(`${path}: value must be JSON-compatible`);
  if (seen.has(value)) throw new TypeError(`${path}: circular reference`);
  seen.add(value);
  const output = {};
  for (const key of Object.keys(value).sort()) {
    const entry = value[key];
    if (entry === undefined) continue;
    if (typeof entry === 'function') {
      output[key] = cloneJson(entry, `${path}.${key}`, depth + 1, seen);
      continue;
    }
    if (typeof entry === 'symbol' || typeof entry === 'bigint') throw new TypeError(`${path}.${key}: value must be JSON-compatible`);
    output[key] = cloneJson(entry, `${path}.${key}`, depth + 1, seen);
  }
  seen.delete(value);
  return output;
}

function normalizeComponent(component) {
  const raw = typeof component === 'string' ? { id: component } : materialize(component);
  if (!isPlainObject(raw)) throw new TypeError('component must be a string id or a plain object');
  const id = String(raw.id ?? '').trim();
  if (!ID_PATTERN.test(id)) throw new TypeError('component.id is required and must use a safe identifier');
  const normalized = { id };
  if (raw.type != null && String(raw.type).trim()) normalized.type = String(raw.type).trim();
  if (raw.version != null && String(raw.version).trim()) normalized.version = String(raw.version).trim();
  if (raw.label != null && String(raw.label).trim()) normalized.label = String(raw.label).trim();
  return normalized;
}

function normalizeSnapshot(input) {
  if (!isPlainObject(input)) throw new TypeError('Inspector snapshot must be a plain object');
  if (input.type !== DOCUMENT_TYPE) throw new TypeError(`Inspector snapshot type must be ${DOCUMENT_TYPE}`);
  if (input.version !== DOCUMENT_VERSION) throw new TypeError(`Inspector snapshot version must be ${DOCUMENT_VERSION}`);
  const component = normalizeComponent(input.component);
  const section = (key, fallback) => input[key] == null ? fallback : cloneJson(input[key], `$.${key}`);
  const controls = section('controls', []);
  const dependencies = section('dependencies', []);
  if (!Array.isArray(controls)) throw new TypeError('controls must be an array');
  if (!Array.isArray(dependencies)) throw new TypeError('dependencies must be an array');
  return {
    type: DOCUMENT_TYPE,
    version: DOCUMENT_VERSION,
    component,
    panel: section('panel', {}),
    state: section('state', {}),
    configuration: section('configuration', {}),
    controls,
    dependencies,
    tests: section('tests', {}),
    technical: section('technical', {}),
    metadata: section('metadata', {})
  };
}

export class InspectorSnapshot {
  static get documentType() { return DOCUMENT_TYPE; }
  static get version() { return DOCUMENT_VERSION; }

  capture({ component, panel = {}, state = {}, configuration = {}, controls = [], dependencies = [], tests = {}, technical = {}, metadata = {} } = {}) {
    return normalizeSnapshot({
      type: DOCUMENT_TYPE,
      version: DOCUMENT_VERSION,
      component: materialize(component),
      panel: materialize(panel),
      state: materialize(state),
      configuration: materialize(configuration),
      controls: materialize(controls),
      dependencies: materialize(dependencies),
      tests: materialize(tests),
      technical: materialize(technical),
      metadata: materialize(metadata)
    });
  }

  validate(input) {
    try {
      normalizeSnapshot(typeof input === 'string' ? JSON.parse(input) : input);
      return { valid: true, errors: [] };
    } catch (error) {
      return { valid: false, errors: [String(error?.message ?? error)] };
    }
  }

  serialize(input, { space = 2 } = {}) {
    const snapshot = normalizeSnapshot(input);
    const numeric = Number(space);
    const indent = Number.isFinite(numeric) ? Math.max(0, Math.min(8, Math.floor(numeric))) : 2;
    return JSON.stringify(snapshot, null, indent);
  }

  parse(input) {
    let parsed;
    if (typeof input === 'string') {
      try { parsed = JSON.parse(input); }
      catch (error) { throw new TypeError(`Invalid Inspector snapshot JSON: ${error.message}`); }
    } else {
      parsed = input;
    }
    return normalizeSnapshot(parsed);
  }
}
