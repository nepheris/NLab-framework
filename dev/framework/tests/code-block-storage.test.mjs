import assert from 'node:assert/strict';
import { CodeBlockStorage } from '../components/code-block-storage.js';

class MemoryStorage {
  constructor(){ this.map = new Map(); }
  getItem(key){ return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key,value){ this.map.set(key,String(value)); }
  removeItem(key){ this.map.delete(key); }
}

const block = { value:'const x = 1;', language:'javascript', filename:'snippet.js', theme:'dark', highlighted:true, fontScale:125 };
const memory = new MemoryStorage();
const store = new CodeBlockStorage({storage:memory,key:'code.test'});
assert.equal(store.isAvailable(), true);
assert.deepEqual(store.snapshot(block), block);
assert.equal(store.load().found, false);
const saved = store.save(block, {meta:{source:'editor'}});
assert.equal(saved.ok, true);
const parsed = JSON.parse(saved.json);
assert.equal(parsed.type, 'nlab.code-block-state');
assert.equal(parsed.version, 1);
assert.equal(parsed.meta.source, 'editor');

const targetCalls = [];
const target = {
  setLanguage(v){ targetCalls.push(['language',v]); this.language=v; },
  setFilename(v){ targetCalls.push(['filename',v]); this.filename=v; },
  setValue(v){ targetCalls.push(['value',v]); this.value=v; },
  setTheme(v){ targetCalls.push(['theme',v]); this.theme=v; },
  setHighlighted(v){ targetCalls.push(['highlighted',v]); this.highlighted=v; },
  setFontScale(v){ targetCalls.push(['fontScale',v]); this.fontScale=v; }
};
const loaded = store.load(target);
assert.equal(loaded.ok, true);
assert.equal(loaded.found, true);
assert.deepEqual(targetCalls.map((x)=>x[0]), ['language','filename','value','theme','highlighted','fontScale']);
assert.equal(target.value, block.value);
assert.equal(target.theme, 'dark');

const preview = store.load(null, {apply:false});
assert.equal(preview.document.state.filename, 'snippet.js');

const plainTarget = {};
store.apply(plainTarget, {value:'x',language:'text',filename:'x.txt',theme:'invalid',highlighted:0,fontScale:999});
assert.deepEqual(plainTarget, {value:'x',language:'text',filename:'x.txt',theme:'light',highlighted:false,fontScale:160});

memory.setItem('code.test', '{bad');
assert.equal(store.load().reason, 'invalid-state');
memory.setItem('code.test', JSON.stringify({type:'wrong',version:1,state:{}}));
assert.equal(store.load().reason, 'invalid-state');

assert.equal(store.save(null).reason, 'invalid-state');
const unavailable = new CodeBlockStorage({storage:null});
assert.equal(unavailable.save(block).reason, 'unavailable');
assert.equal(unavailable.load().reason, 'unavailable');
assert.equal(unavailable.clear().reason, 'unavailable');

const failing = new CodeBlockStorage({storage:{getItem(){throw new Error('read');},setItem(){throw new Error('write');},removeItem(){throw new Error('remove');}}});
assert.equal(failing.save(block).reason, 'storage-error');
assert.equal(failing.load().reason, 'storage-error');
assert.equal(failing.clear().reason, 'storage-error');

memory.setItem('code.test', saved.json);
assert.equal(store.clear().ok, true);
assert.equal(store.load().found, false);
console.log('code block storage tests: ok');
