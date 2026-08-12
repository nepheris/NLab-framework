import assert from 'node:assert/strict';
import { DataJoinSpec, DATA_JOIN_SPEC_TYPE, DATA_JOIN_SPEC_VERSION } from '../core/data-join-spec.js';

const spec = new DataJoinSpec({
  type: 'left',
  keys: [{ left: 'customer.id', right: 'customerId', label: 'Customer' }],
  expectedCardinality: '1:N',
  direction: 'left-to-right',
  precedence: 'left',
  comparison: { trim: true, caseSensitive: false, coerce: 'string' },
  collision: { policy: 'suffix', leftSuffix: '_a', rightSuffix: '_b' },
  metadata: { source: 'test' }
});

assert.equal(spec.snapshot().type, 'left');
assert.deepEqual(spec.explain().keys, ['customer.id = customerId']);
assert.equal(spec.explain().navigation, 'left-to-right');

const left = [
  { customer: { id: ' A ' }, amount: 10 },
  { customer: { id: 'B' }, amount: 20 },
  { customer: { id: null }, amount: 30 },
  { customer: { id: 'C' }, amount: 40 }
];
const right = [
  { customerId: 'a', tag: 'x' },
  { customerId: 'A', tag: 'y' },
  { customerId: 'b', tag: 'z' },
  { customerId: 'D', tag: 'q' }
];

const diagnosis = spec.diagnose(left, right);
assert.equal(diagnosis.observedCardinality, '1:N');
assert.equal(diagnosis.keys.matched, 2);
assert.deepEqual(diagnosis.keys.matchedRows, { left: 2, right: 3 });
assert.deepEqual(diagnosis.keys.unmatchedRows, { left: 2, right: 1 });
assert.equal(diagnosis.rows.estimatedOutput, 5);
assert.equal(diagnosis.rejected.left.missing, 1);
assert.equal(diagnosis.duplicates.right.length, 1);
assert.ok(diagnosis.warnings.some((entry) => entry.code === 'LEFT_KEYS_REJECTED'));
assert.ok(diagnosis.warnings.some((entry) => entry.code === 'RIGHT_KEY_DUPLICATES'));
assert.ok(!diagnosis.warnings.some((entry) => entry.code === 'CARDINALITY_MISMATCH'));

const many = new DataJoinSpec({
  type: 'inner',
  keys: [{ left: 'id', right: 'id' }],
  expectedCardinality: '1:1'
}).diagnose([{ id: 1 }, { id: 1 }], [{ id: 1 }, { id: 1 }, { id: 1 }]);
assert.equal(many.observedCardinality, 'N:N');
assert.equal(many.rows.estimatedOutput, 6);
assert.ok(many.warnings.some((entry) => entry.code === 'MANY_TO_MANY'));
assert.ok(many.warnings.some((entry) => entry.code === 'CARDINALITY_MISMATCH' && entry.level === 'error'));

const composite = new DataJoinSpec({
  type: 'full',
  keys: [
    { left: 'country', right: 'country' },
    { left: 'code', right: 'code' }
  ],
  comparison: { coerce: 'string', caseSensitive: false }
}).diagnose(
  [{ country: 'FR', code: 1 }, { country: 'BE', code: 2 }],
  [{ country: 'fr', code: '1' }, { country: 'CH', code: 3 }]
);
assert.equal(composite.observedCardinality, '1:1');
assert.equal(composite.rows.estimatedOutput, 3);
assert.deepEqual(composite.keys.unmatchedRows, { left: 1, right: 1 });

const semi = new DataJoinSpec({ type: 'left-semi', keys: [{ left: 'id', right: 'id' }] });
assert.equal(semi.diagnose([{ id: 1 }, { id: 2 }], [{ id: 2 }, { id: 2 }]).rows.estimatedOutput, 1);
const anti = new DataJoinSpec({ type: 'left-anti', keys: [{ left: 'id', right: 'id' }] });
assert.equal(anti.diagnose([{ id: 1 }, { id: 2 }], [{ id: 2 }]).rows.estimatedOutput, 1);

const nullsDefault = new DataJoinSpec({ keys: [{ left: 'id', right: 'id' }] }).diagnose([{ id: null }], [{ id: null }]);
assert.equal(nullsDefault.keys.matched, 0);
const nullsMatch = new DataJoinSpec({ keys: [{ left: 'id', right: 'id' }], comparison: { nullMatchesNull: true } }).diagnose([{ id: null }], [{ id: null }]);
assert.equal(nullsMatch.keys.matched, 1);

const numeric = new DataJoinSpec({ keys: [{ left: 'id', right: 'id' }], comparison: { coerce: 'number' } }).diagnose(
  [{ id: '001' }, { id: 'not-a-number' }],
  [{ id: 1 }]
);
assert.equal(numeric.keys.matched, 1);
assert.equal(numeric.rejected.left['non-numeric'], 1);

const source = { keys: [{ left: 'id', right: 'id' }], metadata: { nested: { x: 1 } } };
const isolated = new DataJoinSpec(source);
source.metadata.nested.x = 2;
assert.equal(isolated.snapshot().metadata.nested.x, 1);
const snapshot = isolated.snapshot();
snapshot.metadata.nested.x = 3;
assert.equal(isolated.snapshot().metadata.nested.x, 1);

const serialized = spec.serialize();
const parsed = DataJoinSpec.parse(serialized);
assert.deepEqual(parsed.toJSON(), spec.toJSON());
assert.equal(parsed.toJSON().type, DATA_JOIN_SPEC_TYPE);
assert.equal(parsed.toJSON().version, DATA_JOIN_SPEC_VERSION);

const beforeInvalid = spec.snapshot();
assert.throws(() => spec.update({ keys: [] }), /at least one key/);
assert.deepEqual(spec.snapshot(), beforeInvalid, 'invalid update is atomic');

assert.throws(
  () => new DataJoinSpec({ keys: [{ left: '__proto__.x', right: 'id' }] }),
  (error) => error?.code === 'UNSAFE_JOIN_PATH'
);
const unsafe = JSON.parse('{"keys":[{"left":"id","right":"id"}],"metadata":{"__proto__":{"polluted":true}}}');
assert.throws(() => new DataJoinSpec(unsafe), (error) => error?.code === 'UNSAFE_JOIN_KEY');
assert.equal({}.polluted, undefined);

console.log('data join spec tests: ok');
