import assert from 'node:assert/strict';
import { QRPresetStorage } from '../wiz/qr-preset-storage.js';

class MemoryStorage {
  constructor(){ this.map = new Map(); }
  getItem(key){ return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key,value){ this.map.set(key,String(value)); }
  removeItem(key){ this.map.delete(key); }
}

const preset = { id:'default', config:{type:'url',url:'https://example.test'} };
const memory = new MemoryStorage();
const store = new QRPresetStorage({storage:memory,key:'test.qr'});
assert.equal(store.isAvailable(), true);
assert.deepEqual(store.load(), {ok:true,found:false,reason:null,key:'test.qr',document:null,error:null});

const saved = store.save([preset], {activeId:'default', meta:{source:'test'}});
assert.equal(saved.ok, true);
assert.equal(saved.key, 'test.qr');
assert.ok(saved.bytes > 0);
assert.equal(typeof saved.json, 'string');
assert.equal(memory.getItem('test.qr'), saved.json);

const loaded = store.load();
assert.equal(loaded.ok, true);
assert.equal(loaded.found, true);
assert.equal(loaded.document.activeId, 'default');
assert.equal(loaded.document.presets[0].id, 'default');
loaded.document.presets[0].config.url = 'tamper';
assert.equal(store.load().document.presets[0].config.url, 'https://example.test');

const invalid = store.save([{id:'bad id',config:{type:'text',text:'ok'}}]);
assert.equal(invalid.ok, false);
assert.equal(invalid.reason, 'invalid-data');
assert.ok(invalid.issues.length > 0);
assert.equal(store.load().document.presets[0].id, 'default');

memory.setItem('test.qr', '{bad');
const corrupt = store.load();
assert.equal(corrupt.ok, false);
assert.equal(corrupt.found, true);
assert.equal(corrupt.reason, 'invalid-data');
assert.equal(corrupt.document, null);

memory.setItem('test.qr', saved.json);
assert.equal(store.clear().ok, true);
assert.equal(store.load().found, false);

const unavailable = new QRPresetStorage({storage:null});
assert.equal(unavailable.isAvailable(), false);
assert.equal(unavailable.save([preset]).reason, 'unavailable');
assert.equal(unavailable.load().reason, 'unavailable');
assert.equal(unavailable.clear().reason, 'unavailable');

const quotaStorage = {
  getItem(){ return null; },
  setItem(){ const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; },
  removeItem(){}
};
const quota = new QRPresetStorage({storage:quotaStorage});
const quotaResult = quota.save([preset]);
assert.equal(quotaResult.ok, false);
assert.equal(quotaResult.reason, 'storage-error');
assert.equal(quotaResult.error.name, 'QuotaExceededError');

const readFailure = new QRPresetStorage({storage:{
  getItem(){ throw new Error('denied'); },
  setItem(){},
  removeItem(){ throw new Error('denied'); }
}});
assert.equal(readFailure.load().reason, 'storage-error');
assert.equal(readFailure.clear().reason, 'storage-error');

const customKey = new QRPresetStorage({storage:new MemoryStorage(), key:'   '});
assert.equal(customKey.key, 'nlab.qr.presets.v1');

console.log('qr preset storage tests: ok');
