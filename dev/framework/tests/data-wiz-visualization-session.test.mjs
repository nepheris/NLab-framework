import assert from 'node:assert/strict';
import { DataWizVisualizationSession } from '../wiz/data-wiz-visualization-session.js';

const rows=[{category:'A',value:1,secret:'alpha-secret'},{category:'B',value:2,secret:'beta-secret'}];
const adapter={
  snapshot(){return {descriptor:{id:'fake'}}},
  assess(chart){return {gate:'ready',ready:true,compileAllowed:true,mark:chart.snapshot().mark}},
  compile(chart,context){return {adapterId:'fake',assessment:{gate:'ready'},compiled:{mark:chart.snapshot().mark,rows:context.chartData.records.length,contextNote:context.note??null}}}
};

{
  const s=new DataWizVisualizationSession({source:{id:'sales',label:'Sales',kind:'dataset'}});
  assert.deepEqual(s.status(),{bound:false,rows:null,dataRevision:0,profiled:false,recommendations:0,selected:false,selectionOrigin:null,recommendationId:null,materialized:false,autoSelected:false,lastCompile:null});
  s.bindRows(rows); assert.equal(s.status().bound,true); assert.equal(s.status().rows,2);
  s.profile(); assert.equal(s.status().profiled,true); assert.equal(s.status().selected,false);
  const rec=s.recommend(); assert.equal(rec.autoApplied,false); assert.equal(s.status().recommendations,1); assert.equal(s.status().selected,false); assert.equal(s.status().autoSelected,false);
  s.selectRecommendation('r1'); assert.equal(s.status().selected,true); assert.equal(s.status().selectionOrigin,'recommendation');
  const materialized=s.materialize(); assert.equal(materialized.type,'nlab.data-wiz-chart-data'); assert.equal(s.status().materialized,true);
  const assessment=s.assess(adapter); assert.equal(assessment.gate,'ready');
  const compiled=s.compile(adapter,{context:{note:'x',chartData:{evil:true}}}); assert.equal(compiled.compiled.mark,'bar'); assert.equal(compiled.compiled.rows,1); assert.equal(compiled.compiled.contextNote,'x'); assert.equal(s.status().lastCompile.adapterId,'fake');
}
{
  const s=new DataWizVisualizationSession(); s.bindRows(rows); s.profile(); s.recommend(); s.selectRecommendation('r1'); s.materialize();
  s.bindRows([{category:'C',value:3}]);
  const st=s.status(); assert.equal(st.profiled,false); assert.equal(st.recommendations,0); assert.equal(st.selected,false); assert.equal(st.materialized,false); assert.equal(st.dataRevision,2);
}
{
  const s=new DataWizVisualizationSession(); s.bindRows(rows); s.profile(); s.recommend(); s.selectRecommendation('r1');
  s.profile(); assert.equal(s.status().selected,false); assert.equal(s.status().recommendations,0);
}
{
  const s=new DataWizVisualizationSession(); s.bindRows(rows);
  s.setChart({mark:'scatter',encodings:{x:{field:'value'},y:{field:'value'}},presentation:{interactions:{tooltip:true,zoom:false,select:false}}});
  assert.equal(s.status().selectionOrigin,'manual'); assert.equal(s.validateSelection().gate,'ready'); const out=s.compile(adapter); assert.equal(out.compiled.mark,'scatter');
}
{
  const s=new DataWizVisualizationSession(); s.bindRows(rows); const result=s.refresh(); assert.equal(result.recommendations.length,1); assert.equal(s.status().selected,false);
}
{
  const changingRecommender={calls:0,recommend(){this.calls++;return {type:'nlab.data-wiz-chart-recommendations',version:1,autoApplied:false,recommendations:this.calls===1?[{id:'keep',rank:1,rule:'r',score:1,reason:'',warnings:[],chart:{type:'nlab.data-wiz-chart-spec',version:1,chart:{mark:'bar',encodings:{x:{field:'category'}},presentation:{interactions:{tooltip:true,zoom:false,select:false}}}},validation:{gate:'ready'}}]:[]}}};
  const s=new DataWizVisualizationSession({}, {dependencies:{recommender:changingRecommender}}); s.bindRows(rows); s.profile(); s.recommend(); s.selectRecommendation('keep'); assert.equal(s.status().selected,true); s.recommend(); assert.equal(s.status().selected,false);
}
{
  const s=new DataWizVisualizationSession({source:{id:'s',kind:'dataset'}}); s.bindRows(rows); s.profile(); s.recommend(); s.selectRecommendation('r1'); s.compile(adapter);
  const snap=s.snapshot(); const serialized=s.serialize(); assert.equal(snap.type,'nlab.data-wiz-visualization-session'); assert.equal(snap.version,1); assert.equal(snap.status.rows,2); assert.ok(!serialized.includes('alpha-secret')); assert.ok(!serialized.includes('beta-secret')); assert.ok(!serialized.includes('compiled')); assert.equal(snap.recommendations.count,1); assert.equal(snap.selection.recommendationId,'r1');
  snap.source.id='mutated'; assert.equal(s.snapshot().source.id,'s');
}
{
  const s=new DataWizVisualizationSession();
  assert.throws(()=>s.profile(),e=>e.code==='SESSION_ROWS_REQUIRED');
  assert.throws(()=>s.recommend(),e=>e.code==='SESSION_PROFILE_REQUIRED');
  assert.throws(()=>s.selectRecommendation('x'),e=>e.code==='SESSION_PROFILE_REQUIRED');
  assert.throws(()=>s.materialize(),e=>e.code==='SESSION_ROWS_REQUIRED');
  s.bindRows(rows); assert.throws(()=>s.materialize(),e=>e.code==='SESSION_CHART_REQUIRED');
  assert.throws(()=>s.assess({}),e=>e.code==='SESSION_CHART_REQUIRED');
  s.setChart({mark:'bar',encodings:{x:{field:'category'}},presentation:{interactions:{tooltip:true,zoom:false,select:false}}}); assert.throws(()=>s.assess({}),e=>e.code==='INVALID_SESSION_ADAPTER');
  assert.throws(()=>s.bindRows({}),e=>e.code==='INVALID_SESSION_ROWS');
}
{
  let materializeCalls=0;
  const materializer={materialize(rows,chart){materializeCalls++;return {type:'nlab.data-wiz-chart-data',version:1,mark:chart.snapshot().mark,mode:'raw',channels:{},records:rows.map((_,i)=>({values:{x:i}})),provenance:rows.map((_,i)=>({sourceIndexes:[i]})),transforms:{bins:{}},diagnostics:{inputRows:rows.length,outputRows:rows.length,messages:[],truncatedMessages:false}}}};
  const s=new DataWizVisualizationSession({}, {dependencies:{materializer}}); s.bindRows(rows); s.setChart({mark:'bar',encodings:{x:{field:'category'}},presentation:{interactions:{tooltip:true,zoom:false,select:false}}}); s.compile(adapter); s.compile(adapter); assert.equal(materializeCalls,1); s.setChart({mark:'bar',encodings:{x:{field:'value'}},presentation:{interactions:{tooltip:true,zoom:false,select:false}}}); s.compile(adapter); assert.equal(materializeCalls,2);
}

// State-machine fuzz: no operation may auto-select a recommendation.
{
  let seed=0x10203040; const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  for(let iteration=0;iteration<500;iteration++){
    const s=new DataWizVisualizationSession();
    const actions=10+Math.floor(rnd()*20);
    for(let step=0;step<actions;step++){
      const a=Math.floor(rnd()*8);
      try {
        if(a===0)s.bindRows([{category:'A',value:1},{category:'B',value:2}]);
        else if(a===1)s.profile();
        else if(a===2)s.recommend();
        else if(a===3)s.selectRecommendation('r1');
        else if(a===4)s.setChart({mark:'bar',encodings:{x:{field:'category'}},presentation:{interactions:{tooltip:true,zoom:false,select:false}}});
        else if(a===5)s.materialize();
        else if(a===6)s.compile(adapter);
        else s.clearSelection();
      } catch {}
      const st=s.status(); assert.equal(st.autoSelected,false); if(st.selectionOrigin==='recommendation') assert.equal(st.recommendationId,'r1');
      assert.doesNotThrow(()=>JSON.stringify(s.snapshot()));
    }
  }
}
console.log('data wiz visualization session tests: ok');
