import assert from 'node:assert/strict';
import { DataWizDatasetProfile } from '../wiz/data-wiz-dataset-profile.js';

const rows = [
  { id: 1, name: 'Alice', category: 'A', price: 12.5, quantity: '2', active: true, createdAt: '2026-01-02T10:00:00Z', customer: { city: 'Paris' } },
  { id: 2, name: 'Bob', category: 'B', price: 20, quantity: '3', active: false, createdAt: '2026-01-03T11:30:00Z', customer: { city: 'Lyon' } },
  { id: 3, name: 'Cara', category: 'A', price: 7.5, quantity: '4', active: true, createdAt: '2026-01-04T12:00:00Z', customer: { city: 'Paris' } }
];

{
  const profile = DataWizDatasetProfile.fromRows(rows);
  const snapshot = profile.snapshot();
  assert.equal(snapshot.dataset.rows, 3);
  assert.equal(snapshot.dataset.complete, true);
  assert.ok(snapshot.fieldCount >= 8);

  assert.equal(profile.field('id').role, 'identifier');
  assert.equal(profile.field('id').dataType, 'integer');
  assert.equal(profile.field('name').role, 'label');
  assert.equal(profile.field('category').role, 'dimension');
  assert.equal(profile.field('price').role, 'measure');
  assert.equal(profile.field('price').dataType, 'number');
  assert.equal(profile.field('quantity').dataType, 'integer');
  assert.ok(profile.field('quantity').warnings.includes('NUMERIC_COERCION_USED'));
  assert.equal(profile.field('active').dataType, 'boolean');
  assert.equal(profile.field('createdAt').dataType, 'datetime');
  assert.equal(profile.field('createdAt').role, 'time');
  assert.equal(profile.field('customer.city').pointer, '/customer/city');

  const facts = profile.facts();
  assert.ok(facts.numeric.some((field) => field.path === 'price'));
  assert.ok(facts.temporal.some((field) => field.path === 'createdAt'));
  assert.ok(facts.categorical.some((field) => field.path === 'category'));

  const variables = profile.toProvenanceVariables();
  assert.ok(variables.some((variable) => variable.field === 'price' && variable.role === 'measure'));
  assert.ok(variables.some((variable) => variable.field === 'createdAt' && variable.dataType === 'datetime'));
}

{
  const profile = DataWizDatasetProfile.fromRows([
    { 'a.b': 1, a: { b: 2 } },
    { 'a.b': 3, a: { b: 4 } }
  ]);
  const flat = profile.field('/a.b');
  const nested = profile.field('/a/b');
  assert.equal(flat.addressable, false);
  assert.equal(flat.specPath, null);
  assert.equal(nested.addressable, true);
  assert.equal(nested.specPath, 'a.b');
  assert.ok(profile.snapshot().warnings.some((entry) => entry.code === 'UNADDRESSABLE_FIELD_PATH'));
  assert.ok(!profile.toProvenanceVariables().some((variable) => variable.metadata.pointer === '/a.b'));
  assert.ok(profile.toProvenanceVariables({ includeUnaddressable: true }).some((variable) => variable.field === '/a.b'));
}

{
  const sampled = DataWizDatasetProfile.fromRows(Array.from({ length: 20 }, (_, index) => ({ id: index, value: index * 2 })), { maxRows: 5 });
  assert.equal(sampled.snapshot().dataset.rows, 20);
  assert.equal(sampled.snapshot().dataset.sampledRows, 5);
  assert.equal(sampled.snapshot().dataset.complete, false);
  assert.ok(sampled.snapshot().warnings.some((entry) => entry.code === 'ROW_SAMPLE_LIMIT_REACHED'));
}

{
  const profile = DataWizDatasetProfile.fromRows([{ id: 1 }, null, 'x', 42]);
  assert.equal(profile.snapshot().dataset.invalidRows, 3);
  assert.ok(profile.snapshot().warnings.some((entry) => entry.code === 'NON_OBJECT_ROWS_IGNORED'));
}

{
  const root = { id: 1 };
  root.self = root;
  const profile = DataWizDatasetProfile.fromRows([root]);
  assert.ok(profile.snapshot().warnings.some((entry) => entry.code === 'CYCLIC_OBJECT_SKIPPED'));
}

{
  const poisoned = Object.create(null);
  poisoned.safe = 1;
  Object.defineProperty(poisoned, '__proto__', { enumerable: true, value: 2 });
  const profile = DataWizDatasetProfile.fromRows([poisoned]);
  assert.equal(profile.field('safe').dataType, 'integer');
  assert.equal(profile.field('/__proto__'), null);
  assert.ok(profile.snapshot().warnings.some((entry) => entry.code === 'UNSAFE_FIELD_SKIPPED'));
}

{
  const profile = DataWizDatasetProfile.fromRows([
    { code_id: 'A' },
    { code_id: 'A' },
    { code_id: 'B' }
  ]);
  assert.ok(profile.field('code_id').warnings.includes('IDENTIFIER_NOT_UNIQUE'));
}

{
  const profile = DataWizDatasetProfile.fromRows([
    { mixed: 1, maybeDate: '2026-01-01' },
    { mixed: 'x', maybeDate: 'not-a-date' }
  ]);
  assert.equal(profile.field('mixed').dataType, 'mixed');
  assert.ok(profile.field('mixed').warnings.includes('MIXED_TYPES'));
  assert.equal(profile.field('maybeDate').dataType, 'string');
  assert.ok(profile.field('maybeDate').warnings.includes('PARTIAL_TEMPORAL_VALUES'));
}

{
  const profile = DataWizDatasetProfile.fromRows(rows);
  const serialized = profile.serialize();
  const parsed = DataWizDatasetProfile.parse(serialized);
  assert.deepEqual(parsed.snapshot(), profile.snapshot());
  const first = parsed.snapshot();
  first.fields[0].label = 'mutated';
  assert.notEqual(parsed.snapshot().fields[0].label, 'mutated');
  assert.throws(() => DataWizDatasetProfile.parse('{bad'), (error) => error.code === 'INVALID_PROFILE_JSON');
  assert.throws(() => DataWizDatasetProfile.parse({ type: 'wrong', version: 1, profile: {} }), (error) => error.code === 'INVALID_PROFILE_TYPE');
}

{
  assert.throws(() => DataWizDatasetProfile.fromRows({}, {}), (error) => error.code === 'INVALID_PROFILE_INPUT');
  assert.throws(() => DataWizDatasetProfile.fromRows([], { maxRows: 0 }), (error) => error.code === 'INVALID_PROFILE_LIMIT');
}

// Determinism / bounded fuzz: the same rows and options must produce identical serialization,
// finite cardinalities and provenance-compatible enums.
{
  let seed = 0x12345678;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const categories = ['A', 'B', 'C', 'D'];
  const generated = Array.from({ length: 300 }, (_, index) => ({
    id: index + 1,
    category: categories[Math.floor(random() * categories.length)],
    value: Math.round(random() * 10000) / 100,
    amount: String(Math.floor(random() * 500)),
    active: random() > 0.5,
    date: `2026-01-${String(1 + (index % 28)).padStart(2, '0')}`
  }));
  const a = DataWizDatasetProfile.fromRows(generated, { maxRows: 200 });
  const b = DataWizDatasetProfile.fromRows(generated, { maxRows: 200 });
  assert.equal(a.serialize(), b.serialize());
  for (const field of a.snapshot().fields) {
    assert.ok(Number.isFinite(field.cardinality));
    assert.ok(field.cardinality >= 0 && field.cardinality <= 1);
    assert.ok(['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'array', 'object', 'mixed', 'unknown'].includes(field.dataType));
    assert.ok(['identifier', 'dimension', 'measure', 'time', 'label', 'unknown'].includes(field.role));
  }
  assert.ok(a.snapshot().warnings.some((entry) => entry.code === 'ROW_SAMPLE_LIMIT_REACHED'));
}

console.log('data wiz dataset profile tests: ok');
