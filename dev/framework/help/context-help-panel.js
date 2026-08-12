const SIDES = new Set(['left', 'right']);
const EXPERIENCES = new Set(['visitor', 'webmaster']);
const MIN_WIDTH = 240;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 360;
const SENSITIVE = new Set(['__proto__', 'prototype', 'constructor']);

function makeError(code, message) {
  const value = new Error(message);
  value.name = 'ContextHelpPanelError';
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
        value: cloneJson(value[key], seen, `${path}.${key}`),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    return out;
  } finally {
    seen.delete(value);
  }
}

function normalizeExperience(value) {
  const mode = String(value ?? 'visitor').trim().toLowerCase();
  if (!EXPERIENCES.has(mode)) throw makeError('INVALID_EXPERIENCE', `Unsupported help experience: ${mode}`);
  return mode;
}

function normalizeSide(value) {
  const side = String(value ?? 'right').trim().toLowerCase();
  if (!SIDES.has(side)) throw makeError('INVALID_SIDE', `Unsupported help panel side: ${side}`);
  return side;
}

function normalizeWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return DEFAULT_WIDTH;
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(width)));
}

function normalizeId(value) {
  const id = String(value ?? '').trim();
  if (!id || id.length > 240) throw makeError('INVALID_HELP_ID', 'Help id is required');
  return id;
}

function normalizeInlineContent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw makeError('INVALID_HELP_CONTENT', 'Help content must be an object');
  const content = cloneJson(input);
  content.id = normalizeId(content.id);
  content.title = String(content.title ?? content.id);
  content.short = String(content.short ?? '');
  content.long = String(content.long ?? content.short ?? '');
  content.examples = Array.isArray(content.examples) ? content.examples : [];
  content.links = Array.isArray(content.links) ? content.links : [];
  content.media = Array.isArray(content.media) ? content.media : [];
  return content;
}

function cloneEntry(entry) {
  return entry ? { id: entry.id, inline: entry.inline ? cloneJson(entry.inline) : null } : null;
}

export class ContextHelpPanel {
  constructor({
    help = null,
    experience = 'visitor',
    side = 'right',
    width = DEFAULT_WIDTH,
    collapsed = false,
    open = false,
    maxHistory = 32,
    onChange = null
  } = {}) {
    this.help = help;
    this.experience = normalizeExperience(experience);
    this.side = normalizeSide(side);
    this.width = normalizeWidth(width);
    this.collapsed = Boolean(collapsed);
    this.isOpen = Boolean(open);
    this.maxHistory = Math.max(1, Math.min(128, Math.floor(Number(maxHistory) || 32)));
    this.history = [];
    this.index = -1;
    this.onChange = typeof onChange === 'function' ? onChange : null;
  }

  #emit(reason) {
    const value = this.snapshot();
    try { this.onChange?.(value, reason); } catch {}
    return value;
  }

  #resolve(entry) {
    if (!entry) return null;
    if (entry.inline) return cloneJson(entry.inline);
    const provider = this.help;
    try {
      if (typeof provider === 'function') {
        const value = provider(entry.id, { experience: this.experience });
        return value ? normalizeInlineContent({ id: entry.id, ...value }) : null;
      }
      if (typeof provider?.content === 'function') {
        const value = provider.content(entry.id, { experience: this.experience });
        return value ? normalizeInlineContent(value) : null;
      }
      if (typeof provider?.get === 'function') {
        const value = provider.get(entry.id);
        return value ? normalizeInlineContent({ id: entry.id, ...value }) : null;
      }
    } catch (cause) {
      if (cause?.name === 'ContextHelpPanelError') throw cause;
      throw makeError('HELP_PROVIDER_ERROR', cause?.message ?? String(cause));
    }
    return null;
  }

  #currentEntry() {
    return this.index >= 0 && this.index < this.history.length ? this.history[this.index] : null;
  }

  current() {
    const entry = this.#currentEntry();
    return entry ? this.#resolve(entry) : null;
  }

  open(input, { replace = false } = {}) {
    let entry;
    if (typeof input === 'string') {
      entry = { id: normalizeId(input), inline: null };
      if (!this.#resolve(entry)) return { ok: false, code: 'HELP_NOT_FOUND', id: entry.id };
    } else {
      const content = normalizeInlineContent(input);
      entry = { id: content.id, inline: content };
    }

    if (replace && this.index >= 0) {
      this.history[this.index] = entry;
      this.history.splice(this.index + 1);
    } else {
      this.history.splice(this.index + 1);
      this.history.push(entry);
      if (this.history.length > this.maxHistory) this.history.splice(0, this.history.length - this.maxHistory);
      this.index = this.history.length - 1;
    }
    this.isOpen = true;
    this.collapsed = false;
    return { ok: true, content: this.current(), state: this.#emit('open') };
  }

  close() {
    this.isOpen = false;
    return this.#emit('close');
  }

  reopen() {
    if (!this.#currentEntry()) return { ok: false, code: 'NO_HELP' };
    this.isOpen = true;
    return { ok: true, state: this.#emit('reopen'), content: this.current() };
  }

  setCollapsed(value = true) {
    this.collapsed = Boolean(value);
    if (this.collapsed) this.isOpen = true;
    return this.#emit('collapse');
  }

  toggleCollapsed() {
    return this.setCollapsed(!this.collapsed);
  }

  setExperience(value) {
    this.experience = normalizeExperience(value);
    return this.#emit('experience');
  }

  setSide(value) {
    this.side = normalizeSide(value);
    return this.#emit('side');
  }

  setWidth(value) {
    this.width = normalizeWidth(value);
    return this.#emit('width');
  }

  back() {
    if (this.index <= 0) return { ok: false, code: 'HISTORY_START', state: this.snapshot() };
    this.index -= 1;
    this.isOpen = true;
    this.collapsed = false;
    return { ok: true, content: this.current(), state: this.#emit('back') };
  }

  forward() {
    if (this.index < 0 || this.index >= this.history.length - 1) return { ok: false, code: 'HISTORY_END', state: this.snapshot() };
    this.index += 1;
    this.isOpen = true;
    this.collapsed = false;
    return { ok: true, content: this.current(), state: this.#emit('forward') };
  }

  clearHistory({ keepCurrent = false } = {}) {
    const current = keepCurrent ? cloneEntry(this.#currentEntry()) : null;
    this.history = current ? [current] : [];
    this.index = current ? 0 : -1;
    if (!current) this.isOpen = false;
    return this.#emit('clearHistory');
  }

  descriptor() {
    const content = this.current();
    return {
      kind: 'context-help-panel',
      open: this.isOpen,
      collapsed: this.collapsed,
      side: this.side,
      width: this.collapsed ? 48 : this.width,
      expandedWidth: this.width,
      experience: this.experience,
      activeId: content?.id ?? null,
      content,
      canBack: this.index > 0,
      canForward: this.index >= 0 && this.index < this.history.length - 1,
      aria: {
        role: 'complementary',
        label: content?.title ? `Aide — ${content.title}` : 'Aide contextuelle',
        expanded: !this.collapsed
      }
    };
  }

  snapshot() {
    return {
      open: this.isOpen,
      collapsed: this.collapsed,
      side: this.side,
      width: this.width,
      experience: this.experience,
      activeId: this.#currentEntry()?.id ?? null,
      history: {
        index: this.index,
        ids: this.history.map((entry) => entry.id),
        canBack: this.index > 0,
        canForward: this.index >= 0 && this.index < this.history.length - 1
      }
    };
  }
}

export const CONTEXT_HELP_PANEL_SIDES = Object.freeze([...SIDES]);
export const CONTEXT_HELP_PANEL_EXPERIENCES = Object.freeze([...EXPERIENCES]);
