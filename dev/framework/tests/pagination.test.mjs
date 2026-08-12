import assert from 'node:assert/strict';
import { PaginationModel, renderPagination } from '../components/pagination.js';

// Normalisation robuste des entrées.
const model = new PaginationModel({
  page: '99',
  pageSize: '10.8',
  total: '25.9',
  pageSizes: [10, '20', 20, 0, -2, 'bad']
});
assert.equal(model.pageSize, 10);
assert.equal(model.total, 25);
assert.equal(model.page, 3);
assert.equal(model.pageCount, 3);
assert.deepEqual(model.pageSizes, [10, 20]);
assert.deepEqual(model.toJSON(), {
  page: 3,
  pageSize: 10,
  total: 25,
  pageCount: 3,
  offset: 20,
  end: 25,
  pageSizes: [10, 20]
});

// Changement de taille : conserver la position logique de la première ligne visible.
model.setPage(2);
assert.equal(model.offset, 10);
model.setPageSize(6);
assert.equal(model.page, 2);
assert.equal(model.offset, 6);
assert.equal(model.pageSizes.includes(6), true);

// Total et page restent bornés ; slice est défensif.
model.setTotal(-8);
assert.equal(model.total, 0);
assert.equal(model.page, 1);
assert.deepEqual(model.slice(null), []);
model.setTotal(100).setPage(9);
assert.equal(model.page, 9);
assert.deepEqual(model.pages(5), [7, 8, 9, 10, 11]);
assert.deepEqual(model.pages(0), [9]);

// Rendu sans DOM : contrôleur no-op, aucune exception.
const noop = renderPagination(null, model, { document: null });
assert.equal(noop.model, model);
assert.equal(noop.render(), noop);
noop.destroy();

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(value) { this.values.add(value); }
  remove(value) { this.values.delete(value); }
  has(value) { return this.values.has(value); }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.textContent = '';
    this.disabled = false;
    this.type = '';
    this.events = [];
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(type, listeners.filter((entry) => entry !== listener));
  }
  dispatchEvent(event) { this.events.push(event); return true; }
  click() {
    if (this.disabled) return;
    for (const listener of this.listeners.get('click') ?? []) listener({ type: 'click', target: this });
  }
}

class FakeCustomEvent {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}

const fakeDocument = { createElement: (tagName) => new FakeElement(tagName) };
const container = new FakeElement('div');
const interactive = new PaginationModel({ page: 1, pageSize: 10, total: 23 });
const changes = [];
const controller = renderPagination(container, interactive, {
  document: fakeDocument,
  CustomEvent: FakeCustomEvent,
  onChange: (current) => changes.push(current.page),
  ariaLabel: 'Pagination test'
});

assert.equal(controller.model, interactive);
assert.equal(container.classList.has('nlab-pagination'), true);
assert.equal(container.attributes.get('role'), 'navigation');
assert.equal(container.attributes.get('aria-label'), 'Pagination test');
assert.equal(container.children.at(-1).textContent, 'Page 1/3 · 23 éléments');

const next = container.children.find((node) => node.attributes?.get('aria-label') === 'Page suivante');
assert.ok(next);
next.click();
assert.equal(interactive.page, 2);
assert.deepEqual(changes, [2]);
assert.equal(container.events.length, 1);
assert.equal(container.events[0].type, 'nlab:page');
assert.deepEqual(container.events[0].detail, interactive.toJSON());
assert.equal(container.children.at(-1).textContent, 'Page 2/3 · 23 éléments');

// Le bouton de page courante ne déclenche pas de changement artificiel.
const current = container.children.find((node) => node.attributes?.get('aria-current') === 'page');
assert.ok(current);
current.click();
assert.deepEqual(changes, [2]);
assert.equal(container.events.length, 1);

controller.destroy();
assert.equal(container.children.length, 0);
assert.equal(container.classList.has('nlab-pagination'), false);
assert.equal(container.attributes.has('role'), false);
assert.equal(container.attributes.has('aria-label'), false);

console.log('Pagination tests: OK');
