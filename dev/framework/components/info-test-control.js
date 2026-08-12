const MODES = new Set(['classic', 'advanced']);

const clean = (value, fallback = '') => {
  const text = String(value ?? '').trim();
  return text || fallback;
};
const clone = (value) => value === undefined ? undefined : structuredClone(value);
const fn = (value) => typeof value === 'function' ? value : null;

export class InfoTestControlError extends Error {
  constructor(message, code = 'INFO_TEST_CONTROL_ERROR', details = null) {
    super(message);
    this.name = 'InfoTestControlError';
    this.code = code;
    this.details = details;
  }
}

function normalizeMode(value) {
  const mode = clean(value, 'classic').toLowerCase();
  if (!MODES.has(mode)) throw new InfoTestControlError('Unsupported diagnostic mode', 'INVALID_MODE', { mode: value });
  return mode;
}

function shortTooltip(value, fallback = '') {
  const normalized = clean(value, fallback).replace(/\s+/g, ' ');
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177).trimEnd()}…`;
}

export class InfoTestControl {
  constructor({
    ref = null,
    registry = null,
    webmasterMode = null,
    mode = 'classic',
    label = 'Info/Test',
    tooltip = null,
    disabled = false,
    onOpen = null,
    iconRenderer = null,
    documentRef = globalThis.document ?? null
  } = {}) {
    this.ref = clean(ref) || null;
    this.registry = registry;
    this.webmasterMode = webmasterMode;
    this.mode = normalizeMode(mode);
    this.label = clean(label, 'Info/Test');
    this.tooltip = tooltip == null ? null : clean(tooltip);
    this.disabled = Boolean(disabled);
    this.onOpen = fn(onOpen);
    this.iconRenderer = fn(iconRenderer);
    this.document = documentRef;
    this.element = null;
    this._unsubscribe = null;
    this.#bindMode();
  }

  setRef(ref) {
    this.ref = clean(ref) || null;
    this.render();
    return this;
  }

  setMode(mode) {
    this.mode = normalizeMode(mode);
    this.render();
    return this;
  }

  setDisabled(value = true) {
    this.disabled = Boolean(value);
    this.render();
    return this;
  }

  setOnOpen(handler) {
    this.onOpen = fn(handler);
    return this;
  }

  isVisible() {
    if (!this.webmasterMode?.isEnabled) return true;
    try { return Boolean(this.webmasterMode.isEnabled('infoTest')); }
    catch { return false; }
  }

  descriptor({ mode = this.mode } = {}) {
    const normalizedMode = normalizeMode(mode);
    if (!this.ref) throw new InfoTestControlError('Diagnostic ref is required', 'REF_REQUIRED');
    if (!this.registry?.describe) throw new InfoTestControlError('Diagnostic registry is unavailable', 'REGISTRY_UNAVAILABLE');
    let descriptor;
    try { descriptor = this.registry.describe(this.ref, { mode: normalizedMode }); }
    catch (error) {
      throw new InfoTestControlError('Unable to resolve diagnostic descriptor', 'UNKNOWN_DIAGNOSTIC', {
        ref: this.ref,
        cause: error instanceof Error ? error.message : String(error)
      });
    }
    if (!descriptor) throw new InfoTestControlError('Unknown diagnostic ref', 'UNKNOWN_DIAGNOSTIC', { ref: this.ref });
    return clone(descriptor);
  }

  attributes() {
    if (!this.ref || !this.registry?.attributes) return {};
    try { return clone(this.registry.attributes(this.ref)) ?? {}; }
    catch { return {}; }
  }

  state() {
    let descriptor = null;
    let error = null;
    try { descriptor = this.descriptor(); }
    catch (caught) { error = caught; }
    return {
      ref: this.ref,
      mode: this.mode,
      visible: this.isVisible(),
      disabled: this.disabled,
      ready: Boolean(descriptor),
      humanId: descriptor?.humanId ?? null,
      technicalId: descriptor?.technicalId ?? null,
      error: error ? { name: error.name, code: error.code ?? null, message: error.message } : null
    };
  }

  tooltipText() {
    const descriptor = this.descriptor();
    return shortTooltip(this.tooltip, descriptor.objective || descriptor.title || this.label);
  }

  requestOpen({ source = 'api', event = null } = {}) {
    event?.preventDefault?.();
    if (!this.isVisible()) return Promise.resolve({ ok: false, skipped: true, reason: 'hidden', state: this.state() });
    if (this.disabled) return Promise.resolve({ ok: false, skipped: true, reason: 'disabled', state: this.state() });

    let descriptor;
    try { descriptor = this.descriptor(); }
    catch (error) {
      return Promise.resolve({
        ok: false,
        error: { name: error.name, code: error.code ?? null, message: error.message },
        state: this.state()
      });
    }

    const detail = {
      ref: this.ref,
      mode: this.mode,
      descriptor,
      attributes: this.attributes(),
      source: clean(source, 'api')
    };

    const run = async () => {
      try {
        const result = this.onOpen ? await this.onOpen({ ...clone(detail), event }) : clone(detail);
        if (this.element?.dispatchEvent && typeof globalThis.CustomEvent === 'function') {
          try { this.element.dispatchEvent(new globalThis.CustomEvent('nlab:info-test-open', { detail: clone(detail) })); } catch {}
        }
        return { ok: true, detail: clone(detail), result };
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        return { ok: false, error: { name: normalized.name, message: normalized.message }, detail: clone(detail) };
      }
    };
    return run();
  }

  mount(element) {
    this.element = element ?? null;
    this.render();
    return this;
  }

  render() {
    if (!this.element || !this.document?.createElement) return this;
    const visible = this.isVisible();
    this.element.hidden = !visible;
    if (!visible) {
      this.element.replaceChildren?.();
      return this;
    }

    const doc = this.document;
    const state = this.state();
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'nlab-info-test-control';
    button.disabled = this.disabled || !state.ready;
    button.setAttribute?.('data-action', 'info-test');
    button.setAttribute?.('data-diagnostic-mode', this.mode);
    button.setAttribute?.('aria-haspopup', 'dialog');

    for (const [name, value] of Object.entries(this.attributes())) button.setAttribute?.(name, String(value));

    const aria = state.humanId ? `${this.label} — ${state.humanId}` : this.label;
    button.setAttribute?.('aria-label', aria);
    let tooltip = this.label;
    try { tooltip = this.tooltipText(); } catch {}
    if (tooltip) button.setAttribute?.('title', tooltip);

    const iconHost = doc.createElement('span');
    iconHost.className = 'nlab-info-test-control__icon';
    iconHost.setAttribute?.('aria-hidden', 'true');
    let icon = null;
    try { icon = this.iconRenderer?.({ key: 'info', state: state.ready ? 'default' : 'inactive', document: doc }); } catch { icon = null; }
    if (icon && typeof icon === 'object') iconHost.append?.(icon);
    else iconHost.textContent = icon == null ? 'ⓘ' : String(icon);

    const label = doc.createElement('span');
    label.className = 'nlab-info-test-control__label';
    label.textContent = this.label;
    button.append?.(iconHost, label);
    button.addEventListener?.('click', (event) => { void this.requestOpen({ source: 'click', event }); });
    this.element.replaceChildren?.(button);
    return this;
  }

  destroy() {
    this._unsubscribe?.();
    this._unsubscribe = null;
    this.element?.replaceChildren?.();
    if (this.element) this.element.hidden = false;
    this.element = null;
    return this;
  }

  #bindMode() {
    if (!this.webmasterMode?.subscribe) return;
    try { this._unsubscribe = this.webmasterMode.subscribe(() => this.render()); }
    catch { this._unsubscribe = null; }
  }
}
