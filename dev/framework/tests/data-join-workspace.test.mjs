import assert from 'node:assert/strict';
import { DataJoinWorkspace } from '../core/data-join-workspace.js';

const join={type:'left',keys:[{left:'customerId',right:'id'}],expectedCardinality:'N:1'};
const orders=[{id:'o1',customerId:'c1',amount:10},{id:'o2',customerId:'c2',amount:20}];
const customers=[{id:'c1',name:'Alpha'},{id:'c2',name:'Beta'}];
const w=new DataJoinWorkspace({
  sources:{
    left:{id:'orders',label:'Orders',kind:'json',rootPath:'/orders',metadata:{file:'orders.json'}},
    right:{id:'customers',label:'Customers',kind:'json',rootPath:'/customers'}
  },
  join
});
assert.equal(w.status().ready,false);
assert.equal(w.status().left.configured,true);
assert.equal(w.status().left.bound,false);
w.bind('left',orders,{sourceId:'orders'});
w.bind('right',customers,{sourceId:'customers'});
assert.equal(w.status().ready,true);
assert.equal(w.status().left.rows,2);
assert.equal(w.diagnose().joinType,'left');
const result=w.execute({strictCardinality:true});
assert.equal(result.workspace.leftSourceId,'orders');
assert.equal(result.workspace.rightSourceId,'customers');
assert.equal(result.workspace.joinType,'left');
assert.notEqual(result.rows[0].left,orders[0]);

const serialized=w.serialize();
assert.match(serialized,/nlab\.data-join-workspace/);
assert.doesNotMatch(serialized,/"amount"/);
assert.doesNotMatch(serialized,/"Alpha"/);
const restored=DataJoinWorkspace.parse(serialized);
assert.equal(restored.status().joinConfigured,true);
assert.equal(restored.status().left.configured,true);
assert.equal(restored.status().left.bound,false);
assert.equal(restored.status().ready,false);
assert.throws(()=>restored.execute(),e=>e.code==='WORKSPACE_NOT_READY');
assert.throws(()=>restored.bind('left',orders,{sourceId:'wrong'}),e=>e.code==='SOURCE_BINDING_ID_MISMATCH');
restored.bind('left',orders,{sourceId:'orders'});
restored.bind('right',customers,{sourceId:'customers'});
assert.equal(restored.status().ready,true);

const beforeNullJoin=w.joinSnapshot();
assert.throws(()=>w.setJoin(null),e=>e.code==='JOIN_SPEC_REQUIRED');
assert.deepEqual(w.joinSnapshot(),beforeNullJoin);

const snap=w.snapshot();
snap.sources.left.metadata.file='changed';
assert.equal(w.source('left').metadata.file,'orders.json');

w.setSource('left',{id:'orders',label:'Orders renamed',rootPath:'/orders',metadata:{file:'orders-2.json'}});
assert.equal(w.status().left.bound,true);
w.setSource('left',{id:'orders',label:'Orders renamed',rootPath:'/orders-v2'});
assert.equal(w.status().left.bound,false);
w.bind('left',orders,{sourceId:'orders'});
w.setSource('left',{id:'orders-v2',label:'Orders v2',rootPath:'/orders'});
assert.equal(w.status().left.bound,false);
assert.equal(w.status().ready,false);
w.bind('left',[],{sourceId:'orders-v2'});
assert.equal(w.status().left.bound,true);
assert.equal(w.status().left.rows,0);

w.updateJoin({type:'inner'});
assert.equal(w.status().joinType,'inner');
w.clearJoin();
assert.equal(w.status().joinConfigured,false);
assert.throws(()=>w.updateJoin({type:'left'}),e=>e.code==='JOIN_SPEC_REQUIRED');

assert.throws(()=>new DataJoinWorkspace({sources:{left:{id:'x',rootPath:'orders'}},join}),e=>e.code==='INVALID_SOURCE_ROOT_PATH');
assert.throws(()=>new DataJoinWorkspace({sources:{left:{id:'x',rootPath:'/a~2b'}},join}),e=>e.code==='INVALID_SOURCE_ROOT_PATH');
const unsafe=JSON.parse('{"id":"x","metadata":{"__proto__":{"polluted":true}}}');
assert.throws(()=>new DataJoinWorkspace({sources:{left:unsafe},join}),e=>e.code==='UNSAFE_WORKSPACE_KEY');
const cyclic={}; cyclic.self=cyclic;
assert.throws(()=>new DataJoinWorkspace({sources:{left:{id:'x',metadata:cyclic}},join}),e=>e.code==='CYCLIC_WORKSPACE_VALUE');
assert.throws(()=>w.bind('middle',[]),e=>e.code==='INVALID_WORKSPACE_SIDE');

console.log('data join workspace tests: ok');
