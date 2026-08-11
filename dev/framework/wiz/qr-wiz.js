export class QRWiz {
  constructor({ urlResolver = null, encoder = null } = {}) { this.urlResolver = urlResolver; this.encoder = encoder; }

  payload({ url = null, canonical = false, stripHash = false } = {}) {
    if (url) return String(this.urlResolver ? this.urlResolver.resolve(url) : url);
    if (!this.urlResolver) return String(globalThis.location?.href ?? '');
    return String(canonical ? this.urlResolver.current({ stripHash:true, stripQuery:true }) : this.urlResolver.current({ stripHash }));
  }

  options(options = {}) {
    const width = this.#number(options.width, 256, { min:64, max:4096, integer:true });
    const margin = this.#number(options.margin, 2, { min:0, max:64, integer:true });
    const errorCorrectionLevel = String(options.errorCorrectionLevel ?? 'M').toUpperCase();
    const format = String(options.format ?? 'svg').toLowerCase();
    return {
      width,
      margin,
      errorCorrectionLevel: ['L','M','Q','H'].includes(errorCorrectionLevel) ? errorCorrectionLevel : 'M',
      color: {
        dark: String(options.dark ?? options.color?.dark ?? '#000000'),
        light: String(options.light ?? options.color?.light ?? '#ffffff')
      },
      transparent: Boolean(options.transparent),
      logo: options.logo ?? null,
      logoSize: this.#number(options.logoSize, 0.22, { min:0.10, max:0.32 }),
      logoBackground: String(options.logoBackground ?? '#ffffff'),
      logoRadius: this.#number(options.logoRadius, 12, { min:0, max:256 }),
      format: ['svg','png'].includes(format) ? format : 'svg'
    };
  }

  async generate(config = {}) {
    if (!this.encoder || typeof this.encoder.encode !== 'function') throw new Error('QRWiz requires an encoder adapter');
    const payload = this.payload(config);
    if (!payload.trim()) throw new Error('QRWiz payload is empty');
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
    if (!container) return null;
    const output = await this.generate(config);
    if (typeof output === 'string' && output.trim().startsWith('<svg')) {
      container.innerHTML = output;
      return output;
    }
    if (typeof output === 'string') {
      const doc = container.ownerDocument ?? globalThis.document;
      if (!doc?.createElement) return output;
      const img = doc.createElement('img');
      img.src = output;
      img.alt = config.alt ?? 'QR code';
      container.replaceChildren?.(img);
      return output;
    }
    if (output && typeof output === 'object' && Number.isInteger(output.nodeType)) container.replaceChildren?.(output);
    return output;
  }

  #decorate(output, options) {
    if (!options.logo || typeof output !== 'string' || !output.trim().startsWith('<svg')) return output;
    const size = options.logoSize;
    const pct = size * 100;
    const pos = (100 - pct) / 2;
    const pad = 2.5;
    const rectPos = pos - pad;
    const rectSize = pct + pad * 2;
    const href = this.#escapeAttribute(options.logo);
    const background = this.#escapeAttribute(options.logoBackground || '#ffffff');
    const radius = options.logoRadius;
    const overlay = `<g class="nlab-qr-logo"><rect x="${rectPos}%" y="${rectPos}%" width="${rectSize}%" height="${rectSize}%" rx="${radius}" fill="${background}"/><image href="${href}" x="${pos}%" y="${pos}%" width="${pct}%" height="${pct}%" preserveAspectRatio="xMidYMid meet"/></g>`;
    return output.replace('</svg>', `${overlay}</svg>`);
  }

  #number(value, fallback, { min = -Infinity, max = Infinity, integer = false } = {}) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    const bounded = Math.max(min, Math.min(max, number));
    return integer ? Math.round(bounded) : bounded;
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
