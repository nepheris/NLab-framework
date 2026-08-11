import { ResultSet } from '../data/result-set.js';

const get = (object, path) => String(path ?? '').split('.').filter(Boolean).reduce((acc, key) => acc?.[key], object);
const list = (value) => Array.isArray(value) ? value : [];
const finite = (value) => { const number=Number(value); return Number.isFinite(number) ? number : null; };

export class FilterWiz {
  apply(items, filters = [], { logic = 'and' } = {}) {
    const source = Array.isArray(items) ? items : [];
    const filterList = Array.isArray(filters) ? filters : (filters && typeof filters === 'object' ? [filters] : []);
    const normalizedLogic = String(logic ?? 'and').toLowerCase() === 'or' ? 'or' : 'and';
    const predicates = filterList.filter((filter) => typeof filter?.field === 'string' && filter.field.length).map((filter) => this.#predicate(filter));
    if (!predicates.length) return new ResultSet(source, { filters:filterList, total:source.length, meta:{ logic:normalizedLogic } });
    const result = source.filter((item) => normalizedLogic === 'or' ? predicates.some((fn) => fn(item)) : predicates.every((fn) => fn(item)));
    return new ResultSet(result, { filters:filterList, total:result.length, meta:{ logic:normalizedLogic } });
  }

  #predicate(filter) {
    const { field, operator = 'eq', value, min, max } = filter;
    const op = String(operator ?? 'eq').toLowerCase();
    const values = list(filter.values);
    let expression = null;
    if (op === 'regex') {
      try { expression = value instanceof RegExp ? value : new RegExp(String(value ?? ''), filter.flags ?? 'i'); }
      catch { return () => false; }
    }
    const minNumber = finite(min);
    const maxNumber = finite(max);
    const valueNumber = finite(value);
    const minDate = new Date(min).getTime();
    const maxDate = new Date(max).getTime();

    return (item) => {
      const actual = get(item, field);
      if (op === 'eq') return actual === value;
      if (op === 'neq') return actual !== value;
      if (op === 'contains') return Array.isArray(actual) ? actual.includes(value) : String(actual ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
      if (op === 'in') return values.includes(actual);
      if (op === 'overlap') return Array.isArray(actual) && actual.some((entry) => values.includes(entry));
      if (op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte') {
        const actualNumber = finite(actual);
        if (actualNumber == null || valueNumber == null) return false;
        if (op === 'gt') return actualNumber > valueNumber;
        if (op === 'gte') return actualNumber >= valueNumber;
        if (op === 'lt') return actualNumber < valueNumber;
        return actualNumber <= valueNumber;
      }
      if (op === 'between') {
        const actualNumber = finite(actual);
        return actualNumber != null && minNumber != null && maxNumber != null && actualNumber >= minNumber && actualNumber <= maxNumber;
      }
      if (op === 'date-between') {
        const date = new Date(actual).getTime();
        return Number.isFinite(date) && Number.isFinite(minDate) && Number.isFinite(maxDate) && date >= minDate && date <= maxDate;
      }
      if (op === 'regex') {
        expression.lastIndex = 0;
        return expression.test(String(actual ?? ''));
      }
      if (op === 'exists') return actual !== undefined && actual !== null && actual !== '';
      return false;
    };
  }
}
