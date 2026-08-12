export class RuntimeMonitor {
  constructor({ eventBus = null, maxErrors = 100 } = {}) {
    this.eventBus = eventBus;
    const limit = Number(maxErrors);
    this.maxErrors = maxErrors === Infinity ? Infinity : (Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 100);
    this.marks = new Map();
    this.metrics = new Map();
    this.errors = [];
  }

  start(name) {
    this.marks.set(name, globalThis.performance?.now?.() ?? Date.now());
    return this;
  }

  end(name, { meta = {} } = {}) {
    const start = this.marks.get(name);
    if (start == null) return null;
    const duration = (globalThis.performance?.now?.() ?? Date.now()) - start;
    this.marks.delete(name);
    const metric = { name, duration, meta:this.#copyValue(meta), timestamp:Date.now() };
    this.metrics.set(name, metric);
    this.eventBus?.emit?.('monitor:metric', this.#copyMetric(metric));
    return this.#copyMetric(metric);
  }

  count(name, delta = 1) {
    const increment = Number(delta);
    if (!Number.isFinite(increment)) throw new TypeError('RuntimeMonitor count delta must be a finite number');
    const current = this.metrics.get(name)?.value ?? 0;
    const metric = { name, value:current + increment, timestamp:Date.now() };
    this.metrics.set(name, metric);
    return metric.value;
  }

  capture(error, context = {}) {
    const item = {
      message:error?.message ?? String(error),
      stack:error?.stack ?? null,
      context:this.#copyValue(context),
      timestamp:Date.now()
    };
    this.errors.push(item);
    if (Number.isFinite(this.maxErrors) && this.errors.length > this.maxErrors) {
      this.errors.splice(0, this.errors.length - this.maxErrors);
    }
    this.eventBus?.emit?.('monitor:error', this.#copyError(item));
    return this.#copyError(item);
  }

  snapshot() {
    return {
      metrics:Object.fromEntries([...this.metrics].map(([name, metric]) => [name, this.#copyMetric(metric)])),
      errors:this.errors.map((item) => this.#copyError(item))
    };
  }

  clear() {
    this.marks.clear();
    this.metrics.clear();
    this.errors = [];
  }

  #copyValue(value) {
    if (Array.isArray(value)) return [...value];
    if (value && typeof value === 'object') return { ...value };
    return value;
  }

  #copyMetric(metric) {
    return { ...metric, ...(metric.meta !== undefined ? { meta:this.#copyValue(metric.meta) } : {}) };
  }

  #copyError(item) {
    return { ...item, context:this.#copyValue(item.context) };
  }
}
