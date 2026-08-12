import assert from 'node:assert/strict';
import { StateStore } from '../core/state-store.js';

const store = new StateStore({
  user: { name: 'Ada', prefs: { theme: 'light', density: 'normal' } },
  count: 1,
  primitive: 7
});

assert.equal(store.get('user.name'), 'Ada');
assert.equal(store.get('missing', 'fallback'), 'fallback');
const snapshot = store.get();
snapshot.user.name = 'mutated';
assert.equal(store.get('user.name'), 'Ada');

store.set('user.prefs.theme', 'dark');
assert.equal(store.get('user.prefs.theme'), 'dark');
store.update('count', (value) => value + 1);
assert.equal(store.get('count'), 2);

// Un intermédiaire primitif est remplacé proprement par un objet.
store.set('primitive.child.value', 42);
assert.equal(store.get('primitive.child.value'), 42);

assert.throws(() => store.set('', 1), /non-empty/);
assert.throws(() => store.set('user..name', 'x'), /invalid/);
assert.throws(() => store.set('__proto__.polluted', true), /unsafe/);
assert.throws(() => store.set('safe.constructor.polluted', true), /unsafe/);
assert.equal({}.polluted, undefined);
assert.equal(store.get('__proto__.polluted', 'safe'), 'safe');

const notifications = [];
let throwingCalls = 0;
const unsubscribeThrower = store.subscribe('user.name', () => {
  throwingCalls += 1;
  throw new Error('consumer failure');
});
const unsubscribeExact = store.subscribe('user.name', (value, path, state) => {
  notifications.push({ kind: 'exact', value, path, state });
});
const unsubscribeAll = store.subscribe('*', (value, path) => {
  notifications.push({ kind: 'all', value, path });
});
store.set('user.name', 'Grace');
assert.equal(throwingCalls, 1);
assert.equal(notifications.filter((item) => item.path === 'user.name').length, 2);
assert.equal(store.get('user.name'), 'Grace');
unsubscribeThrower();
unsubscribeExact();
unsubscribeAll();

// reset(path) ne notifie qu'une fois l'abonnement exact.
let resetCalls = 0;
store.subscribe('user.name', () => { resetCalls += 1; });
store.reset('user.name');
assert.equal(store.get('user.name'), 'Ada');
assert.equal(resetCalls, 1);

// Une clé sans valeur par défaut est supprimée au reset ciblé.
store.set('user.temp', 'x');
assert.equal(store.get('user.temp'), 'x');
store.reset('user.temp');
assert.equal(store.get('user.temp', 'missing'), 'missing');

store.set('count', 99);
store.reset();
assert.equal(store.get('count'), 1);
assert.equal(store.get('user.prefs.theme'), 'light');

// Hydratation profonde : conserver les defaults non surchargés.
const hydrationStorage = {
  get() {
    return {
      user: { prefs: { theme: 'dark' } },
      extra: { enabled: true }
    };
  },
  set() { return true; }
};
const hydrated = new StateStore({
  user: { name: 'Ada', prefs: { theme: 'light', density: 'compact' } },
  untouched: true
}, { storage: hydrationStorage, storageKey: 'state' });
assert.equal(hydrated.get('user.name'), 'Ada');
assert.equal(hydrated.get('user.prefs.theme'), 'dark');
assert.equal(hydrated.get('user.prefs.density'), 'compact');
assert.equal(hydrated.get('extra.enabled'), true);
assert.equal(hydrated.get('untouched'), true);

// Les clés dangereuses d'une hydratation JSON sont ignorées.
const malicious = JSON.parse('{"safe":1,"__proto__":{"polluted":true}}');
const protectedStore = new StateStore({ safe: 0 }, {
  storage: { get() { return malicious; }, set() { return true; } },
  storageKey: 'state'
});
assert.equal(protectedStore.get('safe'), 1);
assert.equal({}.polluted, undefined);

// Un provider de stockage fautif ne casse ni construction ni mutation.
const brokenStorage = {
  get() { throw new Error('read failure'); },
  set() { throw new Error('write failure'); }
};
const resilient = new StateStore({ value: 1 }, { storage: brokenStorage, storageKey: 'state' });
assert.equal(resilient.get('value'), 1);
assert.doesNotThrow(() => resilient.set('value', 2));
assert.equal(resilient.get('value'), 2);

assert.throws(() => new StateStore([]), /initialState must be an object/);
assert.throws(() => store.subscribe('', () => {}), /non-empty/);
assert.throws(() => store.subscribe('x', null), /listener/);

console.log('StateStore tests: OK');
