import assert from 'node:assert/strict';
import { InspectorSnapshot } from '../components/inspector-snapshot.js';

const snapshots = new InspectorSnapshot();
assert.equal(InspectorSnapshot.documentType, 'nlab.inspector-snapshot');
assert.equal(InspectorSnapshot.version, 1);

const panelState = {
  x: 24, y: 30, width: 390, height: 320, locked: false,
  toJSON(){ return { x:this.x, y:this.y, width:this.width, height:this.height, locked:this.locked }; }
};
const sourceState = { open:true, nested:{ z:2, a:1 } };
const snapshot = snapshots.capture({
  component:{id:'catalog.inspector',type:'InspectorPanel',version:'2',label:'Catalogue'},
  panel:panelState,
  state:()=>sourceState,
  configuration:{ mode:'advanced', nullable:null },
  controls:[{id:'query',type:'text'},{id:'limit',type:'number'}],
  dependencies:['SearchWiz','FilterWiz'],
  tests:{status:'ok',cases:12},
  technical:{module:'components/inspector-panel.js'},
  metadata:{source:'catalogue'}
});
assert.equal(snapshot.component.id, 'catalog.inspector');
assert.equal(snapshot.panel.width, 390);
assert.deepEqual(Object.keys(snapshot.state.nested), ['a','z']);
assert.equal(snapshot.controls.length, 2);
assert.deepEqual(snapshot.dependencies, ['SearchWiz','FilterWiz']);

sourceState.open = false;
panelState.width = 999;
assert.equal(snapshot.state.open, true);
assert.equal(snapshot.panel.width, 390);

const json = snapshots.serialize(snapshot);
const roundTrip = snapshots.parse(json);
assert.deepEqual(roundTrip, snapshot);
roundTrip.state.nested.a = 99;
assert.equal(snapshot.state.nested.a, 1);

const compact = snapshots.serialize(snapshot,{space:0});
assert.equal(compact.includes('\n'), false);
const wide = snapshots.serialize(snapshot,{space:99});
assert.match(wide,/\n        "component"/);

assert.deepEqual(snapshots.validate(snapshot),{valid:true,errors:[]});
assert.equal(snapshots.validate('{bad').valid,false);
assert.equal(snapshots.validate({...snapshot,type:'wrong'}).valid,false);
assert.equal(snapshots.validate({...snapshot,version:2}).valid,false);
assert.equal(snapshots.validate({...snapshot,controls:{}}).valid,false);
assert.equal(snapshots.validate({...snapshot,dependencies:{}}).valid,false);
assert.throws(()=>snapshots.capture({component:{id:'bad id'}}),/safe identifier/);
assert.throws(()=>snapshots.capture({component:'',state:{}}),/component.id/);
assert.throws(()=>snapshots.capture({component:'x',state:{value:Infinity}}),/finite/);

const circular = {}; circular.self = circular;
assert.throws(()=>snapshots.capture({component:'x',state:circular}),/circular/);

const functional = snapshots.capture({
  component:'x',
  state:{ count:()=>3 },
  controls:()=>[{id:'a'}],
  dependencies:()=>['EventBus']
});
assert.equal(functional.state.count,3);
assert.deepEqual(functional.controls,[{id:'a'}]);

console.log('inspector snapshot tests: ok');
