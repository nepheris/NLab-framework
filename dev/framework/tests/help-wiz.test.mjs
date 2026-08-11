import assert from 'node:assert/strict';
import { HelpWiz } from '../help/help-wiz.js';

class FakeTrigger {
  constructor(id) {
    this.dataset = { helpId: id };
    this.title = '';
    this.listeners = new Map();
    this.dispatched = [];
  }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  removeEventListener(type, handler) {
    if (this.listeners.get(type) === handler) this.listeners.delete(type);
  }
  dispatchEvent(event) { this.dispatched.push(event); return true; }
  click() {
    let prevented = false;
    this.listeners.get('click')?.({ preventDefault() { prevented = true; } });
    return prevented;
  }
}

class FakeRoot {
  constructor(triggers = []) { this.triggers = triggers; }
  querySelectorAll(selector) { return selector === '[data-help-id]' ? this.triggers : []; }
}

class FakeCustomEvent {
  constructor(type, options) { this.type = type; this.bubbles = options.bubbles; this.detail = options.detail; }
}

const registry = {
  filters: {
    title: 'Filtres',
    short: 'Filtrer la liste',
    long: 'Utilisez plusieurs critères.',
    examples: ['catégorie'],
    links: [{ label: 'Doc', href: '#doc' }],
    media: [{ type: 'image', src: 'help.png' }],
    technical: { component: 'FilterWiz' }
  }
};

const help = new HelpWiz({ registry, customEventClass: FakeCustomEvent });
assert.equal(help.has('filters'), true);
assert.equal(help.short('filters'), 'Filtrer la liste');
assert.equal(help.long('filters'), 'Utilisez plusieurs critères.');
assert.equal(help.get('missing'), null);
assert.throws(() => help.register('', {}), /id is required/);
assert.throws(() => help.register('bad', []), /must be an object/);

const copy = help.get('filters');
copy.short = 'mutated';
copy.examples.push('bad');
assert.equal(help.short('filters'), 'Filtrer la liste');
assert.deepEqual(help.get('filters').examples, ['catégorie']);

const visitor = help.content('filters');
assert.equal(visitor.technical, null);
assert.equal(visitor.title, 'Filtres');
const webmaster = help.content('filters', { experience: 'webmaster' });
assert.deepEqual(webmaster.technical, { component: 'FilterWiz' });
webmaster.technical.component = 'mutated';
assert.equal(help.content('filters', { experience: 'webmaster' }).technical.component, 'FilterWiz');

const trigger = new FakeTrigger('filters');
const unknown = new FakeTrigger('unknown');
const root = new FakeRoot([trigger, unknown]);
help.attach(root);
assert.equal(trigger.title, 'Filtrer la liste');
assert.equal(trigger.listeners.size, 1);
assert.equal(unknown.listeners.size, 0);
assert.equal(trigger.click(), true);
assert.equal(trigger.dispatched.length, 1);
assert.equal(trigger.dispatched[0].type, 'nlab:help');
assert.equal(trigger.dispatched[0].bubbles, true);
assert.equal(trigger.dispatched[0].detail.technical, null);

// Re-attacher ne doit pas empiler les handlers.
help.attach(root, { experience: 'webmaster' });
assert.equal(trigger.listeners.size, 1);
trigger.click();
assert.equal(trigger.dispatched.length, 2);
assert.deepEqual(trigger.dispatched[1].detail.technical, { component: 'FilterWiz' });
assert.equal(help.detach(root), 1);
assert.equal(trigger.listeners.size, 0);
assert.equal(help.detach(root), 0);

const panels = [];
const panelHelp = new HelpWiz({
  registry,
  panelFactory(content, context) { panels.push({ content, context }); },
  customEventClass: null
});
const panelTrigger = new FakeTrigger('filters');
const panelRoot = new FakeRoot([panelTrigger]);
panelHelp.attach(panelRoot, { experience: 'webmaster' });
panelTrigger.click();
assert.equal(panels.length, 1);
assert.equal(panels[0].content.technical.component, 'FilterWiz');
assert.equal(panels[0].context.trigger, panelTrigger);
assert.equal(panelTrigger.dispatched.length, 0);

const factoryEvents = [];
const factoryHelp = new HelpWiz({
  registry,
  customEventClass: null,
  eventFactory(type, options, eventTrigger) {
    factoryEvents.push({ type, options, eventTrigger });
    return { type, ...options };
  }
});
const factoryTrigger = new FakeTrigger('filters');
factoryHelp.attach(new FakeRoot([factoryTrigger]));
factoryTrigger.click();
assert.equal(factoryEvents.length, 1);
assert.equal(factoryEvents[0].type, 'nlab:help');
assert.equal(factoryEvents[0].eventTrigger, factoryTrigger);

const noDom = new HelpWiz({ registry, documentRef: null, customEventClass: null });
assert.equal(noDom.attach(null), noDom);
assert.equal(noDom.destroy(), noDom);

help.register('new', { title: 'New' });
assert.equal(help.has('new'), true);
assert.equal(help.unregister('new'), true);
assert.equal(help.has('new'), false);
help.destroy();
assert.equal(help.bindings.size, 0);

console.log('HelpWiz tests: OK');
