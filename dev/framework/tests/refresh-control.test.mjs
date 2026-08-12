import assert from 'node:assert/strict';
import { RefreshControl } from '../components/refresh-control.js';

const changes = [];
let calls = 0;
let release;
const gate = new Promise((resolve) => { release = resolve; });
const control = new RefreshControl({
  onRefresh: async ({ runCount, source }) => { calls += 1; await gate; return { runCount, source }; },
  onStateChange: (state) => changes.push(state.status),
  documentRef: null
});

assert.equal(control.state().status, 'idle');
const first = control.activate({ source: 'test' });
const second = control.activate({ source: 'duplicate' });
assert.equal(first, second);
assert.equal(control.state().status, 'running');
assert.equal(control.state().runCount, 1);
assert.equal(calls, 1);
release();
const result = await first;
assert.equal(result.ok, true);
assert.deepEqual(result.result, { runCount: 1, source: 'test' });
assert.equal(control.state().status, 'success');
assert.deepEqual(changes, ['running', 'success']);
assert.equal(control.reset(), true);
assert.equal(control.state().status, 'idle');

const disabled = new RefreshControl({ disabled: true, onRefresh: () => { throw new Error('must not run'); }, documentRef: null });
assert.deepEqual((await disabled.activate()).reason, 'disabled');
assert.equal(disabled.state().runCount, 0);

const failed = new RefreshControl({ onRefresh: () => { throw new Error('network down'); }, documentRef: null });
const failure = await failed.activate();
assert.equal(failure.ok, false);
assert.equal(failed.state().status, 'error');
assert.equal(failed.state().error.message, 'network down');

let reloaded = 0;
const reloadOnly = new RefreshControl({ reload: () => { reloaded += 1; return 'reloaded'; }, documentRef: null });
const reloadResult = await reloadOnly.activate();
assert.equal(reloaded, 1);
assert.equal(reloadResult.result, 'reloaded');

const noReload = new RefreshControl({ reload: null, documentRef: null });
const noReloadResult = await noReload.activate();
assert.equal(noReloadResult.ok, false);
assert.equal(noReload.state().status, 'error');
assert.equal(noReloadResult.error.message, 'No refresh handler is configured');

const observerSafe = new RefreshControl({ onRefresh: () => 'ok', onStateChange: () => { throw new Error('observer failure'); }, documentRef: null });
assert.equal((await observerSafe.activate()).ok, true);

function element(tagName) {
  return {
    tagName: String(tagName).toUpperCase(),
    children: [],
    attrs: {},
    hidden: false,
    textContent: '',
    disabled: false,
    append(...nodes) { this.children.push(...nodes); },
    setAttribute(name, value) { this.attrs[name] = String(value); },
    addEventListener(name, fn) { this.listeners ??= {}; this.listeners[name] = fn; },
    replaceChildren(...nodes) { this.children = [...nodes]; }
  };
}
const documentRef = { createElement: element };
const host = element('div');
const iconNode = element('svg');
const rendered = new RefreshControl({ documentRef, iconRenderer: ({ key, state, document }) => {
  assert.equal(key, 'refresh');
  assert.equal(state, 'idle');
  assert.equal(document, documentRef);
  return iconNode;
} }).mount(host);
assert.equal(host.children.length, 1);
const wrapper = host.children[0];
assert.equal(wrapper.attrs['data-refresh-state'], 'idle');
const button = wrapper.children[0];
assert.equal(button.tagName, 'BUTTON');
assert.equal(button.attrs['aria-label'], 'Actualiser');
assert.equal(button.attrs['aria-busy'], 'false');
assert.equal(button.attrs['data-action'], 'refresh');
assert.equal(button.children[0].children[0], iconNode);
const feedback = wrapper.children[1];
assert.equal(feedback.attrs.role, 'status');
assert.equal(feedback.attrs['aria-live'], 'polite');
assert.equal(feedback.hidden, true);
rendered.destroy();
assert.equal(host.children.length, 0);

console.log('refresh control tests: ok');
