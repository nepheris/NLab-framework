export class DataSourceError extends Error {
  constructor(message, code = 'DATA_SOURCE_ERROR', details = null) {
    super(message);
    this.name = 'DataSourceError';
    this.code = code;
    this.details = details;
  }
}

function requiredString(value, label, code) {
  if (typeof value !== 'string') {
    throw new DataSourceError(`${label} must be a string`, code, { value });
  }
  const normalized = value.trim();
  if (!normalized) throw new DataSourceError(`${label} is required`, code, { value });
  return normalized;
}

function cloneConfig(value, ancestors = new WeakSet()) {
  const plainObject = value && typeof value === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(value));
  if (!Array.isArray(value) && !plainObject) return value;
  if (ancestors.has(value)) {
    throw new DataSourceError('DataSource configuration must not contain circular references', 'CIRCULAR_CONFIG');
  }

  ancestors.add(value);
  const copy = Array.isArray(value) ? [] : {};
  if (Array.isArray(value)) {
    for (const item of value) copy.push(cloneConfig(item, ancestors));
  } else {
    for (const [key, item] of Object.entries(value)) {
      Object.defineProperty(copy, key, {
        value: cloneConfig(item, ancestors),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
  }
  ancestors.delete(value);
  return copy;
}

function objectOptions(value, label, code) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new DataSourceError(`${label} must be an object`, code, { value });
  }
  return cloneConfig(value);
}

export class DataSource {
  constructor({ id, type, location = null, options = {}, metadata = {} } = {}) {
    this.id = requiredString(id, 'DataSource id', 'INVALID_ID');
    this.type = requiredString(type, 'DataSource type', 'INVALID_TYPE');
    this.location = location;
    this.options = objectOptions(options, 'DataSource options', 'INVALID_OPTIONS');
    this.metadata = objectOptions(metadata, 'DataSource metadata', 'INVALID_METADATA');
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      location: this.location,
      options: cloneConfig(this.options),
      metadata: cloneConfig(this.metadata)
    };
  }
}
