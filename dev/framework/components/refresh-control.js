const STATES = new Set(['idle', 'running', 'success', 'error']);

const text = (value, fallback = '') => {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
};

const clone = (value) => value == null ? value : structuredClone(value);
const callback = (value) => typeof value === 'function' ? value : null;

const defaultReload = () => {
  const reload = globalThis.location?.reload;
  if (typeof reload !== 'function') throw new Error('Reload is unavailable in this environment');
  reload.call(globalThis.location);
  return true;
};

export class RefreshControl {
  constructor({
    id = 'nlab-refresh-control',
    label = 'Actualiser',
    successLabel = 'Actualisé',
    errorLabel = 'Échec de l’actualisation',
    runningLabel = 'Actualisation…',
    disabled = false,
    onRefresh = null,
    reload = defaultReload,
    iconRenderer = null,
    onStateChange = null,
    documentRef = globalThis.document ?? null
  } = {}) {
    this.id = text(id, 'nlab-refresh-control');
    this.label = text(label, 'Actualiser');
    this.successLabel = text(successLabel, 'Actualisé');
    this.errorLabel = text(errorLabel, 'Échec de l’actualisation');
    this.runningLabel = text(runningLabel, 'Actualisation…');
    this.disabled = Boolean(disabled);
    this.onRefresh = callback(onRefresh);
    this.reload = callback(reload);
    this.iconRenderer = callback(iconRenderer);
    this.onStateChange = callback(onStateChange);
    this.document = documentRef;
    this.element = null;
    this.status = 'idle';
    this.error = null;
    this.runCount = 0;
    this.lastSource = null;
    this._pending = null;
  }

  state() {
    return {
      id: this.id,
      status: this.status,
      disabled: this.disabled,
      busy: this.status === 'running',
      runCount: this.runCount,
      lastSource: this.lastSource,
      error: this.error ? { name: this.error.name, message: this.error.message } : null
    };
  }

  setDisabled(value = true) {
    this.disabled = Boolean(value);
    this.render();
    return this;
  }

  setOnRefresh(handler) {
    this.onRefresh = callback(handler);
    return this;
  }

  reset() {
    if (this.status === 'running') return false;
    this.#transition('idle', { error: null, source: 'reset' });
    return true;
  }

  activate({ source = 'api', event = null } = {}) {
    if (this.disabled) {
      event?.preventDefault?.();
      return Promise.resolve({ ok: false, skipped: true, reason: 'disabled', state: this.state() });
    }
    event?.preventDefault?.();
    if (this._pending) return this._pending;

    this.runCount += 1;
    this.lastSource = text(source, 'api');
    this.#transition('running', { error: null, source: this.lastSource });

    const run = async () => {
      try {
        const context = { source: this.lastSource, runCount: this.runCount, control: this, event };
        let result;
        if (this.onRefresh) result = await this.onRefresh(context);
        else if (this.reload) result = await this.reload(context);
        else throw new Error('No refresh handler is configured');

        this.#transition('success', { error: null, source: this.lastSource });
        return { ok: true, result, state: this.state() };
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        this.#transition('error', { error: normalized, source: this.lastSource });
        return { ok: false, error: { name: normalized.name, message: normalized.message }, state: this.state() };
      } finally {
        this._pending = null;
      }
    };

    this._pending = run();
    return this._pending;
  }

  mount(element) {
    this.element = element ?? null;
    this.render();
    return this;
  }

  render() {
    if (!this.element || !this.document?.createElement) return this;
    const doc = this.document;
    const wrapper = doc.createElement('div');
    wrapper.className = `nlab-refresh-control nlab-refresh-control--${this.status}`;
    wrapper.setAttribute?.('data-refresh-state', this.status);

    const button = doc.createElement('button');
    button.type = 'button';
    button.id = this.id;
    button.className = 'nlab-refresh-control__button';
    button.disabled = this.disabled || this.status === 'running';
    button.setAttribute?.('aria-label', this.label);
    button.setAttribute?.('aria-busy', this.status === 'running' ? 'true' : 'false');
    button.setAttribute?.('data-action', 'refresh');

    const iconHost = doc.createElement('span');
    iconHost.className = 'nlab-refresh-control__icon';
    iconHost.setAttribute?.('aria-hidden', 'true');
    let icon = null;
    try { icon = this.iconRenderer?.({ key: 'refresh', state: this.status, document: doc }); } catch { icon = null; }
    if (icon && typeof icon === 'object') iconHost.append?.(icon);
    else iconHost.textContent = icon == null ? '↻' : String(icon);

    const label = doc.createElement('span');
    label.className = 'nlab-refresh-control__label';
    label.textContent = this.label;
    button.append?.(iconHost, label);

    const feedback = doc.createElement('span');
    feedback.className = 'nlab-refresh-control__feedback';
    feedback.id = `${this.id}-status`;
    feedback.setAttribute?.('role', 'status');
    feedback.setAttribute?.('aria-live', 'polite');
    feedback.textContent = this.#feedbackText();
    if (!feedback.textContent) feedback.hidden = true;
    button.setAttribute?.('aria-describedby', feedback.id);

    button.addEventListener?.('click', (event) => { void this.activate({ source: 'click', event }); });
    this.element.replaceChildren?.(wrapper);
    wrapper.append?.(button, feedback);
    return this;
  }

  destroy() {
    this.element?.replaceChildren?.();
    this.element = null;
    return this;
  }

  #feedbackText() {
    if (this.status === 'running') return this.runningLabel;
    if (this.status === 'success') return this.successLabel;
    if (this.status === 'error') return this.error?.message ? `${this.errorLabel} : ${this.error.message}` : this.errorLabel;
    return '';
  }

  #transition(next, { error = null, source = 'api' } = {}) {
    if (!STATES.has(next)) throw new TypeError(`Unsupported refresh state: ${next}`);
    this.status = next;
    this.error = error;
    const detail = { ...this.state(), source };
    this.render();
    try { this.onStateChange?.(clone(detail)); } catch {}
    if (this.element?.dispatchEvent && typeof globalThis.CustomEvent === 'function') {
      try { this.element.dispatchEvent(new globalThis.CustomEvent('nlab:refresh-state', { detail: clone(detail) })); } catch {}
    }
    return detail;
  }
}
