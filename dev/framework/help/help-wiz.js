export class HelpWiz {
  constructor({ registry = {}, panelFactory = null } = {}) { this.registry = new Map(Object.entries(registry)); this.panelFactory = panelFactory; }
  register(id, entry) { this.registry.set(id, entry); return this; }
  get(id) { return this.registry.get(id) ?? null; }
  short(id) { const entry = this.get(id); return entry?.short ?? entry?.title ?? ''; }
  long(id) { const entry = this.get(id); return entry?.long ?? entry?.short ?? ''; }
  attach(root = document, { experience = 'visitor' } = {}) {
    for (const trigger of root.querySelectorAll('[data-help-id]')) {
      const id = trigger.dataset.helpId; const entry = this.get(id); if (!entry) continue;
      trigger.title = entry.short ?? entry.title ?? id;
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        const content = {
          id, title:entry.title ?? id, short:entry.short ?? '', long:entry.long ?? '',
          examples:entry.examples ?? [], links:entry.links ?? [], media:entry.media ?? [],
          technical:experience === 'webmaster' ? entry.technical ?? null : null
        };
        if (this.panelFactory) this.panelFactory(content);
        else trigger.dispatchEvent(new CustomEvent('nlab:help', { bubbles:true, detail:content }));
      });
    }
    return this;
  }
}
