const clone = (value) => value === undefined ? undefined : structuredClone(value);

export class WebmasterModeControlError extends Error {
  constructor(message, code = 'WEBMASTER_MODE_CONTROL_ERROR', details = null) {
    super(message);
    this.name = 'WebmasterModeControlError';
    this.code = code;
    this.details = details;
  }
}

function assertMode(mode) {
  const methods = ['snapshot', 'setMode', 'toggle', 'setFeature', 'isEnabled', 'subscribe'];
  if (!mode || methods.some((method) => typeof mode[method] !== 'function')) {
    throw new WebmasterModeControlError('WebmasterMode-compatible source is required', 'INVALID_WEBMASTER_MODE');
  }
  return mode;
}

export class WebmasterModeControl {
  constructor({ webmasterMode, onChange = null } = {}) {
    this.webmasterMode = assertMode(webmasterMode);
    this.onChange = typeof onChange === 'function' ? onChange : null;
    this.mutating = 0;
    this.destroyed = false;
    this.unsubscribe = this.webmasterMode.subscribe((event) => {
      if (!this.destroyed && this.mutating === 0) this.#emit('external', { sourceEvent: clone(event) });
    });
  }

  state() {
    const snapshot = this.webmasterMode.snapshot();
    const ids = Boolean(this.webmasterMode.isEnabled('ids'));
    const infoTest = Boolean(this.webmasterMode.isEnabled('infoTest'));
    return {
      mode: snapshot.mode,
      webmaster: snapshot.mode === 'webmaster',
      ids,
      infoTest,
      testTools: ids && infoTest,
      testToolsMixed: ids !== infoTest,
      features: clone(snapshot.features ?? {}),
      overrides: clone(snapshot.overrides ?? {})
    };
  }

  controls() {
    const state = this.state();
    return [
      {
        id: 'webmaster-mode',
        type: 'toggle',
        label: state.webmaster ? 'Webmaster' : 'Web public',
        actionLabel: state.webmaster ? 'Passer en Web public' : 'Passer en Webmaster',
        pressed: state.webmaster,
        mixed: false,
        ariaPressed: String(state.webmaster),
        ariaLabel: state.webmaster ? 'Mode Webmaster activé' : 'Mode Web public activé',
        value: state.mode
      },
      {
        id: 'diagnostic-tools',
        type: 'toggle',
        label: 'IDs + Info/Test',
        actionLabel: state.testTools ? 'Masquer les IDs et Info/Test' : 'Afficher les IDs et Info/Test',
        pressed: state.testTools,
        mixed: state.testToolsMixed,
        ariaPressed: state.testToolsMixed ? 'mixed' : String(state.testTools),
        ariaLabel: state.testToolsMixed
          ? 'IDs et Info/Test partiellement activés'
          : state.testTools
            ? 'IDs et Info/Test affichés'
            : 'IDs et Info/Test masqués',
        value: { ids: state.ids, infoTest: state.infoTest }
      }
    ];
  }

  descriptor() {
    return {
      type: 'webmaster-mode-control',
      state: this.state(),
      controls: this.controls()
    };
  }

  setMode(mode, options = {}) {
    const normalized = String(mode ?? '').trim().toLowerCase();
    if (!['public', 'webmaster'].includes(normalized)) {
      throw new WebmasterModeControlError('Mode must be public or webmaster', 'INVALID_MODE', { mode });
    }
    this.#mutate(() => this.webmasterMode.setMode(normalized, options));
    return this.#emit('mode', { mode: normalized });
  }

  toggleMode(options = {}) {
    this.#mutate(() => this.webmasterMode.toggle(options));
    return this.#emit('mode', { mode: this.state().mode });
  }

  setTestTools(enabled, { persist = true } = {}) {
    const value = Boolean(enabled);
    this.#mutate(() => {
      this.webmasterMode.setFeature('ids', value, { persist: false });
      this.webmasterMode.setFeature('infoTest', value, { persist: false });
      if (persist && typeof this.webmasterMode.persist === 'function') this.webmasterMode.persist();
    });
    return this.#emit('test-tools', { enabled: value });
  }

  toggleTestTools(options = {}) {
    return this.setTestTools(!this.state().testTools, options);
  }

  activate(controlId, options = {}) {
    if (controlId === 'webmaster-mode') return this.toggleMode(options);
    if (controlId === 'diagnostic-tools') return this.toggleTestTools(options);
    throw new WebmasterModeControlError('Unknown webmaster control', 'UNKNOWN_CONTROL', { controlId });
  }

  destroy() {
    if (this.destroyed) return false;
    this.destroyed = true;
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    try { unsubscribe?.(); } catch {}
    return true;
  }

  #mutate(callback) {
    this.mutating += 1;
    try { callback(); }
    finally { this.mutating -= 1; }
  }

  #emit(type, details = {}) {
    const event = { type, ...clone(details), descriptor: this.descriptor() };
    try { this.onChange?.(clone(event)); } catch {}
    return clone(event.descriptor);
  }
}
