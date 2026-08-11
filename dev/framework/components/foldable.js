export class FoldableController {
  constructor(root, { storage = null, storageKey = null } = {}) {
    this.root = root;
    this.storage = storage;
    this.storageKey = storageKey;
    this.sections = new Map();
  }

  init() {
    if (!this.root?.querySelectorAll) return this;
    for (const section of this.root.querySelectorAll('[data-foldable]')) {
      const id = section.id || section.dataset.foldable;
      if (!id) continue;
      const defaultOpen = section.dataset.defaultOpen !== 'false';
      this.sections.set(id, { element: section, defaultOpen });
      const trigger = this.root.querySelector(`[data-foldable-toggle="${CSS.escape(id)}"]`);
      trigger?.addEventListener('click', () => this.toggle(id));
    }
    const saved = this.storage && this.storageKey ? this.storage.get(this.storageKey, {}) : {};
    for (const [id, entry] of this.sections) this.set(id, saved[id] ?? entry.defaultOpen, { persist: false });
    this.restoreFromHash();
    return this;
  }

  set(id, open, { persist = true } = {}) {
    const entry = this.sections.get(id); if (!entry) return false;
    entry.element.hidden = !open; entry.element.dataset.open = String(Boolean(open));
    const trigger = this.root.querySelector?.(`[data-foldable-toggle="${CSS.escape(id)}"]`);
    trigger?.setAttribute('aria-expanded', String(Boolean(open)));
    if (persist) this.#persist();
    return true;
  }

  toggle(id) { const entry = this.sections.get(id); return entry ? this.set(id, entry.element.hidden) : false; }
  openAll() { for (const id of this.sections.keys()) this.set(id, true, { persist:false }); this.#persist(); }
  closeAll() { for (const id of this.sections.keys()) this.set(id, false, { persist:false }); this.#persist(); }
  reset() { for (const [id, entry] of this.sections) this.set(id, entry.defaultOpen, { persist:false }); this.#persist(); }

  restoreFromHash(hash = globalThis.location?.hash ?? '') {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    let node = this.root.querySelector?.(`#${CSS.escape(id)}`);
    while (node && node !== this.root) {
      if (node.matches?.('[data-foldable]') && node.id) this.set(node.id, true, { persist:false });
      node = node.parentElement;
    }
  }

  #persist() {
    if (!this.storage || !this.storageKey) return;
    const state = {};
    for (const [id, entry] of this.sections) state[id] = !entry.element.hidden;
    this.storage.set(this.storageKey, state);
  }
}
