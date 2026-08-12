import assert from 'node:assert/strict';
import { compileDataWizPlotlyPlan, createDataWizPlotlyAdapter, DATA_WIZ_PLOTLY_CAPABILITIES } from '../wiz/data-wiz-plotly-adapter.js';

const chart = (mark, encodings, presentation={}) => ({
  type:'nlab.data-wiz-chart-spec', version:1, chart:{
    id:'c',label:'',mark,source:{id:'s',label:'s',kind:'dataset'},encodings,
    presentation:{title:'Title',subtitle:'Subtitle',orientation:'auto',stack:'none',legend:'auto',interactions:{tooltip:true,zoom:false,select:false},...presentation},metadata:{}
  }
});
const data = (mark, records, provenance=records.map((_,i)=>({sourceIndexes:[i]})), extra={}) => ({
  type:'nlab.data-wiz-chart-data',version:1,mark,mode:'raw',channels:{},records,provenance,transforms:{bins:{}},diagnostics:{inputRows:records.length,outputRows:records.length,messages:[],truncatedMessages:false},...extra
});

{
  const c=chart('line',{x:{field:'date',title:'Date',type:'temporal'},y:{field:'value',title:'Value',type:'quantitative'}});
  const d=data('line',[{values:{x:'2026-01-01',y:1}},{values:{x:'2026-01-02',y:2}}]);
  const p=compileDataWizPlotlyPlan(c,d);
  assert.equal(p.data.length,1); assert.equal(p.data[0].type,'scatter'); assert.equal(p.data[0].mode,'lines');
  assert.deepEqual(p.data[0].x,['2026-01-01','2026-01-02']); assert.deepEqual(p.data[0].y,[1,2]);
  assert.equal(p.layout.title.text,'Title'); assert.equal(p.layout.title.subtitle.text,'Subtitle');
  assert.equal(p.layout.xaxis.title.text,'Date'); assert.equal(p.layout.yaxis.title.text,'Value');
  assert.equal(p.config.responsive,true); assert.equal(p.config.displaylogo,false); assert.equal(p.meta.runtimeBundled,false);
}
{
  const c=chart('bar',{x:{field:'cat',title:'Category',type:'nominal'},y:{field:'value',title:'Value',type:'quantitative'},color:{field:'group',type:'nominal'}},{legend:'show'});
  const d=data('bar',[{values:{x:'A',y:1,color:'G1'}},{values:{x:'B',y:2,color:'G2'}},{values:{x:'C',y:3,color:'G1'}}]);
  const p=compileDataWizPlotlyPlan(c,d);
  assert.equal(p.data.length,2); assert.deepEqual(p.data[0].x,['A','C']); assert.deepEqual(p.data[0].y,[1,3]); assert.equal(p.data[0].name,'G1');
  assert.equal(p.layout.showlegend,true);
}
{
  const c=chart('bar',{x:{field:'cat',title:'Category',type:'nominal'},y:{field:'value',title:'Value',type:'quantitative'}},{orientation:'horizontal'});
  const d=data('bar',[{values:{x:'A',y:10}},{values:{x:'B',y:20}}]);
  const p=compileDataWizPlotlyPlan(c,d);
  assert.equal(p.data[0].orientation,'h'); assert.deepEqual(p.data[0].x,[10,20]); assert.deepEqual(p.data[0].y,['A','B']);
  assert.equal(p.layout.xaxis.title.text,'Value'); assert.equal(p.layout.yaxis.title.text,'Category');
}
{
  const c=chart('area',{x:{field:'date',type:'temporal'},y:{field:'value',type:'quantitative'},color:{field:'group',type:'nominal'}},{stack:'normalize'});
  const d=data('area',[{values:{x:'a',y:1,color:'A'}},{values:{x:'a',y:2,color:'B'}}]);
  const p=compileDataWizPlotlyPlan(c,d);
  assert.equal(p.data.length,2); assert.ok(p.data.every(t=>t.stackgroup==='nlab'&&t.groupnorm==='percent'));
}
{
  const c=chart('scatter',{x:{field:'x',type:'quantitative'},y:{field:'y',type:'quantitative'},color:{field:'score',type:'quantitative'},size:{field:'size',type:'quantitative'}},{interactions:{tooltip:false,zoom:true,select:true}});
  const d=data('scatter',[{values:{x:1,y:2,color:5,size:8}},{values:{x:2,y:3,color:7,size:12}}]);
  const p=compileDataWizPlotlyPlan(c,d);
  assert.equal(p.data.length,1); assert.deepEqual(p.data[0].marker.color,[5,7]); assert.deepEqual(p.data[0].marker.size,[8,12]); assert.equal(p.data[0].marker.showscale,true); assert.equal(p.data[0].hoverinfo,'skip');
  assert.equal(p.config.scrollZoom,true); assert.equal(p.layout.dragmode,'select');
}
{
  const c=chart('box',{x:{field:'category',type:'nominal'},y:{field:'value',type:'quantitative'}});
  const d=data('box',[{values:{x:'A',y:1}},{values:{x:'A',y:2}},{values:{x:'B',y:3}}]);
  const p=compileDataWizPlotlyPlan(c,d); assert.equal(p.data[0].type,'box'); assert.deepEqual(p.data[0].y,[1,2,3]);
}
{
  const c=chart('histogram',{x:{field:'value',type:'quantitative',bin:{maxBins:2}}});
  const d=data('histogram',[{values:{x:5},metrics:{count:2}},{values:{x:15},metrics:{count:3}}],[{sourceIndexes:[0,1]},{sourceIndexes:[2,3,4]}],{mode:'histogram',transforms:{bins:{x:{bins:[{min:0,max:10},{min:10,max:20}]}}}});
  const p=compileDataWizPlotlyPlan(c,d); assert.equal(p.data[0].type,'bar'); assert.deepEqual(p.data[0].y,[2,3]); assert.deepEqual(p.data[0].width,[10,10]); assert.deepEqual(p.data[0].customdata[0].sourceIndexes,[0,1]);
}
{
  const c=chart('radar',{theta:{field:'category',type:'nominal'},radius:{field:'value',type:'quantitative'}});
  const d=data('radar',[{values:{theta:'A',radius:1}},{values:{theta:'B',radius:2}}]);
  const p=compileDataWizPlotlyPlan(c,d); assert.equal(p.data[0].type,'scatterpolar'); assert.equal(p.data[0].fill,'toself'); assert.deepEqual(p.data[0].theta,['A','B']); assert.deepEqual(p.data[0].r,[1,2]);
}
{
  const c=chart('bar',{x:{field:'x',type:'nominal'},y:{field:'y',type:'quantitative'}},{stack:'normalize'});
  const p=compileDataWizPlotlyPlan(c,data('bar',[{values:{x:'A',y:1}}])); assert.equal(p.layout.barmode,'stack'); assert.equal(p.layout.barnorm,'percent');
}
{
  const adapter=createDataWizPlotlyAdapter(); const s=adapter.snapshot();
  assert.equal(s.descriptor.id,'plotly-js'); assert.equal(s.descriptor.metadata.runtimeBundled,false); assert.ok(DATA_WIZ_PLOTLY_CAPABILITIES.marks.includes('radar')); assert.ok(!DATA_WIZ_PLOTLY_CAPABILITIES.marks.includes('heatmap'));
  const state=chart('bar',{x:{field:'x',type:'nominal'},y:{field:'y',type:'quantitative'}}).chart;
  const result=adapter.compile(state,{chartData:data('bar',[{values:{x:'A',y:1}}])}); assert.equal(result.compiled.data[0].type,'bar');
}
{
  const c=chart('histogram',{x:{field:'value',type:'quantitative',bin:true}});
  assert.throws(()=>compileDataWizPlotlyPlan(c,data('histogram',[{values:{x:1}}])),e=>e.code==='PLOTLY_HISTOGRAM_DATA_REQUIRED');
  assert.throws(()=>compileDataWizPlotlyPlan(chart('line',{x:{field:'x'},y:{field:'y'}}),data('bar',[])),e=>e.code==='PLOTLY_MARK_MISMATCH');
  assert.throws(()=>compileDataWizPlotlyPlan({type:'wrong',version:1,chart:{}},data('bar',[])),e=>e.code==='INVALID_PLOTLY_CHART');
  assert.throws(()=>compileDataWizPlotlyPlan(chart('heatmap',{x:{field:'x'},y:{field:'y'}}),data('heatmap',[])),e=>e.code==='PLOTLY_MARK_UNSUPPORTED');
}

// fuzz JSON-safe deterministic plans over supported cartesian marks.
{
  let seed=0x13572468; const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const marks=['bar','line','area','point','scatter','box'];
  for(let it=0;it<500;it++){
    const mark=marks[it%marks.length]; const grouped=rnd()>.5;
    const enc={x:{field:'x',title:'X',type:'auto'},y:{field:'y',title:'Y',type:'quantitative'}}; if(grouped) enc.color={field:'group',type:'nominal'};
    const c=chart(mark,enc,{orientation:mark==='bar'&&rnd()>.7?'horizontal':'auto',stack:['bar','area'].includes(mark)&&rnd()>.7?'zero':'none'});
    const records=Array.from({length:2+Math.floor(rnd()*20)},(_,i)=>({values:{x:`c${i%4}`,y:Math.round(rnd()*1000)/10,...(grouped?{color:`g${i%3}`}:{})}}));
    const d=data(mark,records); const a=compileDataWizPlotlyPlan(c,d),b=compileDataWizPlotlyPlan(c,d);
    assert.deepEqual(a,b); assert.doesNotThrow(()=>JSON.stringify(a)); assert.ok(a.data.length>=1);
    for(const trace of a.data) assert.equal(trace.customdata.length,trace.x?.length??trace.y?.length??0);
  }
}
console.log('data wiz plotly adapter tests: ok');
