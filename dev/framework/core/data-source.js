export class DataSourceError extends Error {
  constructor(message, code = 'DATA_SOURCE_ERROR', details = null) {
    super(message);
    this.name = 'DataSourceError';
    this.code = code;
    this.details = details;
  }
}

const token = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new DataSourceError(`${label} must be a non-empty string`, `INVALID_${label.toUpperCase()}`, { value });
  }
  return value.trim();
};

const configObject = (value, label) => {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new DataSourceError(`${label} must be an object`, `INVALID_${label.toUpperCase()}`, { value });
  }
  return cloneConfig(value);
};

const cloneConfig = (value, ancestors = new WeakSet()) => {
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
        value: cloneConfig(item, ancestors), enumerable: true, configurable: true, writable: true
      });
    }
  }
  ancestors.delete(value);
  return copy;
};

const normalizeLocation = (value) => {
  if (value == null || value === '') return null;
  if (value instanceof URL) return value.toString();
  if (typeof value !== 'string') {
    throw new DataSourceError('location must be a string, URL or null', 'INVALID_LOCATION', { value });
  }
  return value.trim() || null;
};

export class DataSource {
  constructor({ id, type, location = null, options = {}, metadata = {} } = {}) {
    this.id = token(id, 'id');
    this.type = token(type, 'type');
    this.location = normalizeLocation(location);
    this.options = configObject(options, 'options');
    this.metadata = configObject(metadata, 'metadata');
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
