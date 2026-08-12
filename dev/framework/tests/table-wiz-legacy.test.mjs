import assert from 'node:assert/strict';
import { TableWiz } from '../wiz/table-wiz.js';

const items = [
  { id:'A', name:'Tarte aux pommes', category:'dessert', score:12 },
  { id:'B', name:'Soupe de carottes', category:'plat', score:7 },
  { id:'C', name:'Pommes rôties', category:'dessert', score:9 }
];

const table = new TableWiz({ columns:[
  { id:'name', label:'Nom' },
  { id:'category' },
  { id:'score' }
], pageSize:2 });

// Baseline: process is non-mutating and pagination remains coherent.
const original = structuredClone(items);
let result = table.process(items);
assert.deepEqual(items, original);
assert.equal(result.total, 3);
assert.deepEqual(result.page.map((row)=>row.id), ['A','B']);
assert.equal(result.pageModel.pageCount, 2);

// Sorting accepts id-only columns, normalizes direction and toggles deterministically.
table.setSort('score', 'DESC');
assert.equal(table.sortState.direction, 'desc');
assert.deepEqual(table.process(items).all.map((row)=>row.id), ['A','C','B']);
table.toggleSort('score');
assert.equal(table.sortState.direction, 'asc');
assert.deepEqual(table.process(items).all.map((row)=>row.id), ['B','C','A']);

// Query/filter changes bring pagination back to the first page.
table.pagination.setPage(2);
table.setQuery('pommes');
assert.equal(table.pagination.page, 1);
assert.equal(table.process(items).total, 2);

// Regex filters reuse FilterWiz and fail closed without throwing.
table.setQuery('').setRegexFilter('name', '^Tarte');
result = table.process(items);
assert.deepEqual(result.all.map((row)=>row.id), ['A']);
assert.equal(result.error, null);
table.setRegexFilter('name', '[');
result = table.process(items);
assert.deepEqual(result.all, []);
assert.equal(result.error?.code, 'INVALID_REGEX');
assert.equal(result.error?.field, 'name');

// Invalid regex search is contained by TableWiz rather than escaping to consumers.
table.reset().setQuery('[', { regex:true });
result = table.process(items);
assert.deepEqual(result.all, []);
assert.equal(result.error?.code, 'INVALID_SEARCH');
table.setQuery('pommes');
assert.deepEqual(table.queryOptions, {});
assert.equal(table.process(items).total, 2);

// Reset restores interaction state and optionally the initial column configuration.
table.setColumnVisible('category', false).setColumnWidth('name', 320).reorder(['score','name','category']);
table.setFilters([{ field:'category', operator:'eq', value:'dessert' }]).setSort('name','desc');
table.pagination.setPage(2);
table.reset({ columns:true });
assert.equal(table.query, '');
assert.deepEqual(table.filters, []);
assert.equal(table.sortState, null);
assert.equal(table.pagination.page, 1);
assert.deepEqual(table.visibleColumns().map((column)=>column.id), ['name','category','score']);
assert.equal(table.columns.find((column)=>column.id==='category').visible, true);
assert.equal(table.columns.find((column)=>column.id==='name').width, undefined);

// Defensive inputs and exports remain safe without narrowing valid JSON export values.
assert.equal(table.process(null).total, 0);
assert.equal(table.exportJSON(null), '[]');
assert.match(table.exportJSON({ ok:true }), /"ok": true/);
assert.match(table.exportCSV([{ name:'A "quote"', category:'x', score:1 }]), /"A ""quote"""/);

console.log('table wiz legacy tests: ok');
