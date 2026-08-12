import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  findLockConflicts,
  globToRegExp,
  isOccupiedLock,
  loadLocks,
  lockPairConflicts,
  scopePatternsOverlap
} from '../tools/coordination/check-lock-overlaps.mjs';

assert.equal(scopePatternsOverlap('dev/framework/core/data-source.js', 'dev/framework/core/data-source.js'), true);
assert.equal(scopePatternsOverlap('dev/framework/core/data-source.js', 'dev/framework/core/data-provider.js'), false);
assert.equal(scopePatternsOverlap('dev/framework/tests/*.mjs', 'dev/framework/tests/data-source.test.mjs'), true);
assert.equal(scopePatternsOverlap('dev/framework/tests/data-*.mjs', 'dev/framework/tests/data-source.test.mjs'), true);
assert.equal(scopePatternsOverlap('dev/framework/tests/a*.mjs', 'dev/framework/tests/b*.mjs'), false);
assert.equal(scopePatternsOverlap('dev/framework/**/data-*.js', 'dev/framework/core/data-source.js'), true);
assert.equal(scopePatternsOverlap('', 'x'), false);
assert.equal(globToRegExp('a/*.js').test('a/b.js'), true);
assert.equal(globToRegExp('a/*.js').test('a/x/b.js'), false);
assert.equal(globToRegExp('a/**/b.js').test('a/x/y/b.js'), true);

for (const status of ['reserved', 'in_progress', 'blocked', 'review']) {
  assert.equal(isOccupiedLock({ task_id: 'x', status }), true);
}
for (const status of ['done', 'released', null]) {
  assert.equal(isOccupiedLock({ task_id: 'x', status }), false);
}

const a = {
  task_id: '8B-DATA-SOURCE-ROBUSTNESS',
  agent: 'B',
  status: 'reserved',
  file_scope: [
    'dev/framework/core/data-source.js',
    'dev/framework/tests/data-source*.mjs'
  ]
};
const c = {
  task_id: '8B-DATA-SOURCE-CONTRACT',
  agent: 'C',
  status: 'reserved',
  file_scope: [
    'dev/framework/core/data-source.js',
    'dev/framework/tests/data-source-contract.test.mjs'
  ]
};
const overlaps = lockPairConflicts(a, c);
assert.equal(overlaps.length, 2);
assert.ok(overlaps.some((item) => item.leftScope === 'dev/framework/core/data-source.js'));

const globalConflicts = findLockConflicts([
  a,
  c,
  { task_id: 'DONE', agent: 'A', status: 'done', file_scope: ['dev/framework/core/data-source.js'] },
  { task_id: 'OTHER', agent: 'A', status: 'in_progress', file_scope: ['dev/framework/demo/*.js'] }
]);
assert.equal(globalConflicts.length, 1);
assert.equal(globalConflicts[0].left.task_id, a.task_id);
assert.equal(globalConflicts[0].right.task_id, c.task_id);

const candidateConflicts = findLockConflicts([a], { candidate: c });
assert.equal(candidateConflicts.length, 1);
assert.equal(candidateConflicts[0].right.agent, 'B');

assert.deepEqual(findLockConflicts([
  { ...a, status: 'released' },
  c
]), []);

assert.deepEqual(findLockConflicts([a], { candidate: { ...a } }), []);

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'nlab-locks-'));
try {
  await fs.writeFile(path.join(temp, 'a.json'), JSON.stringify(a));
  await fs.writeFile(path.join(temp, 'c.json'), JSON.stringify(c));
  await fs.writeFile(path.join(temp, 'ignore.txt'), 'not json');
  const loaded = await loadLocks(temp);
  assert.equal(loaded.errors.length, 0);
  assert.equal(loaded.locks.length, 2);
  assert.equal(findLockConflicts(loaded.locks).length, 1);

  await fs.writeFile(path.join(temp, 'broken.json'), '{broken');
  const broken = await loadLocks(temp);
  assert.equal(broken.errors.length, 1);
  assert.match(broken.errors[0].file, /broken\.json$/);
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}

console.log('Coordination lock overlap tests: OK');
