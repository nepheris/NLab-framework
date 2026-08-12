const TYPES = new Set(['info', 'success', 'warning', 'error', 'dev']);
const TYPE_ALIASES = Object.freeze({ danger:'error' });

const DEFAULT_RULES = Object.freeze({
  'snapshot:exported': Object.freeze({ type:'success', message:'Snapshot JSON exporté' }),
  'snapshot:imported': Object.freeze({ type:'success', message:'Snapshot JSON importé' }),
  'configuration:saved': Object.freeze({ type:'success', message:'Configuration Inspector enregistrée' }),
  'configuration:reset': Object.freeze({ type:'info', message:'Configuration Inspector réinitialisée' }),
  'validation:warning': Object.freeze({ type:'warning', message:'Validation Inspector : avertissement' }),
  'validation:error': Object.freeze({ type:'error', message:'Validation Inspector : erreur', persistent:true }),
  'operation:error': Object.freeze({ type:'error', message:'Opération Inspector en échec' })
});

function normalizeType(value = 'info') {
  const key = String(value ?? 'info').trim().toLowerCase();
  const normalized = TYPE_ALIASES[key] ?? key;
  return TYPES.has(normalized) ? normalized : 'info';
}

function normalizeCode(value) {
  return String(value ?? '').trim();
}

function normalizeDuration(value) {
  if (value == null) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function normalizeRule(rule, code = 'rule') {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) throw new TypeError(`${code} must be an object`);
  if (typeof rule.message !== 'string' && typeof rule.message !== 'function') throw new TypeError(`${code}.message must be a string or function`);
  return {
    type: normalizeType(rule.type),
    message: rule.message,
    duration: normalizeDuration(rule.duration),
    persistent: Boolean(rule.persistent)
  };
}

function resolveMessage(message, detail, code) {
  const value = typeof message === 'function' ? message(detail, code) : message;
  return String(value ?? '').trim();
}

export class InspectorNotificationBridge {
  constructor({
    center = null,
    rules = {},
    dedupeWindow = 800,
    now = () => Date.now(),
    prefix = ''
  } = {}) {
    this.center = center;
    this.now = typeof now === 'function' ? now : () => Date.now();
    this.dedupeWindow = Math.max(0, Number(dedupeWindow) || 0);
    this.prefix = String(prefix ?? '').trim();
    this.rules = new Map();
    for (const [code, rule] of Object.entries(DEFAULT_RULES)) this.rules.set(code, normalizeRule(rule, code));
    for (const [code, rule] of Object.entries(rules ?? {})) this.setRule(code, rule);
    this.recent = new Map();
  }

  setCenter(center) {
    this.center = center ?? null;
    return this;
  }

  setRule(code, rule) {
    const key = normalizeCode(code);
    if (!key) throw new TypeError('rule code is required');
    this.rules.set(key, normalizeRule(rule, key));
    return this;
  }

  removeRule(code) {
    return this.rules.delete(normalizeCode(code));
  }

  listRules() {
    return Object.fromEntries([...this.rules.entries()].map(([code, rule]) => [code, { ...rule }]));
  }

  notify(code, detail = {}, options = {}) {
    const key = normalizeCode(code);
    if (!key) return { shown:false, reason:'invalid-code', code:key, node:null };
    const base = this.rules.get(key);
    if (!base && options.message == null) return { shown:false, reason:'unmapped', code:key, node:null };

    const rule = base ?? { type:'info', message:'' };
    const type = normalizeType(options.type ?? rule.type);
    const rawMessage = options.message ?? rule.message;
    const message = resolveMessage(rawMessage, detail, key);
    if (!message) return { shown:false, reason:'empty-message', code:key, node:null };
    const finalMessage = this.prefix ? `${this.prefix} ${message}` : message;
    const duration = normalizeDuration(options.duration ?? rule.duration);
    const persistent = options.persistent == null ? Boolean(rule.persistent) : Boolean(options.persistent);

    const dedupeKey = String(options.dedupeKey ?? `${key}|${type}|${finalMessage}`);
    const timestamp = Number(this.now()) || 0;
    const previous = this.recent.get(dedupeKey);
    if (!options.force && this.dedupeWindow > 0 && previous != null && timestamp - previous < this.dedupeWindow) {
      return { shown:false, reason:'duplicate', code:key, type, message:finalMessage, node:null };
    }

    const center = this.center;
    if (!center) return { shown:false, reason:'unavailable', code:key, type, message:finalMessage, node:null };
    const notificationOptions = { persistent };
    if (duration !== undefined) notificationOptions.duration = duration;

    let node = null;
    if (typeof center[type] === 'function') node = center[type](finalMessage, notificationOptions);
    else if (typeof center.show === 'function') node = center.show(finalMessage, { ...notificationOptions, type });
    else return { shown:false, reason:'unavailable', code:key, type, message:finalMessage, node:null };

    this.recent.set(dedupeKey, timestamp);
    return { shown: node !== null && node !== false, reason: node == null || node === false ? 'provider-declined' : null, code:key, type, message:finalMessage, node };
  }

  handle(event, options = {}) {
    if (!event || typeof event !== 'object') return { shown:false, reason:'invalid-event', code:'', node:null };
    const code = normalizeCode(event.type ?? event.code);
    return this.notify(code, event.detail ?? event.data ?? {}, options);
  }

  reportResult(operation, result, options = {}) {
    const label = String(operation ?? 'Opération').trim() || 'Opération';
    const value = result ?? {};
    if (value.error || value.ok === false) {
      const suffix = value.error?.message ? ` : ${value.error.message}` : value.reason ? ` : ${value.reason}` : '';
      return this.notify('operation:error', value, { ...options, type:'error', message: options.errorMessage ?? `${label} en échec${suffix}` });
    }
    const warnings = Array.isArray(value.warnings) ? value.warnings.length : Number(value.warnings) || 0;
    if (warnings > 0 || value.warning) {
      return this.notify('validation:warning', value, { ...options, type:'warning', message: options.warningMessage ?? `${label} terminé avec avertissement` });
    }
    return this.notify('configuration:saved', value, { ...options, type: options.type ?? 'success', message: options.successMessage ?? `${label} terminé` });
  }

  clearDedupe() {
    const size = this.recent.size;
    this.recent.clear();
    return size;
  }
}

export const INSPECTOR_NOTIFICATION_RULES = DEFAULT_RULES;
