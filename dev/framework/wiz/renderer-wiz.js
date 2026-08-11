const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export class RendererWiz {
  constructor() { this.renderers = new Map(); this.#registerCore(); }
  register(id, renderer) { if (!id || typeof renderer !== 'function') throw new Error('Renderer id and function are required'); this.renderers.set(id, renderer); return this; }
  has(id) { return this.renderers.has(id); }
  render(id, items, options = {}) { const renderer = this.renderers.get(id); if (!renderer) throw new Error(`Unknown renderer: ${id}`); return renderer(items, options); }
  chooseForWidth(width, config = {}) {
    const breakpoints = config.breakpoints ?? { 0:'list', 480:'compact-cards', 760:'cards', 1100:'filmstrip' };
    return Object.entries(breakpoints).map(([min, renderer]) => [Number(min), renderer]).filter(([min]) => width >= min).sort((a,b) => b[0]-a[0])[0]?.[1] ?? config.default ?? 'list';
  }

  #registerCore() {
    const fields = (item, options) => ({ title:item?.[options.titleField ?? 'name'] ?? item?.[options.labelField ?? 'label'] ?? item?.id ?? '', text:item?.[options.textField ?? 'description'] ?? '', image:item?.[options.imageField ?? 'image'] ?? item?.image_url ?? '' });
    this.register('cards', (items, options = {}) => `<div class="nlab-grid nlab-render-cards">${items.map((item) => { const v=fields(item,options); return `<article class="nlab-card">${v.image?`<img src="${escapeHTML(v.image)}" alt="">`:''}<h3>${escapeHTML(v.title)}</h3>${v.text?`<p>${escapeHTML(v.text)}</p>`:''}</article>`; }).join('')}</div>`);
    this.register('compact-cards', (items, options = {}) => `<div class="nlab-grid nlab-render-compact">${items.map((item) => { const v=fields(item,options); return `<article class="nlab-card nlab-card--compact"><strong>${escapeHTML(v.title)}</strong></article>`; }).join('')}</div>`);
    this.register('list', (items, options = {}) => `<ul class="nlab-render-list">${items.map((item) => { const v=fields(item,options); return `<li><strong>${escapeHTML(v.title)}</strong>${v.text?` — ${escapeHTML(v.text)}`:''}</li>`; }).join('')}</ul>`);
    this.register('links', (items, options = {}) => `<ul class="nlab-render-links">${items.map((item) => { const v=fields(item,options); const href=item?.[options.urlField ?? 'url'] ?? '#'; return `<li><a href="${escapeHTML(href)}">${escapeHTML(v.title)}</a></li>`; }).join('')}</ul>`);
    this.register('gallery', (items, options = {}) => `<div class="nlab-grid nlab-render-gallery">${items.map((item) => { const v=fields(item,options); return v.image?`<figure><img src="${escapeHTML(v.image)}" alt="${escapeHTML(v.title)}"><figcaption>${escapeHTML(v.title)}</figcaption></figure>`:''; }).join('')}</div>`);
    this.register('tiles', (items, options = {}) => `<div class="nlab-grid nlab-render-tiles">${items.map((item) => { const v=fields(item,options); return `<div class="nlab-tile"><strong>${escapeHTML(v.title)}</strong></div>`; }).join('')}</div>`);
    this.register('filmstrip', (items, options = {}) => `<div class="nlab-render-filmstrip" style="display:flex;overflow-x:auto;gap:1rem;scroll-snap-type:x mandatory">${items.map((item) => { const v=fields(item,options); return `<article style="min-width:min(78vw,320px);scroll-snap-align:start">${v.image?`<img src="${escapeHTML(v.image)}" alt="">`:''}<h3>${escapeHTML(v.title)}</h3></article>`; }).join('')}</div>`);
    this.register('table', (items) => { const columns=[...new Set(items.flatMap((item)=>Object.keys(item??{})))]; return `<table><thead><tr>${columns.map((c)=>`<th>${escapeHTML(c)}</th>`).join('')}</tr></thead><tbody>${items.map((item)=>`<tr>${columns.map((c)=>`<td>${escapeHTML(Array.isArray(item[c])?item[c].join(', '):item[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`; });
  }
}
