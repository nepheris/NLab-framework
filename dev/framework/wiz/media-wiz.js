const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export class MediaWiz {
  render(media, { mode = 'preview', alt = null, loading = 'lazy', ratio = null, objectFit = null } = {}) {
    if (!media) return '';
    const item = typeof media === 'string' ? { url:media } : media;
    const rawUrl = this.#firstSafeUrl(item.url, item.fallbackUrl, item.fallback);
    const type = item.type ?? this.#infer(rawUrl);
    const url = escapeHTML(rawUrl);
    const label = escapeHTML(alt ?? item.alt ?? item.label ?? '');
    const safeLoading = this.#loading(loading ?? item.loading);
    const style = this.#style({ ratio:ratio ?? item.ratio ?? item.aspectRatio, objectFit:objectFit ?? item.objectFit });
    const styleAttr = style ? ` style="${escapeHTML(style)}"` : '';

    if (type === 'image') return rawUrl ? `<img src="${url}" alt="${label}" loading="${safeLoading}"${styleAttr}>` : '';
    if (type === 'svg') {
      if (item.inline) return String(item.inline);
      return rawUrl ? `<img src="${url}" alt="${label}" loading="${safeLoading}"${styleAttr}>` : '';
    }
    if (type === 'video') return rawUrl ? `<video controls preload="metadata" src="${url}"${styleAttr}>${label}</video>` : '';
    if (type === 'audio') return rawUrl ? `<audio controls preload="metadata" src="${url}">${label}</audio>` : '';
    if (type === 'pdf') {
      if (!rawUrl) return '';
      return mode === 'link'
        ? `<a href="${url}" target="_blank" rel="noopener">${label || 'PDF'}</a>`
        : `<object data="${url}" type="application/pdf"><a href="${url}">${label || 'PDF'}</a></object>`;
    }
    return rawUrl ? `<a href="${url}" target="_blank" rel="noopener">${label || url}</a>` : '';
  }

  gallery(items = [], options = {}) { return `<div class="nlab-grid nlab-media-gallery">${items.map((item)=>`<figure>${this.render(item,options)}${item?.label?`<figcaption>${escapeHTML(item.label)}</figcaption>`:''}</figure>`).join('')}</div>`; }
  filmstrip(items = [], options = {}) { return `<div class="nlab-media-filmstrip" style="display:flex;overflow-x:auto;gap:1rem;scroll-snap-type:x mandatory">${items.map((item)=>`<figure style="min-width:min(75vw,320px);scroll-snap-align:start">${this.render(item,options)}${item?.label?`<figcaption>${escapeHTML(item.label)}</figcaption>`:''}</figure>`).join('')}</div>`; }

  #firstSafeUrl(...values) {
    for (const value of values) {
      if (value == null || value === '') continue;
      const text = String(value).trim();
      if (!text || /^(?:javascript|vbscript):/i.test(text) || /^data:text\/html/i.test(text)) continue;
      return text;
    }
    return '';
  }

  #loading(value) { return value === 'eager' ? 'eager' : 'lazy'; }

  #style({ ratio = null, objectFit = null } = {}) {
    const declarations = [];
    const normalizedRatio = this.#ratio(ratio);
    if (normalizedRatio) declarations.push(`aspect-ratio:${normalizedRatio}`);
    const fit = String(objectFit ?? '').toLowerCase();
    if (['cover','contain','fill','none','scale-down'].includes(fit)) declarations.push(`object-fit:${fit}`);
    return declarations.join(';');
  }

  #ratio(value) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return String(value);
    const text = String(value ?? '').trim();
    if (/^\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?$/.test(text)) return text.replace(/\s+/g,'');
    if (/^\d+(?:\.\d+)?$/.test(text) && Number(text) > 0) return text;
    return '';
  }

  #infer(url) { const ext=String(url).split(/[?#]/)[0].split('.').pop()?.toLowerCase(); if(['png','jpg','jpeg','webp','gif','avif'].includes(ext))return'image'; if(ext==='svg')return'svg'; if(['mp4','webm'].includes(ext))return'video'; if(['mp3','ogg','wav'].includes(ext))return'audio'; if(ext==='pdf')return'pdf'; return'file'; }
}
