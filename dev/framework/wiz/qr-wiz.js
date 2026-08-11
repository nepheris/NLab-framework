export class QRWiz {
  constructor({ urlResolver = null, encoder = null } = {}) { this.urlResolver = urlResolver; this.encoder = encoder; }
  payload({ url = null, canonical = false, stripHash = false } = {}) {
    if (url) return this.urlResolver ? this.urlResolver.resolve(url) : String(url);
    if (!this.urlResolver) return globalThis.location?.href ?? '';
    return canonical ? this.urlResolver.current({ stripHash:true, stripQuery:true }) : this.urlResolver.current({ stripHash });
  }
  options(options = {}) {
    return {
      width: options.width ?? 256,
      margin: options.margin ?? 2,
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
      color: { dark:options.dark ?? options.color?.dark ?? '#000000', light:options.light ?? options.color?.light ?? '#ffffff' },
      transparent: Boolean(options.transparent),
      logo: options.logo ?? null,
      format: options.format ?? 'svg'
    };
  }
  async generate(config = {}) {
    if (!this.encoder) throw new Error('QRWiz requires an encoder adapter');
    const payload = this.payload(config); const options = this.options(config);
    return this.encoder.encode(payload, options);
  }
  async render(container, config = {}) {
    if (!container) return;
    const output = await this.generate(config);
    if (typeof output === 'string' && output.trim().startsWith('<svg')) container.innerHTML = output;
    else if (typeof output === 'string') { const img=document.createElement('img'); img.src=output; img.alt=config.alt ?? 'QR code'; container.replaceChildren(img); }
    else if (output instanceof Node) container.replaceChildren(output);
  }
}

export class QRCodeEncoderAdapter {
  constructor(qrcodeLibrary) { this.library = qrcodeLibrary; }
  async encode(text, options) {
    const lib=this.library;
    if (options.format==='svg' && lib?.toString) return lib.toString(text,{ ...options, type:'svg' });
    if (lib?.toDataURL) return lib.toDataURL(text,options);
    throw new Error('Unsupported QR encoder library');
  }
}
