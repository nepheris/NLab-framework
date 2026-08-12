import { FilmstripController } from './filmstrip-controller.js';

const DEFAULT_CONTROLLERS = Object.freeze(['arrows', 'dots', 'thumbnails', 'counter']);
const clone = (value) => value === undefined ? undefined : structuredClone(value);

export class QRStudioFilmstripError extends Error {
  constructor(message, code = 'QR_STUDIO_FILMSTRIP_ERROR', details = null) {
    super(message);
    this.name = 'QRStudioFilmstripError';
    this.code = code;
    this.details = details;
  }
}

function assertSession(session) {
  const methods = ['list', 'select', 'beginEdit', 'patch', 'regenerate', 'validate', 'reset'];
  if (!session || methods.some((method) => typeof session[method] !== 'function')) {
    throw new QRStudioFilmstripError('QRStudioSession-compatible source is required', 'INVALID_SESSION');
  }
  return session;
}

function assertController(controller) {
  const methods = ['subscribe', 'setCount', 'go', 'next', 'previous', 'descriptors', 'snapshot'];
  if (!controller || methods.some((method) => typeof controller[method] !== 'function')) {
    throw new QRStudioFilmstripError('FilmstripController-compatible controller is required', 'INVALID_CONTROLLER');
  }
  return controller;
}

function errorSnapshot(error) {
  return { name: String(error?.name ?? 'Error'), message: String(error?.message ?? error ?? 'Unknown error') };
}

export class QRStudioFilmstrip {
  constructor({
    session,
    controller = null,
    controllers = DEFAULT_CONTROLLERS,
    loop = true,
    previewOf = null,
    onChange = null
  } = {}) {
    this.session = assertSession(session);
    this.previewOf = typeof previewOf === 'function' ? previewOf : null;
    this.onChange = typeof onChange === 'function' ? onChange : null;
    this.pending = new Set();
    this.syncing = false;

    const states = this.session.list();
    const index = Math.max(0, states.findIndex((entry) => entry.active));
    this.controller = assertController(controller ?? new FilmstripController({
      count: states.length,
      index,
      loop,
      controllers
    }));
    this.unsubscribe = this.controller.subscribe((event) => this.#controllerEvent(event));
    this.refresh();
  }

  refresh({ emit = false } = {}) {
    const states = this.session.list();
    const activeIndex = states.findIndex((entry) => entry.active);
    this.syncing = true;
    try {
      this.controller.setCount(states.length);
      if (states.length) this.controller.go(activeIndex >= 0 ? activeIndex : 0, { reason: 'session-sync' });
    } finally {
      this.syncing = false;
    }
    const descriptor = this.descriptor();
    if (emit) this.#emit('refresh', descriptor);
    return descriptor;
  }

  selectedId() {
    return this.session.list().find((entry) => entry.active)?.id ?? null;
  }

  items() {
    return this.session.list().map((state, index) => this.#item(state, index));
  }

  select(target, { reason = 'select' } = {}) {
    const states = this.session.list();
    let index = -1;
    if (Number.isInteger(target)) index = target;
    else index = states.findIndex((entry) => entry.id === String(target ?? '').trim());
    if (index < 0 || index >= states.length) {
      throw new QRStudioFilmstripError('Unknown QR filmstrip item', 'UNKNOWN_ITEM', { target });
    }

    const state = this.session.select(states[index].id);
    this.syncing = true;
    try { this.controller.go(index, { reason }); } finally { this.syncing = false; }
    const item = this.#item(state, index);
    this.#emit('select', { item, descriptor: this.descriptor(), reason });
    return item;
  }

  next() {
    this.controller.next({ reason: 'next' });
    return this.selected();
  }

  previous() {
    this.controller.previous({ reason: 'previous' });
    return this.selected();
  }

  selected() {
    return this.items().find((item) => item.selected) ?? null;
  }

  beginEdit(id = this.selectedId()) {
    this.select(id, { reason: 'edit' });
    const state = this.session.beginEdit(id);
    const item = this.#item(state, this.#indexOf(id));
    this.#emit('edit', { item, descriptor: this.descriptor() });
    return item;
  }

  patch(patch, { id = this.selectedId(), replace = false } = {}) {
    this.select(id, { reason: 'patch' });
    const state = this.session.patch(patch, { id, replace });
    const item = this.#item(state, this.#indexOf(id));
    this.#emit('patch', { item, descriptor: this.descriptor() });
    return item;
  }

  async regenerate(id = this.selectedId(), options = {}) {
    this.select(id, { reason: 'regenerate' });
    this.pending.add(id);
    this.#emit('regenerate-start', { id, descriptor: this.descriptor() });
    let result;
    try {
      result = await this.session.regenerate({ id, ...options });
    } finally {
      this.pending.delete(id);
    }
    const item = this.items().find((entry) => entry.id === id) ?? null;
    this.#emit(result?.ok ? 'regenerate' : 'regenerate-error', { id, result: clone(result), item, descriptor: this.descriptor() });
    return { ...clone(result), item };
  }

  validate(id = this.selectedId(), options = {}) {
    this.select(id, { reason: 'validate' });
    const result = this.session.validate(id, options);
    const item = this.items().find((entry) => entry.id === id) ?? null;
    this.#emit(result?.ok ? 'validate' : 'validate-error', { id, result: clone(result), item, descriptor: this.descriptor() });
    return { ...clone(result), item };
  }

  reset(id = this.selectedId(), options = {}) {
    this.select(id, { reason: 'reset' });
    const state = this.session.reset(id, options);
    const item = this.#item(state, this.#indexOf(id));
    this.#emit('reset', { item, descriptor: this.descriptor() });
    return item;
  }

  descriptor() {
    const items = this.items();
    const snapshot = this.controller.snapshot();
    const controls = this.controller.descriptors().map((descriptor) => {
      if (descriptor.type !== 'thumbnails') return clone(descriptor);
      return {
        ...clone(descriptor),
        items: items.map((item) => ({
          index: item.index,
          id: item.id,
          label: item.label,
          selected: item.selected,
          status: item.status
        }))
      };
    });
    return {
      type: 'qr-studio-filmstrip',
      layout: 'compact',
      allVisible: true,
      count: items.length,
      selectedId: items.find((item) => item.selected)?.id ?? null,
      items,
      controller: { ...clone(snapshot), descriptors: controls }
    };
  }

  destroy() {
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = null;
    try { unsubscribe?.(); } catch {}
    this.pending.clear();
    return true;
  }

  #indexOf(id) {
    return this.session.list().findIndex((entry) => entry.id === id);
  }

  #controllerEvent(event) {
    if (this.syncing || event?.type !== 'index') return;
    const states = this.session.list();
    const state = states[event.snapshot?.index];
    if (!state) return;
    this.session.select(state.id);
    this.#emit('select', {
      item: this.#item(this.session.state?.(state.id) ?? state, event.snapshot.index),
      descriptor: this.descriptor(),
      reason: event.reason ?? 'controller'
    });
  }

  #item(state, index) {
    const pending = this.pending.has(state.id);
    const generationError = state.lastGeneration?.ok === false;
    const status = pending
      ? 'regenerating'
      : generationError
        ? 'generation-error'
        : state.editing && state.dirty
          ? 'editing-dirty'
          : state.editing
            ? 'editing'
            : state.dirty
              ? 'dirty'
              : state.validated
                ? 'validated'
                : 'idle';

    let preview = state.lastGeneration?.ok ? clone(state.lastGeneration.result) : null;
    let previewError = null;
    if (this.previewOf) {
      try { preview = clone(this.previewOf(clone(state))); }
      catch (error) { preview = null; previewError = errorSnapshot(error); }
    }

    return {
      index,
      id: state.id,
      label: state.label,
      selected: Boolean(state.active),
      editing: Boolean(state.editing),
      dirty: Boolean(state.dirty),
      validated: Boolean(state.validated),
      pending,
      status,
      generationCount: Number(state.generationCount) || 0,
      preview,
      previewError,
      config: clone(state.config),
      meta: clone(state.meta ?? {}),
      markers: {
        selection: state.active ? 'border' : 'none',
        editing: state.editing ? 'editing' : 'none',
        dirty: state.dirty ? 'dirty' : 'clean',
        validation: state.validated ? 'validated' : 'unvalidated',
        generation: pending ? 'pending' : generationError ? 'error' : state.lastGeneration?.ok ? 'ready' : 'none'
      },
      actions: [
        { id: 'edit', label: 'Modifier', enabled: !pending },
        { id: 'regenerate', label: 'Régénérer', enabled: !pending },
        { id: 'validate', label: 'Valider / OK', enabled: !pending && (state.dirty || state.editing) },
        { id: 'reset', label: 'Reset', enabled: !pending && (state.dirty || state.editing) }
      ],
      ariaLabel: `${state.label} — ${status}`,
      ariaCurrent: state.active ? 'true' : null
    };
  }

  #emit(type, result) {
    try { this.onChange?.({ type, result: clone(result) }); } catch {}
  }
}
