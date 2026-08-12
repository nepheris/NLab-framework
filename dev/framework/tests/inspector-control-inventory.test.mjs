import assert from 'node:assert/strict';
import { InspectorControlInventory, INSPECTOR_CONTROL_SELECTOR } from '../components/inspector-control-inventory.js';

const inventory = new InspectorControlInventory();
assert.match(INSPECTOR_CONTROL_SELECTOR,/input/);

const label = (textContent) => ({textContent});
const selectOptions = [
  {value:'all',label:'Tous',selected:true,disabled:false},
  {value:'open',label:'Ouverts',selected:false,disabled:false}
];
const elements = [
  {tagName:'INPUT',id:'query',type:'search',value:'pomme',required:true,placeholder:'Rechercher',dataset:{section:'search'},labels:[label('Recherche')]},
  {tagName:'INPUT',name:'active',type:'checkbox',checked:true,dataset:{controlId:'active-toggle',controlType:'boolean',label:'Actif'}},
  {tagName:'SELECT',id:'status',name:'status',multiple:false,value:'all',options:selectOptions,selectedOptions:[selectOptions[0]],dataset:{}},
  {tagName:'INPUT',id:'query',type:'text',value:'duplicate',disabled:true,dataset:{}},
  {tagName:'TEXTAREA',value:'notes',hidden:true,minLength:3,maxLength:120,dataset:{}},
];
const root = {
  seenSelector:null,
  querySelectorAll(selector){ this.seenSelector=selector; return elements; }
};

const rows = inventory.scan(root);
assert.equal(root.seenSelector,INSPECTOR_CONTROL_SELECTOR);
assert.equal(rows.length,5);
assert.deepEqual(rows.map((row)=>row.id),['query','active-toggle','status','query#2','control-5']);
assert.equal(rows[0].label,'Recherche');
assert.equal(rows[0].value,'pomme');
assert.equal(rows[0].required,true);
assert.equal(rows[0].constraints.placeholder,'Rechercher');
assert.equal(rows[1].type,'boolean');
assert.equal(rows[1].value,true);
assert.equal(rows[2].options.length,2);
assert.equal(rows[3].disabled,true);
assert.equal(rows[4].hidden,true);
assert.equal(rows[4].constraints.minLength,3);
assert.equal(rows[4].constraints.maxLength,120);

const enabledOnly = inventory.scan(elements,{includeDisabled:false});
assert.equal(enabledOnly.length,4);
assert.ok(enabledOnly.every((row)=>!row.disabled));

const custom = inventory.scan([{tagName:'DIV',dataset:{control:'1',controlType:'slider',controlId:'density'},value:'4'}]);
assert.equal(custom[0].type,'slider');
assert.equal(custom[0].id,'density');

const multiple = inventory.scan([{tagName:'SELECT',id:'tags',multiple:true,options:selectOptions,selectedOptions:[selectOptions[0],selectOptions[1]],dataset:{}}]);
assert.deepEqual(multiple[0].value,['all','open']);

const summary = inventory.summarize(rows);
assert.equal(summary.total,5);
assert.equal(summary.enabled,4);
assert.equal(summary.disabled,1);
assert.equal(summary.required,1);
assert.equal(summary.hidden,1);
assert.deepEqual(summary.byType,{boolean:1,search:1,select:1,text:1,textarea:1});
assert.deepEqual(inventory.summarize(null),{total:0,enabled:0,disabled:0,required:0,hidden:0,byType:{}});
assert.deepEqual(inventory.scan(null),[]);
assert.deepEqual(inventory.scan({}),[]);

console.log('inspector control inventory tests: ok');
