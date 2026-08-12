import assert from 'node:assert/strict';
import { QRStudioSchema } from '../components/qr-studio-schema.js';
import { QRStudioSession, QRStudioSessionError } from '../components/qr-studio-session.js';

const codec = {
  validatePreset(preset) {
    const errors=[];
    if (!['L','M','Q','H'].includes(preset.config.errorCorrectionLevel)) errors.push('bad level');
    return {valid:errors.length===0,errors};
  },
  exportCollection(presets,{activeId,meta,space}) { return JSON.stringify({type:'nlab.qr-presets',version:1,presets,activeId,meta},null,space); },
  importCollection(input) { return typeof input==='string'?JSON.parse(input):structuredClone(input); }
};
let saved=null;
const storage={
  save(presets,{activeId,meta}) { saved={type:'nlab.qr-presets',version:1,presets:structuredClone(presets),activeId,meta}; return {ok:true}; },
  load(){ return saved?{ok:true,found:true,document:structuredClone(saved)}:{ok:true,found:false,document:null}; }
};
const changes=[];
const session=new QRStudioSession({schema:new QRStudioSchema(),codec,storage,autoLoad:false,onChange:e=>changes.push(e.type),generate:async(config)=>({dark:config.dark})});
assert.equal(session.active().id,'standard');
assert.equal(session.list().length,6);
assert.equal(session.active().dirty,false);
session.beginEdit();
session.patch({dark:'#123456'});
assert.equal(session.active().editing,true);
assert.equal(session.active().dirty,true);
assert.equal(session.active().reference.dark,'#000000');
const generated=await session.regenerate();
assert.equal(generated.ok,true);
assert.deepEqual(generated.result,{dark:'#123456'});
assert.equal(session.active().generationCount,1);
const validated=session.validate();
assert.equal(validated.ok,true);
assert.equal(session.active().reference.dark,'#123456');
assert.equal(session.active().dirty,false);
assert.equal(saved.activeId,'standard');
session.patch({dark:'#abcdef'});
assert.equal(session.reset().config.dark,'#123456');
session.patch({dark:'#abcdef'});
assert.equal(session.reset('standard',{to:'canonical'}).config.dark,'#000000');
assert.equal(session.active().reference.dark,'#123456');
assert.equal(session.active().dirty,true);
const panel=session.controlPanel();
assert.equal(panel.config.dark,'#000000');
assert.equal(panel.reference.dark,'#123456');
assert.deepEqual(panel.actions.map(a=>a.id),['edit','regenerate','validate','reset']);

session.patch({errorCorrectionLevel:'Z'});
const invalid=await session.regenerate();
assert.equal(invalid.ok,false); assert.equal(invalid.reason,'invalid');
assert.equal(session.validate().ok,false);
session.reset();

session.select('transparent');
assert.equal(session.active().config.transparent,true);
const json=session.exportJSON();
const parsed=JSON.parse(json);
assert.equal(parsed.activeId,'transparent');
assert.equal(parsed.presets.length,6);
const modified=structuredClone(parsed);
modified.presets.find(p=>p.id==='transparent').config.dark='#777777';
modified.activeId='transparent';
assert.equal(session.importJSON(modified).ok,true);
assert.equal(session.active().reference.dark,'#777777');
assert.equal(session.load().ok,true);
assert.equal(session.active().reference.dark,'#777777');

const unknown=structuredClone(modified); unknown.presets[0].id='other';
assert.equal(session.importJSON(unknown,{persist:false}).reason,'unknown-preset');
assert.throws(()=>session.select('nope'),e=>e instanceof QRStudioSessionError&&e.code==='UNKNOWN_PRESET');
assert.throws(()=>session.reset('standard',{to:'x'}),e=>e.code==='INVALID_RESET_TARGET');
assert.throws(()=>session.exportJSON({source:'x'}),e=>e.code==='INVALID_EXPORT_SOURCE');
const noGenerator=new QRStudioSession({schema:new QRStudioSchema(),codec,autoLoad:false});
assert.equal((await noGenerator.regenerate()).reason,'generator-unavailable');
const exploding=new QRStudioSession({schema:new QRStudioSchema(),codec,autoLoad:false,generate:()=>{throw new Error('boom');}});
assert.equal((await exploding.regenerate()).reason,'generation-error');
assert.ok(changes.includes('validate'));
console.log('qr studio session tests: ok');
