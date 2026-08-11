const TYPE_ALIASES = {
  danger: 'error'
};

const BACKGROUNDS = {
  info: 'var(--nlab-notification-info,var(--nlab-info,#1d4ed8))',
  success: 'var(--nlab-notification-success,var(--nlab-success,#166534))',
  warning: 'var(--nlab-notification-warning,var(--nlab-warning,#a16207))',
  error: 'var(--nlab-notification-error,var(--nlab-danger,#b91c1c))',
  dev: 'var(--nlab-notification-dev,var(--nlab-dev,#475569))'
};

function normalizeDuration(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function normalizeMaxItems(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.max(1, Math.floor(number)) : 5;
}

function normalizeType(type) {
  const key = String(type ?? 'info').trim().toLowerCase();
  const normalized = TYPE_ALIASES[key] ?? key;
  return BACKGROUNDS[normalized] ? normalized : 'info';
}

export class NotificationCenter {
  constructor({
    root = null,
    documentRef = globalThis.document ?? null,
    duration = 1800,
    exitDuration = 180,
    maxItems = 5
  } = {}) {
    this.document = documentRef;
    this.root = root ?? documentRef?.body ?? null;
    this.duration = normalizeDuration(duration, 1800);
    this.exitDuration = normalizeDuration(exitDuration, 180);
    this.maxItems = normalizeMaxItems(maxItems);
    this.host = null;
    this.timers = new Map();
  }

  mount() {
    if (this.host && this.host.isConnected !== false) return this.host;
    if (!this.root || typeof this.root.append !== 'function') return null;
    if (!this.document || typeof this.document.createElement !== 'function') return null;

    const host = this.document.createElement('div');
    host.className = 'nlab-notification-center';
    host.setAttribute('aria-live', 'polite');
    host.setAttribute('aria-relevant', 'additions removals');
    host.style.cssText = 'position:fixed;right:1rem;bottom:1rem;z-index:100000;display:grid;gap:.45rem;max-width:min(92vw,420px)';
    this.root.append(host);
    this.host = host;
    return host;
  }

  show(message, {
    type = 'info',
    duration = this.duration,
    persistent = false
  } = {}) {
    const host = this.mount();
    if (!host) return null;

    const normalizedType = normalizeType(type);
    const node = this.document.createElement('div');
    node.className = 'nlab-notification';
    node.dataset.type = normalizedType;
    node.setAttribute('role', ['warning', 'error'].includes(normalizedType) ? 'alert' : 'status');
    node.textContent = String(message ?? '');
    node.style.cssText = `padding:.55rem .75rem;border-radius:.55rem;background:${BACKGROUNDS[normalizedType]};color:white;box-shadow:0 8px 28px #0003;transition:.16s`;
    host.append(node);

    while ((host.children?.length ?? 0) > this.maxItems) {
      const oldest = host.children[0];
      if (!oldest || oldest === node) break;
      this.dismiss(oldest, { immediate: true });
    }

    const effectiveDuration = normalizeDuration(duration, this.duration);
    if (!persistent && effectiveDuration > 0) {
      const timer = setTimeout(() => this.dismiss(node), effectiveDuration);
      this.timers.set(node, timer);
    }

    return node;
  }

  dismiss(node, { immediate = false } = {}) {
    if (!node) return false;

    const timer = this.timers.get(node);
    if (timer) clearTimeout(timer);
    this.timers.delete(node);

    if (immediate || this.exitDuration === 0) {
      node.remove?.();
      return true;
    }

    if (node.style) {
      node.style.opacity = '0';
      node.style.transform = 'translateY(6px)';
    }

    setTimeout(() => node.remove?.(), this.exitDuration);
    return true;
  }

  clear({ immediate = true } = {}) {
    if (!this.host?.children) return 0;
    const nodes = Array.from(this.host.children);
    nodes.forEach((node) => this.dismiss(node, { immediate }));
    return nodes.length;
  }

  destroy() {
    this.clear({ immediate: true });
    this.host?.remove?.();
    this.host = null;
    return true;
  }

  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }

  danger(message, options = {}) {
    return this.error(message, options);
  }

  dev(message, options = {}) {
    return this.show(message, { ...options, type: 'dev' });
  }
}
