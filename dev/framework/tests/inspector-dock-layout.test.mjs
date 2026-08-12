import assert from 'node:assert/strict';
import { InspectorDockLayout } from '../components/inspector-dock-layout.js';

assert.deepEqual(InspectorDockLayout.modes(), ['overlay','push']);
assert.deepEqual(InspectorDockLayout.sides(), ['left','right','top','bottom']);

const layout = new InspectorDockLayout();
let plan = layout.plan({ viewportWidth:1024, viewportHeight:768 });
assert.equal(plan.mode, 'overlay');
assert.equal(plan.side, 'right');
assert.equal(plan.size, 360);
assert.equal(plan.panel.right, '0px');
assert.equal(plan.panel.width, '360px');
assert.equal(plan.contentInset.right, 0);

layout.setMode('push').setSide('left').setSize(420).setGap(12);
plan = layout.plan({ viewportWidth:800 });
assert.equal(plan.contentInset.left, 432);
assert.equal(plan.cssVariables['--nlab-inspector-push-left'], '432px');
assert.equal(plan.panel.left, '0px');
assert.equal(plan.panel.right, 'auto');

layout.setSide('top').setSize(80).setGap(-5);
plan = layout.plan({ viewportHeight:500 });
assert.equal(plan.size, 120);
assert.equal(plan.gap, 0);
assert.equal(plan.panel.height, '120px');
assert.equal(plan.contentInset.top, 120);

layout.setSide('bottom').setSize(900);
plan = layout.plan({ viewportHeight:600 });
assert.equal(plan.size, 600);
assert.equal(plan.panel.bottom, '0px');
assert.equal(plan.contentInset.bottom, 600);

const invalid = new InspectorDockLayout({ mode:'weird', side:'center', size:'nope', gap:'nope' });
assert.deepEqual(invalid.snapshot({ viewportWidth:1000 }), {
  mode:'overlay', side:'right', size:360, gap:0,
  contentInset:{top:0,right:0,bottom:0,left:0}
});

const panel = { dataset:{}, style:makeStyle() };
const content = { dataset:{}, style:makeStyle() };
const appliedLayout = new InspectorDockLayout({ mode:'push', side:'right', size:300, gap:10 });
let result = appliedLayout.apply({ panel, content, viewportWidth:900 });
assert.equal(result.applied, true);
assert.equal(panel.dataset.dockMode, 'push');
assert.equal(panel.dataset.dockSide, 'right');
assert.equal(content.dataset.inspectorDockMode, 'push');
assert.equal(panel.style.values.width, '300px');
assert.equal(content.style.values['margin-right'], '310px');
assert.equal(content.style.values['--nlab-inspector-push-right'], '310px');

appliedLayout.setMode('overlay');
result = appliedLayout.apply({ panel, content, viewportWidth:900 });
assert.equal(result.plan.contentInset.right, 0);
assert.equal(content.style.values['margin-right'], undefined);

const noTarget = appliedLayout.apply();
assert.equal(noTarget.applied, false);
assert.equal(noTarget.reason, 'no-target');

function makeStyle() {
  return {
    values:{},
    setProperty(name, value) { this.values[name] = value; },
    removeProperty(name) { delete this.values[name]; }
  };
}

console.log('inspector dock layout tests: ok');
