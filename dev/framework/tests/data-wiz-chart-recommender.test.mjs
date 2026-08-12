import assert from 'node:assert/strict';
import { DataWizChartRecommender } from '../wiz/data-wiz-chart-recommender.js';

function profile(fields, rows=100) {
  const snapshot={dataset:{rows,sampledRows:rows,objectRows:rows,complete:true},fieldCount:fields.length,fields,warnings:[],options:{}};
  return {snapshot:()=>structuredClone(snapshot), field:(p)=>structuredClone(fields.find(f=>f.specPath===p||f.pointer===p)??null)};
}
const f=(specPath,dataType,role,distinct=10,count=100,warnings=[])=>({pointer:`/${specPath}`,path:specPath,specPath,addressable:true,depth:1,label:specPath,dataType,role,count,present:count,missing:100-count,nulls:0,blanks:0,distinct,distinctCapped:false,cardinality:count?distinct/count:0,unique:distinct===count,types:{},examples:[],numeric:null,string:null,temporal:null,warnings});
const base=profile([
  f('category','string','dimension',4),
  f('price','number','measure',80),
  f('quantity','integer','measure',50),
  f('createdAt','datetime','time',90),
  f('id','integer','identifier',100),
]);

const rec=new DataWizChartRecommender();
{
  const result=rec.recommend(base);
  assert.equal(result.type,'nlab.data-wiz-chart-recommendations');
  assert.equal(result.version,1);
  assert.equal(result.autoApplied,false);
  assert.ok(result.recommendations.length>5);
  assert.equal(result.recommendations[0].rank,1);
  assert.ok(result.recommendations.every((x,i)=>x.rank===i+1));
  assert.ok(result.recommendations.every(x=>x.score>=0&&x.score<=100));
  assert.ok(result.recommendations.every(x=>x.chart.type==='nlab.data-wiz-chart-spec'));
  assert.ok(result.recommendations.every(x=>x.validation.gate!=='blocked'));
  assert.ok(result.recommendations.some(x=>x.rule==='temporal-measure'));
  assert.ok(result.recommendations.some(x=>x.rule==='category-measure'));
  assert.ok(result.recommendations.some(x=>x.rule==='measure-pair'));
  assert.ok(result.recommendations.some(x=>x.rule==='numeric-distribution'));
  assert.ok(result.recommendations.some(x=>x.rule==='categorical-frequency'));
  assert.ok(result.recommendations.some(x=>x.rule==='category-distribution'));
  const ids=new Set(result.recommendations.map(x=>x.id));
  assert.equal(ids.size,result.recommendations.length);
  const again=rec.recommend(base);
  assert.deepEqual(again,result);
  assert.equal(rec.explain(result).autoApplied,false);
}
{
  const result=rec.recommend(base,{includeSecondary:false,maxRecommendations:50});
  assert.ok(!result.recommendations.some(x=>x.rule==='category-radar-secondary'));
}
{
  const result=rec.recommend(base,{includeSecondary:true,maxRecommendations:50});
  const radar=result.recommendations.find(x=>x.rule==='category-radar-secondary');
  assert.ok(radar);
  assert.ok(radar.warnings.some(x=>x.code==='SECONDARY_VISUALIZATION'));
}

{
  const stringId=profile([f('uuid','string','identifier',100),f('category','string','dimension',5)]);
  const result=rec.recommend(stringId,{maxRecommendations:50});
  assert.ok(!result.recommendations.some(x=>JSON.stringify(x.chart).includes('uuid')));
}
{
  const onlyNumeric=profile([f('value','number','measure',80)]);
  const result=rec.recommend(onlyNumeric,{maxRecommendations:10});
  assert.ok(result.recommendations.some(x=>x.rule==='numeric-distribution'));
  assert.ok(!result.recommendations.some(x=>x.rule==='categorical-frequency'));
}
{
  const onlyCategory=profile([f('category','string','dimension',5)]);
  const result=rec.recommend(onlyCategory);
  assert.ok(result.recommendations.some(x=>x.rule==='categorical-frequency'));
}
{
  const onlyTime=profile([f('createdAt','datetime','time',80)]);
  const result=rec.recommend(onlyTime);
  assert.ok(result.recommendations.some(x=>x.rule==='temporal-frequency'));
}
{
  const high=profile([f('category','string','dimension',95),f('value','number','measure',80)]);
  const result=rec.recommend(high,{maxRecommendations:50});
  const cat=result.recommendations.find(x=>x.rule==='categorical-frequency');
  assert.ok(cat.warnings.some(x=>x.code==='HIGH_CARDINALITY_CATEGORY'));
}
{
  const ambiguous={dataset:{rows:1,sampledRows:1,objectRows:1,complete:true},fields:[{...f('x','number','measure',1,1),pointer:'/a.b',path:'a.b',specPath:null,addressable:false}],warnings:[],options:{}};
  const result=rec.recommend(ambiguous);
  assert.equal(result.recommendations.length,0);
}
{
  assert.throws(()=>rec.recommend(null),e=>e.code==='INVALID_RECOMMENDER_PROFILE');
  assert.throws(()=>rec.recommend(base,{includeSecondary:'yes'}),e=>e.code==='INVALID_RECOMMENDER_BOOLEAN');
  assert.throws(()=>rec.recommend(base,{maxRecommendations:0}),e=>e.code==='INVALID_RECOMMENDER_LIMIT');
  assert.throws(()=>rec.recommend(base,{renderer:'plotly'}),e=>e.code==='UNKNOWN_RECOMMENDER_OPTION');
  assert.throws(()=>rec.explain({}),e=>e.code==='INVALID_RECOMMENDATION_RESULT');
}

// fuzz determinism, bounds and no blocked candidates.
{
  let seed=0xdeadbeef;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const types=['string','number','integer','boolean','date','datetime'];
  const roles=['dimension','measure','time','label','identifier'];
  for(let it=0;it<500;it++){
    const fields=[];
    const n=1+Math.floor(rnd()*12);
    for(let i=0;i<n;i++){
      let type=types[Math.floor(rnd()*types.length)];
      let role=roles[Math.floor(rnd()*roles.length)];
      if(role==='time') type=rnd()>0.5?'date':'datetime';
      if(role==='measure') type=rnd()>0.5?'number':'integer';
      const count=20+Math.floor(rnd()*80), distinct=Math.max(1,Math.min(count,Math.floor(rnd()*count)+1));
      fields.push(f(`f${i}`,type,role,distinct,count));
    }
    const p=profile(fields,100);
    const a=rec.recommend(p,{maxRecommendations:20,includeSecondary:it%2===0});
    const b=rec.recommend(p,{maxRecommendations:20,includeSecondary:it%2===0});
    assert.deepEqual(a,b);
    assert.ok(a.recommendations.length<=20);
    assert.ok(a.recommendations.every(x=>x.validation.gate!=='blocked'));
    assert.ok(a.recommendations.every(x=>x.rank>=1&&x.score>=0&&x.score<=100));
  }
}
console.log('data wiz chart recommender tests: ok');
