import assert from 'node:assert/strict';
import { DataWiz } from '../wiz/data-wiz.js';

const data = new DataWiz();
const items = [
  { id:'A', meta:{ score:12 }, category:'dessert', tags:['fruit','quick'], mixed:'10' },
  { id:'B', meta:{ score:7 }, category:'plat', tags:['veg'], mixed:2 },
  { id:'C', meta:{ score:9 }, category:'dessert', tags:['fruit'], mixed:false },
  { id:'D', meta:{ score:null }, category:'', tags:[], mixed:'x' }
];

const legacy = data.describe(items, ['category']);
assert.equal(legacy.rows, 4);
assert.equal(legacy.fields.category.count, 3);
assert.equal(legacy.fields.category.missing, 1);
assert.equal(legacy.fields.category.unique, 2);
assert.deepEqual(legacy.fields.category.top[0], { value:'dessert', count:2 });

const nested = data.describe(items, ['meta.score','mixed']);
assert.equal(nested.fields['meta.score'].numeric.max, 12);
assert.equal(nested.fields['meta.score'].numeric.min, 7);
assert.equal(nested.fields['meta.score'].numeric.median, 9);
assert.equal(nested.fields['meta.score'].numeric.count, 3);
assert.equal(nested.fields.mixed.numeric.count, 2);
assert.equal(nested.fields.mixed.numeric.sum, 12);
assert.equal(nested.fields.mixed.types.boolean, 1);
assert.equal(nested.fields.mixed.types.string, 2);

assert.equal(data.describe(null).rows, 0);
assert.throws(() => data.describe(items, ['__proto__.x']), (error) => error.code === 'UNSAFE_PATH');

const categories = data.groupBy(items, 'category');
assert.deepEqual(categories.map((group) => [group.value, group.count]), [
  ['dessert',2], ['plat',1], ['(vide)',1]
]);
const tags = data.groupBy(items, 'tags');
assert.equal(tags.find((group) => group.value === 'fruit').count, 2);
assert.equal(tags.find((group) => group.value === '(vide)').count, 1);
const sorted = data.groupBy(items, 'category', { sort:'asc', emptyLabel:'—' });
assert.deepEqual(sorted.map((group) => group.value), ['—','dessert','plat']);

const hist = data.histogram(items, 'meta.score', { bins:2 });
assert.equal(hist.length, 2);
assert.equal(hist.reduce((sum, bin) => sum + bin.count, 0), 3);
assert.equal(hist.at(-1).count, 1);
const domain = data.histogram(items, 'meta.score', { bins:2, min:8, max:10 });
assert.equal(domain.reduce((sum, bin) => sum + bin.count, 0), 1);
const constant = data.histogram([{v:5},{v:'5'},{v:6}], 'v', { min:5, max:5, bins:9 });
assert.deepEqual(constant, [{ min:5, max:5, count:2 }]);
assert.throws(() => data.histogram(items, 'meta.score', { min:10, max:5 }), (error) => error.code === 'INVALID_HISTOGRAM_DOMAIN');
assert.deepEqual(data.histogram([{v:false},{v:''},{v:null}], 'v'), []);

console.log('data wiz convergence tests: ok');
