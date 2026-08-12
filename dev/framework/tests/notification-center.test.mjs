import assert from 'node:assert/strict';
import { NotificationCenter } from '../components/notification-center.js';

class FakeNode {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.isConnected = false;
    this.className = '';
    this.dataset = {};
    this.style = {};
    this.attributes = new Map();
    this.textContent = '';
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes) {
    for (const node of nodes) {
      node.parentNode = this;
      node.isConnected = true;
      this.children.push(node);
    }
  }

  remove() {
    if (this.parentNode) {
      const index = this.parentNode.children.indexOf(this);
      if (index >= 0) this.parentNode.children.splice(index, 1);
    }
    this.parentNode = null;
    this.isConnected = false;
  }
}

class FakeDocument {
  constructor() {
    this.body = new FakeNode('body');
    this.body.isConnected = true;
  }

  createElement(tagName) {
    return new FakeNode(tagName);
  }
}

const noDom = new NotificationCenter({ documentRef: null, root: null });
assert.equal(noDom.mount(), null);
assert.equal(noDom.info('ignored'), null);

const documentRef = new FakeDocument();
const center = new NotificationCenter({
  documentRef,
  root: documentRef.body,
  duration: 0,
  exitDuration: 0,
  maxItems: 2
});

const host = center.mount();
assert.ok(host);
assert.equal(center.mount(), host);
assert.equal(host.getAttribute('aria-live'), 'polite');
assert.equal(host.getAttribute('aria-relevant'), 'additions removals');

const info = center.info('Info', { persistent: true });
const danger = center.danger('Danger', { persistent: true });
assert.equal(info.dataset.type, 'info');
assert.equal(info.getAttribute('role'), 'status');
assert.equal(danger.dataset.type, 'error');
assert.equal(danger.getAttribute('role'), 'alert');
assert.match(danger.style.cssText, /--nlab-notification-error/);

const dev = center.dev('Dev', { persistent: true });
assert.equal(dev.dataset.type, 'dev');
assert.match(dev.style.cssText, /--nlab-notification-dev/);
assert.equal(host.children.length, 2);
assert.equal(info.isConnected, false);
assert.equal(host.children[0], danger);
assert.equal(host.children[1], dev);

assert.equal(center.dismiss(danger, { immediate: true }), true);
assert.equal(danger.isConnected, false);
assert.equal(host.children.length, 1);

const success = center.success(null, { persistent: true });
assert.equal(success.textContent, '');
assert.equal(success.dataset.type, 'success');

const unknown = center.show('Unknown', { type: 'not-a-level', persistent: true });
assert.equal(unknown.dataset.type, 'info');
assert.equal(host.children.length, 2);
assert.equal(dev.isConnected, false);

const warning = center.warning('Warning', { persistent: true });
assert.equal(warning.dataset.type, 'warning');
assert.equal(warning.getAttribute('role'), 'alert');
assert.equal(host.children.length, 2);

assert.equal(center.clear(), 2);
assert.equal(host.children.length, 0);
assert.equal(center.clear(), 0);

const finalNode = center.error('Final', { persistent: true });
assert.equal(finalNode.dataset.type, 'error');
assert.equal(center.destroy(), true);
assert.equal(center.host, null);
assert.equal(host.isConnected, false);
assert.equal(documentRef.body.children.length, 0);

console.log('notification center tests: ok');
