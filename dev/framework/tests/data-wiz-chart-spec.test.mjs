import assert from 'node:assert/strict';
import { DataWizDatasetProfile } from '../wiz/data-wiz-dataset-profile.js';
import { DataWizChartSpec } from '../wiz/data-wiz-chart-spec.js';

const rows = [
  { id: 1, category: 'A', price: 12.5, quantity: '2', createdAt: '2026-01-02T10:00:00Z' },
  { id: 2, category: 'B', price: 20, quantity: '3', createdAt: '2026-01-03T11:30:00Z' },
  { id: 3, category: 'A', price: 7.5, quantity: '4', createdAt: '2026-01-04T12:00:00Z' }
];
const profile = DataWizDatasetProfile.fromRows(rows);

function chart(overrides = {}) {
  return new DataWizChartSpec({
    id: 'chart-1',
    mark: 'line',
    source: { id: 'sales', kind: 'dataset' },
    encodings: {
      x: { field: 'createdAt', type: 'temporal' },
      y: { field: 'price', type: 'quantitative', aggregate: 'mean' }
    },
    presentation: { title: 'Price over time' },
    ...overrides
  });
}

{
  const spec = chart();
  const validation = spec.validate(profile);
  assert.equal(validation.gate, 'ready');
  assert.equal(validation.valid, true);
  assert.equal(spec.explain(profile).mark, 'line');
  const parsed = DataWizChartSpec.parse(spec.serialize());
  assert.deepEqual(parsed.snapshot(), spec.snapshot());
}

{
  const spec = new DataWizChartSpec({
    mark: 'scatter',
    encodings: {
      x: { field: 'price', type: 'quantitative' },
      y: { field: 'quantity', type: 'quantitative' },
      color: { field: 'category', type: 'nominal' }
    }
  });
  assert.equal(spec.validate(profile).gate, 'ready');
}

{
  const spec = new DataWizChartSpec({ mark: 'bar', encodings: {
    x: { field: 'category', type: 'nominal' },
    y: { aggregate: 'count', type: 'quantitative' }
  }});
  assert.equal(spec.validate(profile).gate, 'ready');
}

{
  const spec = new DataWizChartSpec({ mark: 'histogram', encodings: { x: { field: 'price', type: 'quantitative', bin: { maxBins: 20 } } } });
  assert.equal(spec.validate(profile).gate, 'ready');
  const noBin = new DataWizChartSpec({ mark: 'histogram', encodings: { x: { field: 'price', type: 'quantitative' } } });
  assert.equal(noBin.validate(profile).gate, 'blocked');
  assert.ok(noBin.validate(profile).messages.some((entry) => entry.code === 'HISTOGRAM_BIN_REQUIRED'));
}

{
  const wrong = new DataWizChartSpec({ mark: 'bar', encodings: { x: { field: 'category', type: 'quantitative' } } });
  const validation = wrong.validate(profile);
  assert.equal(validation.gate, 'blocked');
  assert.ok(validation.messages.some((entry) => entry.code === 'QUANTITATIVE_FIELD_MISMATCH'));
}

{
  const missing = new DataWizChartSpec({ mark: 'bar', encodings: { x: { field: 'does.not.exist', type: 'nominal' } } });
  assert.ok(missing.validate(profile).messages.some((entry) => entry.code === 'CHART_FIELD_NOT_FOUND'));
}

{
  const identifier = new DataWizChartSpec({ mark: 'bar', encodings: { x: { field: 'id', type: 'nominal' }, y: { aggregate: 'count' } } });
  const validation = identifier.validate(profile);
  assert.equal(validation.gate, 'warning');
  assert.ok(validation.messages.some((entry) => entry.code === 'IDENTIFIER_ENCODING'));
}

{
  const spec = chart();
  const before = spec.snapshot();
  assert.throws(() => spec.update({ mark: 'Plotly.Trace' }), (error) => error.code === 'INVALID_CHART_ENUM');
  assert.deepEqual(spec.snapshot(), before);
  assert.throws(() => spec.update({ trace: [] }), (error) => error.code === 'UNKNOWN_CHART_KEY');
}

{
  const spec = chart();
  spec.setEncoding('color', { field: 'category', type: 'nominal' });
  assert.equal(spec.snapshot().encodings.color.field, 'category');
  spec.removeEncoding('color');
  assert.equal(spec.snapshot().encodings.color, undefined);
  spec.removeEncoding('x');
  assert.equal(spec.snapshot().encodings.x, undefined);
  assert.equal(spec.validate(profile).gate, 'blocked');
  assert.throws(() => spec.removeEncoding('y'), (error) => error.code === 'EMPTY_CHART_ENCODINGS');
}

{
  const radar = new DataWizChartSpec({ mark: 'radar', encodings: {
    theta: { field: 'category', type: 'nominal' },
    radius: { field: 'price', type: 'quantitative' }
  }, presentation: { orientation: 'horizontal' } });
  const validation = radar.validate(profile);
  assert.equal(validation.gate, 'ready');
  assert.ok(validation.messages.some((entry) => entry.code === 'ORIENTATION_NOT_APPLICABLE'));
}

{
  const sampledProfile = DataWizDatasetProfile.fromRows(Array.from({ length: 20 }, (_, index) => ({ x: index, y: index * 2 })), { maxRows: 5 });
  const spec = new DataWizChartSpec({ mark: 'scatter', encodings: { x: { field: 'x' }, y: { field: 'y' } } });
  const validation = spec.validate(sampledProfile);
  assert.ok(validation.messages.some((entry) => entry.code === 'DATASET_PROFILE_SAMPLED'));
}

{
  const profileWithAmbiguous = DataWizDatasetProfile.fromRows([{ 'a.b': 1, a: { b: 2 } }]);
  const spec = new DataWizChartSpec({ mark: 'bar', encodings: { x: { field: '/a.b', type: 'quantitative' } } });
  assert.ok(spec.validate(profileWithAmbiguous).messages.some((entry) => entry.code === 'CHART_FIELD_NOT_ADDRESSABLE'));
}

{
  assert.throws(() => new DataWizChartSpec({ mark: 'bar', encodings: {} }), (error) => error.code === 'EMPTY_CHART_ENCODINGS');
  assert.throws(() => new DataWizChartSpec({ mark: 'bar', encodings: { x: { type: 'nominal' } } }), (error) => error.code === 'MISSING_CHART_FIELD');
  assert.throws(() => new DataWizChartSpec({ mark: 'bar', encodings: { x: { field: 'x', renderer: 'plotly' } } }), (error) => error.code === 'UNKNOWN_CHART_KEY');
  assert.throws(() => new DataWizChartSpec({ mark: 'bar', encodings: { x: { field: 'x' } }, presentation: { interactions: { tooltip: 'false' } } }), (error) => error.code === 'INVALID_CHART_BOOLEAN');
  assert.throws(() => DataWizChartSpec.parse('{oops'), (error) => error.code === 'INVALID_CHART_JSON');
}

// Structural fuzz: round-trip and update atomicity over renderer-independent grammar.
{
  let seed = 0x31415926;
  const random = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
  const marks = ['bar', 'line', 'area', 'point', 'scatter', 'histogram', 'box', 'violin', 'heatmap', 'radar'];
  const fields = ['id', 'category', 'price', 'quantity', 'createdAt'];
  const types = ['auto', 'quantitative', 'nominal', 'ordinal', 'temporal'];
  const aggregates = ['none', 'count', 'distinct', 'sum', 'mean', 'median', 'min', 'max'];
  for (let iteration = 0; iteration < 500; iteration += 1) {
    const mark = marks[Math.floor(random() * marks.length)];
    const encodings = {};
    const channels = mark === 'radar' ? ['theta', 'radius'] : mark === 'box' || mark === 'violin' ? ['y'] : mark === 'histogram' ? ['x'] : ['x', 'y'];
    for (const channel of channels) {
      const aggregate = aggregates[Math.floor(random() * aggregates.length)];
      encodings[channel] = {
        field: aggregate === 'count' && random() > 0.5 ? null : fields[Math.floor(random() * fields.length)],
        type: types[Math.floor(random() * types.length)],
        aggregate,
        bin: mark === 'histogram' && channel === 'x' ? true : false
      };
    }
    const spec = new DataWizChartSpec({ mark, encodings });
    const serialized = spec.serialize();
    assert.deepEqual(DataWizChartSpec.parse(serialized).snapshot(), spec.snapshot());
    const before = spec.snapshot();
    try { spec.update({ presentation: { stack: 'invalid' } }); } catch {}
    assert.deepEqual(spec.snapshot(), before);
    const validation = spec.validate(profile);
    assert.ok(['ready', 'warning', 'blocked'].includes(validation.gate));
  }
}

console.log('data wiz chart spec tests: ok');
