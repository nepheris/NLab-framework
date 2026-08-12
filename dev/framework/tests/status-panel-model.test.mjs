import assert from 'node:assert/strict';
import { StatusPanelModel, STATUS_PANEL_LEVELS } from '../components/status-panel-model.js';

assert.deepEqual(STATUS_PANEL_LEVELS, ['info', 'success', 'warning', 'error', 'dev']);
const changes = [];
const actions = [];
const model = new StatusPanelModel({
  maxHistory: 2,
  onChange: (state, reason) => changes.push([reason, state.revision]),
  onAction: async ({ action, payload, status }) => {
    actions.push([action.id, payload, status.level]);
    if (action.id === 'fail') throw new Error('boom');
    return 'done';
  }
});

const first = model.info('Chargement terminé', {
  title: 'Info', code: 'LOAD_OK', details: { rows: 3 },
  actions: [{ id: 'open.log', label: 'Voir le log', metadata: { target: 'log' } }]
});
assert.equal(first.entry.revision, 1);
assert.equal(model.snapshot().open, true);
assert.equal(model.descriptor().aria.role, 'status');
assert.equal(model.descriptor().iconKey, 'info');

model.success('Validé');
model.warning('Attention');
model.error('Erreur', { actions: [{ id: 'retry', label: 'Réessayer' }, { id: 'fail', label: 'Fail' }] });
assert.equal(model.snapshot().revision, 4);
assert.equal(model.snapshot().history.length, 2);
assert.equal(model.descriptor().aria.role, 'alert');
assert.equal(model.descriptor().aria.live, 'assertive');

assert.deepEqual(await model.executeAction('retry', { force: true }), { ok: true, actionId: 'retry', value: 'done' });
assert.deepEqual(actions[0], ['retry', { force: true }, 'error']);
model.setActionEnabled('retry', false);
assert.equal((await model.executeAction('retry')).code, 'ACTION_DISABLED');
assert.equal((await model.executeAction('unknown')).code, 'ACTION_NOT_FOUND');
assert.equal((await model.executeAction('fail')).code, 'ACTION_FAILED');

const snap = model.snapshot();
snap.current.details = { polluted: true };
snap.current.actions[0].metadata.polluted = true;
assert.notDeepEqual(model.snapshot().current.details, { polluted: true });
assert.equal(model.snapshot().current.actions[0].metadata.polluted, undefined);

model.close();
assert.equal(model.snapshot().open, false);
assert.equal(model.reopen().ok, true);
const restored = model.restorePrevious();
assert.equal(restored.ok, true);
assert.equal(restored.entry.level, 'warning');
assert.equal(restored.entry.revision, 5);

model.clear();
assert.equal(model.snapshot().current, null);
assert.equal(model.reopen().code, 'NO_STATUS');
assert.equal(model.restorePrevious().ok, true);
model.clear({ history: true });
assert.equal(model.restorePrevious().code, 'HISTORY_EMPTY');

const noHandler = new StatusPanelModel();
noHandler.show({ level: 'danger', message: 'x', actions: [{ id: 'a' }] });
assert.equal(noHandler.snapshot().current.level, 'error');
assert.equal((await noHandler.executeAction('a')).code, 'ACTION_HANDLER_MISSING');

assert.throws(() => model.show({ level: 'nope', message: 'x' }), (err) => err.code === 'INVALID_LEVEL');
assert.throws(() => model.show({ message: 'x', actions: [{ id: 'same' }, { id: 'same' }] }), (err) => err.code === 'DUPLICATE_ACTION');
const cyclic = {}; cyclic.self = cyclic;
assert.throws(() => model.show({ message: 'x', details: cyclic }), (err) => err.code === 'CYCLE');
assert.ok(changes.some(([reason]) => reason === 'show'));
console.log('status panel model tests: ok');
