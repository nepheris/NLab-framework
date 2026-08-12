const STATES = ['normal', 'hover', 'focus', 'visited', 'active', 'disabled'];
const DECORATIONS = new Set(['none', 'underline', 'overline', 'line-through']);
const DECORATION_STYLES = new Set(['solid', 'double', 'dotted', 'dashed', 'wavy']);
const MAX_VALUE = 256;

const plain = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const clone = (value) => value === undefined ? undefined : structuredClone(value);
const clean = (value) => String(value ?? '').trim();

export class LinkThemeTokenError extends Error {
  constructor(message, code = 'LINK_THEME_TOKEN_ERROR', details = null) {
    super(message);
    this.name = 'LinkThemeTokenError';
    this.code = code;
    this.details = details;
  }
}

function safeCssValue(value, field) {
  if (value == null || value === '') return null;
  const text = clean(value);
  if (!text) return null;
  if (text.length > MAX_VALUE) throw new LinkThemeTokenError(`${field} exceeds ${MAX_VALUE} characters`, 'VALUE_TOO_LONG', { field });
  if (/[;{}<>\u0000-\u001f\u007f]/.test(text) || /(?:url|expression)\s*\(/i.test(text)) {
    throw new LinkThemeTokenError(`Unsafe CSS token: ${field}`, 'UNSAFE_CSS_VALUE', { field, value: text });
  }
  return text;
}

function enumValue(value, allowed, field) {
  if (value == null || value === '') return null;
  const normalized = clean(value).toLowerCase();
  if (!allowed.has(normalized)) throw new LinkThemeTokenError(`Invalid ${field}`, 'INVALID_ENUM', { field, value });
  return normalized;
}

function opacity(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) {
    throw new LinkThemeTokenError('opacity must be between 0 and 1', 'INVALID_OPACITY', { value });
  }
  return number;
}

function normalizeState(value = {}) {
  if (!plain(value)) throw new LinkThemeTokenError('Link state tokens must be an object', 'INVALID_STATE');
  const state = {};
  const color = safeCssValue(value.color, 'color');
  const decoration = enumValue(value.decoration ?? value.textDecoration, DECORATIONS, 'decoration');
  const decorationColor = safeCssValue(value.decorationColor ?? value.textDecorationColor, 'decorationColor');
  const decorationStyle = enumValue(value.decorationStyle ?? value.textDecorationStyle, DECORATION_STYLES, 'decorationStyle');
  const outline = safeCssValue(value.outline, 'outline');
  const opacityValue = opacity(value.opacity);
  if (color != null) state.color = color;
  if (decoration != null) state.decoration = decoration;
  if (decorationColor != null) state.decorationColor = decorationColor;
  if (decorationStyle != null) state.decorationStyle = decorationStyle;
  if (outline != null) state.outline = outline;
  if (opacityValue != null) state.opacity = opacityValue;
  return state;
}

function normalizeDescriptor(input = {}) {
  if (!plain(input)) throw new LinkThemeTokenError('Link theme descriptor must be an object', 'INVALID_DESCRIPTOR');
  const descriptor = {};
  const hasStateKeys = STATES.some((state) => Object.hasOwn(input, state));
  descriptor.normal = normalizeState(hasStateKeys ? (input.normal ?? {}) : input);
  for (const state of STATES.slice(1)) descriptor[state] = normalizeState(input[state] ?? {});
  return descriptor;
}

function variableSuffix(field) {
  return ({
    color: 'color',
    decoration: 'decoration',
    decorationColor: 'decoration-color',
    decorationStyle: 'decoration-style',
    outline: 'outline',
    opacity: 'opacity'
  })[field];
}

function valueToCss(value) {
  return typeof value === 'number' ? String(value) : value;
}

export class LinkThemeTokens {
  constructor(tokens = {}) {
    this.tokens = normalizeDescriptor(tokens);
  }

  static states() { return [...STATES]; }

  replace(tokens = {}) {
    this.tokens = normalizeDescriptor(tokens);
    return this;
  }

  merge(patch = {}) {
    if (!plain(patch)) throw new LinkThemeTokenError('Link theme patch must be an object', 'INVALID_PATCH');
    const next = clone(this.tokens);
    const hasStateKeys = STATES.some((state) => Object.hasOwn(patch, state));
    if (!hasStateKeys) next.normal = { ...next.normal, ...normalizeState(patch) };
    else {
      for (const state of STATES) {
        if (Object.hasOwn(patch, state)) next[state] = { ...next[state], ...normalizeState(patch[state]) };
      }
    }
    this.tokens = normalizeDescriptor(next);
    return this;
  }

  state(name = 'normal', { inherit = true } = {}) {
    const state = clean(name, 'normal').toLowerCase();
    if (!STATES.includes(state)) throw new LinkThemeTokenError('Unknown link visual state', 'UNKNOWN_STATE', { state: name });
    const own = clone(this.tokens[state]);
    if (!inherit || state === 'normal') return own;
    return { ...clone(this.tokens.normal), ...own };
  }

  variables({ prefix = '--nlab-link', inherit = true } = {}) {
    const normalizedPrefix = clean(prefix, '--nlab-link').toLowerCase();
    if (!/^--[a-z][a-z0-9-]*$/.test(normalizedPrefix)) {
      throw new LinkThemeTokenError('Invalid CSS variable prefix', 'INVALID_PREFIX', { prefix });
    }
    const variables = {};
    for (const state of STATES) {
      const tokens = this.state(state, { inherit });
      for (const [field, value] of Object.entries(tokens)) {
        const suffix = variableSuffix(field);
        if (!suffix) continue;
        const statePrefix = state === 'normal' ? normalizedPrefix : `${normalizedPrefix}-${state}`;
        variables[`${statePrefix}-${suffix}`] = valueToCss(value);
      }
    }
    return variables;
  }

  snapshot() { return clone(this.tokens); }
}
