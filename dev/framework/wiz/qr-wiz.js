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
      color: {
        dark: options.dark ?? options.color?.dark ?? '#000000',
        light: options.light ?? options.color?.light ?? '#ffffff'
      },
      transparent: Boolean(options.transparent),
      logo: options.logo ?? null,
      logoSize: options.logoSize ?? 0.22,
      logoBackground: options.logoBackground ?? '#ffffff',
      logoRadius: options.logoRadius ?? 12,
      format: options.format ?? 'svg'
    };
  }

  async generate(config = {}) {
    if (!this.encoder) throw new Error('QRWiz requires an encoder adapter');
    const payload = this.payload(config);
    const options = this.options(config);
    const output = await this.encoder.encode(payload, {
      ...options,
      color: {
        dark: options.color.dark,
        light: options.transparent ? '#00000000' : options.color.light
      }
    });
    return this.#decorate(output, options);
  }

  async render(container, config = {}) {
    if (!container) return;
    const output = await this.generate(config);
    if (typeof output === 'string' && output.trim().startsWith('<svg')) container.innerHTML = output;
    else if (typeof output === 'string') {
      const img = document.createElement('img');
      img.src = output;
      img.alt = config.alt ?? 'QR code';
      container.replaceChildren(img);
    } else if (output instanceof Node) container.replaceChildren(output);
  }

  #decorate(output, options) {
    if (!options.logo || typeof output !== 'string' || !output.trim().startsWith('<svg')) return output;
    const size = Math.max(0.10, Math.min(0.32, Number(options.logoSize) || 0.22));
    const pct = size * 100;
    const pos = (100 - pct) / 2;
    const pad = 2.5;
    const rectPos = pos - pad;
    const rectSize = pct + pad * 2;
    const href = this.#escapeAttribute(options.logo);
    const background = this.#escapeAttribute(options.logoBackground || '#ffffff');
    const radius = Math.max(0, Number(options.logoRadius) || 0);
    const overlay = `<g class="nlab-qr-logo"><rect x="${rectPos}%" y="${rectPos}%" width="${rectSize}%" height="${rectSize}%" rx="${radius}" fill="${background}"/><image href="${href}" x="${pos}%" y="${pos}%" width="${pct}%" height="${pct}%" preserveAspectRatio="xMidYMid meet"/></g>`;
    return output.replace('</svg>', `${overlay}</svg>`);
  }

  #escapeAttribute(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }
}

export class QRCodeEncoderAdapter {
  constructor(qrcodeLibrary) { this.library = qrcodeLibrary; }

  async encode(text, options) {
    const lib = this.library;
    const encoderOptions = {
      width: options.width,
      margin: options.margin,
      errorCorrectionLevel: options.errorCorrectionLevel,
      color: options.color
    };
    if (options.format === 'svg' && lib?.toString) return lib.toString(text,{ ...encoderOptions, type:'svg' });
    if (lib?.toDataURL) return lib.toDataURL(text,encoderOptions);
    throw new Error('Unsupported QR encoder library');
  }
}
