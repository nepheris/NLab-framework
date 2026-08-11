export class EventBus {
  constructor() { this.listeners = new Map(); }

  on(eventName, listener) {
    if (!eventName || typeof listener !== 'function') throw new Error('eventName and listener are required');
    const set = this.listeners.get(eventName) ?? new Set();
    set.add(listener); this.listeners.set(eventName, set);
    return () => this.off(eventName, listener);
  }

  once(eventName, listener) {
    const off = this.on(eventName, (event) => { off(); listener(event); });
    return off;
  }

  off(eventName, listener = null) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    if (!listener) { this.listeners.delete(eventName); return; }
    set.delete(listener); if (!set.size) this.listeners.delete(eventName);
  }

  emit(eventName, payload = null, meta = {}) {
    const event = { name: eventName, payload, meta, timestamp: Date.now() };
    const listeners = [...(this.listeners.get(eventName) ?? []), ...(this.listeners.get('*') ?? [])];
    const errors = [];
    for (const listener of listeners) {
      try { listener(event); }
      catch (error) { errors.push(error); }
    }
    return { delivered: listeners.length, errors };
  }
}
