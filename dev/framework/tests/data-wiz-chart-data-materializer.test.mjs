import assert from 'node:assert/strict';
import { DataWizChartSpec } from '../wiz/data-wiz-chart-spec.js';
import { DataWizChartDataMaterializer } from '../wiz/data-wiz-chart-data-materializer.js';

const mat=new DataWizChartDataMaterializer();
const rows=[
  {category:'A',value:10,qty:'2',date:'2026-01-01T10:15:20Z'},
  {category:'A',value:20,qty:'3',date:'2026-01-01T11:10:00Z'},
  {category:'B',value:30,qty:'4',date:'2026-02-02T12:00:00Z'},
  {category:'B',value:40,qty:'5',date:'2026-02-03T12:00:00Z'}
];

{
  const spec=new DataWizChartSpec({mark:'scatter',encodings:{x:{field:'value',type:'quantitative'},y:{field:'qty',type:'quantitative'}}});
  const out=mat.materialize(rows,spec);
  assert.equal(out.mode,'raw'); assert.equal(out.records.length,4);
  assert.deepEqual(out.records[0].values,{x:10,y:2});
  assert.deepEqual(out.provenance[2].sourceIndexes,[2]);
}
{
  const spec=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'category',type:'nominal'},y:{field:'value',type:'quantitative',aggregate:'mean'}}});
  const out=mat.materialize(rows,spec);
  assert.equal(out.mode,'aggregate'); assert.equal(out.records.length,2);
  assert.deepEqual(out.records.map(r=>r.values),[{x:'A',y:15},{x:'B',y:35}]);
  assert.deepEqual(out.provenance.map(p=>p.sourceIndexes),[[0,1],[2,3]]);
}
{
  const spec=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'category'},y:{aggregate:'count',type:'quantitative'}}});
  const out=mat.materialize(rows,spec);
  assert.deepEqual(out.records.map(r=>r.values),[{x:'A',y:2},{x:'B',y:2}]);
}
{
  const spec=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'category'},y:{field:'qty',type:'quantitative',aggregate:'sum'}}});
  const out=mat.materialize(rows,spec);
  assert.deepEqual(out.records.map(r=>r.values),[{x:'A',y:5},{x:'B',y:9}]);
}
{
  const spec=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'category'},y:{field:'category',aggregate:'distinct',type:'quantitative'}}});
  const out=mat.materialize(rows,spec);
  assert.deepEqual(out.records.map(r=>r.values),[{x:'A',y:1},{x:'B',y:1}]);
}
{
  const spec=new DataWizChartSpec({mark:'line',encodings:{x:{field:'date',type:'temporal',timeUnit:'month'},y:{field:'value',aggregate:'sum',type:'quantitative'}}});
  const out=mat.materialize(rows,spec);
  assert.deepEqual(out.records.map(r=>r.values),[
    {x:'2026-01-01T00:00:00.000Z',y:30},
    {x:'2026-02-01T00:00:00.000Z',y:70}
  ]);
}
{
  const spec=new DataWizChartSpec({mark:'histogram',encodings:{x:{field:'value',type:'quantitative',bin:{maxBins:2}}}});
  const out=mat.materialize(rows,spec);
  assert.equal(out.mode,'histogram'); assert.equal(out.records.length,2);
  assert.deepEqual(out.records.map(r=>r.metrics.count),[2,2]);
  assert.equal(out.transforms.bins.x.bins.length,2);
  assert.deepEqual(out.provenance.map(p=>p.sourceIndexes),[[0,1],[2,3]]);
}
{
  const spec=new DataWizChartSpec({mark:'point',encodings:{x:{field:'value',type:'quantitative',bin:{maxBins:2}},y:{field:'qty',type:'quantitative'}}});
  const out=mat.materialize(rows,spec);
  assert.equal(out.mode,'raw'); assert.equal(out.records.length,4);
  assert.equal(out.records[0].values.x,out.records[1].values.x);
}
{
  const spec=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'category',sort:'desc'},y:{aggregate:'count'}}});
  const out=mat.materialize(rows,spec);
  assert.deepEqual(out.records.map(r=>r.values.x),['B','A']);
}
{
  const dirty=[...rows,{category:'C',value:'bad',qty:'x',date:'bad-date'},null];
  const spec=new DataWizChartSpec({mark:'scatter',encodings:{x:{field:'value',type:'quantitative'},y:{field:'qty',type:'quantitative'}}});
  const out=mat.materialize(dirty,spec);
  assert.equal(out.records.length,4);
  assert.ok(out.diagnostics.messages.some(m=>m.code==='CHANNEL_VALUE_REJECTED'));
  assert.ok(out.diagnostics.messages.some(m=>m.code==='NON_OBJECT_ROW_SKIPPED'));
}
{
  const spec=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'category'},y:{field:'value',aggregate:'median',type:'quantitative'}}});
  const out=mat.materialize(rows,spec); assert.deepEqual(out.records.map(r=>r.values.y),[15,35]);
}
{
  const spec=new DataWizChartSpec({mark:'line',encodings:{x:{field:'date',type:'temporal',timeUnit:'week'},y:{field:'value',aggregate:'sum',type:'quantitative'}}});
  const out=mat.materialize(rows.slice(0,2),spec); assert.equal(out.records.length,1); assert.equal(out.records[0].values.x,'2025-12-29T00:00:00.000Z');
}

{
  const spec=new DataWizChartSpec({mark:'bar',encodings:{y:{aggregate:'count',type:'quantitative'}}});
  const out=mat.materialize([],spec);
  assert.equal(out.records.length,1); assert.equal(out.records[0].values.y,0); assert.deepEqual(out.provenance[0].sourceIndexes,[]);
}
{
  const spec=new DataWizChartSpec({mark:'histogram',encodings:{x:{field:'value',type:'quantitative',bin:true},color:{field:'category'}}});
  assert.throws(()=>mat.materialize(rows,spec),e=>e.code==='HISTOGRAM_CHANNELS_UNSUPPORTED');
}
{
  const bad=new DataWizChartSpec({mark:'line',encodings:{y:{field:'value'}}});
  assert.throws(()=>mat.materialize(rows,bad),e=>e.code==='CHART_SPEC_BLOCKED');
  assert.throws(()=>mat.materialize({},new DataWizChartSpec({mark:'bar',encodings:{x:{field:'category'}}})),e=>e.code==='INVALID_MATERIALIZER_ROWS');
  assert.throws(()=>new DataWizChartDataMaterializer({maxGroups:0}),e=>e.code==='INVALID_MATERIALIZER_LIMIT');
}
{
  const spec=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'category',bin:true},y:{field:'value',aggregate:'sum'}}});
  const out=mat.materialize(rows,spec);
  assert.equal(out.records.length,0);
  assert.ok(out.diagnostics.messages.some(m=>m.code==='GROUP_VALUE_REJECTED'));
}
{
  const spec=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'category'},y:{field:'value',aggregate:'sum',bin:true}}});
  assert.throws(()=>mat.materialize(rows,spec),e=>e.code==='AGGREGATE_TRANSFORM_CONFLICT');
}
{
  const limit=new DataWizChartDataMaterializer({maxOutputRows:2});
  const spec=new DataWizChartSpec({mark:'scatter',encodings:{x:{field:'value'},y:{field:'qty'}}});
  assert.throws(()=>limit.materialize(rows,spec),e=>e.code==='MATERIALIZED_OUTPUT_LIMIT');
}

// Fuzz deterministic grouping/provenance: source indexes must be valid and output stable.
{
  let seed=0x42424242; const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let it=0;it<500;it++){
    const data=Array.from({length:10+Math.floor(rnd()*40)},(_,i)=>({cat:['A','B','C'][Math.floor(rnd()*3)],a:Math.floor(rnd()*100),b:String(Math.floor(rnd()*20)),date:`2026-${String(1+Math.floor(rnd()*6)).padStart(2,'0')}-${String(1+Math.floor(rnd()*20)).padStart(2,'0')}`}));
    const specs=[
      new DataWizChartSpec({mark:'scatter',encodings:{x:{field:'a',type:'quantitative'},y:{field:'b',type:'quantitative'}}}),
      new DataWizChartSpec({mark:'bar',encodings:{x:{field:'cat'},y:{field:'a',aggregate:'mean',type:'quantitative'}}}),
      new DataWizChartSpec({mark:'line',encodings:{x:{field:'date',type:'temporal',timeUnit:'month'},y:{field:'a',aggregate:'sum',type:'quantitative'}}}),
      new DataWizChartSpec({mark:'histogram',encodings:{x:{field:'a',type:'quantitative',bin:{maxBins:5}}}})
    ];
    const spec=specs[it%specs.length]; const a=mat.materialize(data,spec),b=mat.materialize(data,spec);
    assert.deepEqual(a,b);
    assert.equal(a.records.length,a.provenance.length);
    for(const p of a.provenance) for(const idx of p.sourceIndexes) assert.ok(Number.isInteger(idx)&&idx>=0&&idx<data.length);
  }
}
console.log('data wiz chart data materializer tests: ok');
