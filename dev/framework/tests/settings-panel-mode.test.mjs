import assert from 'node:assert/strict';
import { SettingsPanelMode, SETTINGS_PANEL_MODES } from '../core/settings-panel-mode.js';

assert.deepEqual(SETTINGS_PANEL_MODES, ['classic', 'advanced']);
const changes = [];
const model = new SettingsPanelMode({
  items: [
    { id: 'general.title', label: 'Titre', level: 'classic', group: 'general', metadata: { order: 1 } },
    { id: 'general.debug', label: 'Debug', level: 'advanced', group: 'general' },
    { id: 'layout.gap', label: 'Gap', level: 'classic', group: 'layout' },
    { id: 'layout.raw', label: 'Raw', level: 'advanced', group: 'layout', enabled: false }
  ],
  onChange: (state, reason) => changes.push([reason, state.mode])
});

assert.equal(model.descriptor().mode, 'classic');
assert.deepEqual(model.list({ visibleOnly: true }).map((item) => item.id), ['general.title', 'layout.gap']);
assert.equal(model.get('general.debug').effectiveVisible, false);
model.setMode('advanced');
assert.deepEqual(model.list({ visibleOnly: true }).map((item) => item.id), ['general.debug', 'general.title', 'layout.gap', 'layout.raw']);
assert.equal(model.get('layout.raw').enabled, false);
assert.equal(model.descriptor().visibleCount, 4);
assert.equal(model.descriptor().modes.find((item) => item.id === 'advanced').ariaPressed, true);

model.setOverride('general.debug', 'classic', true);
model.setMode('classic');
assert.equal(model.get('general.debug').effectiveVisible, true);
model.setOverride('general.title', 'classic', false);
assert.equal(model.get('general.title').effectiveVisible, false);
model.setOverride('general.title', 'classic', null);
assert.equal(model.get('general.title').effectiveVisible, true);

model.setVisible('layout.gap', false);
model.setMode('advanced');
assert.equal(model.get('layout.gap').effectiveVisible, false);
model.setOverride('layout.gap', 'advanced', true);
assert.equal(model.get('layout.gap').effectiveVisible, false);
model.setVisible('layout.gap', true);
assert.equal(model.get('layout.gap').effectiveVisible, true);

assert.deepEqual(model.list({ group: 'general' }).map((item) => item.id), ['general.debug', 'general.title']);
model.setEnabled('layout.raw', true);
assert.equal(model.get('layout.raw').enabled, true);
const snapshot = model.snapshot();
snapshot.items[0].metadata.polluted = true;
assert.equal(model.get(snapshot.items[0].id).metadata.polluted, undefined);

model.toggle();
assert.equal(model.snapshot().mode, 'classic');
assert.ok(changes.some(([reason]) => reason === 'mode'));

assert.throws(() => model.setMode('expert'), (error) => error.code === 'INVALID_MODE');
assert.throws(() => model.register({ id: 'general.title' }), (error) => error.code === 'ITEM_EXISTS');
assert.throws(() => model.setEnabled('missing', true), (error) => error.code === 'ITEM_NOT_FOUND');
assert.throws(() => model.register({ id: 'bad/id' }), (error) => error.code === 'INVALID_ID');
const cyclic = {}; cyclic.self = cyclic;
assert.throws(() => model.register({ id: 'cycle', metadata: cyclic }), (error) => error.code === 'CYCLE');
assert.equal(model.unregister('general.debug'), true);
assert.equal(model.get('general.debug'), null);

console.log('settings panel mode tests: ok');
