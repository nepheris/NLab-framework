import assert from 'node:assert/strict';
import {ScrollWiz,ScrollWizError} from '../navigation/scroll-wiz.js';

const events=[];
const w=new ScrollWiz({hydrate:false,onChange:e=>events.push(e)});
assert.deepEqual(w.get('tab:a'),{x:0,y:0,meta:null});
w.capture('tab:a',{x:-1,y:320,meta:{panel:'a'}});
assert.deepEqual(w.get('tab:a'),{x:0,y:320,meta:{panel:'a'}});
const got=w.get('tab:a');got.meta.panel='x';assert.equal(w.get('tab:a').meta.panel,'a');assert.equal(w.has('tab:a'),true);
const restored=w.restore('tab:a',{behavior:'smooth'});assert.equal(restored.found,true);assert.equal(restored.y,320);assert.equal(restored.behavior,'smooth');
const missing=w.restore('missing',{fallback:{x:4,y:9}});assert.equal(missing.found,false);assert.equal(missing.y,9);
const transition=w.transition({fromKey:'tab:a',toKey:'tab:b',position:{y:777},fallback:{y:12},behavior:'instant'});assert.equal(w.get('tab:a').y,777);assert.equal(transition.y,12);assert.equal(transition.behavior,'instant');
assert.equal(w.shouldShowBackToTop({y:479}),false);assert.equal(w.shouldShowBackToTop({y:480}),true);w.setBackToTop('always');assert.equal(w.shouldShowBackToTop({y:0}),true);w.setBackToTop('never');assert.equal(w.shouldShowBackToTop({y:9000}),false);assert.throws(()=>w.setBackToTop('sometimes'),e=>e instanceof ScrollWizError&&e.code==='INVALID_POLICY');assert.deepEqual(w.backToTopDescriptor(),{x:0,y:0,behavior:'smooth'});
assert.throws(()=>w.get(''),e=>e.code==='KEY_REQUIRED');w.clear('tab:a');assert.equal(w.has('tab:a'),false);w.clear();assert.equal(Object.keys(w.snapshot().positions).length,0);assert.ok(events.some(e=>e.type==='capture'));
const storage={data:new Map(),getItem(k){return this.data.get(k)??null},setItem(k,v){this.data.set(k,String(v))}};
const a=new ScrollWiz({storage,storageKey:'s',hydrate:false});a.capture('page:1',{y:123});a.setBackToTop('threshold',{threshold:250});
const b=new ScrollWiz({storage,storageKey:'s'});assert.equal(b.get('page:1').y,123);assert.equal(b.threshold,250);assert.equal(b.shouldShowBackToTop({y:249}),false);assert.equal(b.shouldShowBackToTop({y:250}),true);
console.log('scroll wiz tests: ok');
