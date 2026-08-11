const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export class MediaWiz {
  render(media, { mode = 'preview', alt = null, loading = 'lazy' } = {}) {
    if (!media) return '';
    const item = typeof media === 'string' ? { url:media } : media;
    const type = item.type ?? this.#infer(item.url ?? '');
    const url = escapeHTML(item.url ?? '');
    const label = escapeHTML(alt ?? item.alt ?? item.label ?? '');
    if (type === 'image') return `<img src="${url}" alt="${label}" loading="${loading}">`;
    if (type === 'svg') return item.inline ? String(item.inline) : `<img src="${url}" alt="${label}" loading="${loading}">`;
    if (type === 'video') return `<video controls preload="metadata" src="${url}">${label}</video>`;
    if (type === 'audio') return `<audio controls preload="metadata" src="${url}">${label}</audio>`;
    if (type === 'pdf') return mode === 'link' ? `<a href="${url}" target="_blank" rel="noopener">${label || 'PDF'}</a>` : `<object data="${url}" type="application/pdf"><a href="${url}">${label || 'PDF'}</a></object>`;
    return `<a href="${url}" target="_blank" rel="noopener">${label || url}</a>`;
  }

  gallery(items = [], options = {}) { return `<div class="nlab-grid nlab-media-gallery">${items.map((item)=>`<figure>${this.render(item,options)}${item?.label?`<figcaption>${escapeHTML(item.label)}</figcaption>`:''}</figure>`).join('')}</div>`; }
  filmstrip(items = [], options = {}) { return `<div class="nlab-media-filmstrip" style="display:flex;overflow-x:auto;gap:1rem;scroll-snap-type:x mandatory">${items.map((item)=>`<figure style="min-width:min(75vw,320px);scroll-snap-align:start">${this.render(item,options)}${item?.label?`<figcaption>${escapeHTML(item.label)}</figcaption>`:''}</figure>`).join('')}</div>`; }
  #infer(url) { const ext=String(url).split(/[?#]/)[0].split('.').pop()?.toLowerCase(); if(['png','jpg','jpeg','webp','gif','avif'].includes(ext))return'image'; if(ext==='svg')return'svg'; if(['mp4','webm'].includes(ext))return'video'; if(['mp3','ogg','wav'].includes(ext))return'audio'; if(ext==='pdf')return'pdf'; return'file'; }
}
