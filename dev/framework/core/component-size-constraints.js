const AXES = new Set(['x', 'y', 'both', 'none']);
const ANCHORS = new Set(['auto', 'width', 'height']);

const finite = (value, fallback = null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const nonNegative = (value, fallback = 0) => Math.max(0, finite(value, fallback));
const positive = (value, fallback = null) => {
  const number = finite(value, fallback);
  return number != null && number > 0 ? number : fallback;
};
const clone = (value) => value === undefined ? undefined : structuredClone(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class ComponentSizeConstraintError extends Error {
  constructor(message, code = 'COMPONENT_SIZE_CONSTRAINT_ERROR', details = null) {
    super(message);
    this.name = 'ComponentSizeConstraintError';
    this.code = code;
    this.details = details;
  }
}

function normalizeAxis(value) {
  const axis = String(value ?? 'both').trim().toLowerCase();
  if (!AXES.has(axis)) throw new ComponentSizeConstraintError('Unsupported resize axis', 'INVALID_AXIS', { axis: value });
  return axis;
}

function normalizeBound(value, fallback) {
  if (value == null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new ComponentSizeConstraintError('Size bounds must be finite non-negative numbers', 'INVALID_BOUND', { value });
  return number;
}

function normalizeConfig(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ComponentSizeConstraintError('Constraint config must be an object', 'INVALID_CONFIG');
  const axis = normalizeAxis(input.axis);
  const minWidth = normalizeBound(input.minWidth, 0);
  const maxWidth = normalizeBound(input.maxWidth, Infinity);
  const minHeight = normalizeBound(input.minHeight, 0);
  const maxHeight = normalizeBound(input.maxHeight, Infinity);
  if (minWidth > maxWidth) throw new ComponentSizeConstraintError('minWidth cannot exceed maxWidth', 'INVALID_WIDTH_RANGE', { minWidth, maxWidth });
  if (minHeight > maxHeight) throw new ComponentSizeConstraintError('minHeight cannot exceed maxHeight', 'INVALID_HEIGHT_RANGE', { minHeight, maxHeight });
  const aspectRatio = input.aspectRatio == null || input.aspectRatio === '' ? null : positive(input.aspectRatio, null);
  if (input.aspectRatio != null && input.aspectRatio !== '' && aspectRatio == null) throw new ComponentSizeConstraintError('aspectRatio must be a positive finite number', 'INVALID_ASPECT_RATIO', { value: input.aspectRatio });
  if (aspectRatio != null && axis !== 'both') throw new ComponentSizeConstraintError('aspectRatio requires axis="both"', 'ASPECT_REQUIRES_BOTH_AXES', { axis });
  const step = positive(input.step, 8);
  const keyboardMultiplier = positive(input.keyboardMultiplier, 5);
  return { axis, minWidth, maxWidth, minHeight, maxHeight, aspectRatio, step, keyboardMultiplier };
}

function normalizeSize(value, label = 'size', { proposal = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ComponentSizeConstraintError(`${label} must be an object`, 'INVALID_SIZE', { label });
  const width = proposal ? finite(value.width, null) : positive(value.width, null);
  const height = proposal ? finite(value.height, null) : positive(value.height, null);
  if (width == null || height == null) {
    const expectation = proposal ? 'finite numbers' : 'positive finite numbers';
    throw new ComponentSizeConstraintError(`${label} width/height must be ${expectation}`, 'INVALID_SIZE', { label, value });
  }
  return { width, height };
}

function availableViewport(viewport = null, origin = null) {
  if (!viewport) return { width: Infinity, height: Infinity };
  if (typeof viewport !== 'object' || Array.isArray(viewport)) throw new ComponentSizeConstraintError('viewport must be an object', 'INVALID_VIEWPORT');
  const width = viewport.width == null ? Infinity : nonNegative(viewport.width, Infinity);
  const height = viewport.height == null ? Infinity : nonNegative(viewport.height, Infinity);
  const x = origin == null ? 0 : nonNegative(origin.x, 0);
  const y = origin == null ? 0 : nonNegative(origin.y, 0);
  return { width: Math.max(0, width - x), height: Math.max(0, height - y) };
}

function keyboardVector(key) {
  if (key === 'ArrowLeft') return { dx: -1, dy: 0 };
  if (key === 'ArrowRight') return { dx: 1, dy: 0 };
  if (key === 'ArrowUp') return { dx: 0, dy: -1 };
  if (key === 'ArrowDown') return { dx: 0, dy: 1 };
  return { dx: 0, dy: 0 };
}

export class ComponentSizeConstraints {
  constructor(config = {}) {
    this.config = normalizeConfig(config);
  }

  replace(config = {}) {
    this.config = normalizeConfig(config);
    return this;
  }

  snapshot() { return clone(this.config); }

  canResize(axis = 'both') {
    const requested = normalizeAxis(axis);
    if (requested === 'none' || this.config.axis === 'none') return false;
    if (this.config.axis === 'both') return requested !== 'none';
    return requested === this.config.axis;
  }

  plan(current, proposal, { viewport = null, origin = null, anchor = 'auto' } = {}) {
    const before = normalizeSize(current, 'current');
    const requested = normalizeSize(proposal, 'proposal', { proposal: true });
    const anchorMode = String(anchor ?? 'auto').trim().toLowerCase();
    if (!ANCHORS.has(anchorMode)) throw new ComponentSizeConstraintError('Unsupported aspect anchor', 'INVALID_ANCHOR', { anchor });
    const limits = this.#limits(viewport, origin);
    const { axis, aspectRatio } = this.config;
    let width = before.width;
    let height = before.height;

    if (axis === 'x' || axis === 'both') width = requested.width;
    if (axis === 'y' || axis === 'both') height = requested.height;

    if (axis === 'none') return this.#result(before, before, limits, 'none');

    if (aspectRatio != null) {
      const widthDelta = Math.abs(requested.width - before.width) / Math.max(1, before.width);
      const heightDelta = Math.abs(requested.height - before.height) / Math.max(1, before.height);
      const resolvedAnchor = anchorMode === 'auto' ? (heightDelta > widthDelta ? 'height' : 'width') : anchorMode;
      const minWidth = Math.max(limits.minWidth, limits.minHeight * aspectRatio);
      const maxWidth = Math.min(limits.maxWidth, limits.maxHeight * aspectRatio);
      if (minWidth > maxWidth) throw new ComponentSizeConstraintError('Aspect ratio cannot satisfy current bounds/viewport', 'UNSATISFIABLE_ASPECT_RATIO', { minWidth, maxWidth, aspectRatio });
      const targetWidth = resolvedAnchor === 'height' ? height * aspectRatio : width;
      width = clamp(targetWidth, minWidth, maxWidth);
      height = width / aspectRatio;
      return this.#result(before, { width, height }, limits, resolvedAnchor);
    }

    width = clamp(width, limits.minWidth, limits.maxWidth);
    height = clamp(height, limits.minHeight, limits.maxHeight);
    return this.#result(before, { width, height }, limits, axis);
  }

  keyboardDelta(key, { shiftKey = false, step = this.config.step } = {}) {
    const unit = positive(step, this.config.step) * (shiftKey ? this.config.keyboardMultiplier : 1);
    const vector = keyboardVector(key);
    let dx = vector.dx * unit;
    let dy = vector.dy * unit;
    if (this.config.axis === 'x') dy = 0;
    else if (this.config.axis === 'y') dx = 0;
    else if (this.config.axis === 'none') { dx = 0; dy = 0; }
    return { dx, dy, handled: dx !== 0 || dy !== 0 };
  }

  planKeyboard(current, key, options = {}) {
    const before = normalizeSize(current, 'current');
    const delta = this.keyboardDelta(key, options);
    if (!delta.handled) return { ...this.#result(before, before, this.#limits(options.viewport, options.origin), 'keyboard'), delta };
    const proposal = { width: before.width + delta.dx, height: before.height + delta.dy };
    return { ...this.plan(before, proposal, options), delta };
  }

  handleDescriptors() {
    const descriptors = [];
    if (this.canResize('x')) descriptors.push({ id: 'resize-x', axis: 'x', cursor: 'ew-resize', ariaLabel: 'Redimensionner horizontalement' });
    if (this.canResize('y')) descriptors.push({ id: 'resize-y', axis: 'y', cursor: 'ns-resize', ariaLabel: 'Redimensionner verticalement' });
    if (this.config.axis === 'both') descriptors.push({ id: 'resize-both', axis: 'both', cursor: 'nwse-resize', ariaLabel: 'Redimensionner horizontalement et verticalement' });
    return descriptors;
  }

  #limits(viewport, origin) {
    const available = availableViewport(viewport, origin);
    return {
      minWidth: this.config.minWidth,
      maxWidth: Math.max(0, Math.min(this.config.maxWidth, available.width)),
      minHeight: this.config.minHeight,
      maxHeight: Math.max(0, Math.min(this.config.maxHeight, available.height))
    };
  }

  #result(before, after, limits, source) {
    return {
      width: after.width,
      height: after.height,
      changed: after.width !== before.width || after.height !== before.height,
      clamped: after.width <= limits.minWidth || after.width >= limits.maxWidth || after.height <= limits.minHeight || after.height >= limits.maxHeight,
      source,
      limits: clone(limits),
      aspectRatio: this.config.aspectRatio
    };
  }
}
