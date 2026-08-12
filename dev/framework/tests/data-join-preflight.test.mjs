import assert from 'node:assert/strict';
import { DataJoinSpec } from '../core/data-join-spec.js';
import { DataJoinExecutor } from '../core/data-join-executor.js';
import { DataJoinPreflight } from '../core/data-join-preflight.js';

function spec(overrides = {}) {
  return new DataJoinSpec({
    type: 'inner',
    keys: [{ left: 'id', right: 'id' }],
    expectedCardinality: 'auto',
    direction: 'none',
    precedence: 'none',
    comparison: { trim: true, caseSensitive: true, coerce: 'none', blankAsNull: true, nullMatchesNull: false },
    collision: { policy: 'nested', leftSuffix: '_left', rightSuffix: '_right' },
    ...overrides,
    comparison: { trim: true, caseSensitive: true, coerce: 'none', blankAsNull: true, nullMatchesNull: false, ...(overrides.comparison ?? {}) },
    collision: { policy: 'nested', leftSuffix: '_left', rightSuffix: '_right', ...(overrides.collision ?? {}) }
  });
}

const preflight = new DataJoinPreflight();
const left = [{ id: 1, name: 'A', value: 10 }, { id: 2, name: 'B', value: 20 }];
const right = [{ id: 1, name: 'Alpha', extra: true }, { id: 2, name: 'Beta', extra: false }];

{
  const result = preflight.assess(left, right, spec());
  assert.equal(result.gate, 'ready');
  assert.equal(result.ready, true);
  assert.deepEqual(result.fields.overlap, ['id', 'name']);
  assert.ok(result.messages.some((item) => item.code === 'FIELD_OVERLAP_ISOLATED_BY_NESTING'));
  assert.equal(preflight.explain(result).blockers.length, 0);
}

{
  const result = preflight.assess(left, right, spec({ collision: { policy: 'error' } }));
  assert.equal(result.gate, 'blocked');
  assert.ok(result.messages.some((item) => item.code === 'JOIN_FIELD_COLLISION' && item.level === 'error'));
}

{
  const suffixLeft = [{ id: 1, id_left: 'already-here' }];
  const suffixRight = [{ id: 1 }];
  const result = preflight.assess(suffixLeft, suffixRight, spec({ collision: { policy: 'suffix', leftSuffix: '_left', rightSuffix: '_right' } }));
  assert.equal(result.gate, 'blocked');
  const collision = result.messages.find((item) => item.code === 'JOIN_OUTPUT_KEY_COLLISION');
  assert.ok(collision);
  assert.ok(collision.details.duplicates.some((entry) => entry.targetField === 'id_left'));
}

{
  const result = preflight.assess(left, right, spec({ collision: { policy: 'leftWins' } }));
  assert.equal(result.gate, 'warning');
  assert.ok(result.messages.some((item) => item.code === 'RIGHT_FIELDS_OVERWRITTEN'));
}

{
  const result = preflight.assess([{ id: 1, a: 1 }], [{ id: 1, b: 2 }], spec({ collision: { policy: 'error' } }));
  assert.equal(result.gate, 'blocked'); // id is still a top-level collision
  const noOverlap = preflight.assess([{ key: 1, a: 1 }], [{ other: 1, b: 2 }], new DataJoinSpec({
    type: 'inner', keys: [{ left: 'key', right: 'other' }], collision: { policy: 'error' }
  }));
  assert.equal(noOverlap.gate, 'ready');
}

{
  const result = preflight.assess(left, right, spec({ type: 'left-semi', collision: { policy: 'error' } }));
  assert.equal(result.gate, 'ready');
  assert.equal(result.materialization.applicable, false);
  assert.ok(result.messages.some((item) => item.code === 'COLLISION_POLICY_NOT_APPLICABLE'));
}


{
  const coercing = spec({ collision: { policy: 'error' }, comparison: { coerce: 'number' } });
  const result = preflight.assess([{ id: ' 1 ', shared: 'L' }], [{ id: 1, shared: 'R' }], coercing);
  assert.equal(result.gate, 'blocked');
  assert.ok(result.messages.some((item) => item.code === 'JOIN_FIELD_COLLISION'));
}

{
  const insensitive = spec({ collision: { policy: 'error' }, comparison: { caseSensitive: false } });
  const result = preflight.assess([{ id: 'ABC', shared: 'L' }], [{ id: 'abc', shared: 'R' }], insensitive);
  assert.equal(result.gate, 'blocked');
  assert.ok(result.messages.some((item) => item.code === 'JOIN_FIELD_COLLISION'));
}

{
  const result = preflight.assess([{ id: 1, shared: 'L' }], [{ id: 2, shared: 'R' }], spec({ collision: { policy: 'error' } }));
  assert.equal(result.gate, 'ready');
  assert.deepEqual(result.materialization.actualOverlap, []);
}

{
  const result = preflight.assess(
    [{ id: 1 }, { id: 1 }],
    [{ id: 1 }, { id: 1 }],
    spec({ expectedCardinality: '1:1' })
  );
  assert.equal(result.gate, 'blocked');
  assert.ok(result.messages.some((item) => item.code === 'CARDINALITY_MISMATCH'));
}

{
  const result = preflight.assess(
    [{ id: 1 }, { id: 1 }, { id: 1 }],
    [{ id: 1 }, { id: 1 }, { id: 1 }],
    spec(),
    { maxOutputRows: 5 }
  );
  assert.equal(result.rows.estimatedOutput, 9);
  assert.equal(result.gate, 'blocked');
  assert.ok(result.messages.some((item) => item.code === 'OUTPUT_LIMIT_EXCEEDED'));
}

{
  const poisoned = Object.create(null);
  poisoned.id = 1;
  Object.defineProperty(poisoned, '__proto__', { value: 'x', enumerable: true });
  const result = preflight.assess([poisoned], [{ id: 1 }], spec());
  assert.equal(result.gate, 'blocked');
  assert.ok(result.messages.some((item) => item.code === 'UNSAFE_JOIN_ROW_KEY'));
}

{
  const cyclic = { id: 1 };
  cyclic.self = cyclic;
  const result = preflight.assess([cyclic], [{ id: 1 }], spec());
  assert.equal(result.gate, 'blocked');
  assert.ok(result.messages.some((item) => item.code === 'CYCLIC_JOIN_ROW'));
}

{
  const result = preflight.assess([{ id: 1, x: Infinity }], [{ id: 1 }], spec());
  assert.equal(result.gate, 'blocked');
  assert.ok(result.messages.some((item) => item.code === 'NON_FINITE_JOIN_ROW'));
}

{
  const original = preflight.assess(left, right, spec({ collision: { policy: 'leftWins' } }));
  original.messages[0].code = 'MUTATED';
  original.fields.left.push('evil');
  const fresh = preflight.assess(left, right, spec({ collision: { policy: 'leftWins' } }));
  assert.ok(!fresh.fields.left.includes('evil'));
  assert.ok(!fresh.messages.some((item) => item.code === 'MUTATED'));
}

{
  assert.throws(() => new DataJoinPreflight({ maxOutputRows: 0 }), /positive finite/);
  assert.throws(() => preflight.assess({}, [], spec()), /inputs must be arrays/);
  assert.throws(() => preflight.explain({}), /requires a DataJoinPreflight result/);
}


{
  const result = preflight.assess(
    [{ id: 1, a: 1 }, { id: 1, b: 1 }],
    [{ id: 1, c: 1 }, { id: 1, d: 1 }],
    spec({ collision: { policy: 'suffix' } }),
    { maxShapePairs: 1 }
  );
  assert.equal(result.gate, 'blocked');
  assert.equal(result.materialization.shapePairScanComplete, false);
  assert.ok(result.messages.some((item) => item.code === 'SHAPE_PAIR_SCAN_LIMIT_EXCEEDED'));
}

// Fuzz: whenever the preflight sees no blocking materialization issue, executor must not
// fail with a collision/materialization/output-key error for the same shallow row shapes.
{
  const executor = new DataJoinExecutor({ maxOutputRows: 10000 });
  const policies = ['nested', 'suffix', 'leftWins', 'rightWins', 'error'];
  const names = ['id', 'name', 'value', 'code', 'id_left', 'id_right', 'shared', 'x'];
  let seed = 0x6d2b79f5;
  const random = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (array) => array[Math.floor(random() * array.length)];
  const row = (id) => {
    const out = { id };
    const count = 1 + Math.floor(random() * 4);
    for (let index = 0; index < count; index += 1) out[pick(names)] = Math.floor(random() * 100);
    out.id = id;
    return out;
  };

  for (let iteration = 0; iteration < 500; iteration += 1) {
    const leftRows = [row(1), row(2)];
    const rightRows = [row(1), row(2)];
    const policy = pick(policies);
    const leftSuffix = pick(['_left', '_l', '']);
    const rightSuffix = pick(['_right', '_r', '']);
    const join = spec({ collision: { policy, leftSuffix, rightSuffix } });
    const result = preflight.assess(leftRows, rightRows, join, { maxOutputRows: 10000 });
    const blockingCodes = new Set(result.messages.filter((item) => item.level === 'error').map((item) => item.code));
    let thrown = null;
    try { executor.execute(leftRows, rightRows, join, { maxOutputRows: 10000 }); }
    catch (error) { thrown = error; }
    if (thrown && ['JOIN_FIELD_COLLISION', 'JOIN_OUTPUT_KEY_COLLISION', 'UNSAFE_JOIN_OUTPUT_KEY', 'UNSAFE_JOIN_ROW_KEY', 'NON_FINITE_JOIN_ROW', 'CYCLIC_JOIN_ROW', 'UNSUPPORTED_JOIN_ROW_VALUE'].includes(thrown.code)) {
      assert.ok(blockingCodes.has(thrown.code) || (thrown.code === 'JOIN_OUTPUT_KEY_COLLISION' && blockingCodes.has('JOIN_OUTPUT_KEY_COLLISION')), `preflight missed executor error ${thrown.code}`);
    }
  }
}

console.log('data join preflight tests: ok');
