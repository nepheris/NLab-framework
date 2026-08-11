import assert from 'node:assert/strict';
import { BrowserStorage } from '../core/storage.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const memory = new MemoryStorage();
const storage = new BrowserStorage(memory, { prefix: 'test:' });
assert.equal(storage.key('item'), 'test:item');
assert.equal(storage.set('item', { ok: true }), true);
assert.deepEqual(storage.get('item'), { ok: true });
assert.equal(storage.get('missing', 'fallback'), 'fallback');
assert.equal(storage.remove('item'), true);
assert.equal(storage.get('item', null), null);

storage.set('one', 1);
storage.set('two', 2);
memory.setItem('other:keep', '3');
storage.clear();
assert.equal(memory.getItem('test:one'), null);
assert.equal(memory.getItem('test:two'), null);
assert.equal(memory.getItem('other:keep'), '3');

const circular = {};
circular.self = circular;
assert.equal(storage.set('circular', circular), false);
assert.equal(storage.set('undefined', undefined), false);
assert.equal(storage.set('bigint', 1n), false);

const throwing = {
  get length() { throw new Error('security'); },
  getItem() { throw new Error('security'); },
  setItem() { throw new Error('quota'); },
  removeItem() { throw new Error('security'); },
  key() { throw new Error('security'); }
};
const safe = new BrowserStorage(throwing);
assert.equal(safe.get('x', 42), 42);
assert.equal(safe.set('x', 1), false);
assert.equal(safe.remove('x'), false);
assert.doesNotThrow(() => safe.clear());

const partial = {
  items: ['nlab:a', 'nlab:b', 'other:c'],
  get length() { return this.items.length; },
  key(index) { if (index === 1) throw new Error('key failure'); return this.items[index] ?? null; },
  removeItem(key) { if (key === 'nlab:a') throw new Error('remove failure'); this.items = this.items.filter((item) => item !== key); }
};
assert.doesNotThrow(() => new BrowserStorage(partial).clear());

const empty = new BrowserStorage(null);
assert.equal(empty.get('x', 'fallback'), 'fallback');
assert.equal(empty.set('x', 1), false);
assert.equal(empty.remove('x'), false);
assert.doesNotThrow(() => empty.clear());

const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
try {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('blocked'); }
  });
  const defaultSafe = new BrowserStorage();
  assert.equal(defaultSafe.storage, null);
  assert.equal(defaultSafe.get('x', 'ok'), 'ok');
} finally {
  if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
  else delete globalThis.localStorage;
}

console.log('BrowserStorage tests: OK');
