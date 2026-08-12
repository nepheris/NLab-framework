import assert from 'node:assert/strict';
import { WebmasterMode } from '../core/webmaster-mode.js';
import { WebmasterModeControl, WebmasterModeControlError } from '../components/webmaster-mode-control.js';

const stored=[];
const storage={
  set(key,value){stored.push([key,structuredClone(value)]);return true;},
  get(){return null;}
};
const mode=new WebmasterMode({mode:'public',storage,hydrate:false});
const events=[];
const control=new WebmasterModeControl({webmasterMode:mode,onChange:event=>events.push(event.type)});

let descriptor=control.descriptor();
assert.equal(descriptor.type,'webmaster-mode-control');
assert.equal(descriptor.state.mode,'public');
assert.equal(descriptor.state.webmaster,false);
assert.equal(descriptor.state.testTools,false);
assert.deepEqual(descriptor.controls.map(entry=>entry.id),['webmaster-mode','diagnostic-tools']);
assert.equal(descriptor.controls[0].ariaPressed,'false');
assert.equal(descriptor.controls[1].ariaPressed,'false');

control.toggleMode();
assert.equal(mode.snapshot().mode,'webmaster');
assert.equal(control.state().testTools,true);
assert.equal(control.controls()[0].ariaPressed,'true');
assert.equal(events.filter(type=>type==='mode').length,1);

control.setTestTools(false);
assert.equal(mode.isEnabled('ids'),false);
assert.equal(mode.isEnabled('infoTest'),false);
assert.equal(control.state().testTools,false);
assert.equal(events.filter(type=>type==='test-tools').length,1);
assert.equal(stored.length,2);

mode.setFeature('ids',true,{persist:false});
const mixed=control.state();
assert.equal(mixed.testTools,false);
assert.equal(mixed.testToolsMixed,true);
assert.equal(control.controls()[1].ariaPressed,'mixed');
assert.equal(events.at(-1),'external');

control.activate('diagnostic-tools',{persist:false});
assert.equal(mode.isEnabled('ids'),true);
assert.equal(mode.isEnabled('infoTest'),true);
assert.equal(control.state().testToolsMixed,false);

control.setMode('public',{resetOverrides:true,persist:false});
assert.equal(control.state().mode,'public');
assert.equal(control.state().ids,false);
assert.equal(control.state().infoTest,false);

assert.throws(()=>control.setMode('x'),error=>error instanceof WebmasterModeControlError&&error.code==='INVALID_MODE');
assert.throws(()=>control.activate('x'),error=>error.code==='UNKNOWN_CONTROL');
assert.throws(()=>new WebmasterModeControl({webmasterMode:{}}),error=>error.code==='INVALID_WEBMASTER_MODE');
assert.equal(control.destroy(),true);
assert.equal(control.destroy(),false);
mode.toggle({persist:false});
assert.notEqual(events.at(-1),'external');

console.log('webmaster mode control tests: ok');
