import assert from 'node:assert/strict';
import { DataJoinSpec } from '../core/data-join-spec.js';
import { DataJoinExecutor, executeDataJoin } from '../core/data-join-executor.js';

const left = [
  { id: 1, name: 'Alpha', shared: 'L1' },
  { id: 2, name: 'Beta', shared: 'L2' },
  { id: 3, name: 'Gamma', shared: 'L3' }
];
const right = [
  { parentId: 1, value: 'x', shared: 'R1' },
  { parentId: 1, value: 'y', shared: 'R2' },
  { parentId: 4, value: 'z', shared: 'R4' }
];

function join(type = 'inner', patch = {}) {
  return new DataJoinSpec({
    type,
    keys: [{ left: 'id', right: 'parentId' }],
    ...patch
  });
}

let result = executeDataJoin(left, right, join('inner'));
assert.equal(result.rows.length, 2);
assert.deepEqual(result.rows[0], { left: left[0], right: right[0] });
assert.deepEqual(result.provenance[1], { leftIndex: 0, rightIndex: 1, kind: 'matched' });
assert.equal(result.execution.matchedPairs, 2);
assert.equal(result.execution.observedCardinality, '1:N');
result.rows[0].left.name = 'Changed';
assert.equal(left[0].name, 'Alpha');

result = executeDataJoin(left, right, join('left'));
assert.equal(result.rows.length, 4);
assert.deepEqual(result.provenance.map((entry) => entry.kind), ['matched', 'matched', 'unmatched-left', 'unmatched-left']);

result = executeDataJoin(left, right, join('right'));
assert.equal(result.rows.length, 3);
assert.equal(result.provenance.at(-1).kind, 'unmatched-right');

result = executeDataJoin(left, right, join('full'));
assert.equal(result.rows.length, 5);

result = executeDataJoin(left, right, join('left-semi'));
assert.deepEqual(result.rows, [left[0]]);
result = executeDataJoin(left, right, join('left-anti'));
assert.deepEqual(result.rows, [left[1], left[2]]);
result = executeDataJoin(left, right, join('right-semi'));
assert.deepEqual(result.rows, [right[0], right[1]]);
result = executeDataJoin(left, right, join('right-anti'));
assert.deepEqual(result.rows, [right[2]]);

result = executeDataJoin(left, right, join('inner', {
  collision: { policy: 'suffix', leftSuffix: '_L', rightSuffix: '_R' }
}));
assert.deepEqual(result.rows[0], {
  id: 1, name: 'Alpha', shared_L: 'L1', parentId: 1, value: 'x', shared_R: 'R1'
});

result = executeDataJoin(left, right, join('inner', { collision: { policy: 'leftWins' } }));
assert.equal(result.rows[0].shared, 'L1');
result = executeDataJoin(left, right, join('inner', { collision: { policy: 'rightWins' } }));
assert.equal(result.rows[0].shared, 'R1');
assert.throws(
  () => executeDataJoin(left, right, join('inner', { collision: { policy: 'error' } })),
  (error) => error.code === 'JOIN_FIELD_COLLISION'
);

const numericLeft = [{ id: '01' }, { id: '2' }];
const numericRight = [{ parentId: 1 }, { parentId: 2 }];
result = executeDataJoin(numericLeft, numericRight, join('inner', {
  comparison: { coerce: 'number' }
}));
assert.equal(result.rows.length, 2);

const nullLeft = [{ id: null }, { id: 1 }];
const nullRight = [{ parentId: null }, { parentId: 1 }];
result = executeDataJoin(nullLeft, nullRight, join('inner', {
  comparison: { nullMatchesNull: true }
}));
assert.equal(result.rows.length, 2);

const strictMismatch = join('inner', { expectedCardinality: '1:1' });
assert.throws(
  () => executeDataJoin(left, right, strictMismatch, { strictCardinality: true }),
  (error) => error.code === 'CARDINALITY_MISMATCH'
);
assert.doesNotThrow(() => executeDataJoin(left, right, join('inner', { expectedCardinality: '1:N' }), { strictCardinality: true }));
assert.throws(
  () => executeDataJoin(left, right, strictMismatch.snapshot(), { strictCardinality: true }),
  (error) => error.code === 'CARDINALITY_MISMATCH'
);

const limited = new DataJoinExecutor({ maxOutputRows: 1 });
assert.throws(() => limited.execute(left, right, join('inner')), (error) => error.code === 'OUTPUT_LIMIT_EXCEEDED');

assert.throws(
  () => executeDataJoin(left, right, {
    ...join('inner').snapshot(),
    keys: [{ left: '__proto__.id', right: 'parentId' }]
  }),
  (error) => error.code === 'UNSAFE_JOIN_PATH'
);

const originalLeft = structuredClone(left);
const originalRight = structuredClone(right);
executeDataJoin(left, right, join('full'));
assert.deepEqual(left, originalLeft);
assert.deepEqual(right, originalRight);

console.log('data join executor tests: ok');
