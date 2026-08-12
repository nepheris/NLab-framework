import { DataWizDatasetProfile } from './data-wiz-dataset-profile.js';
import { DataWizChartRecommender } from './data-wiz-chart-recommender.js';
import { DataWizChartSpec } from './data-wiz-chart-spec.js';
import { DataWizChartDataMaterializer } from './data-wiz-chart-data-materializer.js';

const TYPE = 'nlab.data-wiz-visualization-session';
const VERSION = 1;
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SOURCE_KINDS = new Set(['dataset', 'collection', 'resultset', 'file', 'api', 'derived', 'unknown']);
const MAX_TEXT = 1024;

function fail(message, code = 'VISUALIZATION_SESSION_ERROR', details = null, ErrorType = Error) {
  const error = new ErrorType(message);
  error.code = code;
  error.details = details;
  throw error;
}
function isPlainObject(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) return false; const proto=Object.getPrototypeOf(value); return proto===Object.prototype||proto===null; }
function cloneSafe(value, seen=new WeakSet()) {
  if (value===null||typeof value==='string'||typeof value==='boolean') return value;
  if (typeof value==='number') { if(!Number.isFinite(value)) fail('Session values must use finite numbers','NON_FINITE_SESSION_VALUE',null,TypeError); return value; }
  if (Array.isArray(value)) { if(seen.has(value)) fail('Cyclic session values are not supported','CYCLIC_SESSION_VALUE',null,TypeError); seen.add(value); try{return value.map(v=>cloneSafe(v,seen));}finally{seen.delete(value)} }
  if (!isPlainObject(value)) fail('Session values must be JSON-like','UNSUPPORTED_SESSION_VALUE',null,TypeError);
  if(seen.has(value)) fail('Cyclic session values are not supported','CYCLIC_SESSION_VALUE',null,TypeError); seen.add(value);
  try { const out={}; for(const [k,v] of Object.entries(value)){ if(BAD_KEYS.has(k)) fail(`Unsafe session key: ${k}`,'UNSAFE_SESSION_KEY',{key:k},TypeError); Object.defineProperty(out,k,{value:cloneSafe(v,seen),enumerable:true,configurable:true,writable:true}); } return out; } finally {seen.delete(value)}
}
function text(value,fallback=''){const result=String(value??fallback).trim(); if(result.length>MAX_TEXT) fail(`Session text exceeds ${MAX_TEXT} characters`,'SESSION_TEXT_TOO_LONG',{max:MAX_TEXT},RangeError); return result;}
function normalizeSource(value={}) { if(!isPlainObject(value)) fail('source must be an object','INVALID_SESSION_SOURCE',null,TypeError); const kind=text(value.kind,'unknown'); if(!SOURCE_KINDS.has(kind)) fail(`Invalid source kind ${kind}`,'INVALID_SESSION_SOURCE_KIND',{kind},TypeError); const id=text(value.id); return {id,label:text(value.label,id),kind,metadata:cloneSafe(isPlainObject(value.metadata)?value.metadata:{})}; }
function normalizeChart(value){ if(value instanceof DataWizChartSpec) return new DataWizChartSpec(value.snapshot()); if(typeof value==='string') return DataWizChartSpec.parse(value); if(!isPlainObject(value)) fail('Chart selection must be ChartSpec-compatible','INVALID_SESSION_CHART',null,TypeError); if(value.type==='nlab.data-wiz-chart-spec'||Object.hasOwn(value,'version')||Object.hasOwn(value,'chart')) return DataWizChartSpec.parse(value); return new DataWizChartSpec(value); }
function normalizeDependencies(value={}) { if(!isPlainObject(value)) fail('dependencies must be an object','INVALID_SESSION_DEPENDENCIES',null,TypeError); const profileFactory=value.profileFactory??((rows,options)=>DataWizDatasetProfile.fromRows(rows,options)); const recommender=value.recommender??new DataWizChartRecommender(); const materializer=value.materializer??new DataWizChartDataMaterializer(); if(typeof profileFactory!=='function') fail('profileFactory must be a function','INVALID_SESSION_PROFILE_FACTORY',null,TypeError); if(!recommender||typeof recommender.recommend!=='function') fail('recommender must expose recommend()','INVALID_SESSION_RECOMMENDER',null,TypeError); if(!materializer||typeof materializer.materialize!=='function') fail('materializer must expose materialize()','INVALID_SESSION_MATERIALIZER',null,TypeError); return {profileFactory,recommender,materializer}; }
function normalizeAdapter(adapter){ if(!adapter||typeof adapter.assess!=='function'||typeof adapter.compile!=='function') fail('adapter must expose assess() and compile()','INVALID_SESSION_ADAPTER',null,TypeError); return adapter; }
function profileSummary(profile){ if(!profile) return null; if(typeof profile.explain==='function') return cloneSafe(profile.explain()); const snapshot=profile.snapshot?.(); return snapshot?{rows:snapshot.dataset?.rows??null,sampledRows:snapshot.dataset?.sampledRows??null,fields:Array.isArray(snapshot.fields)?snapshot.fields.length:null}:null; }
function recommendationSummary(result){ if(!result) return null; const items=Array.isArray(result.recommendations)?result.recommendations:[]; return {count:items.length,autoApplied:false,items:items.map(item=>({id:item.id,rank:item.rank,rule:item.rule,score:item.score,reason:item.reason,warnings:Array.isArray(item.warnings)?item.warnings.map(w=>w.code??String(w)):[]}))}; }

export const DATA_WIZ_VISUALIZATION_SESSION_TYPE = TYPE;
export const DATA_WIZ_VISUALIZATION_SESSION_VERSION = VERSION;

export class DataWizVisualizationSession {
  constructor({source={}}={}, {dependencies={}}={}) {
    this._source=normalizeSource(source);
    this._deps=normalizeDependencies(dependencies);
    this._rows=null;
    this._profile=null;
    this._recommendations=null;
    this._selection=null;
    this._chartData=null;
    this._dataRevision=0;
    this._selectionRevision=0;
    this._materializedRevision=null;
    this._lastCompile=null;
  }
  _invalidateDerived({selection=true}={}) { this._profile=null; this._recommendations=null; if(selection){this._selection=null;this._selectionRevision+=1;} this._chartData=null; this._materializedRevision=null; this._lastCompile=null; }
  _invalidateAfterSelection(){ this._chartData=null; this._materializedRevision=null; this._lastCompile=null; this._selectionRevision+=1; }
  _requireRows(){ if(!Array.isArray(this._rows)) fail('Bind rows before this operation','SESSION_ROWS_REQUIRED'); return this._rows; }
  _requireProfile(){ if(!this._profile) fail('Profile rows before this operation','SESSION_PROFILE_REQUIRED'); return this._profile; }
  _requireSelection(){ if(!this._selection) fail('Select or set a ChartSpec before this operation','SESSION_CHART_REQUIRED'); return this._selection; }
  bindRows(rows,{source=null}={}) { if(!Array.isArray(rows)) fail('rows must be an array','INVALID_SESSION_ROWS',null,TypeError); const nextSource=source===null?this._source:normalizeSource(source); this._rows=rows; this._source=nextSource; this._dataRevision+=1; this._invalidateDerived(); return this.status(); }
  unbindRows(){ this._rows=null; this._dataRevision+=1; this._invalidateDerived(); return this.status(); }
  setSource(source){ this._source=normalizeSource(source); return cloneSafe(this._source); }
  profile(options={}) { const rows=this._requireRows(); const next=this._deps.profileFactory(rows,cloneSafe(options)); if(!next||typeof next.snapshot!=='function') fail('profileFactory must return a profile with snapshot()','INVALID_SESSION_PROFILE_RESULT',null,TypeError); this._profile=next; this._recommendations=null; this._selection=null; this._selectionRevision+=1; this._chartData=null; this._materializedRevision=null; this._lastCompile=null; return cloneSafe(next.snapshot()); }
  recommend(options={}) { const profile=this._requireProfile(); const result=this._deps.recommender.recommend(profile,cloneSafe(options)); if(!isPlainObject(result)||!Array.isArray(result.recommendations)) fail('Recommender returned an invalid result','INVALID_SESSION_RECOMMENDATION_RESULT',null,TypeError); this._recommendations=cloneSafe(result); if(this._selection?.origin==='recommendation') { const current=result.recommendations.find(item=>item.id===this._selection.recommendationId); if(!current){this._selection=null;this._invalidateAfterSelection();} } return cloneSafe(result); }
  refresh({profileOptions={},recommendationOptions={}}={}) { this.profile(profileOptions); return this.recommend(recommendationOptions); }
  selectRecommendation(id){ const profile=this._requireProfile(); if(!this._recommendations) fail('Generate recommendations before selecting one','SESSION_RECOMMENDATIONS_REQUIRED'); const key=text(id); const item=this._recommendations.recommendations.find(entry=>entry.id===key); if(!item) fail(`Unknown recommendation ${key}`,'SESSION_RECOMMENDATION_NOT_FOUND',{id:key}); const chart=normalizeChart(item.chart); const validation=chart.validate(profile); if(validation.gate==='blocked') fail('Selected recommendation is blocked by current profile','SESSION_RECOMMENDATION_BLOCKED',{id:key,validation}); this._selection={origin:'recommendation',recommendationId:key,chart:chart.toJSON()}; this._invalidateAfterSelection(); return this.selection(); }
  setChart(value){ const chart=normalizeChart(value); this._selection={origin:'manual',recommendationId:null,chart:chart.toJSON()}; this._invalidateAfterSelection(); return this.selection(); }
  clearSelection(){ this._selection=null; this._invalidateAfterSelection(); return this.status(); }
  selection(){ return this._selection?cloneSafe(this._selection):null; }
  selectedChart(){ return this._selection?normalizeChart(this._selection.chart):null; }
  validateSelection(){ const selection=this._requireSelection(); const chart=normalizeChart(selection.chart); return cloneSafe(chart.validate(this._profile)); }
  materialize(){ const rows=this._requireRows(); const selection=this._requireSelection(); const chart=normalizeChart(selection.chart); const result=this._deps.materializer.materialize(rows,chart,{profile:this._profile}); this._chartData=cloneSafe(result); this._materializedRevision={data:this._dataRevision,selection:this._selectionRevision}; this._lastCompile=null; return cloneSafe(result); }
  chartData(){ return this._chartData?cloneSafe(this._chartData):null; }
  assess(adapter){ const selection=this._requireSelection(); const target=normalizeAdapter(adapter); const chart=normalizeChart(selection.chart); return cloneSafe(target.assess(chart,{profile:this._profile})); }
  compile(adapter,{context={}}={}) { const target=normalizeAdapter(adapter); const selection=this._requireSelection(); const chart=normalizeChart(selection.chart); const validCache=this._chartData&&this._materializedRevision?.data===this._dataRevision&&this._materializedRevision?.selection===this._selectionRevision; const chartData=validCache?this._chartData:this.materialize(); const safeContext=cloneSafe(context); const result=target.compile(chart,{...safeContext,chartData:cloneSafe(chartData)},{profile:this._profile}); const adapterSnapshot=typeof target.snapshot==='function'?target.snapshot():null; this._lastCompile={adapterId:adapterSnapshot?.descriptor?.id??null,gate:result?.assessment?.gate??null}; return cloneSafe(result); }
  status(){ return {bound:Array.isArray(this._rows),rows:Array.isArray(this._rows)?this._rows.length:null,dataRevision:this._dataRevision,profiled:Boolean(this._profile),recommendations:this._recommendations?.recommendations?.length??0,selected:Boolean(this._selection),selectionOrigin:this._selection?.origin??null,recommendationId:this._selection?.recommendationId??null,materialized:Boolean(this._chartData),autoSelected:false,lastCompile:cloneSafe(this._lastCompile)}; }
  snapshot(){ return {type:TYPE,version:VERSION,source:cloneSafe(this._source),status:this.status(),profile:profileSummary(this._profile),recommendations:recommendationSummary(this._recommendations),selection:this.selection()}; }
  serialize({indent=2}={}) { const safeIndent=Math.max(0,Math.min(8,Math.floor(Number(indent)||0))); return JSON.stringify(this.snapshot(),null,safeIndent); }
}
