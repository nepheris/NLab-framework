import { ResultSet } from '../data/result-set.js';

const lower = (value, locale = 'fr') => {
  const text = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  try { return text.toLocaleLowerCase(locale); } catch { return text.toLowerCase(); }
};
const tokenize = (text, locale = 'fr') => lower(text, locale).replace(/[^\p{L}\p{N}@._-]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
const asArray = (value) => Array.isArray(value) ? value : [];
const normalizeFields = (fields) => {
  const targetFields = Array.isArray(fields)
    ? fields.filter((field) => typeof field === 'string' && field.length)
    : typeof fields === 'string' && fields.length ? [fields] : null;
  return targetFields?.length ? targetFields : null;
};
const candidateValues = (item, fields) => {
  const entries = fields
    ? fields.map((field) => [field, item?.[field]])
    : item && typeof item === 'object' ? Object.entries(item) : [[null, item]];
  return entries.flatMap(([field, raw]) => (Array.isArray(raw) ? raw : [raw]).map((value) => ({ field, value })));
};

export class SearchWiz {
  search(items, query, { fields = null, mode = 'text', exact = false, regex = false, limit = null, locale = 'fr', stopwords = [] } = {}) {
    const source = asArray(items);
    const queryText = query instanceof RegExp ? query.source : String(query ?? '');
    if (!queryText) return new ResultSet(source, { query:'', total:source.length });

    const normalizedFields = normalizeFields(fields);
    const normalizedMode = String(mode ?? 'text').toLowerCase();
    let expression = null;
    if (regex || normalizedMode === 'regex') expression = query instanceof RegExp ? query : new RegExp(String(query), 'i');

    const ignored = new Set(asArray(stopwords).flatMap((word) => tokenize(word, locale)));
    const tokens = tokenize(queryText, locale).filter((token) => !ignored.has(token));

    const rows = source.map((item, index) => {
      const values = normalizedFields ? normalizedFields.map((field) => item?.[field]) : Object.values(item ?? {});
      const haystack = lower(values.flatMap((value) => Array.isArray(value) ? value : [value]).join(' '), locale);
      let score = 0;
      let matched = false;

      if (expression) {
        expression.lastIndex = 0;
        matched = expression.test(haystack);
        score = matched ? 100 : 0;
      } else if (exact) {
        matched = haystack === lower(queryText, locale);
        score = matched ? 100 : 0;
      } else {
        for (const token of tokens) {
          if (haystack.includes(token)) {
            matched = true;
            score += haystack === token ? 20 : haystack.startsWith(token) ? 10 : 5;
          }
        }
        if (tokens.length && tokens.every((token) => haystack.includes(token))) score += 10;
      }
      return { item, score, matched, index };
    }).filter((row) => row.matched).sort((a,b) => b.score - a.score || a.index - b.index);

    const result = rows.map(({ item, score }) => ({ ...item, _searchScore:score }));
    const numericLimit = limit == null ? null : Number(limit);
    const normalizedLimit = Number.isFinite(numericLimit) ? Math.max(0, Math.floor(numericLimit)) : null;
    const limited = normalizedLimit == null ? result : result.slice(0, normalizedLimit);
    return new ResultSet(limited, {
      total:result.length,
      query,
      meta:{ mode:normalizedMode, fields:normalizedFields, exact:Boolean(exact), regex:Boolean(expression), locale, stopwords:[...ignored] }
    });
  }

  suggest(items, query, { fields = null, limit = 8, minChars = 1, locale = 'fr', match = 'contains' } = {}) {
    const source = asArray(items);
    const normalizedFields = normalizeFields(fields);
    const needle = lower(String(query ?? '').trim(), locale);
    const numericMinChars = Number(minChars);
    const normalizedMinChars = Number.isFinite(numericMinChars) ? Math.max(0, Math.floor(numericMinChars)) : 1;
    const numericLimit = Number(limit);
    const normalizedLimit = Number.isFinite(numericLimit) ? Math.max(0, Math.floor(numericLimit)) : 8;
    const normalizedMatch = String(match ?? 'contains').toLowerCase() === 'prefix' ? 'prefix' : 'contains';

    if (needle.length < normalizedMinChars || normalizedLimit === 0) return [];

    const bestByValue = new Map();
    let order = 0;
    for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
      for (const candidate of candidateValues(source[sourceIndex], normalizedFields)) {
        const raw = candidate.value;
        if (raw === null || raw === undefined || typeof raw === 'object') continue;
        const value = String(raw).trim();
        if (!value) continue;
        const normalized = lower(value, locale);

        let score = 0;
        if (normalized === needle) score = 100;
        else if (normalized.startsWith(needle)) score = 80;
        else if (normalizedMatch === 'contains' && tokenize(normalized, locale).some((token) => token.startsWith(needle))) score = 60;
        else if (normalizedMatch === 'contains' && normalized.includes(needle)) score = 40;
        else continue;

        const ranked = { value, normalized, score, sourceIndex, order: order++ };
        const current = bestByValue.get(normalized);
        if (!current || score > current.score) bestByValue.set(normalized, ranked);
      }
    }

    return [...bestByValue.values()]
      .sort((a, b) => b.score - a.score || a.value.length - b.value.length || a.sourceIndex - b.sourceIndex || a.order - b.order)
      .slice(0, normalizedLimit)
      .map((entry) => entry.value);
  }
}
