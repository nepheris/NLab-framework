import assert from 'node:assert/strict';
import { DataWiz } from '../wiz/data-wiz.js';
import { QRWiz } from '../wiz/qr-wiz.js';
import { ResultSet } from '../data/result-set.js';

// DataWiz — cas réels et limites
const data = new DataWiz();
const rows = [
  { id:'A', score:10, category:'dessert', tags:['fruit','froid'] },
  { id:'B', score:'20', category:'plat', tags:['legume'] },
  { id:'C', score:null, category:'dessert', tags:['fruit'] },
  { id:'D', category:'', tags:[] },
  { id:'E', category:null },
];
const stats = data.describe(rows, ['score','category']);
assert.equal(stats.rows, 5);
assert.equal(stats.fields.score.count, 2);
assert.equal(stats.fields.score.missing, 3);
assert.equal(stats.fields.score.numeric.min, 10);
assert.equal(stats.fields.score.numeric.max, 20);
assert.equal(stats.fields.score.numeric.mean, 15);
assert.equal(stats.fields.category.unique, 2);
const categoryGroups = data.groupBy(rows,'category');
assert.equal(categoryGroups.find((g)=>g.value==='dessert').count, 2);
// Contrat actuel : null/undefined => `(vide)`, chaîne vide => groupe `''` distinct.
assert.equal(categoryGroups.find((g)=>g.value==='(vide)').count, 1);
assert.equal(categoryGroups.find((g)=>g.value==='').count, 1);
assert.equal(data.groupBy(rows,'tags').find((g)=>g.value==='fruit').count, 2);
const histogram = data.histogram(rows,'score',{bins:2});
assert.equal(histogram.length, 2);
assert.equal(histogram.reduce((sum,bin)=>sum+bin.count,0), 2);
assert.deepEqual(data.histogram(rows,'missing'), []);

// ResultSet — immutabilité fonctionnelle de base et conservation du contexte
const original = new ResultSet([{id:1},{id:2},{id:3}], { total:9, query:'pomme', filters:[{active:true}], meta:{source:'demo'} });
const sliced = original.slice(0,2);
assert.equal(sliced.items.length,2);
assert.equal(sliced.total,9);
assert.equal(sliced.query,'pomme');
assert.deepEqual(sliced.meta,{source:'demo'});
const mapped = original.map((item)=>({...item,label:`#${item.id}`}));
assert.equal(mapped.items[0].label,'#1');
assert.equal(mapped.total,9);
const enriched = original.withMeta({page:2});
assert.deepEqual(enriched.meta,{source:'demo',page:2});
assert.deepEqual(original.meta,{source:'demo'});

// QRWiz — payload, defaults, transparence et décoration logo
const resolver = {
  resolve:(url)=>`RESOLVED:${url}`,
  current:({stripHash=false,stripQuery=false}={})=>`CURRENT:${stripHash}:${stripQuery}`,
};
const calls=[];
const encoder = {
  async encode(payload, options) {
    calls.push({payload,options});
    return '<svg viewBox="0 0 100 100"><rect width="100" height="100"/></svg>';
  }
};
const qr = new QRWiz({urlResolver:resolver,encoder});
assert.equal(qr.payload({url:'/r/REC001'}),'RESOLVED:/r/REC001');
assert.equal(qr.payload({canonical:true}),'CURRENT:true:true');
const defaults = qr.options();
assert.equal(defaults.width,256);
assert.equal(defaults.errorCorrectionLevel,'M');
assert.equal(defaults.logoSize,0.22);

const generated = await qr.generate({url:'/r/REC001',transparent:true,logo:'assets/logo.svg',logoSize:0.5,logoRadius:8});
assert.equal(calls.length,1);
assert.equal(calls[0].payload,'RESOLVED:/r/REC001');
assert.equal(calls[0].options.color.light,'#00000000');
assert.match(generated,/nlab-qr-logo/);
// logoSize est borné à 0.32 dans la décoration SVG
assert.match(generated,/width="32%"/);

await assert.rejects(async()=>new QRWiz().generate({url:'x'}),/requires an encoder adapter/);

console.log('parallel data/qr tests: ok');
