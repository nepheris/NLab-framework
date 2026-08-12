import assert from 'node:assert/strict';
import {
  DataJoinCompositeKeyMatcher,
  createDataJoinSpecCandidateEvaluator,
  matchDataJoinCompositeKeys
} from '../core/data-join-composite-key-matcher.js';

function getPath(row, path) {
  return path.split('.').reduce((value, part) => value?.[part], row);
}

function normalized(value, coerce) {
  if (value === null || value === undefined || value === '') return null;
  if (coerce === 'string') return String(value).trim();
  if (coerce === 'number') {
    const number = Number(String(value).trim());
    return Number.isFinite(number) ? number : null;
  }
  return value;
}

class FakeDataJoinSpec {
  static lastConfig = null;
  constructor(config) {
    FakeDataJoinSpec.lastConfig = structuredClone(config);
    this.config = config;
  }
  diagnose(leftRows, rightRows) {
    const coerce = this.config.comparison.coerce;
    const encode = (row, side) => {
      const values = this.config.keys.map((key) => normalized(getPath(row, key[side]), coerce));
      return values.some((value) => value === null) ? null : JSON.stringify(values);
    };
    const index = (rows, side) => {
      const groups = new Map();
      let rejected = 0;
      rows.forEach((row) => {
        const key = encode(row, side);
        if (key === null) { rejected += 1; return; }
        groups.set(key, (groups.get(key) ?? 0) + 1);
      });
      return { groups, rejected };
    };
    const left = index(leftRows, 'left');
    const right = index(rightRows, 'right');
    let matchedLeft = 0;
    let matchedRight = 0;
    let matchedGroups = 0;
    const matched = [];
    for (const [key, l] of left.groups) {
      const r = right.groups.get(key);
      if (!r) continue;
      matchedLeft += l;
      matchedRight += r;
      matchedGroups += 1;
      matched.push({ left: l, right: r });
    }
    const manyLeft = matched.some((group) => group.left > 1);
    const manyRight = matched.some((group) => group.right > 1);
    const observed = !matched.length ? 'unknown' : manyLeft && manyRight ? 'N:N' : manyLeft ? 'N:1' : manyRight ? '1:N' : '1:1';
    const duplicates = (groups) => [...groups].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
    return {
      joinType: 'inner',
      observedCardinality: observed,
      rows: { left: leftRows.length, right: rightRows.length, estimatedOutput: matched.reduce((sum, group) => sum + group.left * group.right, 0) },
      keys: {
        matched: matchedGroups,
        matchedRows: { left: matchedLeft, right: matchedRight },
        unmatchedRows: { left: leftRows.length - matchedLeft, right: rightRows.length - matchedRight }
      },
      rejected: { left: { missing: left.rejected }, right: { missing: right.rejected } },
      duplicates: { left: duplicates(left.groups), right: duplicates(right.groups) },
      warnings: observed === 'N:N' ? [{ code: 'MANY_TO_MANY', level: 'warning', message: 'Many-to-many join detected' }] : []
    };
  }
}

function field(specPath, type = 'string') {
  return { specPath, pointer: `/${specPath}`, name: specPath.split('.').at(-1), type, types: [type] };
}

function candidate(left, right, score, { coerce = 'none', type = 'string', rightType = type } = {}) {
  return {
    score,
    left: field(left, type),
    right: field(right, rightType),
    comparisonHint: { coerce },
    expectedCardinality: 'unknown',
    warnings: []
  };
}

class StubKeyMatcher {
  constructor(candidates, warnings = []) { this.candidates = candidates; this.warnings = warnings; }
  match() { return { candidates: structuredClone(this.candidates), warnings: structuredClone(this.warnings) }; }
}

const leftRows = [
  { tenantId: 'A', customerId: '1', orderId: 'a1' },
  { tenantId: 'A', customerId: '1', orderId: 'a2' },
  { tenantId: 'B', customerId: '1', orderId: 'b1' },
  { tenantId: 'B', customerId: '2', orderId: 'b2' }
];
const rightRows = [
  { tenantId: 'A', id: '1', name: 'Ada' },
  { tenantId: 'B', id: '1', name: 'Bob' },
  { tenantId: 'B', id: '2', name: 'Bea' }
];

const evaluator = createDataJoinSpecCandidateEvaluator(FakeDataJoinSpec);
const matcher = new DataJoinCompositeKeyMatcher({
  keyMatcher: new StubKeyMatcher([
    candidate('customerId', 'id', 92),
    candidate('tenantId', 'tenantId', 88),
    candidate('orderId', 'id', 45)
  ]),
  evaluator,
  minScore: 0,
  maxComponents: 3
});

const result = matcher.match(leftRows, rightRows, { fields: [] }, { fields: [] }, {});
assert.ok(result.candidates.length >= 1);
const best = result.candidates[0];
assert.deepEqual(best.keys, [
  { left: 'customerId', right: 'id', label: '' },
  { left: 'tenantId', right: 'tenantId', label: '' }
]);
assert.equal(best.observedCardinality, 'N:1');
assert.equal(best.coverage.left, 1);
assert.equal(best.coverage.right, 1);
assert.equal(best.comparisonHint.coerce, 'none');
assert.ok(best.reasons.some((reason) => reason.code === 'OBSERVED_CARDINALITY'));
assert.equal(FakeDataJoinSpec.lastConfig.type, 'inner');
assert.equal(FakeDataJoinSpec.lastConfig.expectedCardinality, 'auto');
assert.equal(FakeDataJoinSpec.lastConfig.collision.policy, 'nested');

const reuse = new DataJoinCompositeKeyMatcher({
  keyMatcher: new StubKeyMatcher([
    candidate('customerId', 'id', 90),
    candidate('customerId', 'legacyId', 89),
    candidate('tenantId', 'tenantId', 80)
  ]),
  evaluator,
  minScore: 0,
  maxComponents: 3
}).match(leftRows, rightRows, { fields: [] }, { fields: [] });
assert.ok(reuse.candidates.every((entry) => new Set(entry.keys.map((key) => key.left)).size === entry.keys.length));
assert.ok(reuse.candidates.every((entry) => new Set(entry.keys.map((key) => key.right)).size === entry.keys.length));

const coercionConflict = new DataJoinCompositeKeyMatcher({
  keyMatcher: new StubKeyMatcher([
    candidate('a', 'a', 90, { coerce: 'number', type: 'string', rightType: 'number' }),
    candidate('b', 'b', 90, { coerce: 'string', type: 'number', rightType: 'string' })
  ]),
  evaluator,
  minScore: 0
}).match([{ a: '1', b: 2 }], [{ a: 1, b: '2' }], { fields: [] }, { fields: [] });
assert.equal(coercionConflict.candidates.length, 0);
assert.equal(coercionConflict.considered.incompatibleCoercion, 1);
assert.ok(coercionConflict.warnings.some((warning) => warning.code === 'INCOMPATIBLE_COMPOSITE_COERCION'));

const numericCompatible = new DataJoinCompositeKeyMatcher({
  keyMatcher: new StubKeyMatcher([
    candidate('a', 'a', 90, { coerce: 'number', type: 'string', rightType: 'number' }),
    candidate('n', 'n', 80, { coerce: 'none', type: 'number', rightType: 'number' })
  ]),
  evaluator,
  minScore: 0
}).match([{ a: '1', n: 7 }], [{ a: 1, n: 7 }], { fields: [] }, { fields: [] });
assert.equal(numericCompatible.candidates[0].comparisonHint.coerce, 'number');

const numericUnsafe = new DataJoinCompositeKeyMatcher({
  keyMatcher: new StubKeyMatcher([
    candidate('a', 'a', 90, { coerce: 'number', type: 'string', rightType: 'number' }),
    candidate('name', 'name', 80, { coerce: 'none', type: 'string', rightType: 'string' })
  ]),
  evaluator,
  minScore: 0
}).match([{ a: '1', name: 'x' }], [{ a: 1, name: 'x' }], { fields: [] }, { fields: [] });
assert.equal(numericUnsafe.candidates.length, 0);
assert.equal(numericUnsafe.considered.incompatibleCoercion, 1);

const manySeeds = Array.from({ length: 8 }, (_, i) => candidate(`l${i}`, `r${i}`, 100 - i));
const capped = new DataJoinCompositeKeyMatcher({
  keyMatcher: new StubKeyMatcher(manySeeds),
  evaluator: () => ({
    observedCardinality: '1:1', rows: { left: 1, right: 1, estimatedOutput: 1 },
    keys: { matchedRows: { left: 1, right: 1 }, unmatchedRows: { left: 0, right: 0 } },
    rejected: { left: {}, right: {} }, duplicates: { left: [], right: [] }, warnings: []
  }),
  minScore: 0,
  maxCombinations: 3,
  maxEvaluations: 100,
  maxComponents: 4
}).match([{}], [{}], { fields: [] }, { fields: [] });
assert.equal(capped.considered.combinationLimitReached, true);
assert.ok(capped.warnings.some((warning) => warning.code === 'COMBINATION_LIMIT_REACHED'));

const simpleSeeds = [candidate('x', 'x', 70), candidate('y', 'y', 69), candidate('z', 'z', 68)];
const beforeSeeds = structuredClone(simpleSeeds);
const beforeLeft = structuredClone(leftRows);
const deterministicMatcher = new DataJoinCompositeKeyMatcher({ keyMatcher: new StubKeyMatcher(simpleSeeds), evaluator, minScore: 0 });
const first = deterministicMatcher.match(leftRows, rightRows, { fields: [] }, { fields: [] });
const second = deterministicMatcher.match(leftRows, rightRows, { fields: [] }, { fields: [] });
assert.deepEqual(first, second);
assert.deepEqual(simpleSeeds, beforeSeeds);
assert.deepEqual(leftRows, beforeLeft);

const convenience = matchDataJoinCompositeKeys([{}], [{}], { fields: [] }, { fields: [] }, {}, {
  keyMatcher: new StubKeyMatcher([candidate('a', 'a', 90), candidate('b', 'b', 80)]),
  evaluator: () => ({
    observedCardinality: '1:1', rows: { left: 1, right: 1 },
    keys: { matchedRows: { left: 1, right: 1 }, unmatchedRows: { left: 0, right: 0 } },
    rejected: { left: {}, right: {} }, duplicates: { left: [], right: [] }, warnings: []
  }),
  minScore: 0
});
assert.equal(convenience.candidates.length, 1);

assert.throws(() => new DataJoinCompositeKeyMatcher({ evaluator }), /keyMatcher\.match/);
assert.throws(() => new DataJoinCompositeKeyMatcher({ keyMatcher: new StubKeyMatcher([]) }), /evaluator callback/);
assert.throws(() => new DataJoinCompositeKeyMatcher({ keyMatcher: new StubKeyMatcher([]), evaluator, minComponents: 4, maxComponents: 2 }), /maxComponents/);
assert.throws(() => createDataJoinSpecCandidateEvaluator(null), /constructor/);

console.log('data join composite key matcher tests: ok');
