export class IconRegistry {
  constructor({ fallback = 'help' } = {}) { this.icons = new Map(); this.fallback = fallback; }
  register(id, svg) { if (!id || !svg) throw new Error('Icon id and svg are required'); this.icons.set(id, svg); return this; }
  registerPack(pack = {}) { for (const [id, svg] of Object.entries(pack)) this.register(id, svg); return this; }
  has(id) { return this.icons.has(id); }
  get(id) { return this.icons.get(id) ?? this.icons.get(this.fallback) ?? null; }
  render(id, { title = null, className = 'nlab-icon' } = {}) {
    const source = this.get(id); if (!source) return '';
    return source.replace('<svg ', `<svg class="${className}" aria-hidden="${title ? 'false' : 'true'}" ${title ? `aria-label="${title.replaceAll('"','&quot;')}" ` : ''}`);
  }
}

export const CORE_ICONS = {
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.2 1.8c-1 .8-1.9 1.3-1.9 2.7"/><path d="M12 17h.01"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16M7 12h10M10 19h4"/></svg>',
  table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/></svg>',
  cards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h3a6 6 0 0 0 6-6c0-3-4-5-9-5Z"/><circle cx="7.5" cy="9" r="1"/><circle cx="10" cy="6.5" r="1"/><circle cx="15" cy="7" r="1"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  unlock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2.6"/></svg>'
};
