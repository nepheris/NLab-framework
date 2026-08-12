const clone = (value) => {
  if (value == null) return value;
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

function normalizeExperience(value) {
  return String(value ?? 'visitor').trim().toLowerCase() === 'webmaster' ? 'webmaster' : 'visitor';
}

export class HelpWiz {
  constructor({
    registry = {},
    panelFactory = null,
    documentRef = globalThis.document ?? null,
    customEventClass = globalThis.CustomEvent ?? null,
    eventFactory = null
  } = {}) {
    this.registry = new Map();
    this.panelFactory = panelFactory;
    this.document = documentRef;
    this.CustomEvent = customEventClass;
    this.eventFactory = eventFactory;
    this.bindings = new Map();

    for (const [id, entry] of Object.entries(registry ?? {})) this.register(id, entry);
  }

  register(id, entry) {
    const key = String(id ?? '').trim();
    if (!key) throw new Error('Help id is required');
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TypeError(`Help entry must be an object: ${key}`);
    }
    this.registry.set(key, clone(entry));
    return this;
  }

  unregister(id) {
    return this.registry.delete(String(id ?? '').trim());
  }

  has(id) {
    return this.registry.has(String(id ?? '').trim());
  }

  get(id) {
    const entry = this.registry.get(String(id ?? '').trim());
    return entry ? clone(entry) : null;
  }

  short(id) {
    const entry = this.get(id);
    return entry?.short ?? entry?.title ?? '';
  }

  long(id) {
    const entry = this.get(id);
    return entry?.long ?? entry?.short ?? '';
  }

  content(id, { experience = 'visitor' } = {}) {
    const key = String(id ?? '').trim();
    const entry = this.get(key);
    if (!entry) return null;
    const mode = normalizeExperience(experience);
    return {
      id: key,
      title: entry.title ?? key,
      short: entry.short ?? '',
      long: entry.long ?? entry.short ?? '',
      examples: Array.isArray(entry.examples) ? clone(entry.examples) : [],
      links: Array.isArray(entry.links) ? clone(entry.links) : [],
      media: Array.isArray(entry.media) ? clone(entry.media) : [],
      technical: mode === 'webmaster' ? clone(entry.technical ?? null) : null
    };
  }

  attach(root = this.document, { experience = 'visitor' } = {}) {
    if (!root?.querySelectorAll) return this;
    const mode = normalizeExperience(experience);

    for (const trigger of root.querySelectorAll('[data-help-id]') ?? []) {
      const id = String(trigger?.dataset?.helpId ?? '').trim();
      const entry = this.get(id);
      const previous = this.bindings.get(trigger);

      if (!entry) {
        if (previous) this.#detachTrigger(trigger, previous);
        continue;
      }

      trigger.title = entry.short ?? entry.title ?? id;
      if (previous) this.#detachTrigger(trigger, previous);

      const handler = (event) => {
        event?.preventDefault?.();
        const detail = this.content(id, { experience: mode });
        if (!detail) return;
        if (typeof this.panelFactory === 'function') {
          this.panelFactory(detail, { trigger, event });
          return;
        }
        const helpEvent = this.#createEvent(detail, trigger);
        if (helpEvent && typeof trigger.dispatchEvent === 'function') trigger.dispatchEvent(helpEvent);
      };

      trigger.addEventListener?.('click', handler);
      this.bindings.set(trigger, { handler, root });
    }
    return this;
  }

  detach(root = null) {
    let count = 0;
    for (const [trigger, binding] of [...this.bindings.entries()]) {
      if (root && binding.root !== root) continue;
      this.#detachTrigger(trigger, binding);
      count += 1;
    }
    return count;
  }

  destroy() {
    this.detach();
    return this;
  }

  #detachTrigger(trigger, binding) {
    trigger?.removeEventListener?.('click', binding?.handler);
    this.bindings.delete(trigger);
  }

  #createEvent(detail, trigger) {
    if (typeof this.eventFactory === 'function') {
      return this.eventFactory('nlab:help', { bubbles: true, detail: clone(detail) }, trigger);
    }

    const EventClass = this.CustomEvent ?? globalThis.CustomEvent;
    if (typeof EventClass === 'function') {
      return new EventClass('nlab:help', { bubbles: true, detail: clone(detail) });
    }

    const documentRef = trigger?.ownerDocument ?? this.document;
    const legacy = documentRef?.createEvent?.('CustomEvent');
    if (legacy?.initCustomEvent) {
      legacy.initCustomEvent('nlab:help', true, false, clone(detail));
      return legacy;
    }
    return null;
  }
}
