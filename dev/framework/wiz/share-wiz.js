export class ShareWiz {
  constructor({ urlResolver = null, qrWiz = null } = {}) { this.urlResolver=urlResolver; this.qrWiz=qrWiz; }
  metadata(input = {}) {
    const url=input.url ?? this.urlResolver?.current({ stripHash:false }) ?? globalThis.location?.href ?? '';
    return { title:input.title ?? globalThis.document?.title ?? '', description:input.description ?? '', url, canonical_url:input.canonical_url ?? url, image:input.image ?? input.sectionImage ?? input.siteImage ?? input.fallbackImage ?? null };
  }
  async copyUrl(meta = {}) { const data=this.metadata(meta); if(!globalThis.navigator?.clipboard) return { ok:false, reason:'clipboard-unavailable', value:data.url }; await navigator.clipboard.writeText(data.url); return { ok:true, value:data.url }; }
  email(meta = {}) { const data=this.metadata(meta); return `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent([data.description,data.url].filter(Boolean).join('\n\n'))}`; }
  async native(meta = {}) { const data=this.metadata(meta); if(!navigator?.share) return { ok:false, reason:'web-share-unavailable', data }; await navigator.share({ title:data.title, text:data.description, url:data.url }); return { ok:true, data }; }
  print() { globalThis.print?.(); }
  async qr(config = {}) { if(!this.qrWiz) throw new Error('QRWiz not configured'); return this.qrWiz.generate(config); }
}
