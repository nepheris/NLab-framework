import assert from 'node:assert/strict';
import { DataJoinFieldCatalog, buildDataJoinFieldCatalog } from '../core/data-join-field-catalog.js';

const rows = [
  { id:1, customer:{id:'c1',name:'Alpha'}, active:true, tags:['x'], nullable:null, 'a.b':'literal', 'slash/key':'v' },
  { id:2, customer:{id:'c2',name:'Beta'}, active:false, nullable:'x', 'slash/key':'w' },
  'bad-row'
];
const catalog = buildDataJoinFieldCatalog(rows);
const byPointer = new Map(catalog.fields.map((field)=>[field.pointer,field]));
assert.equal(catalog.rows.sampled,3);
assert.equal(catalog.rows.objectRows,2);
assert.equal(catalog.rows.nonObjectRows,1);
assert.equal(byPointer.get('/customer').type,'object');
assert.equal(byPointer.get('/customer').joinable,false);
assert.equal(byPointer.get('/customer/id').specPath,'customer.id');
assert.equal(byPointer.get('/customer/id').joinable,true);
assert.equal(byPointer.get('/customer/id').present,2);
assert.equal(byPointer.get('/customer/id').missing,1);
assert.equal(byPointer.get('/customer/id').distinct,2);
assert.deepEqual(byPointer.get('/customer/id').examples,['c1','c2']);
assert.equal(byPointer.get('/tags').type,'array');
assert.equal(byPointer.get('/tags').joinable,false);
assert.equal(byPointer.get('/nullable').type,'string');
assert.equal(byPointer.get('/nullable').nulls,1);
assert.equal(byPointer.get('/nullable').joinable,true);
assert.equal(byPointer.get('/a.b').specPath,null);
assert.equal(byPointer.get('/a.b').joinable,false);
assert.equal(byPointer.get('/slash~1key').specPath,'slash/key');
assert.equal(byPointer.get('/slash~1key').joinable,true);
assert.ok(catalog.warnings.some((warning)=>warning.code==='UNADDRESSABLE_JOIN_PATH'&&warning.pointer==='/a.b'));
assert.ok(catalog.warnings.some((warning)=>warning.code==='NON_OBJECT_ROWS'));
const customerNode=catalog.tree.find((node)=>node.pointer==='/customer');
assert.deepEqual(customerNode.children.map((node)=>node.pointer),['/customer/id','/customer/name']);

const mixed=buildDataJoinFieldCatalog([{key:1},{key:'1'},{key:null}]);
assert.equal(mixed.fields[0].type,'mixed');
assert.deepEqual(mixed.fields[0].types,['null','number','string']);
assert.equal(mixed.fields[0].distinct,2);
assert.equal(mixed.fields[0].joinable,true);

const weird=JSON.parse('{"safe":1,"__proto__":2,"constructor":3}');
const unsafe=buildDataJoinFieldCatalog([weird]);
assert.deepEqual(unsafe.fields.map((field)=>field.pointer),['/safe']);
assert.equal(unsafe.warnings.filter((warning)=>warning.code==='UNSAFE_FIELD_SKIPPED').length,2);
assert.equal({}.polluted,undefined);

const cyclic={id:1}; cyclic.self=cyclic;
const cyclicCatalog=buildDataJoinFieldCatalog([cyclic]);
assert.equal(cyclicCatalog.fields.find((field)=>field.pointer==='/self').type,'object');
assert.ok(cyclicCatalog.warnings.some((warning)=>warning.code==='CYCLIC_VALUE_SKIPPED'&&warning.pointer==='/self'));

const custom=buildDataJoinFieldCatalog([{date:new Date(0),fn(){},big:1n,bad:Infinity}]);
assert.equal(custom.fields.find((field)=>field.pointer==='/date').joinable,false);
assert.equal(custom.fields.find((field)=>field.pointer==='/fn').joinable,false);
assert.equal(custom.fields.find((field)=>field.pointer==='/big').joinable,false);
assert.equal(custom.fields.find((field)=>field.pointer==='/bad').joinable,false);
assert.ok(custom.warnings.some((warning)=>warning.code==='NON_FINITE_VALUE'));
assert.ok(custom.warnings.some((warning)=>warning.code==='UNSUPPORTED_FIELD_VALUE'));

const sampled=buildDataJoinFieldCatalog([{a:1},{a:2},{a:3}],{maxRows:2});
assert.equal(sampled.rows.sampled,2);
assert.equal(sampled.fields[0].present,2);
assert.ok(sampled.warnings.some((warning)=>warning.code==='ROW_SAMPLE_LIMIT'));

const depth=buildDataJoinFieldCatalog([{a:{b:{c:1}}}],{maxDepth:2});
assert.ok(depth.fields.some((field)=>field.pointer==='/a/b'));
assert.ok(!depth.fields.some((field)=>field.pointer==='/a/b/c'));
assert.ok(depth.warnings.some((warning)=>warning.code==='DEPTH_LIMIT_REACHED'&&warning.pointer==='/a/b'));

const limited=buildDataJoinFieldCatalog([{a:1,b:2,c:3}],{maxFields:2});
assert.equal(limited.fields.length,2);
assert.ok(limited.warnings.some((warning)=>warning.code==='FIELD_LIMIT_REACHED'));

const empty=new DataJoinFieldCatalog({maxRows:0,maxExamples:0}).build([{a:1}]);
assert.equal(empty.rows.sampled,0);
assert.deepEqual(empty.fields,[]);
assert.ok(empty.warnings.some((warning)=>warning.code==='ROW_SAMPLE_LIMIT'));

assert.throws(()=>new DataJoinFieldCatalog({maxDepth:0}),e=>e.code==='INVALID_CATALOG_LIMIT');
assert.throws(()=>buildDataJoinFieldCatalog({},{}),e=>e.code==='INVALID_CATALOG_ROWS');

console.log('data join field catalog tests: ok');
