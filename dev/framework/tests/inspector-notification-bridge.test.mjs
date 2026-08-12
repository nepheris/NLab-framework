import assert from 'node:assert/strict';
import { InspectorNotificationBridge, INSPECTOR_NOTIFICATION_RULES } from '../components/inspector-notification-bridge.js';

assert.equal(INSPECTOR_NOTIFICATION_RULES['validation:error'].type, 'error');
const calls=[];
const center={
  success(message, options){ calls.push(['success',message,options]); return { id:calls.length }; },
  warning(message, options){ calls.push(['warning',message,options]); return { id:calls.length }; },
  error(message, options){ calls.push(['error',message,options]); return { id:calls.length }; },
  info(message, options){ calls.push(['info',message,options]); return { id:calls.length }; }
};
let time=1000;
const bridge=new InspectorNotificationBridge({center,now:()=>time,dedupeWindow:500,prefix:'Inspector —'});
let result=bridge.notify('snapshot:exported');
assert.equal(result.shown,true);
assert.equal(result.type,'success');
assert.equal(calls[0][1],'Inspector — Snapshot JSON exporté');

result=bridge.notify('snapshot:exported');
assert.equal(result.shown,false);
assert.equal(result.reason,'duplicate');
time+=501;
assert.equal(bridge.notify('snapshot:exported').shown,true);
assert.equal(bridge.notify('snapshot:exported',{}, {force:true}).shown,true);

bridge.setRule('control:changed',{type:'info',message:(detail)=>`Contrôle ${detail.id} modifié`,duration:0});
result=bridge.handle({type:'control:changed',detail:{id:'density'}});
assert.equal(result.shown,true);
assert.equal(result.message,'Inspector — Contrôle density modifié');
assert.equal(calls.at(-1)[2].duration,0);

assert.equal(bridge.notify('unknown').reason,'unmapped');
assert.equal(bridge.notify('').reason,'invalid-code');
assert.equal(bridge.handle(null).reason,'invalid-event');
assert.throws(()=>bridge.setRule('',{message:'x'}),/required/);
assert.throws(()=>bridge.setRule('bad',{}),/message/);

const fallbackCalls=[];
const fallback=new InspectorNotificationBridge({center:{show(message,options){fallbackCalls.push([message,options]); return 1;}},dedupeWindow:0});
result=fallback.notify('validation:error',{}, {duration:120});
assert.equal(result.shown,true);
assert.equal(fallbackCalls[0][1].type,'error');
assert.equal(fallbackCalls[0][1].persistent,true);
assert.equal(fallbackCalls[0][1].duration,120);

const unavailable=new InspectorNotificationBridge();
assert.equal(unavailable.notify('configuration:reset').reason,'unavailable');
unavailable.setCenter({});
assert.equal(unavailable.notify('configuration:reset').reason,'unavailable');

const reportCalls=[];
const reporter=new InspectorNotificationBridge({center:{show(message,options){reportCalls.push([message,options]);return {}; }},dedupeWindow:0});
assert.equal(reporter.reportResult('Import',{ok:true}).type,'success');
assert.equal(reportCalls.at(-1)[0],'Import terminé');
assert.equal(reporter.reportResult('Validation',{warnings:['x']}).type,'warning');
assert.equal(reporter.reportResult('Import',{ok:false,reason:'invalid-data'}).type,'error');
assert.match(reportCalls.at(-1)[0],/invalid-data/);
assert.equal(reporter.reportResult('Save',{error:new Error('quota')}).type,'error');
assert.match(reportCalls.at(-1)[0],/quota/);

const rules=bridge.listRules();
rules['snapshot:exported'].type='error';
assert.equal(bridge.listRules()['snapshot:exported'].type,'success');
assert.equal(bridge.removeRule('control:changed'),true);
assert.equal(bridge.notify('control:changed',{id:'x'}).reason,'unmapped');
assert.ok(bridge.clearDedupe() >= 1);

console.log('inspector notification bridge tests: ok');
