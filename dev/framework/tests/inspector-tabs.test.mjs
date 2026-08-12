import assert from 'node:assert/strict';
import { InspectorTabs, INSPECTOR_CANONICAL_TABS } from '../components/inspector-tabs.js';

assert.deepEqual(INSPECTOR_CANONICAL_TABS.map((tab)=>tab.id),['test','technical','dependencies','state','configuration']);
const events=[];
const tabs = new InspectorTabs({activeId:'state',onChange:(event)=>events.push(event)});
assert.equal(tabs.active().id,'state');
assert.equal(tabs.list().length,5);
assert.equal(tabs.list({visibleOnly:true}).length,5);

let result=tabs.activate('configuration');
assert.equal(result.changed,true);
assert.equal(tabs.active().id,'configuration');
assert.equal(events.at(-1).action,'activate');
assert.equal(events.at(-1).source,'api');
result=tabs.activate('configuration');
assert.equal(result.changed,false);

assert.equal(tabs.setVisible('configuration',false),true);
assert.equal(tabs.active().id,'test');
assert.equal(tabs.list({visibleOnly:true}).length,4);
assert.equal(tabs.activate('configuration').reason,'unavailable');

assert.equal(tabs.setEnabled('test',false),true);
assert.equal(tabs.active().id,'technical');
assert.equal(tabs.setBadge('technical',3),true);
assert.equal(tabs.list().find((tab)=>tab.id==='technical').badge,'3');
assert.equal(tabs.setBadge('technical',null),true);
assert.equal(tabs.list().find((tab)=>tab.id==='technical').badge,null);
assert.equal(tabs.setEnabled('missing',false),false);

const snapshot=tabs.snapshot();
snapshot.tabs[0].metadata.tamper=true;
assert.equal(tabs.snapshot().tabs[0].metadata.tamper,undefined);

const custom=new InspectorTabs({tabs:[
  {id:'a',label:'A',visible:false},
  {id:'b',label:'B',enabled:false},
  {id:'c',label:'C',metadata:{x:1}}
],activeId:'missing'});
assert.equal(custom.active().id,'c');
custom.setVisible('c',false);
assert.equal(custom.active(),null);
custom.setVisible('a',true);
assert.equal(custom.active().id,'a');

assert.throws(()=>new InspectorTabs({tabs:{}}),/array/);
assert.throws(()=>new InspectorTabs({tabs:[{id:'bad id'}]}),/invalid/);
assert.throws(()=>new InspectorTabs({tabs:['x','x']}),/duplicate/);

const silentEvents=[];
const silent=new InspectorTabs({tabs:['one','two'],onChange:(event)=>silentEvents.push(event)});
silent.activate('two',{emit:false});
assert.equal(silentEvents.length,0);
silent.activate('one',{source:'keyboard'});
assert.equal(silentEvents.at(-1).source,'keyboard');

console.log('inspector tabs tests: ok');
