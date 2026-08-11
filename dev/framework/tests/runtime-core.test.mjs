import assert from 'node:assert/strict';
import { StateStore } from '../core/state-store.js';
import { EventBus } from '../core/event-bus.js';
import { FrameworkRegistry } from '../core/registry.js';
import { URLResolver } from '../core/url-resolver.js';
import { Environment } from '../core/environment.js';

const store = new StateStore({ ui: { density: 'normal' } });
let seen = 0;
store.subscribe('ui.density', () => { seen += 1; });
store.set('ui.density', 'compact');
assert.equal(store.get('ui.density'), 'compact');
assert.equal(seen, 1);
store.reset();
assert.equal(store.get('ui.density'), 'normal');

const bus = new EventBus();
let payload = null;
bus.once('demo:ready', (event) => { payload = event.payload; });
bus.emit('demo:ready', { ok: true });
bus.emit('demo:ready', { ok: false });
assert.equal(payload.ok, true);

const registry = new FrameworkRegistry();
registry.register('services', 'demo', { ok: true });
assert.equal(registry.get('services', 'demo').ok, true);

const resolver = new URLResolver({ baseUrl: 'https://example.test/app/', assetsBase: 'assets/' });
assert.equal(resolver.asset('logo.svg'), 'https://example.test/app/assets/logo.svg');

const environment = new Environment({ mode: 'preview', experience: 'webmaster' });
assert.equal(environment.isPreview, true);
assert.equal(environment.isWebmasterExperience, true);

console.log('runtime core tests: ok');
