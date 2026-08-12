const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export class MediaWiz {
  render(media, { mode = 'preview', alt = null, loading = 'lazy', ratio = null, objectFit = null } = {}) {
    if (!media) return '';
    const item = typeof media === 'string' ? { url:media } : media;
    const rawUrl = this.#firstSafeUrl(item.url, item.fallbackUrl, item.fallback);
    const type = item.type ?? this.#infer(rawUrl);
    const normalizedMode = this.#mode(mode ?? item.mode);
    const url = escapeHTML(rawUrl);
    const label = escapeHTML(alt ?? item.alt ?? item.label ?? '');
    const safeLoading = this.#loading(loading ?? item.loading);
    const style = this.#style({ ratio:ratio ?? item.ratio ?? item.aspectRatio, objectFit:objectFit ?? item.objectFit });
    const styleAttr = style ? ` style="${escapeHTML(style)}"` : '';
    if (!rawUrl && !(type === 'svg' && item.inline && ['preview','viewer','inline'].includes(normalizedMode))) return '';

    if (normalizedMode === 'download') return this.#download(rawUrl, label || this.#typeLabel(type), item);
    if (normalizedMode === 'new-tab') return this.#newTab(rawUrl, label || this.#typeLabel(type), type);

    if (type === 'image') {
      const image = `<img src="${url}" alt="${label}" loading="${safeLoading}"${styleAttr}>`;
      return normalizedMode === 'thumbnail' ? this.#thumbnail(rawUrl, image, type, label) : image;
    }
    if (type === 'svg') {
      if (item.inline && ['preview','viewer','inline'].includes(normalizedMode)) return String(item.inline);
      const image = `<img src="${url}" alt="${label}" loading="${safeLoading}"${styleAttr}>`;
      return normalizedMode === 'thumbnail' ? this.#thumbnail(rawUrl, image, type, label) : image;
    }
    if (type === 'video') {
      if (normalizedMode === 'thumbnail') return this.#thumbnail(rawUrl, '', type, label || 'Video');
      return `<video controls preload="metadata" src="${url}"${styleAttr}>${label}</video>`;
    }
    if (type === 'audio') {
      if (normalizedMode === 'thumbnail') return this.#thumbnail(rawUrl, '', type, label || 'Audio');
      return `<audio controls preload="metadata" src="${url}">${label}</audio>`;
    }
    if (type === 'pdf') {
      if (normalizedMode === 'thumbnail') return this.#thumbnail(rawUrl, '', type, label || 'PDF');
      return `<object class="nlab-media-viewer nlab-media-viewer--pdf" data="${url}" type="application/pdf"><a href="${url}" target="_blank" rel="noopener">${label || 'PDF'}</a></object>`;
    }
    if (normalizedMode === 'thumbnail') return this.#thumbnail(rawUrl, '', type, label || url);
    return this.#newTab(rawUrl, label || url, type);
  }

  gallery(items = [], options = {}) { return `<div class="nlab-grid nlab-media-gallery">${items.map((item)=>`<figure>${this.render(item,options)}${item?.label?`<figcaption>${escapeHTML(item.label)}</figcaption>`:''}</figure>`).join('')}</div>`; }
  filmstrip(items = [], options = {}) { return `<div class="nlab-media-filmstrip" style="display:flex;overflow-x:auto;gap:1rem;scroll-snap-type:x mandatory">${items.map((item)=>`<figure style="min-width:min(75vw,320px);scroll-snap-align:start">${this.render(item,options)}${item?.label?`<figcaption>${escapeHTML(item.label)}</figcaption>`:''}</figure>`).join('')}</div>`; }

  #mode(value) {
    const mode = String(value ?? 'preview').trim().toLowerCase();
    if (['link','new-tab','newtab','external'].includes(mode)) return 'new-tab';
    if (['thumb','thumbnail','vignette'].includes(mode)) return 'thumbnail';
    if (['download','preview','viewer','inline'].includes(mode)) return mode;
    return 'preview';
  }

  #newTab(rawUrl, label, type) {
    if (!rawUrl) return '';
    return `<a class="nlab-media-link nlab-media-link--${escapeHTML(type)}" href="${escapeHTML(rawUrl)}" target="_blank" rel="noopener">${label}</a>`;
  }

  #download(rawUrl, label, item) {
    if (!rawUrl) return '';
    const name = this.#downloadName(item, rawUrl);
    return `<a class="nlab-media-download" href="${escapeHTML(rawUrl)}" download="${escapeHTML(name)}">${label}</a>`;
  }

  #thumbnail(rawUrl, inner, type, label) {
    if (!rawUrl) return '';
    const content = inner || `<span class="nlab-media-thumbnail__label">${label}</span>`;
    return `<a class="nlab-media-thumbnail nlab-media-thumbnail--${escapeHTML(type)}" href="${escapeHTML(rawUrl)}" target="_blank" rel="noopener">${content}</a>`;
  }

  #downloadName(item, rawUrl) {
    const explicit = String(item?.downloadName ?? item?.filename ?? '').trim();
    if (explicit) return explicit;
    const clean = String(rawUrl).split(/[?#]/)[0];
    const segment = clean.split('/').filter(Boolean).pop();
    return segment || 'download';
  }

  #typeLabel(type) {
    return ({image:'Image',svg:'SVG',video:'Video',audio:'Audio',pdf:'PDF',file:'File'})[type] ?? 'File';
  }

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
