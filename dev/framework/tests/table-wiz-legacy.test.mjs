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
    this.value='';
    this.checked=false;
    this.required=false;
    this.placeholder='';
    this.type='';
    this.clientWidth=0;
  }
  append(...nodes){ this.children.push(...nodes); }
  appendChild(node){ this.append(node); }
  replaceChildren(...nodes){ this.children=[...nodes]; }
  setAttribute(name,value){ this.attributes.set(name,String(value)); }
  removeAttribute(name){ this.attributes.delete(name); }
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
class MemoryStorage {
  constructor(){ this.data=new Map(); }
  getItem(key){ return this.data.has(key)?this.data.get(key):null; }
  setItem(key,value){ this.data.set(key,String(value)); }
  removeItem(key){ this.data.delete(key); }
}

const items = [
  { id:'A', name:'Tarte aux pommes', category:'dessert', score:12 },
  { id:'B', name:'Soupe de carottes', category:'plat', score:7 },
  { id:'C', name:'Pommes rôties', category:'dessert', score:9 }
];

// A1 — process/sort/search/filter/reset.
const table = new TableWiz({
  columns:[
    { id:'name', label:'Nom' },
    { id:'category' },
    { id:'score' }
  ],
  pageSize:2
});
const original = structuredClone(items);
let result = table.process(items);
assert.deepEqual(items, original);
assert.equal(result.total, 3);
assert.deepEqual(result.page.map((row)=>row.id), ['A','B']);
assert.equal(result.pageModel.pageCount, 2);

table.setSort('score','DESC');
assert.deepEqual(table.process(items).all.map((row)=>row.id), ['A','C','B']);
table.toggleSort('score');
assert.deepEqual(table.process(items).all.map((row)=>row.id), ['B','C','A']);

table.pagination.setPage(2);
table.setQuery('pommes');
assert.equal(table.pagination.page,1);
assert.equal(table.process(items).total,2);

table.setQuery('').setRegexFilter('name','^Tarte');
assert.deepEqual(table.process(items).all.map((row)=>row.id), ['A']);
table.setRegexFilter('name','[');
result=table.process(items);
assert.deepEqual(result.all,[]);
assert.equal(result.error?.code,'INVALID_REGEX');

table.reset().setQuery('[',{regex:true});
result=table.process(items);
assert.equal(result.error?.code,'INVALID_SEARCH');
table.setQuery('pommes');
assert.equal(table.process(items).total,2);
table.reset();

// Nested fields are sortable and exportable.
const nestedItems=[
  {id:'1',profile:{name:'Zulu'}},
  {id:'2',profile:{name:'Alpha'}}
];
const nestedTable=new TableWiz({columns:[{id:'profileName',field:'profile.name'}]});
nestedTable.setSort('profile.name','asc');
assert.deepEqual(nestedTable.process(nestedItems).all.map((row)=>row.id),['2','1']);
assert.deepEqual(nestedTable.exportColumn(nestedItems,'profileName'),['Zulu','Alpha']);

// A2 — resize contract.
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
resizeTable.setColumnWidth('name',20);
assert.equal(resizeTable.columnWidth('name'),80);
resizeTable.setColumnWidth('name','180px');
assert.equal(resizeTable.columnWidth('name'),180);
resizeTable.resizeColumn('name',999);
assert.equal(resizeTable.columnWidth('name'),220);
resizeTable.resizeColumn('category',200);
assert.equal(resizeTable.columnWidth('category'),null);
resizeTable.setColumnWidth('score','25%');
assert.equal(resizeTable.columnWidth('score'),null);

const fakeDocument=new FakeDocument();
const container=new FakeElement('div',fakeDocument);
const resizeEvents=[];
resizeTable.setColumnWidth('name',120);
resizeTable.render(container,items,{onColumnResize:(event)=>resizeEvents.push(event)});
let handle=findByAttribute(container,'data-column-resizer','name');
assert.ok(handle);
handle.dispatch('pointerdown',pointerEvent({clientX:100}));
fakeDocument.dispatch('pointermove',pointerEvent({clientX:175}));
assert.equal(resizeTable.columnWidth('name'),195);
fakeDocument.dispatch('pointerup',pointerEvent({clientX:175}));
assert.equal(resizeEvents.at(-1).width,195);
handle=findByAttribute(container,'data-column-resizer','name');
handle.dispatch('keydown',keyEvent('ArrowRight'));
assert.equal(resizeTable.columnWidth('name'),205);
resizeTable.destroy();
assert.equal(fakeDocument.listenerCount('pointermove'),0);

// A3 — visibility/order/state.
const stateTable=new TableWiz({columns:[
  {id:'a',label:'A'},
  {id:'b',label:'B'},
  {id:'c',label:'C'},
  {id:'d',label:'D'}
]});
stateTable.reorder(['c','a']);
assert.deepEqual(stateTable.visibleColumnIds(),['c','a','b','d']);
stateTable.moveColumn('d',1);
assert.deepEqual(stateTable.visibleColumnIds(),['c','d','a','b']);
stateTable.setColumnsVisible(['c','b'],false);
assert.deepEqual(stateTable.visibleColumnIds(),['d','a']);
stateTable.toggleColumn('c').showAllColumns();
assert.deepEqual(stateTable.visibleColumnIds(),['c','d','a','b']);
stateTable.applyColumnState([
  {id:'b',order:0,visible:false,width:150,sticky:true},
  {id:'a',order:1},
  {id:'d',order:2},
  {id:'c',order:3}
]);
assert.deepEqual(stateTable.columnState().map((column)=>column.id),['b','a','d','c']);
assert.equal(stateTable.columnState()[0].visible,false);
assert.equal(stateTable.columnState()[0].width,150);
assert.equal(stateTable.toolbarState().canReset,true);
stateTable.reset({columns:true});
assert.deepEqual(stateTable.visibleColumnIds(),['a','b','c','d']);

// A4 — mobile/standalone.
const mobileTable=new TableWiz({
  columns:[
    {id:'name',label:'Nom'},
    {id:'category',label:'Catégorie'},
    {id:'score',label:'Score'}
  ],
  viewMode:'auto',
  mobileBreakpoint:640,
  standalone:true
});
const mobileDocument=new FakeDocument();
const mobileContainer=new FakeElement('div',mobileDocument);
mobileContainer.clientWidth=480;
mobileTable.render(mobileContainer,items);
let shell=mobileContainer.children[0];
assert.match(shell.className,/standalone--stacked/);
assert.match(shell.children[0].className,/--stacked/);
mobileContainer.clientWidth=900;
mobileTable.render(mobileContainer,items);
shell=mobileContainer.children[0];
assert.match(shell.className,/standalone--table/);
assert.equal(shell.children[0].tagName,'TABLE');

// A5 — targeted exports + HTML escaping.
const exportTable=new TableWiz({columns:[
  {id:'id',label:'ID'},
  {id:'name',label:'Nom'},
  {id:'category',label:'Catégorie'},
  {id:'score',label:'Score'}
]});
assert.deepEqual(exportTable.exportSelection(items,{rowIndexes:[2,0,2],columnIds:['name','score']}),[
  {name:'Pommes rôties',score:9},
  {name:'Tarte aux pommes',score:12}
]);
assert.deepEqual(exportTable.exportRow(items,1,{columnIds:['id','category']}),{id:'B',category:'plat'});
assert.deepEqual(exportTable.exportColumn(items,'score',{rowIndexes:[0,2]}),[12,9]);
assert.equal(
  exportTable.exportCSV(items,{rowIndexes:[1],columnIds:['name','score'],delimiter:','}),
  '"Nom","Score"\n"Soupe de carottes","7"'
);
const html=exportTable.exportPrintHTML([{id:'X',name:'<script>x</script>',category:'A&B',score:1}],{
  title:'A&B <Test>',
  columnIds:['name','category']
});
assert.match(html,/@page\{size:landscape/);
assert.match(html,/A&amp;B &lt;Test&gt;/);
assert.doesNotMatch(html,/<script>x<\/script>/);

// A6 — typed editing API.
const edits=[];
const editableItems=[
  {
    id:'R1',
    title:'Initial',
    quantity:2,
    price:3.5,
    active:false,
    tags:['a'],
    published:'2026-08-12',
    meta:{note:'old'},
    readonly:'locked'
  }
];
const editTable=new TableWiz({
  editable:true,
  onEdit:(event)=>edits.push(event),
  columns:[
    {id:'title',type:'text'},
    {id:'quantity',type:'integer'},
    {id:'price',type:'number'},
    {id:'active',type:'boolean'},
    {id:'tags',type:'tags',separator:';'},
    {id:'published',type:'date'},
    {id:'note',field:'meta.note',type:'text'},
    {id:'readonly',type:'text',editable:false},
    {
      id:'code',
      field:'meta.code',
      editable:true,
      parse:(raw)=>String(raw).trim().toUpperCase(),
      validate:(value)=>value.length===3||'Code must be 3 characters.'
    }
  ]
});
assert.deepEqual(
  editTable.editableColumnIds(),
  ['title','quantity','price','active','tags','published','note','code']
);

let edit=editTable.editCell(editableItems,0,'quantity','7');
assert.equal(edit.ok,true);
assert.equal(edit.value,7);
assert.equal(edit.items[0].quantity,7);
assert.equal(editableItems[0].quantity,2);
assert.notEqual(edit.items,editableItems);

edit=editTable.editCell(editableItems,0,'quantity','7.2');
assert.equal(edit.ok,false);
assert.equal(edit.error.code,'INVALID_INTEGER');
assert.equal(editableItems[0].quantity,2);

edit=editTable.editCell(editableItems,0,'active','oui',{mutate:true});
assert.equal(edit.ok,true);
assert.equal(editableItems[0].active,true);
assert.equal(edits.at(-1).field,'active');

edit=editTable.editCell(editableItems,0,'tags','alpha; beta; alpha',{mutate:true});
assert.deepEqual(editableItems[0].tags,['alpha','beta']);

edit=editTable.editCell(editableItems,0,'note','new note',{mutate:true});
assert.equal(editableItems[0].meta.note,'new note');

edit=editTable.editCell(editableItems,0,'readonly','changed',{mutate:true});
assert.equal(edit.ok,false);
assert.equal(edit.error.code,'COLUMN_NOT_EDITABLE');
assert.equal(editableItems[0].readonly,'locked');

edit=editTable.editCell(editableItems,0,'code',' ab ',{mutate:true});
assert.equal(edit.ok,false);
assert.equal(edit.error.code,'VALIDATION_FAILED');
edit=editTable.editCell(editableItems,0,'code',' xyz ',{mutate:true});
assert.equal(edit.ok,true);
assert.equal(editableItems[0].meta.code,'XYZ');

const atomicSource=[{
  id:'R2',
  quantity:1,
  active:false,
  meta:{note:'before'}
}];
const atomicTable=new TableWiz({editable:true,columns:[
  {id:'quantity',type:'integer'},
  {id:'active',type:'boolean'},
  {id:'note',field:'meta.note',type:'text'}
]});
const atomic=atomicTable.editRow(atomicSource,0,{quantity:'9',active:'true',note:'after'});
assert.equal(atomic.ok,true);
assert.deepEqual(atomic.row,{id:'R2',quantity:9,active:true,meta:{note:'after'}});
assert.deepEqual(atomicSource,[{id:'R2',quantity:1,active:false,meta:{note:'before'}}]);

const atomicFail=atomicTable.editRow(atomicSource,0,{quantity:'bad',note:'must-not-apply'});
assert.equal(atomicFail.ok,false);
assert.deepEqual(atomicSource,[{id:'R2',quantity:1,active:false,meta:{note:'before'}}]);

// A6 — DOM editor resolves source row by rowKey even after search clones rows.
const domEditItems=[
  {id:'A',name:'Alpha',score:1},
  {id:'B',name:'Beta',score:2}
];
const domEditTable=new TableWiz({
  editable:true,
  columns:[
    {id:'name',type:'text'},
    {id:'score',type:'integer'}
  ]
});
domEditTable.setQuery('Beta');
const editDocument=new FakeDocument();
const editContainer=new FakeElement('div',editDocument);
domEditTable.render(editContainer,domEditItems);
const scoreEditor=findByAttribute(editContainer,'data-cell-editor','score');
assert.ok(scoreEditor);
assert.equal(scoreEditor.attributes.get('data-row-index'),'1');
scoreEditor.value='8';
scoreEditor.dispatch('change',{});
assert.equal(domEditItems[1].score,8);

// A6 — unsafe prototype-sensitive paths are rejected before mutation.
const unsafeTarget=[{id:'safe'}];
const unsafeTable=new TableWiz({editable:true,columns:[
  {id:'danger',field:'__proto__.polluted',editable:true}
]});
const unsafeEdit=unsafeTable.editCell(unsafeTarget,0,'danger','yes',{mutate:true});
assert.equal(unsafeEdit.ok,false);
assert.equal(unsafeEdit.error.code,'UNSAFE_FIELD_PATH');
assert.equal({}.polluted,undefined);

// A7 — profiles/presets and injectable persistence.
const storage=new MemoryStorage();
const profileTable=new TableWiz({
  profileStorage:storage,
  profileStorageKey:'table-profiles',
  columns:[
    {id:'name'},
    {id:'score'}
  ]
});
profileTable
  .setQuery('alpha')
  .setSort('score','desc')
  .setColumnVisible('score',false)
  .setViewMode('stacked')
  .setStandalone(true);
profileTable.registerProfile('Compact');
assert.deepEqual(profileTable.profileNames(),['Compact']);
const storedProfile=profileTable.profileState('Compact');
storedProfile.columns[0].visible=false;
assert.notDeepEqual(storedProfile,profileTable.profileState('Compact'));

profileTable.reset({columns:true,view:true});
assert.equal(profileTable.query,'');
assert.equal(profileTable.visibleColumnIds().includes('score'),true);
profileTable.applyProfile('Compact');
assert.equal(profileTable.query,'alpha');
assert.deepEqual(profileTable.sortState,{field:'score',direction:'desc'});
assert.equal(profileTable.visibleColumnIds().includes('score'),false);
assert.equal(profileTable.viewMode,'stacked');
assert.equal(profileTable.standalone,true);
assert.equal(profileTable.activeProfile,'Compact');

assert.equal(profileTable.saveProfiles(),true);
const restored=new TableWiz({
  profileStorage:storage,
  profileStorageKey:'table-profiles',
  columns:[{id:'name'},{id:'score'}]
});
restored.loadProfiles();
assert.deepEqual(restored.profileNames(),['Compact']);
restored.applyProfile('Compact');
assert.equal(restored.query,'alpha');

const beforeNames=restored.profileNames();
restored.importProfiles('{bad');
assert.equal(restored.lastError.code,'INVALID_PROFILE_JSON');
assert.deepEqual(restored.profileNames(),beforeNames);
restored.importProfiles(JSON.stringify({Broken:{version:99}}));
assert.equal(restored.lastError.code,'UNSUPPORTED_PROFILE_VERSION');
assert.deepEqual(restored.profileNames(),beforeNames);

const toolbar=profileTable.toolbarState();
assert.deepEqual(toolbar.profiles.names,['Compact']);
assert.equal(toolbar.counts.editableColumns,0);

// Defensive compatibility.
assert.equal(table.process(null).total,0);
assert.equal(table.exportJSON(null),'[]');
assert.match(table.exportJSON({ok:true}),/"ok": true/);
assert.match(table.exportCSV([{name:'A "quote"',category:'x',score:1}]),/"A ""quote"""/);

console.log('table wiz legacy tests: ok');
