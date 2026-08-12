const TYPE = 'nlab.search-advanced-options';
const VERSION = 1;
const SEARCH_MODES = new Set(['contains', 'exact', 'regex']);
const SUGGEST_MATCHES = new Set(['contains', 'prefix']);
const MAX_LIMIT = 1000000;
const MAX_LIST_ITEMS = 256;
const MAX_TEXT_LENGTH = 256;

const DEFAULTS = Object.freeze({
  mode: 'contains',
  fields: null,
  limit: null,
  locale: 'fr',
  stopwords: Object.freeze([]),
  suggest: Object.freeze({
    enabled: true,
    inheritFields: true,
    fields: null,
    minChars: 1,
    limit: 8,
    match: 'contains'
  })
});

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, entry] of Object.entries(value)) result[key] = clone(entry);
    return result;
  }
  return value;
}

function normalizeText(value, fallback = '') {
  const text = String(value ?? fallback).trim();
  if (!text) return String(fallback ?? '').trim();
  if (text.length > MAX_TEXT_LENGTH) throw new TypeError(`Search option text exceeds ${MAX_TEXT_LENGTH} characters`);
  return text;
}

function normalizeLocale(value) {
  const locale = normalizeText(value, DEFAULTS.locale);
  try {
    new Intl.Collator(locale);
    return locale;
  } catch {
    return DEFAULTS.locale;
  }
}

function normalizeMode(value) {
  const mode = normalizeText(value, DEFAULTS.mode).toLowerCase();
  return SEARCH_MODES.has(mode) ? mode : DEFAULTS.mode;
}

function normalizeSuggestMatch(value) {
  const match = normalizeText(value, DEFAULTS.suggest.match).toLowerCase();
  return SUGGEST_MATCHES.has(match) ? match : DEFAULTS.suggest.match;
}

function normalizeLimit(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(MAX_LIMIT, Math.floor(number)));
}

function normalizeList(value, { nullable = false, locale = DEFAULTS.locale } = {}) {
  if (value === null || value === undefined) return nullable ? null : [];
  const source = Array.isArray(value) ? value : [value];
  if (source.length > MAX_LIST_ITEMS) throw new RangeError(`Search option list exceeds ${MAX_LIST_ITEMS} items`);

  const seen = new Set();
  const result = [];
  for (const entry of source) {
    if (typeof entry !== 'string') continue;
    const text = normalizeText(entry, '');
    if (!text) continue;
    let key;
    try { key = text.toLocaleLowerCase(locale); } catch { key = text.toLowerCase(); }
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return nullable ? (result.length ? result : null) : result;
}

function normalizeSuggest(value = {}, locale) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const inheritFields = source.inheritFields === undefined ? DEFAULTS.suggest.inheritFields : Boolean(source.inheritFields);
  return {
    enabled: source.enabled === undefined ? DEFAULTS.suggest.enabled : Boolean(source.enabled),
    inheritFields,
    fields: inheritFields ? null : normalizeList(source.fields, { nullable: true, locale }),
    minChars: normalizeLimit(source.minChars, DEFAULTS.suggest.minChars),
    limit: normalizeLimit(source.limit, DEFAULTS.suggest.limit),
    match: normalizeSuggestMatch(source.match)
  };
}

function normalizeConfig(value = {}) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Search advanced options must be an object');
  const locale = normalizeLocale(value.locale);
  const fields = normalizeList(value.fields, { nullable: true, locale });
  const suggest = normalizeSuggest(value.suggest, locale);
  return {
    mode: normalizeMode(value.mode),
    fields,
    limit: normalizeLimit(value.limit, DEFAULTS.limit),
    locale,
    stopwords: normalizeList(value.stopwords, { locale }),
    suggest
  };
}

function mergeConfig(current, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('Search advanced options patch must be an object');
  return {
    ...clone(current),
    ...clone(patch),
    suggest: patch.suggest === undefined
      ? clone(current.suggest)
      : { ...clone(current.suggest), ...clone(patch.suggest) }
  };
}

export const SEARCH_ADVANCED_OPTIONS_TYPE = TYPE;
export const SEARCH_ADVANCED_OPTIONS_VERSION = VERSION;

export class SearchAdvancedOptions {
  constructor(options = {}) {
    this._state = normalizeConfig(options);
    this._initial = clone(this._state);
  }

  static defaults() {
    return normalizeConfig({});
  }

  static parse(input) {
    const payload = typeof input === 'string' ? JSON.parse(input) : clone(input);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('Search advanced options payload must be an object');
    if (payload.type !== TYPE) throw new TypeError(`Unsupported search advanced options type: ${String(payload.type)}`);
    if (payload.version !== VERSION) throw new TypeError(`Unsupported search advanced options version: ${String(payload.version)}`);
    return new SearchAdvancedOptions(payload.options);
  }

  snapshot() {
    return clone(this._state);
  }

  update(patch = {}) {
    this._state = normalizeConfig(mergeConfig(this._state, patch));
    return this.snapshot();
  }

  reset() {
    this._state = clone(this._initial);
    return this.snapshot();
  }

  resetDefaults() {
    this._state = normalizeConfig({});
    return this.snapshot();
  }

  forSearch() {
    const state = this._state;
    return {
      fields: clone(state.fields),
      mode: state.mode === 'regex' ? 'regex' : 'text',
      exact: state.mode === 'exact',
      regex: state.mode === 'regex',
      limit: state.limit,
      locale: state.locale,
      stopwords: clone(state.stopwords)
    };
  }

  forSuggest() {
    const state = this._state;
    if (!state.suggest.enabled) return null;
    return {
      fields: state.suggest.inheritFields ? clone(state.fields) : clone(state.suggest.fields),
      limit: state.suggest.limit,
      minChars: state.suggest.minChars,
      locale: state.locale,
      match: state.suggest.match
    };
  }

  toJSON() {
    return {
      type: TYPE,
      version: VERSION,
      options: this.snapshot()
    };
  }

  serialize({ indent = 2 } = {}) {
    const safeIndent = Math.max(0, Math.min(8, Math.floor(Number(indent) || 0)));
    return JSON.stringify(this.toJSON(), null, safeIndent);
  }
}
