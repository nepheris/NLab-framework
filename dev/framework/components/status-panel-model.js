const LEVEL_ALIASES = new Map([['danger', 'error']]);
const LEVELS = new Set(['info', 'success', 'warning', 'error', 'dev']);
const ACTION_ID = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const SENSITIVE = new Set(['__proto__', 'prototype', 'constructor']);

function makeError(code, message) {
  const value = new Error(message);
  value.name = 'StatusPanelModelError';
  value.code = code;
  return value;
}

function cloneJson(value, seen = new Set(), path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw makeError('NON_FINITE_NUMBER', `Non-finite number at ${path}`);
    return value;
  }
  if (typeof value !== 'object') throw makeError('UNSUPPORTED_VALUE', `Unsupported value at ${path}`);
  if (seen.has(value)) throw makeError('CYCLE', `Cyclic value at ${path}`);
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item, index) => cloneJson(item, seen, `${path}[${index}]`));
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw makeError('UNSUPPORTED_OBJECT', `Unsupported object at ${path}`);
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (SENSITIVE.has(key)) throw makeError('SENSITIVE_KEY', `Sensitive key ${key} at ${path}`);
      Object.defineProperty(out, key, {
        value: cloneJson(value[key], seen, `${path}.${key}`), enumerable: true, configurable: true, writable: true
      });
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

function normalizeLevel(value) {
  const key = String(value ?? 'info').trim().toLowerCase();
  const level = LEVEL_ALIASES.get(key) ?? key;
  if (!LEVELS.has(level)) throw makeError('INVALID_LEVEL', `Unsupported status level: ${key}`);
  return level;
}

function normalizeText(value, fallback = '') {
  return value == null ? fallback : String(value);
}

function normalizeAction(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw makeError('INVALID_ACTION', 'Status panel action must be an object');
  const id = String(input.id ?? '').trim().toLowerCase();
  if (!id || !ACTION_ID.test(id)) throw makeError('INVALID_ACTION_ID', `Invalid action id: ${String(input.id)}`);
  return {
    id,
    label: normalizeText(input.label, id),
    kind: String(input.kind ?? 'secondary').trim().toLowerCase() || 'secondary',
    disabled: Boolean(input.disabled),
    metadata: input.metadata == null ? {} : cloneJson(input.metadata)
  };
}

function normalizeActions(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw makeError('INVALID_ACTIONS', 'actions must be an array');
  const seen = new Set();
  return value.map(normalizeAction).map((action) => {
    if (seen.has(action.id)) throw makeError('DUPLICATE_ACTION', `Duplicate action id: ${action.id}`);
    seen.add(action.id);
    return action;
  });
}

function cloneEntry(entry) {
  if (!entry) return null;
  return {
    revision: entry.revision,
    level: entry.level,
    title: entry.title,
    message: entry.message,
    code: entry.code,
    details: cloneJson(entry.details),
    actions: entry.actions.map((action) => ({ ...action, metadata: cloneJson(action.metadata) })),
    metadata: cloneJson(entry.metadata)
  };
}

function normalizeEntry(input, revision) {
  const source = typeof input === 'string' ? { message: input } : input;
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw makeError('INVALID_STATUS', 'Status descriptor must be a string or object');
  return {
    revision,
    level: normalizeLevel(source.level ?? source.type),
    title: normalizeText(source.title, ''),
    message: normalizeText(source.message, ''),
    code: source.code == null ? null : String(source.code),
    details: source.details == null ? null : cloneJson(source.details),
    actions: normalizeActions(source.actions),
    metadata: source.metadata == null ? {} : cloneJson(source.metadata)
  };
}

export class StatusPanelModel {
  constructor({ maxHistory = 20, onChange = null, onAction = null } = {}) {
    this.maxHistory = Math.max(0, Math.min(200, Math.floor(Number(maxHistory) || 0)));
    this.onChange = typeof onChange === 'function' ? onChange : null;
    this.onAction = typeof onAction === 'function' ? onAction : null;
    this.open = false;
    this.current = null;
    this.history = [];
    this.revision = 0;
  }

  #emit(reason) {
    const snapshot = this.snapshot();
    try { this.onChange?.(snapshot, reason); } catch {}
    return snapshot;
  }

  show(input, { preserveHistory = true } = {}) {
    const nextRevision = this.revision + 1;
    const next = normalizeEntry(input, nextRevision);
    if (preserveHistory && this.current && this.maxHistory > 0) {
      this.history.push(cloneEntry(this.current));
      if (this.history.length > this.maxHistory) this.history.splice(0, this.history.length - this.maxHistory);
    }
    this.current = next;
    this.revision = nextRevision;
    this.open = true;
    return { entry: cloneEntry(next), state: this.#emit('show') };
  }

  info(message, options = {}) { return this.show({ ...options, message, level: 'info' }); }
  success(message, options = {}) { return this.show({ ...options, message, level: 'success' }); }
  warning(message, options = {}) { return this.show({ ...options, message, level: 'warning' }); }
  error(message, options = {}) { return this.show({ ...options, message, level: 'error' }); }
  dev(message, options = {}) { return this.show({ ...options, message, level: 'dev' }); }

  close() {
    this.open = false;
    return this.#emit('close');
  }

  reopen() {
    if (!this.current) return { ok: false, code: 'NO_STATUS', state: this.snapshot() };
    this.open = true;
    return { ok: true, state: this.#emit('reopen'), entry: cloneEntry(this.current) };
  }

  clear({ history = false } = {}) {
    this.current = null;
    this.open = false;
    if (history) this.history = [];
    return this.#emit('clear');
  }

  restorePrevious() {
    if (!this.history.length) return { ok: false, code: 'HISTORY_EMPTY', state: this.snapshot() };
    this.current = this.history.pop();
    this.revision += 1;
    this.current.revision = this.revision;
    this.open = true;
    return { ok: true, entry: cloneEntry(this.current), state: this.#emit('restorePrevious') };
  }

  setActionEnabled(actionId, enabled = true) {
    if (!this.current) throw makeError('NO_STATUS', 'No active status');
    const id = String(actionId ?? '').trim().toLowerCase();
    const action = this.current.actions.find((item) => item.id === id);
    if (!action) throw makeError('ACTION_NOT_FOUND', `Unknown action: ${id}`);
    action.disabled = !Boolean(enabled);
    return cloneEntry(this.current);
  }

  executeAction(actionId, payload = undefined) {
    if (!this.current) return Promise.resolve({ ok: false, code: 'NO_STATUS' });
    const id = String(actionId ?? '').trim().toLowerCase();
    const action = this.current.actions.find((item) => item.id === id);
    if (!action) return Promise.resolve({ ok: false, code: 'ACTION_NOT_FOUND', actionId: id });
    if (action.disabled) return Promise.resolve({ ok: false, code: 'ACTION_DISABLED', actionId: id });
    if (!this.onAction) return Promise.resolve({ ok: false, code: 'ACTION_HANDLER_MISSING', actionId: id });
    return Promise.resolve().then(() => this.onAction({ action: { ...action, metadata: cloneJson(action.metadata) }, payload, status: cloneEntry(this.current) }))
      .then((value) => ({ ok: true, actionId: id, value: value === undefined ? null : value }))
      .catch((cause) => ({ ok: false, code: 'ACTION_FAILED', actionId: id, error: cause?.message ?? String(cause) }));
  }

  descriptor() {
    const entry = cloneEntry(this.current);
    const level = entry?.level ?? 'info';
    return {
      kind: 'status-panel',
      open: this.open,
      level,
      iconKey: level,
      entry,
      aria: {
        role: ['warning', 'error'].includes(level) ? 'alert' : 'status',
        live: ['warning', 'error'].includes(level) ? 'assertive' : 'polite'
      }
    };
  }

  snapshot() {
    return {
      open: this.open,
      revision: this.revision,
      current: cloneEntry(this.current),
      history: this.history.map(cloneEntry)
    };
  }
}

export const STATUS_PANEL_LEVELS = Object.freeze([...LEVELS]);
