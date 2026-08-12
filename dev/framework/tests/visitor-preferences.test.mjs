import assert from 'node:assert/strict';
import {VisitorPreferences,VisitorPreferencesError} from '../themes/visitor-preferences.js';

const storage={data:new Map(),getItem(k){return this.data.get(k)??null},setItem(k,v){this.data.set(k,String(v))}};
const p=new VisitorPreferences({storage,key:'v'});
assert.equal(p.needsFirstVisit(),true);
assert.deepEqual(p.themePatch(),{scheme:'system',density:'normal',accent:'blue'});
assert.deepEqual(p.webmasterPatch(),{mode:'public'});
assert.deepEqual(p.consents(),{personalization:true,telemetry:null});
p.completeFirstVisit({language:'en-gb',scheme:'dark',density:'compact',accent:'cyan',viewMode:'webmaster',personalization:false,telemetry:true});
assert.equal(p.needsFirstVisit(),false);assert.equal(p.get('language'),'en-GB');assert.deepEqual(p.themePatch(),{scheme:'dark',density:'compact',accent:'cyan'});assert.deepEqual(p.webmasterPatch(),{mode:'webmaster'});assert.deepEqual(p.consents(),{personalization:false,telemetry:true});assert.ok(storage.data.has('v'));
const r=new VisitorPreferences({storage,key:'v'});assert.equal(r.get('viewMode'),'webmaster');const all=r.getAll();all.language='xx';assert.equal(r.get('language'),'en-GB');
r.set('custom',{a:1});const custom=r.get('custom');custom.a=9;assert.equal(r.get('custom').a,1);r.replace({language:'fr',scheme:'light'},{merge:false});assert.equal(r.get('viewMode'),'public');assert.equal(r.get('scheme'),'light');assert.equal(r.needsFirstVisit(),true);
assert.throws(()=>r.set('scheme','sepia'),e=>e instanceof VisitorPreferencesError&&e.code==='INVALID_SCHEME');assert.throws(()=>r.set('language','english'),e=>e.code==='INVALID_LANGUAGE');assert.throws(()=>r.set('viewMode','admin'),e=>e.code==='INVALID_VIEW_MODE');assert.throws(()=>r.set('density','bad value'),e=>e.code==='INVALID_PREFERENCE');
const legacy={value:null,get(k,f){return this.value??f},set(k,v){this.value=structuredClone(v);return true}};
const l=new VisitorPreferences({storage:legacy,key:'x'});l.set('scheme','dark').set('density','comfortable').set('accent','orange');assert.deepEqual(l.themePatch(),{scheme:'dark',density:'comfortable',accent:'orange'});const l2=new VisitorPreferences({storage:legacy,key:'x'});assert.equal(l2.get('scheme'),'dark');l2.reset();assert.equal(l2.get('scheme'),'system');
console.log('visitor preferences tests: ok');
