import assert from 'node:assert/strict';
import { SearchWiz } from '../wiz/search-wiz.js';
import { FilterWiz } from '../wiz/filter-wiz.js';
import { TableWiz } from '../wiz/table-wiz.js';

const rows = [
  { id:'REC001', name:'Crème de carottes', category:'entrée', score:10, tags:['légume','chaud'], meta:{active:true}, date:'2026-08-01' },
  { id:'REC002', name:'Salade de pommes', category:'dessert', score:20, tags:['fruit','froid'], meta:{active:false}, date:'2026-08-05' },
  { id:'REC003', name:'Soupe tomate', category:'entrée', score:30, tags:['légume','chaud'], meta:{active:true}, date:'2026-08-10' },
  { id:'REC004', name:'Pomme rôtie "minute"', category:'dessert', score:null, tags:['fruit'], meta:{}, date:null },
];

// SearchWiz — normalisation, champs, exact, regex, score et limite
const search = new SearchWiz();
let result = search.search(rows, 'creme');
assert.equal(result.items.length, 1);
assert.equal(result.items[0].id, 'REC001');
assert.ok(result.items[0]._searchScore > 0);

result = search.search(rows, 'dessert', { fields:['category'] });
assert.deepEqual(result.items.map((item)=>item.id).sort(), ['REC002','REC004']);
assert.deepEqual(result.meta.fields, ['category']);

result = search.search(rows, 'REC002', { fields:['id'], exact:true });
assert.equal(result.items.length, 1);
assert.equal(result.items[0]._searchScore, 100);

result = search.search(rows, /^soupe/i, { fields:['name'], regex:true });
assert.equal(result.items.length, 1);
assert.equal(result.items[0].id, 'REC003');
assert.equal(result.meta.regex, true);

result = search.search(rows, 'pomme', { limit:1 });
assert.equal(result.items.length, 1);
assert.equal(result.total, 2, 'limit ne doit pas écraser le total avant limitation');

result = search.search(rows, '', { fields:['name'] });
assert.equal(result.items.length, rows.length);
assert.equal(result.total, rows.length);

// FilterWiz — opérateurs, chemins imbriqués et logique AND/OR
const filter = new FilterWiz();
result = filter.apply(rows, [{ field:'category', operator:'eq', value:'entrée' }]);
assert.deepEqual(result.items.map((item)=>item.id), ['REC001','REC003']);

result = filter.apply(rows, [
  { field:'score', operator:'gte', value:20 },
  { field:'tags', operator:'contains', value:'chaud' },
]);
assert.deepEqual(result.items.map((item)=>item.id), ['REC003']);

result = filter.apply(rows, [
  { field:'category', operator:'eq', value:'dessert' },
  { field:'tags', operator:'overlap', values:['chaud'] },
], { logic:'or' });
assert.deepEqual(result.items.map((item)=>item.id).sort(), ['REC001','REC002','REC003','REC004']);
assert.equal(result.meta.logic, 'or');

result = filter.apply(rows, [{ field:'score', operator:'between', min:15, max:30 }]);
assert.deepEqual(result.items.map((item)=>item.id), ['REC002','REC003']);

result = filter.apply(rows, [{ field:'date', operator:'date-between', min:'2026-08-02', max:'2026-08-09' }]);
assert.deepEqual(result.items.map((item)=>item.id), ['REC002']);

result = filter.apply(rows, [{ field:'meta.active', operator:'exists' }]);
assert.deepEqual(result.items.map((item)=>item.id), ['REC001','REC002','REC003']);

result = filter.apply(rows, [{ field:'name', operator:'regex', value:'pomme', flags:'i' }]);
assert.deepEqual(result.items.map((item)=>item.id).sort(), ['REC002','REC004']);

// TableWiz — composition search/filter/sort, pagination, colonnes et exports
const table = new TableWiz({
  pageSize:2,
  columns:[
    { id:'id', label:'ID' },
    { id:'name', label:'Nom' },
    { id:'category', label:'Catégorie' },
    { id:'score', label:'Score', searchable:false },
  ],
});

table.setQuery('entrée').setFilters([{ field:'score', operator:'gte', value:10 }]).setSort('score','desc');
let processed = table.process(rows);
assert.equal(processed.total, 2);
assert.deepEqual(processed.all.map((item)=>item.id), ['REC003','REC001']);
assert.equal(processed.page.length, 2);
assert.equal(processed.pageModel.pageCount, 1);

table.setQuery('').setFilters([]).setSort('id','asc');
processed = table.process(rows);
assert.equal(processed.total, 4);
assert.equal(processed.page.length, 2);
assert.equal(processed.pageModel.pageCount, 2);
processed.pageModel.setPage(2);
processed = table.process(rows);
assert.deepEqual(processed.page.map((item)=>item.id), ['REC003','REC004']);

table.setColumnVisible('category', false).reorder(['name','id','score']);
assert.deepEqual(table.visibleColumns().map((column)=>column.id), ['name','id','score']);

table.setColumnWidth('name', 220).setSticky('id', true);
assert.equal(table.columns.find((column)=>column.id==='name').width, 220);
assert.equal(table.columns.find((column)=>column.id==='id').sticky, true);

const csv = table.exportCSV(rows.slice(0,1));
assert.match(csv, /^"Nom";"ID";"Score"/);
assert.match(csv, /"Crème de carottes";"REC001";"10"/);

const tableWithQuotedName = new TableWiz({ columns:[{id:'name',label:'Nom'}] });
const quotedCsv = tableWithQuotedName.exportCSV([rows[3]]);
assert.match(quotedCsv, /"Pomme rôtie ""minute"""/);

const json = table.exportJSON(rows.slice(0,1), 0);
assert.deepEqual(JSON.parse(json), rows.slice(0,1));

console.log('search/filter/table tests: ok');
