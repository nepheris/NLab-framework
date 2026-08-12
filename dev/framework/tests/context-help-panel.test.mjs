import assert from 'node:assert/strict';
import {
  ContextHelpPanel,
  CONTEXT_HELP_PANEL_SIDES,
  CONTEXT_HELP_PANEL_EXPERIENCES
} from '../help/context-help-panel.js';

assert.deepEqual(CONTEXT_HELP_PANEL_SIDES, ['left', 'right']);
assert.deepEqual(CONTEXT_HELP_PANEL_EXPERIENCES, ['visitor', 'webmaster']);

const help = {
  content(id, { experience }) {
    if (!['theme', 'qr', 'table'].includes(id)) return null;
    return {
      id,
      title: id.toUpperCase(),
      short: `${id} short`,
      long: `${id} long`,
      technical: experience === 'webmaster' ? { file: `${id}.js` } : null
    };
  }
};
const changes = [];
const panel = new ContextHelpPanel({ help, width: 9999, onChange: (state, reason) => changes.push([reason, state.activeId]) });
assert.equal(panel.snapshot().width, 720);
assert.equal(panel.open('missing').code, 'HELP_NOT_FOUND');
const opened = panel.open('theme');
assert.equal(opened.ok, true);
assert.equal(panel.snapshot().open, true);
assert.equal(panel.current().technical, null);
assert.equal(panel.descriptor().aria.role, 'complementary');
assert.equal(panel.descriptor().width, 720);

panel.setExperience('webmaster');
assert.deepEqual(panel.current().technical, { file: 'theme.js' });
panel.setSide('left');
panel.setWidth(100);
assert.equal(panel.snapshot().width, 240);
panel.toggleCollapsed();
assert.equal(panel.snapshot().collapsed, true);
assert.equal(panel.descriptor().width, 48);
panel.toggleCollapsed();

panel.open('qr');
panel.open('table');
assert.deepEqual(panel.snapshot().history.ids, ['theme', 'qr', 'table']);
assert.equal(panel.back().content.id, 'qr');
assert.equal(panel.back().content.id, 'theme');
assert.equal(panel.back().code, 'HISTORY_START');
assert.equal(panel.forward().content.id, 'qr');
panel.open('theme');
assert.deepEqual(panel.snapshot().history.ids, ['theme', 'qr', 'theme']);
assert.equal(panel.snapshot().history.canForward, false);

const inline = panel.open({ id: 'inline', title: 'Inline', short: 'S', long: 'L', metadata: { b: 2, a: 1 } });
assert.equal(inline.content.id, 'inline');
assert.equal(panel.current().title, 'Inline');
const desc = panel.descriptor();
desc.content.metadata.polluted = true;
assert.equal(panel.current().metadata.polluted, undefined);

panel.close();
assert.equal(panel.snapshot().open, false);
assert.equal(panel.reopen().ok, true);
panel.clearHistory({ keepCurrent: true });
assert.deepEqual(panel.snapshot().history.ids, ['inline']);
panel.clearHistory();
assert.equal(panel.snapshot().activeId, null);
assert.equal(panel.snapshot().open, false);
assert.equal(panel.reopen().code, 'NO_HELP');

const capped = new ContextHelpPanel({ help, maxHistory: 2 });
capped.open('theme'); capped.open('qr'); capped.open('table');
assert.deepEqual(capped.snapshot().history.ids, ['qr', 'table']);

assert.throws(() => panel.setSide('top'), (err) => err.code === 'INVALID_SIDE');
assert.throws(() => panel.setExperience('expert'), (err) => err.code === 'INVALID_EXPERIENCE');
const cyclic = { id: 'cyclic' }; cyclic.self = cyclic;
assert.throws(() => panel.open(cyclic), (err) => err.code === 'CYCLE');
assert.ok(changes.some(([reason]) => reason === 'open'));
console.log('context help panel tests: ok');
