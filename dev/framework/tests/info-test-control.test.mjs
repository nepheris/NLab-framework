import assert from 'node:assert/strict';
import { InfoTestControl, InfoTestControlError } from '../components/info-test-control.js';

const entries = new Map([['DMO-042', {
  humanId: 'DMO-042', technicalId: 'demo.theme.background.gradient', kind: 'component',
  title: 'Gradient', objective: 'Vérifier le gradient et sa portée.', thingsToTest: ['angle'], expectedResult: 'Gradient visible',
  files: ['a.js'], providers: ['p'], dependencies: ['d'], configuration: { scope: 'instance' }, metadata: { owner: 'demo' }
}]]);
const registry = {
  describe(ref, { mode }) {
    const value = entries.get(ref); if (!value) throw new Error('unknown');
    const base = Object.fromEntries(Object.entries(value).filter(([key]) => !['files','providers','dependencies','configuration','metadata'].includes(key)));
    return mode === 'advanced' ? { ...base, files: value.files, providers: value.providers, dependencies: value.dependencies, configuration: value.configuration, metadata: value.metadata } : base;
  },
  attributes(ref) { const value = entries.get(ref); if (!value) throw new Error('unknown'); return {'data-test-id':value.humanId,'data-technical-id':value.technicalId,'data-test-kind':value.kind}; }
};
let infoTest = true;
let subscriber = null;
const webmasterMode = {
  isEnabled(feature) { assert.equal(feature, 'infoTest'); return infoTest; },
  subscribe(fn) { subscriber = fn; return () => { subscriber = null; }; }
};
let opened = null;
const control = new InfoTestControl({ ref: 'DMO-042', registry, webmasterMode, documentRef: null, onOpen: async (detail) => { opened = detail; return 'opened'; } });
assert.equal(control.state().ready, true);
assert.equal(control.state().visible, true);
assert.equal(control.state().humanId, 'DMO-042');
assert.equal(control.tooltipText(), 'Vérifier le gradient et sa portée.');
const request = await control.requestOpen({ source: 'test' });
assert.equal(request.ok, true);
assert.equal(request.result, 'opened');
assert.equal(opened.descriptor.humanId, 'DMO-042');
assert.equal(opened.attributes['data-test-id'], 'DMO-042');
assert.equal(opened.source, 'test');
control.setMode('advanced');
assert.deepEqual(control.descriptor().configuration, { scope: 'instance' });
assert.throws(() => control.setMode('expert'), (error) => error instanceof InfoTestControlError && error.code === 'INVALID_MODE');

infoTest = false; subscriber?.();
assert.equal(control.isVisible(), false);
assert.equal((await control.requestOpen()).reason, 'hidden');
infoTest = true; subscriber?.();
control.setDisabled(true);
assert.equal((await control.requestOpen()).reason, 'disabled');
control.setDisabled(false);
control.setRef('UNKNOWN');
const unknown = await control.requestOpen();
assert.equal(unknown.ok, false);
assert.equal(unknown.error.code, 'UNKNOWN_DIAGNOSTIC');

function element(tagName) {
  return {
    tagName: String(tagName).toUpperCase(), children: [], attrs: {}, hidden: false, disabled: false, textContent: '',
    append(...nodes) { this.children.push(...nodes); }, setAttribute(name, value) { this.attrs[name] = String(value); },
    addEventListener(name, fn) { this.listeners ??= {}; this.listeners[name] = fn; }, replaceChildren(...nodes) { this.children = [...nodes]; }
  };
}
const documentRef = { createElement: element };
const host = element('div');
const icon = element('svg');
const dom = new InfoTestControl({ ref: 'DMO-042', registry, webmasterMode, documentRef, iconRenderer: ({key,state,document}) => { assert.equal(key,'info'); assert.equal(state,'default'); assert.equal(document,documentRef); return icon; } }).mount(host);
assert.equal(host.hidden, false);
assert.equal(host.children.length, 1);
const button = host.children[0];
assert.equal(button.tagName, 'BUTTON');
assert.equal(button.attrs['data-action'], 'info-test');
assert.equal(button.attrs['data-test-id'], 'DMO-042');
assert.equal(button.attrs['data-technical-id'], 'demo.theme.background.gradient');
assert.equal(button.attrs['aria-haspopup'], 'dialog');
assert.equal(button.attrs['aria-label'], 'Info/Test — DMO-042');
assert.equal(button.attrs.title, 'Vérifier le gradient et sa portée.');
assert.equal(button.children[0].children[0], icon);
infoTest = false; subscriber?.();
assert.equal(host.hidden, true);
assert.equal(host.children.length, 0);
dom.destroy();
assert.equal(subscriber, null);
assert.equal(host.hidden, false);

console.log('info test control tests: ok');
