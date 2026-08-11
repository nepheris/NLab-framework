import { ResultSet } from '../data/result-set.js';

const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const tokenize = (text) => normalize(text).replace(/[^a-z0-9@._-]+/g, ' ').trim().split(/\s+/).filter(Boolean);

export class SearchWiz {
  search(items, query, { fields = null, mode = 'text', exact = false, regex = false, limit = null } = {}) {
    if (!query) return new ResultSet(items, { query:'', total:items.length });
    const source = [...items];
    const targetFields = fields?.length ? fields : null;
    let expression = null;
    if (regex || mode === 'regex') expression = query instanceof RegExp ? query : new RegExp(String(query), 'i');
    const tokens = tokenize(query);

    const rows = source.map((item) => {
      const values = targetFields ? targetFields.map((field) => item?.[field]) : Object.values(item ?? {});
      const haystack = normalize(values.flatMap((value) => Array.isArray(value) ? value : [value]).join(' '));
      let score = 0; let matched = false;
      if (expression) { matched = expression.test(haystack); score = matched ? 100 : 0; }
      else if (exact) { matched = haystack === normalize(query); score = matched ? 100 : 0; }
      else {
        for (const token of tokens) {
          if (haystack.includes(token)) { matched = true; score += haystack === token ? 20 : haystack.startsWith(token) ? 10 : 5; }
        }
        if (tokens.length && tokens.every((token) => haystack.includes(token))) score += 10;
      }
      return { item, score, matched };
    }).filter((row) => row.matched).sort((a,b) => b.score - a.score);

    const result = rows.map(({ item, score }) => ({ ...item, _searchScore:score }));
    const limited = limit ? result.slice(0, limit) : result;
    return new ResultSet(limited, { total:result.length, query, meta:{ mode, fields:targetFields, exact, regex:Boolean(expression) } });
  }
}
