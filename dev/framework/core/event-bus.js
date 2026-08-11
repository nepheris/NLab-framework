function normalizeEventName(eventName) {
  if (typeof eventName !== 'string') throw new TypeError('eventName must be a string');
  const normalized = eventName.trim();
  if (!normalized) throw new Error('eventName is required');
  return normalized;
}

export class EventBus {
  constructor({ clock = () => Date.now() } = {}) {
    if (typeof clock !== 'function') throw new TypeError('clock must be a function');
    this.clock = clock;
    this.listeners = new Map();
  }

  on(eventName, listener) {
    const name = normalizeEventName(eventName);
    if (typeof listener !== 'function') throw new Error('listener is required');
    const set = this.listeners.get(name) ?? new Set();
    set.add(listener);
    this.listeners.set(name, set);
    return () => this.off(name, listener);
  }

  once(eventName, listener) {
    if (typeof listener !== 'function') throw new Error('listener is required');
    const name = normalizeEventName(eventName);
    let off = () => false;
    const wrapper = (event) => {
      off();
      return listener(event);
    };
    off = this.on(name, wrapper);
    return off;
  }

  off(eventName, listener = null) {
    const name = normalizeEventName(eventName);
    const set = this.listeners.get(name);
    if (!set) return false;
    if (listener == null) {
      this.listeners.delete(name);
      return true;
    }
    if (typeof listener !== 'function') throw new TypeError('listener must be a function or null');
    const removed = set.delete(listener);
    if (!set.size) this.listeners.delete(name);
    return removed;
  }

  emit(eventName, payload = null, meta = {}) {
    const name = normalizeEventName(eventName);
    const event = {
      name,
      payload,
      meta: meta ?? {},
      timestamp: Number(this.clock())
    };
    const listeners = [
      ...(this.listeners.get(name) ?? []),
      ...(name === '*' ? [] : (this.listeners.get('*') ?? []))
    ];
    const errors = [];
    let delivered = 0;
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        errors.push(error);
      } finally {
        delivered += 1;
      }
    }
    return { delivered, errors, event };
  }

  listenerCount(eventName = null) {
    if (eventName == null) {
      let count = 0;
      for (const set of this.listeners.values()) count += set.size;
      return count;
    }
    return this.listeners.get(normalizeEventName(eventName))?.size ?? 0;
  }

  events() {
    return [...this.listeners.entries()]
      .filter(([, set]) => set.size > 0)
      .map(([name]) => name);
  }

  clear(eventName = null) {
    if (eventName == null) {
      const count = this.listenerCount();
      this.listeners.clear();
      return count;
    }
    const name = normalizeEventName(eventName);
    const count = this.listeners.get(name)?.size ?? 0;
    this.listeners.delete(name);
    return count;
  }
}
