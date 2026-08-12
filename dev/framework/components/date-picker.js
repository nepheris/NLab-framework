function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidIsoDate(value) {
  const text = String(value ?? '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function normalizeIsoDate(value, { allowEmpty = true } = {}) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (allowEmpty) return '';
    throw new TypeError('Date value is required');
  }
  if (!isValidIsoDate(text)) throw new TypeError(`Invalid ISO date: ${text}`);
  return text;
}

function normalizeId(value) {
  const text = String(value ?? '').trim();
  return text || 'nlab-date-picker';
}

function normalizeCallback(value) {
  return typeof value === 'function' ? value : null;
}

export class DatePicker {
  static isValidIsoDate(value) {
    return isValidIsoDate(value);
  }

  static normalizeDate(value, options = {}) {
    return normalizeIsoDate(value, options);
  }

  constructor({
    value = '',
    min = '',
    max = '',
    required = false,
    disabled = false,
    id = 'nlab-date-picker',
    name = '',
    label = 'Date',
    help = '',
    onChange = null,
    documentRef = globalThis.document ?? null
  } = {}) {
    this.value = normalizeIsoDate(value);
    this.min = normalizeIsoDate(min);
    this.max = normalizeIsoDate(max);
    this.required = Boolean(required);
    this.disabled = Boolean(disabled);
    this.id = normalizeId(id);
    this.name = String(name ?? '').trim();
    this.label = String(label ?? 'Date');
    this.help = String(help ?? '');
    this.onChange = normalizeCallback(onChange);
    this.document = documentRef;
    this.element = null;
    this.assertRange();
  }

  assertRange(min = this.min, max = this.max) {
    if (min && max && min > max) {
      throw new RangeError(`DatePicker min (${min}) must be <= max (${max})`);
    }
    return true;
  }

  validate(value = this.value) {
    const raw = String(value ?? '').trim();
    const errors = [];

    if (!raw) {
      if (this.required) errors.push({ code: 'required', message: 'Date required' });
      return { valid: errors.length === 0, value: '', errors };
    }

    if (!isValidIsoDate(raw)) {
      errors.push({ code: 'invalid-date', message: 'Expected YYYY-MM-DD' });
      return { valid: false, value: raw, errors };
    }

    if (this.min && raw < this.min) {
      errors.push({ code: 'min', message: `Date must be on or after ${this.min}`, min: this.min });
    }
    if (this.max && raw > this.max) {
      errors.push({ code: 'max', message: `Date must be on or before ${this.max}`, max: this.max });
    }

    return { valid: errors.length === 0, value: raw, errors };
  }

  setValue(value, { emit = true, render = true, source = 'api' } = {}) {
    const raw = String(value ?? '').trim();
    if (raw && !isValidIsoDate(raw)) {
      return { changed: false, ...this.validate(raw) };
    }

    const validation = this.validate(raw);
    if (!validation.valid) return { changed: false, ...validation };

    const changed = raw !== this.value;
    this.value = raw;
    if (render) this.render();
    if (emit && changed) this.emitChange(source);
    return { changed, ...validation };
  }

  setRange({ min = this.min, max = this.max } = {}) {
    const nextMin = normalizeIsoDate(min);
    const nextMax = normalizeIsoDate(max);
    this.assertRange(nextMin, nextMax);
    this.min = nextMin;
    this.max = nextMax;
    const validation = this.validate();
    this.render();
    return validation;
  }

  setRequired(value = true) {
    this.required = Boolean(value);
    this.render();
    return this;
  }

  setDisabled(value = true) {
    this.disabled = Boolean(value);
    this.render();
    return this;
  }

  setOnChange(callback) {
    this.onChange = normalizeCallback(callback);
    return this;
  }

  state() {
    const validation = this.validate();
    return {
      value: this.value,
      min: this.min,
      max: this.max,
      required: this.required,
      disabled: this.disabled,
      valid: validation.valid,
      errors: validation.errors.map((error) => ({ ...error }))
    };
  }

  emitChange(source = 'api') {
    const detail = { ...this.state(), source };
    this.onChange?.(detail);
    if (this.element?.dispatchEvent && typeof globalThis.CustomEvent === 'function') {
      this.element.dispatchEvent(new globalThis.CustomEvent('nlab:date-change', { detail }));
    }
    return detail;
  }

  mount(element) {
    this.element = element ?? null;
    this.render();
    return this;
  }

  render() {
    if (!this.element) return this;
    const validation = this.validate();
    const errorText = validation.errors.map((error) => error.message).join(' · ');
    const helpId = `${this.id}-help`;
    const errorId = `${this.id}-error`;
    const describedBy = [this.help ? helpId : '', errorText ? errorId : ''].filter(Boolean).join(' ');

    this.element.innerHTML = `<div class="nlab-date-picker"><label class="nlab-date-picker__label" for="${escapeHtml(this.id)}">${escapeHtml(this.label)}</label><input class="nlab-date-picker__input" type="date" id="${escapeHtml(this.id)}"${this.name ? ` name="${escapeHtml(this.name)}"` : ''} value="${escapeHtml(this.value)}"${this.min ? ` min="${escapeHtml(this.min)}"` : ''}${this.max ? ` max="${escapeHtml(this.max)}"` : ''}${this.required ? ' required' : ''}${this.disabled ? ' disabled' : ''}${describedBy ? ` aria-describedby="${escapeHtml(describedBy)}"` : ''} aria-invalid="${validation.valid ? 'false' : 'true'}">${this.help ? `<div class="nlab-date-picker__help" id="${escapeHtml(helpId)}">${escapeHtml(this.help)}</div>` : ''}<div class="nlab-date-picker__error" id="${escapeHtml(errorId)}" role="status" aria-live="polite"${errorText ? '' : ' hidden'}>${escapeHtml(errorText)}</div></div>`;

    const input = this.element.querySelector?.('.nlab-date-picker__input');
    input?.addEventListener?.('change', (event) => {
      const next = String(event?.target?.value ?? '').trim();
      const result = this.setValue(next, { emit: true, render: true, source: 'input' });
      if (!result.valid) this.render();
    });
    return this;
  }

  destroy() {
    if (this.element) this.element.innerHTML = '';
    this.element = null;
    return this;
  }
}
