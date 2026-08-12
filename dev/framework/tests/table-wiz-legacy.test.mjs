import assert from 'node:assert/strict';
import { TableWiz } from '../wiz/table-wiz.js';

function pointerEvent(overrides = {}) {
  return {
    button:0,
    clientX:0,
    pointerId:1,
    preventDefault(){},
    stopPropagation(){},
    ...overrides
  };
}

function keyEvent(key) {
  return { key, preventDefault(){}, stopPropagation(){} };
}

function findByAttribute(node, name, value) {
  if (node.attributes?.get(name) === value) return node;
  for (const child of node.children ?? []) {
    const found = findByAttribute(child, name, value);
    if (found) return found;
  }
  return null;
}

class FakeClassList {
  constructor(){ this.values = new Set(); }
  add(...values){ values.forEach((value)=>this.values.add(value)); }
  remove(...values){ values.forEach((value)=>this.values.delete(value)); }
}

class FakeElement {
  constructor(tagName='div', ownerDocument=null) {
    this.tagName=tagName.toUpperCase();
    this.ownerDocument=ownerDocument;
    this.children=[];
    this.attributes=new Map();
    this.listeners=new Map();
    this.classList=new FakeClassList();
    this.style={};
    this.className='';
    this.textContent='';
    this.tabIndex=-1;
  }
  append(...nodes){ this.children.push(...nodes); }
  appendChild(node){ this.append(node); }
  replaceChildren(...nodes){ this.children=[...nodes]; }
  setAttribute(name,value){ this.attributes.set(name,String(value)); }
  addEventListener(type,listener){
    if(!this.listeners.has(type)) this.listeners.set(type,new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type,listener){ this.listeners.get(type)?.delete(listener); }
  dispatch(type,event={}){ for(const listener of [...(this.listeners.get(type)??[])]) listener(event); }
  getBoundingClientRect(){
    const width=Number.parseFloat(this.style.width);
    return { width:Number.isFinite(width)?width:120 };
  }
  setPointerCapture(){}
}

class FakeDocument extends FakeElement {
  constructor(){ super('#document',null); this.ownerDocument=this; }
  createElement(tagName){ return new FakeElement(tagName,this); }
  listenerCount(type){ return this.listeners.get(type)?.size??0; }
}

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

const original = structuredClone(items);
let result = table.process(items);
assert.deepEqual(items, original);
assert.equal(result.total, 3);
assert.deepEqual(result.page.map((row)=>row.id), ['A','B']);
assert.equal(result.pageModel.pageCount, 2);

table.setSort('score', 'DESC');
assert.equal(table.sortState.direction, 'desc');
assert.deepEqual(table.process(items).all.map((row)=>row.id), ['A','C','B']);
table.toggleSort('score');
assert.equal(table.sortState.direction, 'asc');
assert.deepEqual(table.process(items).all.map((row)=>row.id), ['B','C','A']);

table.pagination.setPage(2);
table.setQuery('pommes');
assert.equal(table.pagination.page, 1);
assert.equal(table.process(items).total, 2);

table.setQuery('').setRegexFilter('name', '^Tarte');
result = table.process(items);
assert.deepEqual(result.all.map((row)=>row.id), ['A']);
assert.equal(result.error, null);
table.setRegexFilter('name', '[');
result = table.process(items);
assert.deepEqual(result.all, []);
assert.equal(result.error?.code, 'INVALID_REGEX');
assert.equal(result.error?.field, 'name');

table.reset().setQuery('[', { regex:true });
result = table.process(items);
assert.deepEqual(result.all, []);
assert.equal(result.error?.code, 'INVALID_SEARCH');
table.setQuery('pommes');
assert.deepEqual(table.queryOptions, {});
assert.equal(table.process(items).total, 2);

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

const resizeTable = new TableWiz({
  columns:[
    { id:'name', label:'Nom', width:120, minWidth:80, maxWidth:220 },
    { id:'category', resizable:false },
    { id:'score' }
  ],
  minColumnWidth:64,
  maxColumnWidth:400,
  resizeStep:10
});
resizeTable.setColumnWidth('name', 20);
assert.equal(resizeTable.columnWidth('name'), 80);
resizeTable.setColumnWidth('name', '180px');
assert.equal(resizeTable.columnWidth('name'), 180);
resizeTable.resizeColumn('name', 999);
assert.equal(resizeTable.columnWidth('name'), 220);
resizeTable.resizeColumn('category', 200);
assert.equal(resizeTable.columnWidth('category'), null);
resizeTable.setColumnWidth('score', '25%');
assert.equal(resizeTable.columns.find((column)=>column.id==='score').width, '25%');
assert.equal(resizeTable.columnWidth('score'), null);
resizeTable.resetColumnWidth('name');
assert.equal(resizeTable.columnWidth('name'), null);
resizeTable.adjustColumnWidth('name', 15, { fallback:100 });
assert.equal(resizeTable.columnWidth('name'), 115);

const fakeDocument = new FakeDocument();
const container = new FakeElement('div', fakeDocument);
const resizeEvents = [];
resizeTable.setColumnWidth('name', 120);
resizeTable.render(container, items, { onColumnResize:(event)=>resizeEvents.push(event) });

let handle = findByAttribute(container, 'data-column-resizer', 'name');
assert.ok(handle);
handle.dispatch('pointerdown', pointerEvent({ clientX:100 }));
fakeDocument.dispatch('pointermove', pointerEvent({ clientX:175 }));
assert.equal(resizeTable.columnWidth('name'), 195);
fakeDocument.dispatch('pointerup', pointerEvent({ clientX:175 }));
assert.equal(resizeEvents.at(-1).width, 195);
assert.equal(fakeDocument.listenerCount('pointermove'), 0);
assert.equal(fakeDocument.listenerCount('pointerup'), 0);

handle = findByAttribute(container, 'data-column-resizer', 'name');
handle.dispatch('keydown', keyEvent('ArrowRight'));
assert.equal(resizeTable.columnWidth('name'), 205);
assert.equal(resizeEvents.at(-1).width, 205);

handle = findByAttribute(container, 'data-column-resizer', 'name');
handle.dispatch('keydown', keyEvent('ArrowRight'));
handle = findByAttribute(container, 'data-column-resizer', 'name');
handle.dispatch('keydown', keyEvent('ArrowRight'));
assert.equal(resizeTable.columnWidth('name'), 220);

resizeTable.destroy();
assert.equal(fakeDocument.listenerCount('pointermove'), 0);

const stateTable = new TableWiz({
  columns:[
    { id:'a', label:'A' },
    { id:'b', label:'B' },
    { id:'c', label:'C' },
    { id:'d', label:'D' }
  ]
});
stateTable.reorder(['c','a']);
assert.deepEqual(stateTable.visibleColumnIds(), ['c','a','b','d']);
stateTable.moveColumn('d', 1);
assert.deepEqual(stateTable.visibleColumnIds(), ['c','d','a','b']);
stateTable.setColumnsVisible(['c','b'], false);
assert.deepEqual(stateTable.visibleColumnIds(), ['d','a']);
stateTable.toggleColumn('c');
assert.deepEqual(stateTable.visibleColumnIds(), ['c','d','a']);
stateTable.showAllColumns();
assert.deepEqual(stateTable.visibleColumnIds(), ['c','d','a','b']);

stateTable.applyColumnState([
  { id:'b', order:0, visible:false, width:150, sticky:true },
  { id:'a', order:1 },
  { id:'d', order:2 },
  { id:'c', order:3 }
]);
assert.deepEqual(stateTable.columnState().map((column)=>column.id), ['b','a','d','c']);
assert.equal(stateTable.columnState()[0].visible, false);
assert.equal(stateTable.columnState()[0].width, 150);
assert.equal(stateTable.columnState()[0].sticky, true);

let toolbar = stateTable.toolbarState();
assert.equal(toolbar.counts.columns, 4);
assert.equal(toolbar.counts.visibleColumns, 3);
assert.equal(toolbar.canReset, true);
stateTable.setQuery('alpha').setFilters({ field:'a', operator:'eq', value:1 }).setSort('a','desc');
toolbar = stateTable.toolbarState();
assert.equal(toolbar.query, 'alpha');
assert.equal(toolbar.filters.length, 1);
assert.deepEqual(toolbar.sort, { field:'a', direction:'desc' });

stateTable.reset({ columns:true });
assert.deepEqual(stateTable.visibleColumnIds(), ['a','b','c','d']);
assert.equal(stateTable.toolbarState().canReset, false);
stateTable.reorder(['d','c','b','a']).resetColumnOrder();
assert.deepEqual(stateTable.visibleColumnIds(), ['a','b','c','d']);

assert.equal(table.process(null).total, 0);
assert.equal(table.exportJSON(null), '[]');
assert.match(table.exportJSON({ ok:true }), /"ok": true/);
assert.match(table.exportCSV([{ name:'A "quote"', category:'x', score:1 }]), /"A ""quote"""/);

console.log('table wiz legacy tests: ok');
