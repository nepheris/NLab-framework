import assert from 'node:assert/strict';
import { HeaderStudio } from '../components/header-studio.js';

class MemoryStorage {
  constructor(){ this.data=new Map(); }
  getItem(key){ return this.data.has(key)?this.data.get(key):null; }
  setItem(key,value){ this.data.set(key,String(value)); }
  removeItem(key){ this.data.delete(key); }
}
class FakeClassList { add(){} remove(){} }
class FakeElement {
  constructor(tag='div',doc=null){ this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attributes=new Map();this.listeners=new Map();this.classList=new FakeClassList();this.className='';this.textContent='';this.title='';this.disabled=false;this.draggable=false;this.clientWidth=0; }
  append(...nodes){ this.children.push(...nodes); }
  replaceChildren(...nodes){ this.children=[...nodes]; }
  setAttribute(name,value){ this.attributes.set(name,String(value)); }
  addEventListener(type,fn){ if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn); }
  removeEventListener(type,fn){ this.listeners.get(type)?.delete(fn); }
  dispatch(type,event={}){ for(const fn of [...(this.listeners.get(type)??[])])fn(event); }
}
class FakeDocument { createElement(tag){ return new FakeElement(tag,this); } }
function find(node,attr,value){ if(node.attributes?.get(attr)===value)return node;for(const child of node.children??[]){const hit=find(child,attr,value);if(hit)return hit;}return null; }
class DataTransferStub {
  constructor(){this.data=new Map();this.effectAllowed='';}
  setData(type,value){this.data.set(type,String(value));}
  getData(type){return this.data.get(type)??'';}
}

const items=[
  {id:'home',labels:{short:'Home',long:'Accueil'},icon:'⌂',position:'start',collapse:'keep'},
  {id:'search',labels:{short:'Chercher',long:'Rechercher'},icon:'⌕',position:'center'},
  {id:'settings',labels:{short:'Cfg',long:'Paramètres'},icon:'⚙',position:'end'},
  {id:'help',labels:{short:'Aide',long:'Aide et documentation'},icon:'?',position:'end',collapse:'hide'},
  {id:'account',labels:{short:'Compte',long:'Mon compte'},icon:'●',position:'menu',group:'user'}
];

// Construction validates ids and keeps deterministic order.
assert.throws(()=>new HeaderStudio({items:[{id:'a'},{id:'a'}]}),/Duplicate header item id/);
assert.throws(()=>new HeaderStudio({items:[{}]}),/requires an id/);
assert.throws(()=>new HeaderStudio({items:[{id:'bad',href:'javascript:alert(1)'}]}),/Unsafe header href/);
const header=new HeaderStudio({items,compactBreakpoint:700});
assert.deepEqual(header.orderedItems().map((item)=>item.id),['home','search','settings','help','account']);

// Visibility, position and partial reorder are deterministic.
header.setVisible('help',false).setPosition('settings','start').reorder(['settings','home']);
assert.deepEqual(header.orderedItems().map((item)=>item.id),['settings','home','search','help','account']);
assert.equal(header.item('help').visible,false);
header.toggleVisible('help');
assert.equal(header.item('help').visible,true);
header.moveItem('account',1);
assert.deepEqual(header.orderedItems().map((item)=>item.id),['settings','account','home','search','help']);

// Full vs compact: auto labels, menu collapse and hide policies.
header.resetItems().setLabelMode('auto');
let resolved=header.resolve({width:1200});
assert.equal(resolved.mode,'full');
assert.deepEqual(resolved.zones.start.map((item)=>item.id),['home']);
assert.deepEqual(resolved.zones.center.map((item)=>item.id),['search']);
assert.deepEqual(resolved.zones.end.map((item)=>item.id),['settings','help']);
assert.deepEqual(resolved.zones.menu.map((item)=>item.id),['account']);
assert.equal(resolved.zones.start[0].text,'Accueil');

resolved=header.resolve({width:480});
assert.equal(resolved.mode,'compact');
assert.deepEqual(resolved.zones.start.map((item)=>item.id),['home']);
assert.deepEqual(resolved.zones.menu.map((item)=>item.id),['search','settings','account']);
assert.equal(resolved.visibleCount,4);
assert.equal(resolved.zones.start[0].text,'Home');
assert.equal(resolved.zones.menu[0].text,'Chercher');

header.setItemLabelMode('home','icon');
resolved=header.resolve({width:1200});
assert.equal(resolved.zones.start[0].text,'');
assert.equal(resolved.zones.start[0].title,'Accueil');

// Item state round-trip.
const state=header.itemState();
header.setVisible('home',false).setPosition('search','start').reorder(['account']);
header.applyItemState(state);
assert.equal(header.item('home').visible,true);
assert.equal(header.item('search').position,'center');
assert.deepEqual(header.orderedItems().map((item)=>item.id),['home','search','settings','help','account']);

// Profiles are isolated, atomic and persist through an injected storage.
const storage=new MemoryStorage();
const profiles=new HeaderStudio({items,profileStorage:storage,profileStorageKey:'headers'});
profiles.setVisible('help',false).setLabelMode('short').setCompactBreakpoint(640).registerProfile('Compact');
const stored=profiles.profileState('Compact');
stored.items[0].visible=false;
assert.notDeepEqual(stored,profiles.profileState('Compact'));
profiles.resetItems().setLabelMode('long').setCompactBreakpoint(900);
profiles.applyProfile('Compact');
assert.equal(profiles.activeProfile,'Compact');
assert.equal(profiles.labelMode,'short');
assert.equal(profiles.compactBreakpoint,640);
assert.equal(profiles.item('help').visible,false);
assert.equal(profiles.saveProfiles(),true);
const restored=new HeaderStudio({items,profileStorage:storage,profileStorageKey:'headers'}).loadProfiles();
assert.deepEqual(restored.profileNames(),['Compact']);
restored.importProfiles(JSON.stringify({Broken:{version:99}}));
assert.equal(restored.lastError.code,'UNSUPPORTED_PROFILE_VERSION');
assert.deepEqual(restored.profileNames(),['Compact']);

// DOM rendering uses textContent, actions, ARIA and drag/drop reorder.
const doc=new FakeDocument();
const container=new FakeElement('div',doc);container.clientWidth=1200;
const actions=[];const reorders=[];
header.resetItems().setItemLabelMode('home','icon');
header.render(container,{onAction:(event)=>actions.push(event.id),onReorder:(value)=>reorders.push(value)});
const home=find(container,'data-header-item','home');
assert.ok(home);
assert.equal(home.attributes.get('aria-label'),'Accueil');
home.dispatch('click',{});
assert.deepEqual(actions,['home']);
const search=find(container,'data-header-item','search');
const settings=find(container,'data-header-item','settings');
const transfer=new DataTransferStub();
search.dispatch('dragstart',{dataTransfer:transfer});
settings.dispatch('drop',{dataTransfer:transfer,preventDefault(){}});
assert.equal(reorders.length,1);
assert.deepEqual(header.orderedItems().map((item)=>item.id),['home','settings','search','help','account']);

// Icon adapters can return DOM nodes without enabling raw HTML injection.
let iconArgs=null;
const iconHeader=new HeaderStudio({
  items:[{id:'settings',label:'Settings',icon:'settings'}],
  iconRenderer:(id,item,documentRef)=>{ iconArgs={id,itemId:item.id,documentRef}; return documentRef.createElement('svg'); }
});
const iconContainer=new FakeElement('div',doc);
iconHeader.render(iconContainer);
const iconItem=find(iconContainer,'data-header-item','settings');
assert.equal(iconArgs.id,'settings');
assert.equal(iconArgs.itemId,'settings');
assert.equal(iconArgs.documentRef,doc);
assert.equal(iconItem.children[0].children[0].tagName,'SVG');

// Relative and standard navigation hrefs remain anchors.
const linkHeader=new HeaderStudio({items:[{id:'docs',label:'Docs',href:'#docs'}]});
const linkContainer=new FakeElement('div',doc);
linkHeader.render(linkContainer);
assert.equal(find(linkContainer,'data-header-item','docs').tagName,'A');

// Disabled items do not activate.
const disabled=new HeaderStudio({items:[{id:'x',label:'X',disabled:true}]});
const disabledContainer=new FakeElement('div',doc);let called=0;
disabled.render(disabledContainer,{onAction:()=>called++});
find(disabledContainer,'data-header-item','x').dispatch('click',{preventDefault(){}});
assert.equal(called,0);

disabled.destroy();
console.log('header studio tests: ok');
