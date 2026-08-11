export class DataAdapterError extends Error {
  constructor(message, code = 'DATA_ADAPTER_ERROR', details = null) {
    super(message);
    this.name = 'DataAdapterError';
    this.code = code;
    this.details = details;
  }
}

export class DataAdapter {
  constructor(options = {}) {
    this.options = options;
  }

  get type() {
    return 'abstract';
  }

  async canHandle(_source) {
    return false;
  }

  async normalize(_input, _context = {}) {
    throw new DataAdapterError('normalize() must be implemented', 'NOT_IMPLEMENTED');
  }
}
