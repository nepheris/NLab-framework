import assert from 'node:assert/strict';
import { clamp } from '../components/layout.js';
import { FloatingPanelState } from '../components/floating-panel.js';
import { ToolbarModel } from '../components/toolbar.js';
import { PaginationModel } from '../components/pagination.js';

assert.equal(clamp(12, 0, 10), 10);

const panel = new FloatingPanelState({ x: 10, y: 10, width: 300, height: 200 });
panel.move(900, 900, { width: 800, height: 600 });
assert.equal(panel.x, 500);
assert.equal(panel.y, 400);
panel.toggleLock().move(0, 0, { width: 800, height: 600 });
assert.equal(panel.x, 500);
panel.toggleLock().resize(100, 100, { width: 800, height: 600 });
assert.equal(panel.width, 280);
assert.equal(panel.height, 180);

const toolbar = new ToolbarModel([
  { id: 'a', priority: 20 },
  { id: 'b', priority: 10 },
  { id: 'c', priority: 30 }
], { favorites: ['c'], maxVisible: 2 });
const split = toolbar.split();
assert.deepEqual(split.visible.map((item) => item.id), ['c', 'b']);
assert.deepEqual(split.overflow.map((item) => item.id), ['a']);

const pagination = new PaginationModel({ page: 2, pageSize: 10, total: 35 });
assert.equal(pagination.pageCount, 4);
assert.equal(pagination.offset, 10);
assert.deepEqual(pagination.slice(Array.from({ length: 35 }, (_, i) => i)).slice(0, 2), [10, 11]);
pagination.setPageSize(20);
assert.equal(pagination.page, 1);

console.log('ui primitives tests: ok');
