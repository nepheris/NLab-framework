import assert from 'node:assert/strict';
import {
  DataJoinSuggestionSession,
  createDataJoinSuggestionSession
} from '../core/data-join-suggestion-session.js';

function simple(left, right, score, extra = {}) {
  return {
    score,
    left: { specPath: left, pointer: `/${left}`, name: left.split('.').at(-1), type: extra.leftType ?? 'string' },
    right: { specPath: right, pointer: `/${right}`, name: right.split('.').at(-1), type: extra.rightType ?? 'string' },
    comparisonHint: { coerce: extra.coerce ?? 'none' },
    expectedCardinality: extra.cardinality ?? 'N:1',
    reasons: [{ code: 'NAME_RELATION', weight: 40, message: 'related names' }],
    warnings: extra.warnings ?? []
  };
}

function composite(keys, score, extra = {}) {
  return {
    score,
    keys: keys.map(([left, right]) => ({ left, right, label: '' })),
    comparisonHint: { coerce: extra.coerce ?? 'none' },
    observedCardinality: extra.cardinality ?? 'N:1',
    coverage: extra.coverage ?? { left: 1, right: 1, average: 1, minimum: 1 },
    reasons: [{ code: 'ROW_COVERAGE', weight: 35, message: 'full coverage' }],
    warnings: extra.warnings ?? [],
    components: keys.map(([left, right], index) => ({
      score: 90 - index,
      left: { specPath: left, name: left },
      right: { specPath: right, name: right }
    }))
  };
}

class StubMatcher {
  constructor(result) { this.result = result; this.calls = []; }
  match(...args) {
    this.calls.push(args);
    if (this.result instanceof Error) throw this.result;
    return structuredClone(this.result);
  }
}

const simpleMatcher = new StubMatcher({
  candidates: [
    simple('customerId', 'id', 91),
    simple('tenantId', 'tenantId', 84)
  ],
  warnings: [{ code: 'SAMPLED_PROFILE', level: 'info', message: 'sampled' }]
});

const compositeMatcher = new StubMatcher({
  candidates: [
    composite([['customerId', 'id'], ['tenantId', 'tenantId']], 97)
  ],
  warnings: []
});

const leftRows = [{ customerId: '1', tenantId: 'A' }];
const rightRows = [{ id: '1', tenantId: 'A' }];
const leftCatalog = { fields: [] };
const rightCatalog = { fields: [] };

const session = new DataJoinSuggestionSession({ simpleMatcher, compositeMatcher, maxSuggestions: 10 });
const first = session.refresh({ leftRows, rightRows, leftCatalog, rightCatalog, context: { leftSource: 'orders' } });
assert.equal(first.type, 'nlab.data-join-suggestion-session');
assert.equal(first.version, 1);
assert.equal(first.status.candidateCount, 3);
assert.equal(first.status.hasSelection, false);
assert.equal(first.status.selectionState, 'none');
assert.equal(first.candidates[0].kind, 'composite');
assert.equal(first.candidates[0].score, 97);
assert.equal(first.candidates[0].rank, 1);
assert.equal(first.warnings[0].code, 'SAMPLED_PROFILE');
assert.equal(simpleMatcher.calls.length, 1);
assert.equal(compositeMatcher.calls.length, 1);
assert.strictEqual(compositeMatcher.calls[0][0], leftRows);
assert.strictEqual(compositeMatcher.calls[0][1], rightRows);

const firstId = first.candidates[0].id;
assert.match(firstId, /^composite:[0-9a-f]{16}/);
assert.equal(session.selected(), null);
assert.deepEqual(session.proposal(), { ok: false, reason: 'no-selection' });

const selected = session.select(firstId);
assert.equal(selected.ok, true);
assert.equal(session.status().selectionState, 'selected');
selected.candidate.keys[0].left = 'mutated';
assert.notEqual(session.selected().keys[0].left, 'mutated');

const proposal = session.proposal();
assert.equal(proposal.ok, true);
assert.deepEqual(proposal.patch, {
  keys: [
    { left: 'customerId', right: 'id', label: '' },
    { left: 'tenantId', right: 'tenantId', label: '' }
  ],
  comparison: { coerce: 'none' }
});
assert.equal('type' in proposal.patch, false);
assert.equal('collision' in proposal.patch, false);
assert.equal('expectedCardinality' in proposal.patch, false);
assert.equal(session.proposal({ cardinalityPolicy: 'auto' }).patch.expectedCardinality, 'auto');
assert.equal(session.proposal({ cardinalityPolicy: 'candidate' }).patch.expectedCardinality, 'N:1');

const changedScoreSimple = new StubMatcher({
  candidates: [simple('customerId', 'id', 70), simple('tenantId', 'tenantId', 60)],
  warnings: []
});
const changedScoreComposite = new StubMatcher({
  candidates: [composite([['tenantId', 'tenantId'], ['customerId', 'id']], 80)],
  warnings: []
});
session.simpleMatcher = changedScoreSimple;
session.compositeMatcher = changedScoreComposite;
const refreshed = session.refresh({ leftRows, rightRows, leftCatalog, rightCatalog });
assert.equal(refreshed.status.selectionPreserved, undefined);
assert.equal(refreshed.status.lastRefresh.selectionPreserved, true);
assert.equal(refreshed.status.hasSelection, true);
assert.equal(refreshed.selectedId, firstId);
assert.equal(session.selected().score, 80);

session.compositeMatcher = new StubMatcher({ candidates: [], warnings: [] });
const invalidated = session.refresh({ leftRows, rightRows, leftCatalog, rightCatalog });
assert.equal(invalidated.status.hasSelection, false);
assert.equal(invalidated.status.selectionState, 'invalidated');
assert.equal(invalidated.status.lastRefresh.selectionInvalidated, true);
assert.equal(session.selected(), null);

assert.deepEqual(session.select('missing'), { ok: false, reason: 'unknown-candidate', id: 'missing' });
assert.equal(session.clearSelection().cleared, false);
assert.equal(session.status().selectionState, 'none');

const duplicateMatcher = new StubMatcher({
  candidates: [
    simple('customerId', 'id', 80),
    simple('customerId', 'id', 95),
    simple('otherId', 'id', 50)
  ],
  warnings: []
});
const dedupe = new DataJoinSuggestionSession({ simpleMatcher: duplicateMatcher, maxSuggestions: 1 });
const deduped = dedupe.refresh({ leftCatalog, rightCatalog });
assert.equal(deduped.status.candidateCount, 1);
assert.equal(deduped.candidates[0].score, 95);
assert.equal(deduped.status.lastRefresh.uniqueCandidates, 2);
assert.equal(deduped.status.lastRefresh.retainedCandidates, 1);

const stableA = new DataJoinSuggestionSession({
  simpleMatcher: new StubMatcher({ candidates: [simple('a', 'b', 90, { coerce: 'string' })], warnings: [] })
});
const stableB = new DataJoinSuggestionSession({
  simpleMatcher: new StubMatcher({ candidates: [simple('a', 'b', 10, { coerce: 'string', cardinality: '1:1' })], warnings: [] })
});
const idA = stableA.refresh({ leftCatalog, rightCatalog }).candidates[0].id;
const idB = stableB.refresh({ leftCatalog, rightCatalog }).candidates[0].id;
assert.equal(idA, idB);

const noComposite = createDataJoinSuggestionSession({
  simpleMatcher: new StubMatcher({ candidates: [simple('a', 'b', 80)], warnings: [] })
});
assert.equal(noComposite.refresh({ leftCatalog, rightCatalog }).status.candidateCount, 1);

const atomic = new DataJoinSuggestionSession({
  simpleMatcher: new StubMatcher({ candidates: [simple('a', 'b', 80)], warnings: [] })
});
atomic.refresh({ leftCatalog, rightCatalog });
const beforeAtomic = atomic.snapshot();
atomic.simpleMatcher = new StubMatcher({ candidates: [{ ...simple('a', 'b', 80), score: Infinity }], warnings: [] });
assert.throws(() => atomic.refresh({ leftCatalog, rightCatalog }), /score/);
assert.deepEqual(atomic.snapshot(), beforeAtomic);

const needsRows = new DataJoinSuggestionSession({
  compositeMatcher: new StubMatcher({ candidates: [], warnings: [] })
});
assert.throws(() => needsRows.refresh({ leftCatalog, rightCatalog }), /leftRows and rightRows/);

assert.throws(() => new DataJoinSuggestionSession(), /At least one matcher/);
assert.throws(() => new DataJoinSuggestionSession({ simpleMatcher, maxSuggestions: 0 }), /maxSuggestions/);
stableA.select(idA);
assert.throws(() => stableA.proposal({ cardinalityPolicy: 'strict' }), /cardinalityPolicy/);

// Snapshot/list are defensive and contain no runtime source rows.
const defensive = new DataJoinSuggestionSession({
  simpleMatcher: new StubMatcher({ candidates: [simple('customerId', 'id', 90)], warnings: [] })
});
const snap = defensive.refresh({ leftCatalog, rightCatalog });
snap.candidates[0].keys[0].left = 'tampered';
assert.equal(defensive.list()[0].keys[0].left, 'customerId');
const serialized = JSON.stringify(defensive.snapshot());
assert.equal(serialized.includes('leftRows'), false);
assert.equal(serialized.includes('rightRows'), false);

console.log('data join suggestion session tests: ok');
