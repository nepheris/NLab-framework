import assert from 'node:assert/strict';
import { DataWizProvenance, DATA_WIZ_PROVENANCE_TYPE, DATA_WIZ_PROVENANCE_VERSION } from '../wiz/data-wiz-provenance.js';

const base = {
  source: { id: 'sales', label: 'Ventes', kind: 'collection', rows: 120, metadata: { file: 'sales.json' } },
  variables: [
    { field: 'region', label: 'Région', role: 'dimension', dataType: 'string' },
    { field: 'amount', label: 'Montant', role: 'measure', dataType: 'number' },
    { field: 'region', label: 'Duplicate ignored', role: 'unknown' }
  ],
  measure: { operation: 'sum', field: 'amount', label: 'Total', options: { ignoreNull: true } },
  result: { kind: 'table', rows: 4, fields: ['region', 'amount', 'region'], metadata: { grouped: true } }
};

const model = new DataWizProvenance(base);
const snapshot = model.snapshot();
assert.equal(snapshot.source.id, 'sales');
assert.equal(snapshot.source.rows, 120);
assert.equal(snapshot.variables.length, 2);
assert.deepEqual(snapshot.result.fields, ['region', 'amount']);
assert.equal(snapshot.measure.operation, 'sum');

base.source.metadata.file = 'mutated.json';
base.variables[0].label = 'Mutated';
assert.equal(model.snapshot().source.metadata.file, 'sales.json');
assert.equal(model.snapshot().variables[0].label, 'Région');

snapshot.source.label = 'Modified snapshot';
assert.equal(model.snapshot().source.label, 'Ventes');

const explanation = model.explain();
assert.match(explanation.source.text, /Ventes/);
assert.match(explanation.source.text, /120 lignes/);
assert.equal(explanation.variables[0].text, 'Région [dimension/string]');
assert.equal(explanation.measure.text, 'sum(amount)');
assert.match(explanation.result.text, /4 lignes/);

const serialized = model.serialize();
const parsed = DataWizProvenance.parse(serialized);
assert.deepEqual(parsed.toJSON(), model.toJSON());
assert.equal(parsed.toJSON().type, DATA_WIZ_PROVENANCE_TYPE);
assert.equal(parsed.toJSON().version, DATA_WIZ_PROVENANCE_VERSION);

model.setResult({ kind: 'scalar', rows: 1, value: 0, fields: ['total'] });
assert.equal(model.snapshot().result.value, 0);
assert.equal(model.snapshot().result.rows, 1);

model.setMeasure(null);
assert.equal(model.snapshot().measure, null);
model.reset();
assert.equal(model.snapshot().measure.operation, 'sum');

const beforeInvalid = model.snapshot();
assert.throws(
  () => model.update({ measure: { operation: 'mean' } }),
  (error) => error instanceof TypeError && /requires a field/.test(error.message)
);
assert.deepEqual(model.snapshot(), beforeInvalid, 'invalid updates are atomic');

const defaults = new DataWizProvenance().snapshot();
assert.equal(defaults.source.kind, 'unknown');
assert.deepEqual(defaults.variables, []);
assert.equal(defaults.measure, null);
assert.equal(defaults.result.kind, 'unknown');

const unknowns = new DataWizProvenance({
  source: { kind: 'strange' },
  variables: [{ field: 'x', role: 'strange', dataType: 'strange' }],
  measure: { operation: 'strange' },
  result: { kind: 'strange' }
}).snapshot();
assert.equal(unknowns.source.kind, 'unknown');
assert.equal(unknowns.variables[0].role, 'unknown');
assert.equal(unknowns.variables[0].dataType, 'unknown');
assert.equal(unknowns.measure.operation, 'none');
assert.equal(unknowns.result.kind, 'unknown');

const unsafe = JSON.parse('{"source":{"metadata":{"__proto__":{"polluted":true}}}}');
assert.throws(
  () => new DataWizProvenance(unsafe),
  (error) => error?.code === 'UNSAFE_PROVENANCE_KEY'
);
assert.equal({}.polluted, undefined);

const cyclic = {};
cyclic.self = cyclic;
assert.throws(
  () => new DataWizProvenance({ source: { metadata: cyclic } }),
  (error) => error?.code === 'CYCLIC_PROVENANCE_VALUE'
);

assert.throws(
  () => new DataWizProvenance({ result: { value: Number.POSITIVE_INFINITY } }),
  (error) => error?.code === 'NON_FINITE_PROVENANCE_VALUE'
);

console.log('data wiz provenance tests: ok');
