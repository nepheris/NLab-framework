import assert from 'node:assert/strict';
import { DataJoinKeyMatcher, matchDataJoinKeys } from '../core/data-join-key-matcher.js';

function field(specPath,{name=specPath.split('.').at(-1),type='string',types=[type],present=100,missing=0,nulls=0,distinct=100,examples=[]}={}){
  return {joinable:true,specPath,pointer:`/${specPath.replace(/\./g,'/')}`,name,type,types,present,missing,nulls,distinct,examples};
}
const left={rows:{total:100,sampled:100},fields:[
  field('customerId',{distinct:20}),
  field('id',{distinct:100}),
  field('amount',{type:'number',types:['number'],distinct:80}),
  {...field('ignored'),joinable:false}
]};
const right={rows:{total:20,sampled:20},fields:[
  field('id',{present:20,distinct:20}),
  field('name',{present:20,distinct:20})
]};
const result=matchDataJoinKeys(left,right,{leftSource:{id:'orders',label:'Orders'},rightSource:{id:'customers',label:'Customers'}});
assert.equal(result.considered.left,3);
assert.equal(result.considered.right,2);
assert.equal(result.considered.pairs,6);
assert.equal(result.candidates[0].left.specPath,'customerId');
assert.equal(result.candidates[0].right.specPath,'id');
assert.equal(result.candidates[0].expectedCardinality,'N:1');
assert.equal(result.candidates[0].comparisonHint.coerce,'none');
assert.ok(result.candidates[0].reasons.some(r=>r.code==='FOREIGN_KEY_NAME'));
assert.ok(result.candidates[0].score>result.candidates.find(c=>c.left.specPath==='id'&&c.right.specPath==='id').score);

const same=matchDataJoinKeys({fields:[field('sku',{distinct:10,present:10})]},{fields:[field('sku',{distinct:10,present:10})]});
assert.equal(same.candidates[0].score>60,true);
assert.equal(same.candidates[0].expectedCardinality,'1:1');
assert.ok(same.candidates[0].reasons.some(r=>r.code==='EXACT_LEAF_NAME'));

const coercion=matchDataJoinKeys(
  {fields:[field('code',{type:'number',types:['number'],present:10,distinct:10})]},
  {fields:[field('code',{type:'string',types:['string'],present:10,distinct:10,examples:['1','2']})]}
);
assert.equal(coercion.candidates[0].comparisonHint.coerce,'number');
assert.ok(coercion.candidates[0].warnings.some(w=>w.code==='COERCION_REQUIRED'));

const mismatch=matchDataJoinKeys(
  {fields:[field('flag',{type:'boolean',types:['boolean']})]},
  {fields:[field('flag',{type:'number',types:['number']})]},
  {},{minScore:0}
);
assert.ok(mismatch.candidates[0].warnings.some(w=>w.code==='TYPE_MISMATCH'));
assert.ok(mismatch.candidates[0].reasons.some(r=>r.code==='TYPE_COMPATIBILITY'&&r.weight<0));

const sparse=matchDataJoinKeys(
  {fields:[field('key',{present:30,missing:70,distinct:25})]},
  {fields:[field('key',{present:100,missing:0,distinct:100})]},
  {},{minScore:0}
);
assert.ok(sparse.candidates[0].warnings.some(w=>w.code==='SPARSE_KEY'));

const many=matchDataJoinKeys(
  {fields:[field('group',{present:100,distinct:10})]},
  {fields:[field('group',{present:100,distinct:20})]},
  {},{minScore:0}
);
assert.equal(many.candidates[0].expectedCardinality,'N:N');
assert.ok(many.candidates[0].warnings.some(w=>w.code==='MANY_TO_MANY_LIKELY'));

const sampled=matchDataJoinKeys(
  {rows:{total:1000,sampled:100},fields:[field('id')]},
  {rows:{total:20,sampled:20},fields:[field('id',{present:20,distinct:20})]}
);
assert.deepEqual(sampled.warnings,[{code:'SAMPLED_PROFILE',side:'left',message:'left catalog is based on 100 of 1000 rows'}]);

const limited=new DataJoinKeyMatcher({minScore:0,maxCandidates:2}).match(
  {fields:[field('a'),field('b')]},
  {fields:[field('a'),field('b')]}
);
assert.equal(limited.candidates.length,2);
const deterministic=new DataJoinKeyMatcher({minScore:0,maxCandidates:10}).match(
  {fields:[field('b'),field('a')]},
  {fields:[field('b'),field('a')]}
);
const tied=deterministic.candidates.filter(c=>c.score===deterministic.candidates.at(-1).score).map(c=>`${c.left.specPath}:${c.right.specPath}`);
assert.deepEqual(tied,[...tied].sort());

const nonJoinable=matchDataJoinKeys(
  {fields:[{...field('x'),joinable:false},field('y')]},
  {fields:[field('y')]}
);
assert.equal(nonJoinable.considered.left,1);

const before=structuredClone(left);
matchDataJoinKeys(left,right,{leftSource:{id:'orders'},rightSource:{id:'customers'}});
assert.deepEqual(left,before);

assert.throws(()=>new DataJoinKeyMatcher({uniqueThreshold:0.2}),e=>e.code==='INVALID_MATCHER_OPTION');
assert.throws(()=>new DataJoinKeyMatcher({maxCandidates:0}),e=>e.code==='INVALID_MATCHER_OPTION');
assert.throws(()=>matchDataJoinKeys({},right),e=>e.code==='INVALID_FIELD_CATALOG');
assert.throws(()=>matchDataJoinKeys({fields:[{...field('x'),present:-1}]},right),e=>e.code==='INVALID_FIELD_STATISTICS');

console.log('data join key matcher tests: ok');
