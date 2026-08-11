import assert from 'node:assert/strict';
import { ResultSet } from '../data/result-set.js';

const filters = { category: 'dessert' };
const meta = { source: 'test' };
const result = new ResultSet([{ id: 1 }, { id: 2 }], {
  total: 5,
  query: 'pomme',
  filters,
  meta
});

assert.equal(result.length, 2);
assert.equal(result.isEmpty, false);
assert.deepEqual(result.first, { id: 1 });
assert.deepEqual(result.at(-1), { id: 2 });
assert.equal(result.total, 5);
assert.equal(result.query, 'pomme');
assert.deepEqual([...result], [{ id: 1 }, { id: 2 }]);

// Les conteneurs de contexte sont copiés au constructeur.
filters.category = 'mutated';
meta.source = 'mutated';
assert.equal(result.filters.category, 'dessert');
assert.equal(result.meta.source, 'test');

const mapped = result.map((item) => ({ ...item, mapped: true }));
assert.equal(mapped.total, 5);
assert.equal(mapped.query, 'pomme');
assert.deepEqual(mapped.items, [
  { id: 1, mapped: true },
  { id: 2, mapped: true }
]);
assert.notEqual(mapped.filters, result.filters);
assert.notEqual(mapped.meta, result.meta);

mapped.filters.category = 'mapped-only';
mapped.meta.source = 'mapped-only';
assert.equal(result.filters.category, 'dessert');
assert.equal(result.meta.source, 'test');

const sliced = result.slice(1);
assert.equal(sliced.length, 1);
assert.equal(sliced.total, 5);
assert.deepEqual(sliced.first, { id: 2 });
assert.notEqual(sliced.filters, result.filters);

const enriched = result.withMeta({ page: 2 });
assert.deepEqual(enriched.meta, { source: 'test', page: 2 });
assert.deepEqual(result.meta, { source: 'test' });
assert.equal(enriched.total, 5);

const json = result.toJSON();
assert.deepEqual(json, {
  items: [{ id: 1 }, { id: 2 }],
  total: 5,
  query: 'pomme',
  filters: { category: 'dessert' },
  meta: { source: 'test' }
});
json.filters.category = 'json-only';
json.meta.source = 'json-only';
json.items.push({ id: 3 });
assert.equal(result.filters.category, 'dessert');
assert.equal(result.meta.source, 'test');
assert.equal(result.length, 2);

const empty = new ResultSet();
assert.equal(empty.length, 0);
assert.equal(empty.total, 0);
assert.equal(empty.isEmpty, true);
assert.equal(empty.first, undefined);
assert.equal(empty.at(0), undefined);

const setItems = new ResultSet(new Set(['a', 'b']));
assert.deepEqual(setItems.items, ['a', 'b']);
assert.equal(setItems.total, 2);

assert.throws(() => new ResultSet(null), /iterable/);
assert.throws(() => new ResultSet(42), /iterable/);
assert.throws(() => new ResultSet([1], { total: -1 }), /non-negative integer/);
assert.throws(() => new ResultSet([1], { total: 1.5 }), /non-negative integer/);
assert.throws(() => new ResultSet([1, 2], { total: 1 }), /smaller/);
assert.throws(() => new ResultSet([], { meta: [] }), /meta/);
assert.throws(() => result.map(null), /callback/);
assert.throws(() => result.withMeta(null), /meta/);

// total numérique sous forme de chaîne est normalisé de façon déterministe.
assert.equal(new ResultSet([1], { total: '3' }).total, 3);

console.log('ResultSet tests: OK');
