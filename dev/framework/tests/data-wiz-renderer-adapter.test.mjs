import assert from 'node:assert/strict';
import { DataWizChartSpec } from '../wiz/data-wiz-chart-spec.js';
import { DataWizRendererAdapter } from '../wiz/data-wiz-renderer-adapter.js';

const allCaps={
  marks:['bar','line','area','point','scatter','histogram','box','violin','heatmap','radar'],
  channels:['x','y','color','size','detail','facet','row','column','theta','radius'],
  aggregates:['none','count','distinct','sum','mean','median','min','max'],
  timeUnits:['none','year','quarter','month','week','day','date','hours','minutes','seconds'],
  stackModes:['none','zero','normalize','center'],
  orientations:['auto','vertical','horizontal'],
  legendModes:['auto','show','hide'],
  binning:true,
  interactions:{tooltip:true,zoom:true,select:true},
  maxEncodings:10
};
const adapter=(caps=allCaps,compiler=null)=>new DataWizRendererAdapter({descriptor:{id:'test',label:'Test',version:'1'},capabilities:caps},{compiler});
const line=()=>new DataWizChartSpec({mark:'line',encodings:{x:{field:'date',type:'temporal'},y:{field:'value',type:'quantitative',aggregate:'mean'}}});

{
  const a=adapter(); const result=a.assess(line());
  assert.equal(result.gate,'ready'); assert.equal(result.ready,true); assert.equal(result.compileAllowed,false); assert.equal(a.supports(line()),true);
  assert.deepEqual(DataWizRendererAdapter.parse(a.serialize()).snapshot(),a.snapshot());
}
{
  const caps={...allCaps,marks:['bar']}; const r=adapter(caps).assess(line());
  assert.equal(r.gate,'blocked'); assert.ok(r.messages.some(x=>x.code==='RENDERER_MARK_UNSUPPORTED'));
}
{
  const chart=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'cat'},y:{aggregate:'count'},color:{field:'group'}}});
  const caps={...allCaps,channels:['x','y']}; const r=adapter(caps).assess(chart);
  assert.ok(r.messages.some(x=>x.code==='RENDERER_CHANNEL_UNSUPPORTED'&&x.details.channel==='color'));
}
{
  const chart=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'cat'},y:{field:'value',aggregate:'sum'}}});
  const caps={...allCaps,aggregates:['none','count','mean']}; const r=adapter(caps).assess(chart);
  assert.ok(r.messages.some(x=>x.code==='RENDERER_AGGREGATE_UNSUPPORTED'));
}
{
  const chart=new DataWizChartSpec({mark:'histogram',encodings:{x:{field:'value',type:'quantitative',bin:true}}});
  const caps={...allCaps,binning:false}; const r=adapter(caps).assess(chart);
  assert.ok(r.messages.some(x=>x.code==='RENDERER_BINNING_UNSUPPORTED'));
}
{
  const chart=new DataWizChartSpec({mark:'line',encodings:{x:{field:'date',type:'temporal',timeUnit:'month'},y:{field:'value'}}});
  const caps={...allCaps,timeUnits:['none']}; const r=adapter(caps).assess(chart);
  assert.ok(r.messages.some(x=>x.code==='RENDERER_TIMEUNIT_UNSUPPORTED'));
}
{
  const chart=new DataWizChartSpec({mark:'bar',encodings:{x:{field:'cat'},y:{field:'value'}},presentation:{stack:'normalize',orientation:'horizontal',legend:'hide',interactions:{tooltip:true,zoom:true,select:true}}});
  const caps={...allCaps,stackModes:['none'],orientations:['auto','vertical'],legendModes:['auto','show'],interactions:{tooltip:false,zoom:false,select:false}};
  const r=adapter(caps).assess(chart);
  assert.equal(r.gate,'blocked');
  assert.ok(r.messages.some(x=>x.code==='RENDERER_STACK_UNSUPPORTED'));
  assert.ok(r.messages.some(x=>x.code==='RENDERER_ORIENTATION_UNSUPPORTED'));
  assert.ok(r.messages.some(x=>x.code==='RENDERER_LEGEND_DEGRADED'));
  assert.equal(r.messages.filter(x=>x.code==='RENDERER_INTERACTION_DEGRADED').length,3);
}
{
  const invalid=new DataWizChartSpec({mark:'line',encodings:{y:{field:'value'}}}); const r=adapter().assess(invalid);
  assert.equal(r.gate,'blocked'); assert.equal(r.chartValidation.gate,'blocked');
}
{
  let called=0;
  const a=adapter(allCaps,({adapter:desc,chart,context,assessment})=>{called++; context.value=999; return {kind:'compiled',adapter:desc.descriptor.id,mark:chart.chart.mark,input:context.value,gate:assessment.gate};});
  const context={value:1}; const result=a.compile(line(),context);
  assert.equal(called,1); assert.equal(context.value,1); assert.equal(result.compiled.kind,'compiled'); assert.equal(result.compiled.input,999); assert.equal(result.assessment.gate,'ready');
  result.compiled.kind='mutated'; const fresh=a.compile(line(),{value:2}); assert.equal(fresh.compiled.kind,'compiled');
}
{
  let called=0; const a=adapter({...allCaps,marks:['bar']},()=>{called++;return{}});
  assert.throws(()=>a.compile(line()),e=>e.code==='RENDERER_COMPATIBILITY_BLOCKED'); assert.equal(called,0);
}
{
  assert.throws(()=>adapter().compile(line()),e=>e.code==='RENDERER_COMPILER_UNAVAILABLE');
  const cyc={};cyc.self=cyc; const a=adapter(allCaps,()=>cyc); assert.throws(()=>a.compile(line()),e=>e.code==='CYCLIC_RENDERER_VALUE');
  const asyncAdapter=adapter(allCaps,async()=>({})); assert.throws(()=>asyncAdapter.compile(line()),e=>e.code==='ASYNC_RENDERER_COMPILER_UNSUPPORTED');
  const boom=adapter(allCaps,()=>{throw new Error('boom')}); assert.throws(()=>boom.compile(line()),e=>e.code==='RENDERER_COMPILER_ERROR');
}
{
  assert.throws(()=>new DataWizRendererAdapter({descriptor:{id:''},capabilities:allCaps}),e=>e.code==='MISSING_RENDERER_TEXT');
  assert.throws(()=>new DataWizRendererAdapter({descriptor:{id:'x'},capabilities:{...allCaps,marks:[]}}),e=>e.code==='EMPTY_RENDERER_CAPABILITY');
  assert.throws(()=>new DataWizRendererAdapter({descriptor:{id:'x'},capabilities:{...allCaps,binning:'yes'}}),e=>e.code==='INVALID_RENDERER_BOOLEAN');
  assert.throws(()=>new DataWizRendererAdapter({descriptor:{id:'x'},capabilities:{...allCaps,plotly:true}}),e=>e.code==='UNKNOWN_RENDERER_KEY');
}

// fuzz capability subsets: deterministic assessment and compile never allowed on blocked charts.
{
  let seed=0xabcdef01; const rnd=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed/4294967296};
  const marks=allCaps.marks,channels=allCaps.channels,aggs=allCaps.aggregates;
  for(let i=0;i<500;i++){
    const caps={...allCaps,
      marks:marks.filter(()=>rnd()>.25),channels:channels.filter(()=>rnd()>.25),aggregates:aggs.filter(()=>rnd()>.25),
      timeUnits:['none'],stackModes:['none'],orientations:['auto'],legendModes:['auto'],binning:rnd()>.5,
      interactions:{tooltip:rnd()>.5,zoom:rnd()>.5,select:rnd()>.5},maxEncodings:1+Math.floor(rnd()*10)};
    if(!caps.marks.length)caps.marks=['bar']; if(!caps.channels.length)caps.channels=['x']; if(!caps.aggregates.length)caps.aggregates=['none'];
    const a=adapter(caps,()=>({ok:true})); const c=line(); const r1=a.assess(c),r2=a.assess(c);
    assert.deepEqual(r1,r2); assert.ok(['ready','warning','blocked'].includes(r1.gate));
    if(r1.gate==='blocked')assert.throws(()=>a.compile(c),e=>e.code==='RENDERER_COMPATIBILITY_BLOCKED');
    else assert.equal(a.compile(c).compiled.ok,true);
  }
}
console.log('data wiz renderer adapter tests: ok');
