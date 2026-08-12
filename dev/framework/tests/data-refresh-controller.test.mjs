import assert from 'node:assert/strict';
import { DataRefreshController, DataRefreshError } from '../core/data-refresh-controller.js';

let now = 100;
const calls = [];
let releases = [];
const provider = {
  cacheClears: [],
  clearCache(name){ this.cacheClears.push(name ?? '*'); },
  async listCollections(){ return ['users','posts']; },
  getCollection(name, options){
    calls.push([name, options]);
    if (name === 'fail') throw new Error('network down');
    if (name === 'slow') return new Promise((resolve) => releases.push(resolve));
    return Promise.resolve(name === 'users' ? [{id:1},{id:2}] : [{id:9}]);
  }
};
const events = [];
const controller = new DataRefreshController({ provider, clock: () => ++now, onChange: (event) => events.push(event.type) });

assert.equal(controller.status('users').stale, true);
const first = await controller.refresh('users');
assert.equal(first.revision, 1);
assert.equal(first.size, 2);
assert.equal(first.changed, true);
assert.equal(controller.data('users')[0].id, 1);
controller.data('users')[0].id = 999;
assert.equal(controller.data('users')[0].id, 1);
const second = await controller.refresh('users');
assert.equal(second.revision, 1);
assert.equal(second.changed, false);
assert.equal(calls.at(-1)[1].refresh, true);

controller.invalidate('users', { reason: 'file-change' });
assert.equal(controller.status('users').stale, true);
assert.equal(controller.status('users').invalidationReason, 'file-change');
assert.equal(provider.cacheClears.at(-1), 'users');
const afterInvalidation = await controller.refresh('users');
assert.equal(afterInvalidation.stale, false);

const a = controller.refresh('slow');
const b = controller.refresh('slow');
assert.equal(calls.filter(([name]) => name === 'slow').length, 1);
controller.invalidate('slow');
releases.shift()([{id:1}]);
const [stale, stale2] = await Promise.all([a,b]);
assert.deepEqual(stale2, stale);
assert.equal(stale.superseded, true);
assert.equal(stale.stale, true);

await assert.rejects(() => controller.refresh('fail'), (error) => error instanceof DataRefreshError && error.code === 'REFRESH_FAILED');
assert.equal(controller.status('fail').error.code, 'REFRESH_FAILED');

const all = await controller.refreshAll();
assert.deepEqual(all.map((item) => item.name), ['users','posts']);
assert.ok(all.every((item) => item.ok));

const unsubEvents = [];
const unsubscribe = controller.subscribe((event) => unsubEvents.push(event.type));
controller.invalidate('posts');
unsubscribe();
controller.invalidate('posts');
assert.deepEqual(unsubEvents, ['invalidate']);

controller.clear('posts');
assert.equal(controller.status('posts').revision, 0);
assert.throws(() => controller.status(''), (error) => error.code === 'COLLECTION_REQUIRED');

console.log('data refresh controller tests: ok');
