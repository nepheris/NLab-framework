export class DataSource {
  constructor({ id, type, location = null, options = {}, metadata = {} } = {}) {
    if (!id) throw new Error('DataSource id is required');
    if (!type) throw new Error('DataSource type is required');
    this.id = id;
    this.type = type;
    this.location = location;
    this.options = { ...options };
    this.metadata = { ...metadata };
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
