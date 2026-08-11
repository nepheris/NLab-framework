import { ResultSet } from '../data/result-set.js';

const lower = (value, locale = 'fr') => {
  const text = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  try { return text.toLocaleLowerCase(locale); } catch { return text.toLowerCase(); }
};
const tokenize = (text, locale = 'fr') => lower(text, locale).replace(/[^\p{L}\p{N}@._-]+/gu, ' ').trim().split(/\s+/).filter(Boolean);
const asArray = (value) => Array.isArray(value) ? value : [];

export class SearchWiz {
  search(items, query, { fields = null, mode = 'text', exact = false, regex = false, limit = null, locale = 'fr', stopwords = [] } = {}) {
    const source = asArray(items);
    const queryText = query instanceof RegExp ? query.source : String(query ?? '');
    if (!queryText) return new ResultSet(source, { query:'', total:source.length });

    const targetFields = Array.isArray(fields)
      ? fields.filter((field) => typeof field === 'string' && field.length)
      : typeof fields === 'string' && fields.length ? [fields] : null;
    const normalizedFields = targetFields?.length ? targetFields : null;
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
}
