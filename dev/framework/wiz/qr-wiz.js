const cleanLine = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
const escapeWifi = (value) => String(value ?? '').replace(/([\\;,:"])/g, '\\$1');
const escapeVCard = (value) => String(value ?? '')
  .replaceAll('\\', '\\\\')
  .replace(/\r?\n/g, '\\n')
  .replaceAll(';', '\\;')
  .replaceAll(',', '\\,');

export class QRWiz {
  constructor({ urlResolver = null, encoder = null } = {}) { this.urlResolver = urlResolver; this.encoder = encoder; }

  payload(config = {}) {
    const type = String(config.type ?? 'url').trim().toLowerCase();
    if (type === 'text') return String(config.text ?? config.value ?? '');
    if (['email','mail'].includes(type)) return this.#emailPayload(config);
    if (['tel','phone','telephone'].includes(type)) return this.#phonePayload(config);
    if (['wifi','wi-fi'].includes(type)) return this.#wifiPayload(config.wifi ?? config);
    if (['contact','vcard'].includes(type)) return this.#contactPayload(config.contact ?? config);
    if (type !== 'url') return '';

    const { url = null, canonical = false, stripHash = false } = config;
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

  #emailPayload(config) {
    const address = cleanLine(config.email ?? config.address);
    if (!address) return '';
    const params = [];
    if (config.subject != null && String(config.subject) !== '') params.push(`subject=${encodeURIComponent(String(config.subject))}`);
    if (config.body != null && String(config.body) !== '') params.push(`body=${encodeURIComponent(String(config.body))}`);
    return `mailto:${address}${params.length ? `?${params.join('&')}` : ''}`;
  }

  #phonePayload(config) {
    const phone = cleanLine(config.phone ?? config.tel ?? config.number).replace(/\s+/g, '');
    return phone ? `tel:${phone}` : '';
  }

  #wifiPayload(config) {
    const ssid = cleanLine(config.ssid ?? config.name);
    if (!ssid) return '';
    const rawSecurity = String(config.security ?? config.auth ?? 'WPA').trim().toUpperCase();
    const security = ['NONE','OPEN','NOPASS'].includes(rawSecurity) ? 'nopass' : rawSecurity === 'WEP' ? 'WEP' : 'WPA';
    const password = String(config.password ?? config.pass ?? '');
    const hidden = Boolean(config.hidden);
    return `WIFI:T:${security};S:${escapeWifi(ssid)};${security === 'nopass' ? '' : `P:${escapeWifi(password)};`}H:${hidden ? 'true' : 'false'};;`;
  }

  #contactPayload(config) {
    const firstName = cleanLine(config.firstName ?? config.givenName);
    const lastName = cleanLine(config.lastName ?? config.familyName);
    const fullName = cleanLine(config.name ?? config.fullName) || [firstName, lastName].filter(Boolean).join(' ');
    if (!fullName) return '';

    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVCard(fullName)}`];
    if (firstName || lastName) lines.push(`N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`);
    if (config.organization ?? config.org) lines.push(`ORG:${escapeVCard(config.organization ?? config.org)}`);
    if (config.phone ?? config.tel) lines.push(`TEL:${escapeVCard(cleanLine(config.phone ?? config.tel))}`);
    if (config.email) lines.push(`EMAIL:${escapeVCard(cleanLine(config.email))}`);
    if (config.url) lines.push(`URL:${escapeVCard(cleanLine(config.url))}`);
    const address = config.address;
    if (address && typeof address === 'object') {
      lines.push(`ADR:;;${escapeVCard(address.street ?? '')};${escapeVCard(address.city ?? '')};${escapeVCard(address.region ?? '')};${escapeVCard(address.postalCode ?? address.zip ?? '')};${escapeVCard(address.country ?? '')}`);
    } else if (address) {
      lines.push(`ADR:;;${escapeVCard(address)};;;;`);
    }
    if (config.note) lines.push(`NOTE:${escapeVCard(config.note)}`);
    lines.push('END:VCARD');
    return lines.join('\r\n');
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
