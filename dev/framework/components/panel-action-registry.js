const ACTION_ID = /^[a-z][a-z0-9]*(?:[._:-][a-z0-9]+)*$/;
const OPERATIONS = new Set(['open', 'close', 'toggle', 'focus']);
const SENSITIVE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function error(code, message) {
  const value = new Error(message);
  value.name = 'PanelActionRegistryError';
  value.code = code;
  return value;
}

function normalizeId(value, label = 'id') {
  const id = String(value ?? '').trim().toLowerCase();
  if (!id || id.length > 160 || !ACTION_ID.test(id)) throw error('INVALID_ID', `Invalid ${label}: ${String(value)}`);
  return id;
}

function cloneJson(value, seen = new Set(), path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw error('NON_FINITE_NUMBER', `Non-finite number at ${path}`);
    return value;
  }
  if (typeof value !== 'object') throw error('UNSUPPORTED_VALUE', `Unsupported value at ${path}`);
  if (seen.has(value)) throw error('CYCLE', `Cyclic value at ${path}`);
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((entry, index) => cloneJson(entry, seen, `${path}[${index}]`));
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw error('UNSUPPORTED_OBJECT', `Unsupported object at ${path}`);
    const output = {};
    for (const key of Object.keys(value).sort()) {
      if (SENSITIVE_KEYS.has(key)) throw error('SENSITIVE_KEY', `Sensitive key ${key} at ${path}`);
      Object.defineProperty(output, key, {
        value: cloneJson(value[key], seen, `${path}.${key}`),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function normalizeOperation(value) {
  const operation = String(value ?? 'open').trim().toLowerCase();
  if (!OPERATIONS.has(operation)) throw error('INVALID_OPERATION', `Unsupported panel operation: ${operation}`);
  return operation;
}

function normalizeAction(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw error('INVALID_ACTION', 'Action descriptor must be an object');
  return {
    id: normalizeId(input.id ?? input.actionId, 'action id'),
    panelId: normalizeId(input.panelId, 'panelId'),
    operation: normalizeOperation(input.operation),
    enabled: input.enabled !== false,
    label: input.label == null ? null : String(input.label),
    metadata: input.metadata == null ? {} : cloneJson(input.metadata)
  };
}

function cloneAction(action) {
  return { ...action, metadata: cloneJson(action.metadata) };
}

function stateOpen(provider) {
  try {
    if (typeof provider?.isOpen === 'function') return Boolean(provider.isOpen());
    if (provider?.state && typeof provider.state.open === 'boolean') return provider.state.open;
    if (typeof provider?.snapshot === 'function') {
      const value = provider.snapshot();
      if (value && typeof value.open === 'boolean') return value.open;
    }
    if (typeof provider?.toJSON === 'function') {
      const value = provider.toJSON();
      if (value && typeof value.open === 'boolean') return value.open;
    }
  } catch {}
  return null;
}

function invoke(provider, operation, payload) {
  if (!provider) throw error('PANEL_UNAVAILABLE', 'Panel provider is unavailable');
  if (operation === 'open') {
    if (typeof provider.open === 'function') return provider.open(payload);
    if (typeof provider.reopen === 'function') return provider.reopen(payload);
    if (typeof provider.setOpen === 'function') return provider.setOpen(true, payload);
  }
  if (operation === 'close') {
    if (typeof provider.close === 'function') return provider.close(payload);
    if (typeof provider.setOpen === 'function') return provider.setOpen(false, payload);
  }
  if (operation === 'focus') {
    if (typeof provider.focus === 'function') return provider.focus(payload);
  }
  if (operation === 'toggle') {
    if (typeof provider.toggle === 'function') return provider.toggle(payload);
    const open = stateOpen(provider);
    if (open === true) return invoke(provider, 'close', payload);
    if (open === false) return invoke(provider, 'open', payload);
    throw error('STATE_UNAVAILABLE', 'Panel open state is unavailable for toggle');
  }
  throw error('OPERATION_UNSUPPORTED', `Panel provider does not support ${operation}`);
}

export class PanelActionRegistry {
  constructor({ onResult = null } = {}) {
    this._panels = new Map();
    this._actions = new Map();
    this._pending = new Map();
    this._onResult = typeof onResult === 'function' ? onResult : null;
  }

  registerPanel(panelId, provider, { replace = false } = {}) {
    const id = normalizeId(panelId, 'panelId');
    if (!provider || (typeof provider !== 'object' && typeof provider !== 'function')) throw error('INVALID_PROVIDER', 'Panel provider is required');
    if (this._panels.has(id) && !replace) throw error('PANEL_EXISTS', `Panel already registered: ${id}`);
    this._panels.set(id, provider);
    return id;
  }

  unregisterPanel(panelId, { removeActions = false } = {}) {
    const id = normalizeId(panelId, 'panelId');
    const existed = this._panels.delete(id);
    if (removeActions) {
      for (const [actionId, action] of this._actions) if (action.panelId === id) this._actions.delete(actionId);
    }
    return existed;
  }

  registerAction(input, { replace = false } = {}) {
    const action = normalizeAction(input);
    if (this._actions.has(action.id) && !replace) throw error('ACTION_EXISTS', `Action already registered: ${action.id}`);
    this._actions.set(action.id, action);
    return cloneAction(action);
  }

  unregisterAction(actionId) {
    return this._actions.delete(normalizeId(actionId, 'action id'));
  }

  setEnabled(actionId, enabled = true) {
    const id = normalizeId(actionId, 'action id');
    const action = this._actions.get(id);
    if (!action) throw error('ACTION_NOT_FOUND', `Unknown action: ${id}`);
    action.enabled = Boolean(enabled);
    return cloneAction(action);
  }

  getAction(actionId) {
    let id;
    try { id = normalizeId(actionId, 'action id'); } catch { return null; }
    const action = this._actions.get(id);
    return action ? cloneAction(action) : null;
  }

  listActions({ panelId = null, enabled = null } = {}) {
    let panel = null;
    if (panelId != null) panel = normalizeId(panelId, 'panelId');
    return [...this._actions.values()]
      .filter((action) => panel == null || action.panelId === panel)
      .filter((action) => enabled == null || action.enabled === Boolean(enabled))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(cloneAction);
  }

  execute(actionId, payload = undefined, { coalesce = true } = {}) {
    let id;
    try { id = normalizeId(actionId, 'action id'); }
    catch (cause) { return Promise.resolve({ ok: false, code: cause.code ?? 'INVALID_ID', actionId: null, error: cause.message }); }

    if (coalesce && this._pending.has(id)) return this._pending.get(id);

    const task = Promise.resolve().then(async () => {
      const action = this._actions.get(id);
      if (!action) return { ok: false, code: 'ACTION_NOT_FOUND', actionId: id, error: `Unknown action: ${id}` };
      if (!action.enabled) return { ok: false, code: 'ACTION_DISABLED', actionId: id, panelId: action.panelId, operation: action.operation };
      const provider = this._panels.get(action.panelId);
      if (!provider) return { ok: false, code: 'PANEL_NOT_FOUND', actionId: id, panelId: action.panelId, operation: action.operation };

      try {
        const value = await invoke(provider, action.operation, payload);
        return {
          ok: true,
          actionId: id,
          panelId: action.panelId,
          operation: action.operation,
          value: value === undefined ? null : value
        };
      } catch (cause) {
        return {
          ok: false,
          code: cause?.code ?? 'PANEL_ACTION_FAILED',
          actionId: id,
          panelId: action.panelId,
          operation: action.operation,
          error: cause?.message ?? String(cause)
        };
      }
    }).then((result) => {
      try { this._onResult?.({ ...result }); } catch {}
      return result;
    }).finally(() => {
      if (this._pending.get(id) === task) this._pending.delete(id);
    });

    if (coalesce) this._pending.set(id, task);
    return task;
  }

  snapshot() {
    return {
      panels: [...this._panels.keys()].sort(),
      actions: this.listActions(),
      pending: [...this._pending.keys()].sort()
    };
  }
}

export const PANEL_ACTION_OPERATIONS = Object.freeze([...OPERATIONS]);
