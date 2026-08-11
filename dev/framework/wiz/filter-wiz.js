import { ResultSet } from '../data/result-set.js';

const get = (object, path) => path.split('.').reduce((acc, key) => acc?.[key], object);

export class FilterWiz {
  apply(items, filters = [], { logic = 'and' } = {}) {
    const predicates = filters.filter((filter) => filter?.field).map((filter) => this.#predicate(filter));
    if (!predicates.length) return new ResultSet(items, { filters, total:items.length });
    const result = items.filter((item) => logic === 'or' ? predicates.some((fn) => fn(item)) : predicates.every((fn) => fn(item)));
    return new ResultSet(result, { filters, total:result.length, meta:{ logic } });
  }

  #predicate(filter) {
    const { field, operator = 'eq', value, values, min, max } = filter;
    return (item) => {
      const actual = get(item, field);
      if (operator === 'eq') return actual === value;
      if (operator === 'neq') return actual !== value;
      if (operator === 'contains') return Array.isArray(actual) ? actual.includes(value) : String(actual ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
      if (operator === 'in') return (values ?? []).includes(actual);
      if (operator === 'overlap') return Array.isArray(actual) && actual.some((entry) => (values ?? []).includes(entry));
      if (operator === 'gt') return Number(actual) > Number(value);
      if (operator === 'gte') return Number(actual) >= Number(value);
      if (operator === 'lt') return Number(actual) < Number(value);
      if (operator === 'lte') return Number(actual) <= Number(value);
      if (operator === 'between') return Number(actual) >= Number(min) && Number(actual) <= Number(max);
      if (operator === 'date-between') { const date = new Date(actual).getTime(); return date >= new Date(min).getTime() && date <= new Date(max).getTime(); }
      if (operator === 'regex') return new RegExp(String(value), filter.flags ?? 'i').test(String(actual ?? ''));
      if (operator === 'exists') return actual !== undefined && actual !== null && actual !== '';
      return true;
    };
  }
}
