import assert from 'node:assert/strict';
import { PanelActionRegistry, PANEL_ACTION_OPERATIONS } from '../components/panel-action-registry.js';

assert.deepEqual(PANEL_ACTION_OPERATIONS, ['open', 'close', 'toggle', 'focus']);

const events = [];
const registry = new PanelActionRegistry({ onResult: (result) => events.push(result) });
const panel = {
  state: { open: false },
  open(payload) { this.state.open = true; return { opened: true, payload }; },
  close() { this.state.open = false; return { closed: true }; },
  focus() { return 'focused'; }
};
registry.registerPanel('Inspector.Main', panel);
registry.registerAction({ id: 'info.open', panelId: 'inspector.main', operation: 'open', metadata: { source: 'info-test' } });
registry.registerAction({ id: 'info.toggle', panelId: 'inspector.main', operation: 'toggle' });
registry.registerAction({ id: 'info.close', panelId: 'inspector.main', operation: 'close' });
registry.registerAction({ id: 'info.focus', panelId: 'inspector.main', operation: 'focus' });

assert.equal(registry.getAction('INFO.OPEN').panelId, 'inspector.main');
assert.deepEqual(registry.listActions().map((entry) => entry.id), ['info.close', 'info.focus', 'info.open', 'info.toggle']);
assert.equal((await registry.execute('info.open', { id: 'DMO-042' })).ok, true);
assert.equal(panel.state.open, true);
assert.equal((await registry.execute('info.toggle')).operation, 'toggle');
assert.equal(panel.state.open, false);
assert.equal((await registry.execute('info.toggle')).ok, true);
assert.equal(panel.state.open, true);
assert.equal((await registry.execute('info.focus')).value, 'focused');
assert.equal((await registry.execute('info.close')).ok, true);
assert.equal(panel.state.open, false);

registry.setEnabled('info.open', false);
assert.equal((await registry.execute('info.open')).code, 'ACTION_DISABLED');
registry.setEnabled('info.open', true);
assert.equal((await registry.execute('unknown')).code, 'ACTION_NOT_FOUND');

const setOpenState = { open: false };
registry.registerPanel('settings', {
  state: setOpenState,
  setOpen(value) { setOpenState.open = value; return value; }
});
registry.registerAction({ id: 'settings.open', panelId: 'settings', operation: 'open' });
registry.registerAction({ id: 'settings.toggle', panelId: 'settings', operation: 'toggle' });
assert.equal((await registry.execute('settings.open')).value, true);
assert.equal(setOpenState.open, true);
await registry.execute('settings.toggle');
assert.equal(setOpenState.open, false);

let release;
const asyncPanel = { open: () => new Promise((resolve) => { release = resolve; }) };
registry.registerPanel('async', asyncPanel);
registry.registerAction({ id: 'async.open', panelId: 'async', operation: 'open' });
const a = registry.execute('async.open');
const b = registry.execute('async.open');
assert.equal(a, b);
assert.deepEqual(registry.snapshot().pending, ['async.open']);
await Promise.resolve();
release('done');
assert.equal((await a).value, 'done');
assert.deepEqual(registry.snapshot().pending, []);

const failing = { open() { throw new Error('boom'); } };
registry.registerPanel('failing', failing);
registry.registerAction({ id: 'failing.open', panelId: 'failing', operation: 'open' });
const failure = await registry.execute('failing.open');
assert.equal(failure.ok, false);
assert.equal(failure.code, 'PANEL_ACTION_FAILED');
assert.match(failure.error, /boom/);

registry.registerAction({ id: 'missing.open', panelId: 'missing', operation: 'open' });
assert.equal((await registry.execute('missing.open')).code, 'PANEL_NOT_FOUND');

const noState = { open() {}, close() {} };
registry.registerPanel('nostate', noState);
registry.registerAction({ id: 'nostate.toggle', panelId: 'nostate', operation: 'toggle' });
assert.equal((await registry.execute('nostate.toggle')).code, 'STATE_UNAVAILABLE');

const snapshot = registry.snapshot();
snapshot.actions[0].metadata.pollution = true;
assert.equal(registry.getAction(snapshot.actions[0].id).metadata.pollution, undefined);

assert.throws(() => registry.registerAction({ id: 'bad/id', panelId: 'x' }), /Invalid action id/);
assert.throws(() => registry.registerAction({ id: 'x', panelId: 'x', operation: 'destroy' }), /Unsupported panel operation/);
assert.throws(() => registry.registerPanel('inspector.main', {}), (err) => err.code === 'PANEL_EXISTS');
assert.throws(() => registry.registerAction({ id: 'info.open', panelId: 'x' }), (err) => err.code === 'ACTION_EXISTS');

assert.ok(events.some((entry) => entry.ok === true));
assert.ok(events.some((entry) => entry.ok === false));
console.log('panel action registry tests: ok');
