function normalizeOptions(options) {
  if (options == null) return {};
  if (typeof options !== 'object' || Array.isArray(options)) throw new TypeError('options must be an object');
  return { ...options };
}

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
    this.options = normalizeOptions(options);
  }

  get type() {
    return 'abstract';
  }

  async canHandle(_source) {
    return false;
  }

  async normalize(_input, context = {}) {
    const normalizedContext = normalizeOptions(context);
    throw new DataAdapterError('normalize() must be implemented', 'NOT_IMPLEMENTED', {
      operation: 'normalize',
      adapterType: this.type,
      context: normalizedContext
    });
  }
}
