import assert from 'node:assert/strict';
import { SEOWiz } from '../wiz/seo-wiz.js';
import { AnalyticsWiz, MemoryAnalyticsProvider } from '../analytics/analytics-wiz.js';
import { GA4Provider } from '../analytics/providers/ga4.js';
import { RuntimeMonitor } from '../observability/runtime-monitor.js';

const seo=new SEOWiz();
const model=seo.model({ title:'Test', url:'https://example.test/', breadcrumbs:[{name:'Accueil',url:'https://example.test/'}] });
assert.equal(model.canonical,'https://example.test/');
assert.equal(seo.breadcrumbJsonLd(model).itemListElement[0].position,1);

const memory=new MemoryAnalyticsProvider();
const analytics=new AnalyticsWiz({ provider:memory });
await analytics.trackSearch('pommes');
await analytics.trackFilter({ category:'dessert' });
assert.equal(memory.events.length,2);
assert.equal(memory.events[0].name,'search');

const calls=[];
const ga=new GA4Provider({ measurementId:'G-TEST', gtag:(...args)=>calls.push(args) });
await ga.track('share',{ method:'copy' });
assert.equal(calls[0][0],'event');
assert.equal(calls[0][2].send_to,'G-TEST');

const monitor=new RuntimeMonitor();
monitor.start('boot');
const metric=monitor.end('boot');
assert.equal(metric.duration>=0,true);
monitor.count('records',3); monitor.count('records',2);
assert.equal(monitor.snapshot().metrics.records.value,5);
monitor.capture(new Error('demo'));
assert.equal(monitor.snapshot().errors.length,1);

console.log('web observability tests: ok');
