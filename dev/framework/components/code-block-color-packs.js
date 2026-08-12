const TOKEN_KINDS = Object.freeze([
  'key', 'string', 'literal', 'number', 'comment', 'keyword', 'tag', 'property'
]);

const TOKEN_KIND_SET = new Set(TOKEN_KINDS);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const SAFE_VAR = /^var\(--[A-Za-z0-9_-]+(?:\s*,\s*[^;<>"']+)?\)$/;
const SAFE_HEX = /^#[0-9A-Fa-f]{3,8}$/;
const SAFE_FUNCTION_COLOR = /^(?:rgb|rgba|hsl|hsla)\([0-9A-Za-z.%+\-\s,\/]+\)$/;
const SAFE_NAMED_COLOR = /^(?:transparent|currentColor|[A-Za-z]+)$/;

const BUILTIN_PACKS = Object.freeze({
  default: Object.freeze({
    label: 'Default',
    light: Object.freeze({}),
    dark: Object.freeze({})
  }),
  classic: Object.freeze({
    label: 'Classic',
    light: Object.freeze({
      key: '#7c3aed',
      string: '#047857',
      literal: '#b45309',
      number: '#0369a1',
      comment: '#6b7280',
      keyword: '#7c3aed',
      tag: '#b91c1c',
      property: '#0369a1'
    }),
    dark: Object.freeze({
      key: '#c4b5fd',
      string: '#6ee7b7',
      literal: '#fbbf24',
      number: '#7dd3fc',
      comment: '#9ca3af',
      keyword: '#c4b5fd',
      tag: '#fca5a5',
      property: '#7dd3fc'
    })
  }),
  contrast: Object.freeze({
    label: 'High contrast',
    light: Object.freeze({
      key: '#4c1d95',
      string: '#065f46',
      literal: '#92400e',
      number: '#075985',
      comment: '#374151',
      keyword: '#4c1d95',
      tag: '#991b1b',
      property: '#075985'
    }),
    dark: Object.freeze({
      key: '#ddd6fe',
      string: '#a7f3d0',
      literal: '#fde68a',
      number: '#bae6fd',
      comment: '#d1d5db',
      keyword: '#ddd6fe',
      tag: '#fecaca',
      property: '#bae6fd'
    })
  })
});

function clonePalette(palette = {}) {
  return Object.fromEntries(Object.entries(palette));
}

function clonePack(pack) {
  return {
    label: String(pack.label ?? ''),
    light: clonePalette(pack.light),
    dark: clonePalette(pack.dark)
  };
}

function safeColor(value) {
  const color = String(value ?? '').trim();
  if (!color || /[;<>"']/.test(color)) return null;
  if (SAFE_HEX.test(color) || SAFE_FUNCTION_COLOR.test(color) || SAFE_VAR.test(color) || SAFE_NAMED_COLOR.test(color)) {
    return color;
  }
  return null;
}

function normalizePalette(value, path, errors) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${path} must be an object`);
    return {};
  }

  const output = {};
  for (const [kind, rawColor] of Object.entries(value)) {
    if (!TOKEN_KIND_SET.has(kind)) {
      errors.push(`${path}.${kind} is not a supported token kind`);
      continue;
    }
    const color = safeColor(rawColor);
    if (!color) {
      errors.push(`${path}.${kind} is not a safe CSS color`);
      continue;
    }
    output[kind] = color;
  }
  return output;
}

function normalizePack(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, errors: ['pack must be an object'], pack: null };
  }

  const pack = {
    label: String(value.label ?? '').trim(),
    light: normalizePalette(value.light, 'light', errors),
    dark: normalizePalette(value.dark, 'dark', errors)
  };
  return { valid: errors.length === 0, errors, pack: errors.length ? null : pack };
}

function normalizeTheme(value) {
  return String(value ?? '').trim().toLowerCase() === 'dark' ? 'dark' : 'light';
}

function assertId(id) {
  const normalized = String(id ?? '').trim();
  if (!SAFE_ID.test(normalized)) throw new TypeError('color pack id is invalid');
  return normalized;
}

export class CodeBlockColorPacks {
  constructor({ packs = {}, active = 'default', theme = 'light' } = {}) {
    if (!packs || typeof packs !== 'object' || Array.isArray(packs)) throw new TypeError('packs must be an object');
    this.packs = new Map(Object.entries(BUILTIN_PACKS).map(([id, pack]) => [id, clonePack(pack)]));
    this.custom = new Set();
    this.theme = normalizeTheme(theme);

    for (const [id, pack] of Object.entries(packs)) this.register(id, pack);
    this.active = this.packs.has(String(active)) ? String(active) : 'default';
  }

  static tokenKinds() {
    return [...TOKEN_KINDS];
  }

  static builtinPacks() {
    return Object.fromEntries(Object.entries(BUILTIN_PACKS).map(([id, pack]) => [id, clonePack(pack)]));
  }

  static validatePack(pack) {
    const result = normalizePack(pack);
    return { valid: result.valid, errors: [...result.errors] };
  }

  list() {
    return [...this.packs.entries()].map(([id, pack]) => ({ id, ...clonePack(pack), builtin: !this.custom.has(id) }));
  }

  register(id, pack, { replace = false } = {}) {
    const safeId = assertId(id);
    if (this.packs.has(safeId) && !replace) throw new TypeError(`color pack already exists: ${safeId}`);
    if (Object.hasOwn(BUILTIN_PACKS, safeId) && !replace) throw new TypeError(`built-in color pack cannot be replaced implicitly: ${safeId}`);

    const normalized = normalizePack(pack);
    if (!normalized.valid) {
      const error = new TypeError(`invalid color pack: ${normalized.errors.join('; ')}`);
      error.issues = [...normalized.errors];
      throw error;
    }

    this.packs.set(safeId, normalized.pack);
    if (!Object.hasOwn(BUILTIN_PACKS, safeId)) this.custom.add(safeId);
    return this;
  }

  remove(id) {
    const safeId = String(id ?? '').trim();
    if (!this.custom.has(safeId)) return false;
    this.custom.delete(safeId);
    this.packs.delete(safeId);
    if (this.active === safeId) this.active = 'default';
    return true;
  }

  setActive(id) {
    const safeId = String(id ?? '').trim();
    if (!this.packs.has(safeId)) return false;
    this.active = safeId;
    return true;
  }

  setTheme(theme) {
    this.theme = normalizeTheme(theme);
    return this;
  }

  palette({ pack = this.active, theme = this.theme } = {}) {
    const selected = this.packs.get(String(pack)) ?? this.packs.get('default');
    const normalizedTheme = normalizeTheme(theme);
    const light = clonePalette(selected.light);
    return normalizedTheme === 'dark' ? { ...light, ...selected.dark } : light;
  }

  color(kind, options = {}) {
    if (!TOKEN_KIND_SET.has(String(kind))) return null;
    return this.palette(options)[String(kind)] ?? null;
  }

  cssVariables(options = {}) {
    const palette = this.palette(options);
    return Object.fromEntries(
      TOKEN_KINDS.filter((kind) => palette[kind]).map((kind) => [`--nlab-code-token-${kind}`, palette[kind]])
    );
  }

  snapshot() {
    return {
      active: this.active,
      theme: this.theme,
      packs: this.list()
    };
  }

  apply(root, { pack = this.active, theme = this.theme } = {}) {
    if (!root || typeof root !== 'object') return { applied: false, reason: 'no-root', count: 0 };
    const packId = this.packs.has(String(pack)) ? String(pack) : 'default';
    const normalizedTheme = normalizeTheme(theme);
    const palette = this.palette({ pack: packId, theme: normalizedTheme });

    if (root.dataset) {
      root.dataset.colorPack = packId;
      root.dataset.colorTheme = normalizedTheme;
    }

    let count = 0;
    for (const kind of TOKEN_KINDS) {
      const variable = `--nlab-code-token-${kind}`;
      const color = palette[kind] ?? null;
      if (color) root.style?.setProperty?.(variable, color);
      else root.style?.removeProperty?.(variable);

      const nodes = root.querySelectorAll?.(`.nlab-codeblock__${kind}`) ?? [];
      for (const node of nodes) {
        if (color) node.style?.setProperty?.('color', color);
        else node.style?.removeProperty?.('color');
        count += 1;
      }
    }

    return { applied: true, reason: null, count, pack: packId, theme: normalizedTheme };
  }
}
