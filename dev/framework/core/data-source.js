function requiredString(value, label) {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
}

function objectOptions(value, label) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  return { ...value };
}

export class DataSource {
  constructor({ id, type, location = null, options = {}, metadata = {} } = {}) {
    this.id = requiredString(id, 'DataSource id');
    this.type = requiredString(type, 'DataSource type');
    this.location = location;
    this.options = objectOptions(options, 'DataSource options');
    this.metadata = objectOptions(metadata, 'DataSource metadata');
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      location: this.location,
      options: { ...this.options },
      metadata: { ...this.metadata }
    };
  }
}
