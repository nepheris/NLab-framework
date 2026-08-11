export class ShareWiz {
  constructor({ urlResolver = null, qrWiz = null } = {}) { this.urlResolver=urlResolver; this.qrWiz=qrWiz; }

  metadata(input = {}) {
    const url=String(input.url ?? this.urlResolver?.current({ stripHash:false }) ?? globalThis.location?.href ?? '');
    return {
      title:String(input.title ?? globalThis.document?.title ?? ''),
      description:String(input.description ?? ''),
      url,
      canonical_url:String(input.canonical_url ?? url),
      image:input.image ?? input.sectionImage ?? input.siteImage ?? input.fallbackImage ?? null
    };
  }

  async copyUrl(meta = {}) {
    const data=this.metadata(meta);
    const clipboard=globalThis.navigator?.clipboard;
    if(!clipboard?.writeText) return { ok:false, reason:'clipboard-unavailable', value:data.url };
    try {
      await clipboard.writeText(data.url);
      return { ok:true, value:data.url };
    } catch(error) {
      return { ok:false, reason:'clipboard-error', value:data.url, error };
    }
  }

  email(meta = {}) {
    const data=this.metadata(meta);
    return `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodeURIComponent([data.description,data.url].filter(Boolean).join('\n\n'))}`;
  }

  async native(meta = {}) {
    const data=this.metadata(meta);
    const navigatorRef=globalThis.navigator;
    const share=navigatorRef?.share;
    if(!share) return { ok:false, reason:'web-share-unavailable', data };
    try {
      await share.call(navigatorRef,{ title:data.title, text:data.description, url:data.url });
      return { ok:true, data };
    } catch(error) {
      return { ok:false, reason:'web-share-error', data, error };
    }
  }

  print() { return globalThis.print?.(); }
  async qr(config = {}) { if(!this.qrWiz) throw new Error('QRWiz not configured'); return this.qrWiz.generate(config); }
}
