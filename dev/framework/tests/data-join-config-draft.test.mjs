import assert from 'node:assert/strict';
import {
  DataJoinConfigDraft,
  createDataJoinConfigDraft,
  createDataJoinSpecDraftValidator
} from '../core/data-join-config-draft.js';

class FakeDataJoinSpec {
  constructor(join) {
    this.join = structuredClone(join);
  }
  snapshot() {
    return structuredClone(this.join);
  }
}

const validator = createDataJoinSpecDraftValidator(FakeDataJoinSpec);
const draft = new DataJoinConfigDraft({ validator });

const fresh = draft.snapshot();
assert.equal(fresh.type, 'nlab.data-join-config-draft');
assert.equal(fresh.version, 1);
assert.equal(fresh.status.complete, false);
assert.deepEqual(fresh.status.missing, [
  'keys', 'join', 'cardinality', 'navigation', 'precedence', 'comparison', 'collision'
]);
assert.deepEqual(fresh.join.comparison, {
  trim: true,
  caseSensitive: true,
  coerce: 'none',
  blankAsNull: true,
  nullMatchesNull: false
});
assert.deepEqual(fresh.join.collision, {
  policy: 'nested',
  leftSuffix: '_left',
  rightSuffix: '_right'
});
assert.deepEqual(draft.finalize(), {
  ok: false,
  reason: 'incomplete',
  missing: ['keys', 'join', 'cardinality', 'navigation', 'precedence', 'comparison', 'collision']
});

const proposal = {
  ok: true,
  candidateId: 'composite:abc123',
  kind: 'composite',
  patch: {
    keys: [
      { left: 'customerId', right: 'id', label: '' },
      { left: 'tenantId', right: 'tenantId', label: 'Tenant' }
    ],
    comparison: { coerce: 'string' },
    expectedCardinality: 'N:1'
  },
  evidence: {
    score: 97,
    cardinality: 'N:1',
    coverage: { left: 1, right: 0.98, average: 0.99, minimum: 0.98 },
    warnings: [{ code: 'X' }]
  }
};

const adopted = draft.adoptProposal(proposal);
assert.equal(adopted.status.reviewed.keys, true);
assert.equal(adopted.status.reviewed.comparison, false);
assert.equal(adopted.status.reviewed.cardinality, false);
assert.equal(adopted.join.comparison.coerce, 'string');
assert.equal(adopted.join.expectedCardinality, 'N:1');
assert.equal(adopted.source.candidateId, 'composite:abc123');
assert.equal(adopted.source.evidence.warningCount, 1);
proposal.patch.keys[0].left = 'tampered';
assert.equal(draft.state().keys[0].left, 'customerId');

draft.update('join', 'left');
draft.update('navigation', 'left-to-right');
draft.update('precedence', 'left');
draft.update('collision', { policy: 'suffix', leftSuffix: '_order', rightSuffix: '_customer' });
draft.confirm('cardinality');
draft.confirm('comparison');

const ready = draft.status();
assert.equal(ready.complete, true);
assert.deepEqual(ready.missing, []);

const final = draft.finalize();
assert.equal(final.ok, true);
assert.equal(final.payload.type, 'nlab.data-join-spec');
assert.equal(final.payload.version, 1);
assert.deepEqual(final.payload.join, {
  type: 'left',
  keys: [
    { left: 'customerId', right: 'id', label: '' },
    { left: 'tenantId', right: 'tenantId', label: 'Tenant' }
  ],
  expectedCardinality: 'N:1',
  direction: 'left-to-right',
  precedence: 'left',
  comparison: {
    trim: true,
    caseSensitive: true,
    coerce: 'string',
    blankAsNull: true,
    nullMatchesNull: false
  },
  collision: {
    policy: 'suffix',
    leftSuffix: '_order',
    rightSuffix: '_customer'
  },
  metadata: {}
});
final.payload.join.keys[0].left = 'mutated';
assert.equal(draft.state().keys[0].left, 'customerId');

const oldJoinReviewed = draft.status().reviewed.join;
const second = draft.adoptProposal({
  ok: true,
  candidateId: 'simple:def',
  kind: 'simple',
  patch: {
    keys: [{ left: 'legacyId', right: 'id', label: '' }],
    comparison: { coerce: 'none' }
  }
});
assert.equal(second.status.reviewed.keys, true);
assert.equal(second.status.reviewed.comparison, false);
assert.equal(second.status.reviewed.cardinality, false);
assert.equal(second.status.reviewed.join, oldJoinReviewed);
assert.equal(second.join.expectedCardinality, 'auto');
assert.equal(second.source.candidateId, 'simple:def');
assert.equal(draft.finalize().reason, 'incomplete');

draft.confirm('comparison');
draft.update('cardinality', 'auto');
assert.equal(draft.finalize().ok, true);

const manual = createDataJoinConfigDraft();
manual.update('keys', [{ left: ['nested', 'id'], right: 'id', label: 'ID' }]);
assert.equal(manual.state().keys[0].left, 'nested.id');
assert.equal(manual.state().comparison.coerce, 'none');
assert.equal(manual.state().expectedCardinality, 'auto');
assert.equal(manual.status().reviewed.keys, true);
assert.equal(manual.status().reviewed.comparison, false);
assert.equal(manual.status().reviewed.cardinality, false);
manual.confirm('join');
manual.confirm('cardinality');
manual.confirm('navigation');
manual.confirm('precedence');
manual.update('comparison', {
  trim: false,
  caseSensitive: false,
  coerce: 'number',
  blankAsNull: false,
  nullMatchesNull: true
});
manual.confirm('collision');
assert.equal(manual.finalize().ok, true);

assert.throws(() => manual.update('join', 'INNER'), /invalid/);
assert.throws(() => manual.update('cardinality', 'unknown'), /invalid/);
assert.throws(() => manual.update('navigation', 'left'), /invalid/);
assert.throws(() => manual.update('precedence', 'prefer-left'), /invalid/);
assert.throws(() => manual.update('comparison', { trim: 'false' }), /must be boolean/);
assert.throws(() => manual.update('comparison', { fuzzy: true }), /not supported/);
assert.throws(() => manual.update('collision', { policy: 'merge' }), /invalid/);
assert.throws(() => manual.update('collision', { extra: true }), /not supported/);
assert.throws(() => manual.update('keys', [
  { left: 'id', right: 'id' },
  { left: 'id', right: 'id' }
]), /Duplicate/);
assert.throws(() => manual.update('keys', [{ left: '__proto__.id', right: 'id' }]), /unsafe/);
assert.throws(() => manual.confirm('other'), /Unknown/);

const empty = new DataJoinConfigDraft();
assert.throws(() => empty.confirm('keys'), /before a key mapping exists/);

assert.throws(() => empty.adoptProposal({ ok: false, reason: 'no-selection' }), /failed suggestion/);
assert.throws(() => empty.adoptProposal({
  patch: { keys: [{ left: 'a', right: 'b' }], type: 'left' }
}), /not supported/);
assert.throws(() => empty.adoptProposal({
  patch: { keys: [{ left: 'a', right: 'b' }], comparison: { coerce: 'none', trim: true } }
}), /not supported/);

const metadataDraft = new DataJoinConfigDraft();
metadataDraft.setMetadata({ note: 'ok', nested: { value: 1 } });
const metadata = metadataDraft.state().metadata;
metadata.nested.value = 9;
assert.equal(metadataDraft.state().metadata.nested.value, 1);
const cyclic = {};
cyclic.self = cyclic;
assert.throws(() => metadataDraft.setMetadata(cyclic), /Cyclic/);

const rejecting = new DataJoinConfigDraft({ validator: () => ({ ok: false, code: 'NOPE', message: 'rejected' }) });
rejecting.update('keys', [{ left: 'a', right: 'b' }]);
for (const section of ['join', 'cardinality', 'navigation', 'precedence', 'comparison', 'collision']) rejecting.confirm(section);
assert.deepEqual(rejecting.finalize().validation.code, 'NOPE');

const throwing = new DataJoinConfigDraft({ validator: () => { throw Object.assign(new Error('boom'), { code: 'BOOM' }); } });
throwing.update('keys', [{ left: 'a', right: 'b' }]);
for (const section of ['join', 'cardinality', 'navigation', 'precedence', 'comparison', 'collision']) throwing.confirm(section);
assert.equal(throwing.finalize().validation.code, 'BOOM');

class NormalizingSpec {
  constructor(join) { this.join = { ...structuredClone(join), type: 'inner' }; }
  snapshot() { return structuredClone(this.join); }
}
const mismatchValidator = createDataJoinSpecDraftValidator(NormalizingSpec);
const mismatched = mismatchValidator({
  type: 'nlab.data-join-spec',
  version: 1,
  join: {
    ...manual.state(),
    type: 'left'
  }
});
assert.equal(mismatched.ok, false);
assert.equal(mismatched.code, 'DATA_JOIN_SPEC_NORMALIZATION_MISMATCH');

assert.throws(() => createDataJoinSpecDraftValidator(null), /constructor/);
assert.throws(() => new DataJoinConfigDraft({ validator: true }), /validator must be a function/);

const badValidatorResult = new DataJoinConfigDraft({ validator: () => 'yes' });
badValidatorResult.update('keys', [{ left: 'a', right: 'b' }]);
for (const section of ['join', 'cardinality', 'navigation', 'precedence', 'comparison', 'collision']) badValidatorResult.confirm(section);
assert.equal(badValidatorResult.finalize().validation.code, 'INVALID_VALIDATOR_RESULT');

const serialized = JSON.stringify(draft.snapshot());
assert.equal(serialized.includes('leftRows'), false);
assert.equal(serialized.includes('rightRows'), false);
assert.equal(serialized.includes('DataJoinWorkspace'), false);

const types = ['inner', 'left', 'right', 'full', 'left-semi', 'left-anti', 'right-semi', 'right-anti'];
const cards = ['auto', '1:1', '1:N', 'N:1', 'N:N'];
const dirs = ['none', 'left-to-right', 'right-to-left', 'bidirectional'];
const precs = ['none', 'left', 'right', 'error', 'manual'];
const collisions = ['nested', 'suffix', 'leftWins', 'rightWins', 'error'];
const coercions = ['none', 'string', 'number'];

let seed = 0x6d2b79f5;
function rand() {
  seed |= 0;
  seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function pick(values) { return values[Math.floor(rand() * values.length)]; }

for (let iteration = 0; iteration < 500; iteration += 1) {
  const draft = new DataJoinConfigDraft({ validator: createDataJoinSpecDraftValidator(FakeDataJoinSpec) });
  const keyCount = 1 + Math.floor(rand() * 4);
  const keys = Array.from({ length: keyCount }, (_, index) => ({
    left: `left${iteration}.k${index}`,
    right: `right${iteration}.k${index}`,
    label: `K${index}`
  }));
  const expectedCardinality = pick(cards);
  const coerce = pick(coercions);
  draft.adoptProposal({
    ok: true,
    candidateId: `candidate-${iteration}`,
    kind: keyCount > 1 ? 'composite' : 'simple',
    patch: { keys, comparison: { coerce }, expectedCardinality },
    evidence: { score: Math.floor(rand() * 101), cardinality: expectedCardinality }
  });
  draft.update('join', pick(types));
  draft.update('navigation', pick(dirs));
  draft.update('precedence', pick(precs));
  draft.update('comparison', {
    trim: rand() > 0.5,
    caseSensitive: rand() > 0.5,
    coerce,
    blankAsNull: rand() > 0.5,
    nullMatchesNull: rand() > 0.5
  });
  draft.update('collision', {
    policy: pick(collisions),
    leftSuffix: `_l${iteration}`,
    rightSuffix: `_r${iteration}`
  });
  draft.confirm('cardinality');

  const status = draft.status();
  assert.equal(status.complete, true);
  const final = draft.finalize();
  assert.equal(final.ok, true);
  assert.equal(final.payload.type, 'nlab.data-join-spec');
  assert.equal(final.payload.version, 1);
  assert.equal(final.payload.join.keys.length, keyCount);
  assert.equal(final.payload.join.expectedCardinality, expectedCardinality);
  assert.equal(final.payload.join.comparison.coerce, coerce);
  assert.ok(types.includes(final.payload.join.type));
  assert.ok(dirs.includes(final.payload.join.direction));
  assert.ok(precs.includes(final.payload.join.precedence));
  assert.ok(collisions.includes(final.payload.join.collision.policy));

  const snapshot = draft.snapshot();
  snapshot.join.type = 'tampered';
  assert.notEqual(draft.state().type, 'tampered');
}

console.log('data join config draft tests: ok');
