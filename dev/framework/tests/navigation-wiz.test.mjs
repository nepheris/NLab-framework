import assert from 'node:assert/strict';
import { NavigationWiz } from '../navigation/navigation-wiz.js';

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  contains(value) { return this.values.has(value); }
}

class FakeNode {
  constructor(tagName = 'div', ownerDocument = null) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.classList = new FakeClassList();
    this.textContent = '';
    this.id = '';
    this.open = false;
    this.href = '';
    this.childNodes = [];
    this.scrollCalls = [];
  }

  append(...nodes) {
    for (const node of nodes) {
      node.parentNode = this;
      this.children.push(node);
    }
  }

  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }

  closest(selector) {
    if (selector !== 'li') return null;
    let current = this;
    while (current) {
      if (current.tagName === 'LI') return current;
      current = current.parentNode;
    }
    return null;
  }

  querySelectorAll(selector) {
    const result = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (selector === 'details' && child.tagName === 'DETAILS') result.push(child);
        if (selector === '[data-nav-target]' && child.dataset.navTarget) result.push(child);
        visit(child);
      }
    };
    visit(this);
    return result;
  }

  scrollIntoView(options) {
    this.scrollCalls.push(options);
  }
}

class FakeDocument {
  createElement(tagName) {
    return new FakeNode(tagName, this);
  }
}

class FakeContent extends FakeNode {
  constructor(headings, ownerDocument) {
    super('main', ownerDocument);
    this.headings = headings;
  }
  querySelectorAll(selector) {
    if (selector === 'h1,h2,h3') return this.headings;
    return super.querySelectorAll(selector);
  }
}

class FakeObserver {
  static instances = [];
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
    this.disconnected = false;
    FakeObserver.instances.push(this);
  }
  observe(element) { this.observed.push(element); }
  disconnect() { this.disconnected = true; }
}

const noDom = new NavigationWiz({ root: null, documentRef: null, intersectionObserverClass: null });
assert.deepEqual(noDom.buildTree(), []);
assert.equal(noDom.render(null), noDom);
assert.equal(noDom.restore('#%E0%A4%A'), false);
assert.equal(noDom.destroy(), noDom);

const documentRef = new FakeDocument();
const heading = (tagName, text, id = '') => {
  const node = new FakeNode(tagName, documentRef);
  node.id = id;
  node.textContent = text;
  node.childNodes = [{ textContent: text }];
  return node;
};

const h1 = heading('h1', 'Racine', 'section-1');
const h2 = heading('h2', 'Enfant');
const h3 = heading('h3', 'Petit-enfant');
const h2b = heading('h2', 'Deuxième enfant', 'custom');
const headings = [h1, h2, h3, h2b];
const content = new FakeContent(headings, documentRef);
const root = {
  ownerDocument: documentRef,
  querySelector(selector) { return selector === 'main' ? content : null; },
  getElementById(id) { return headings.find((item) => item.id === id) ?? null; }
};

const nav = new NavigationWiz({ root, documentRef, intersectionObserverClass: FakeObserver });
const tree = nav.buildTree();
assert.equal(tree.length, 1);
assert.equal(tree[0].id, 'section-1');
assert.equal(h2.id, 'section-2');
assert.equal(h3.id, 'section-3');
assert.equal(tree[0].children.length, 2);
assert.equal(tree[0].children[0].id, 'section-2');
assert.equal(tree[0].children[0].children[0].id, 'section-3');
assert.equal(tree[0].children[1].id, 'custom');

const container = new FakeNode('nav', documentRef);
nav.render(container, tree);
assert.equal(container.children.length, 1);
const links = container.querySelectorAll('[data-nav-target]');
assert.equal(links.length, 4);
assert.equal(links.find((link) => link.dataset.navTarget === 'section-2').href, '#section-2');

const details = container.querySelectorAll('details');
assert.equal(details.length, 2);
nav.collapseAll();
assert.ok(details.every((item) => item.open === false));
nav.expandAll();
assert.ok(details.every((item) => item.open === true));
nav.setDepth(1);
assert.equal(details.find((item) => item.closest('li').dataset.navLevel === '1').open, true);
assert.equal(details.find((item) => item.closest('li').dataset.navLevel === '2').open, false);
nav.defaultState();
assert.ok(details.every((item) => item.open === true));

nav.observe(container, { rootMargin: '-10% 0px -80% 0px' });
const firstObserver = FakeObserver.instances.at(-1);
assert.equal(firstObserver.options.rootMargin, '-10% 0px -80% 0px');
assert.equal(firstObserver.observed.length, 4);
const customLink = links.find((link) => link.dataset.navTarget === 'custom');
firstObserver.callback([
  { isIntersecting: true, target: h2, boundingClientRect: { top: 20 } },
  { isIntersecting: true, target: h2b, boundingClientRect: { top: 5 } }
]);
assert.equal(customLink.classList.contains('is-active'), true);

nav.observe(container);
assert.equal(firstObserver.disconnected, true);
const secondObserver = FakeObserver.instances.at(-1);
assert.notEqual(secondObserver, firstObserver);

assert.equal(nav.restore('#section-2'), true);
assert.deepEqual(h2.scrollCalls.at(-1), { block: 'start' });
assert.equal(nav.restore('#does-not-exist'), false);
assert.equal(nav.restore('#%E0%A4%A'), false);

nav.destroy();
assert.equal(secondObserver.disconnected, true);
assert.equal(nav.observer, null);
assert.equal(nav.container, null);

console.log('NavigationWiz tests: OK');
