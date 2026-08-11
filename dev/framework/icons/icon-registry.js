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

const line = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const CORE_ICONS = {
  help: line('<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.2 1.8c-1 .8-1.9 1.3-1.9 2.7"/><path d="M12 17h.01"/>'),
  info: line('<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7h.01"/>'),
  search: line('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
  filter: line('<path d="M4 5h16M7 12h10M10 19h4"/>'),
  settings: line('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1H9.6V21a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1V9.6h.1A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.56 3.7l.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1v-.1h4v.1A1.7 1.7 0 0 0 15 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.5a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1 .4h.1v4h-.1a1.7 1.7 0 0 0-1.6 1.1Z"/>'),
  refresh: line('<path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 1-2-5"/>'),
  reset: line('<path d="M4 7v5h5"/><path d="M5 12a7 7 0 1 0 2-5"/>'),
  export: line('<path d="M12 3v12"/><path d="m8 7 4-4 4 4"/><path d="M5 14v6h14v-6"/>'),
  download: line('<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M5 20h14"/>'),
  copy: line('<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'),
  edit: line('<path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'),
  lock: line('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
  unlock: line('<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2.6"/>'),
  pin: line('<path d="m14 4 6 6-3 1-4 4-1 5-2-2-2-2 5-1 4-4 1-3Z"/><path d="m4 20 6-6"/>'),
  unpin: line('<path d="m14 4 6 6-3 1-2 2"/><path d="m9 16-1 4-2-2-2-2 4-1"/><path d="m4 20 5-5"/><path d="M3 3l18 18"/>'),
  close: line('<path d="M5 5l14 14M19 5 5 19"/>'),
  resize: line('<path d="M8 16 16 8M11 19h8v-8"/><path d="M5 5h8"/>'),
  collapse: line('<path d="m7 14 5-5 5 5"/>'),
  expand: line('<path d="m7 10 5 5 5-5"/>'),
  eye: line('<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.5"/>'),
  eyeOff: line('<path d="M3 3l18 18"/><path d="M10.6 6.2A11 11 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.1 2.8"/><path d="M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a10 10 0 0 0 3.1-.5"/>'),
  responsive: line('<rect x="3" y="5" width="14" height="10" rx="1"/><rect x="17" y="9" width="4" height="10" rx="1"/><path d="M7 19h6"/>'),
  image: line('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>'),
  table: line('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/>'),
  cards: line('<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/>'),
  list: line('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>'),
  palette: line('<path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a1.5 1.5 0 0 1 0-3h3a6 6 0 0 0 6-6c0-3-4-5-9-5Z"/><circle cx="7.5" cy="9" r="1"/><circle cx="10" cy="6.5" r="1"/><circle cx="15" cy="7" r="1"/>'),
  sortAsc: line('<path d="M7 18V5M4 8l3-3 3 3"/><path d="M14 7h6M14 12h4M14 17h2"/>'),
  sortDesc: line('<path d="M7 5v13M4 15l3 3 3-3"/><path d="M14 7h2M14 12h4M14 17h6"/>'),
  chevronLeft: line('<path d="m15 18-6-6 6-6"/>'),
  chevronRight: line('<path d="m9 18 6-6-6-6"/>')
};

export function createCoreIconRegistry() {
  return new IconRegistry().registerPack(CORE_ICONS);
}
