import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm';
import { BrowserStorage } from '../core/storage.js';
import { ThemeEngine, DEFAULT_THEME } from '../themes/theme-engine.js';
import { VisitorPreferences } from '../themes/visitor-preferences.js';
import { ThemeWorkshop } from '../components/theme-workshop.js';
import { RendererWiz } from '../wiz/renderer-wiz.js';
import { SearchWiz } from '../wiz/search-wiz.js';
import { FilterWiz } from '../wiz/filter-wiz.js';
import { TableWiz } from '../wiz/table-wiz.js';
import { JsonStudio } from '../wiz/json-studio.js';
import { DataWiz } from '../wiz/data-wiz.js';
import { NavigationWiz } from '../navigation/navigation-wiz.js';
import { HelpWiz } from '../help/help-wiz.js';
import { FloatingPanelState, mountFloatingPanel } from '../components/floating-panel.js';
import { QRWiz, QRCodeEncoderAdapter } from '../wiz/qr-wiz.js';
import { DocumentWiz } from '../wiz/document-wiz.js';

const storage = new BrowserStorage(localStorage,{ prefix:'nlab-demo:' });
const data = await fetch('data/mixed.json').then((response)=>response.json());
const engine = new ThemeEngine({ base:DEFAULT_THEME, storage, storageKey:'theme' }).load();
engine.apply(document.documentElement,engine.resolve());
const workshop = new ThemeWorkshop({ root:document, engine, storage, storageKey:'workshop' });
const visitor = new VisitorPreferences({ allowed:{ accent:true,density:true,scheme:true }, storage, storageKey:'visitor' });
const renderer = new RendererWiz();
const searchWiz = new SearchWiz();
const filterWiz = new FilterWiz();
const dataWiz = new DataWiz();
const table = new TableWiz({ columns:[
  { id:'id',field:'id',label:'ID',sticky:true,width:90 },
  { id:'name',field:'name',label:'Nom',width:220 },
  { id:'category',field:'category',label:'Catégorie' },
  { id:'tags',field:'tags',label:'Tags' },
  { id:'minutes',field:'minutes',label:'Min.' },
  { id:'rating',field:'rating',label:'Note' },
  { id:'active',field:'active',label:'Actif' },
  { id:'image',field:'image',label:'Image',type:'image',altField:'name' }
], pageSize:12 });
const studio = new JsonStudio({ data:structuredClone(data), table });
const qrWiz = new QRWiz({ encoder:new QRCodeEncoderAdapter(QRCode), urlResolver:{ current:()=>location.href, resolve:(value)=>new URL(value,location.href).toString() } });
const documentWiz = new DocumentWiz({ qrWiz });

const $ = (selector)=>document.querySelector(selector);
const status = $('#status');
const searchInput=$('#search'), category=$('#category'), rendererSelect=$('#renderer');

function filteredData(){
  let rows=data;
  if(searchInput.value) rows=searchWiz.search(rows,searchInput.value,{ fields:['name','category','tags','notes'] }).items;
  if(category.value) rows=filterWiz.apply(rows,[{ field:'category',operator:'eq',value:category.value }]).items;
  return rows;
}
function renderResults(){ const rows=filteredData(); $('#results').innerHTML=renderer.render(rendererSelect.value,rows,{ titleField:'name',textField:'notes',imageField:'image' }); status.textContent=`${rows.length} résultat(s) · vue ${rendererSelect.value}`; renderResponsive(); renderConfig(); }
searchInput.addEventListener('input',renderResults); category.addEventListener('change',renderResults); rendererSelect.addEventListener('change',renderResults);

const stage=$('#demo-stage');
function renderResponsive(){ const width=Number($('#breakpoint').value); stage.style.width=`${width}px`; const mode=renderer.chooseForWidth(width,{ breakpoints:{0:'list',480:'compact-cards',760:'cards',1100:'filmstrip'} }); $('#responsive-info').textContent=`${width}px → renderer conseillé : ${mode}`; $('#responsive-results').innerHTML=renderer.render(mode,filteredData(),{ titleField:'name',textField:'notes',imageField:'image' }); }
$('#breakpoint').addEventListener('change',renderResponsive);

function renderTable(){ table.setQuery($('#table-search').value); table.render($('#table'),data); }
$('#table-search').addEventListener('input',renderTable);
$('#table-export').addEventListener('click',()=>{ const output=$('#csv-preview'); output.hidden=false; output.textContent=table.exportCSV(table.process(data).all); });

for(const button of document.querySelectorAll('[data-json-view]')) button.addEventListener('click',()=>{ studio.setView(button.dataset.jsonView); studio.render($('#json-editor')); });
$('#json-diff').addEventListener('click',()=>$('#json-diff-output').textContent=JSON.stringify(studio.diff(),null,2));

$('#stats').textContent=JSON.stringify(dataWiz.describe(data,['minutes','rating','category']),null,2);
$('#groups').innerHTML=dataWiz.groupBy(data,'category').map((group)=>`<span class="demo-badge">${group.value}: ${group.count}</span>`).join('');

const nav=new NavigationWiz({ root:document,contentSelector:'#demo-content' }); nav.render($('#demo-nav')); nav.observe($('#demo-nav'));
const panel=$('#panel');
const panelController=mountFloatingPanel(panel,{ state:new FloatingPanelState({x:40,y:100,width:390,height:300}),storage,storageKey:'floating-panel' });
$('#open-panel').addEventListener('click',()=>{ panel.hidden=false; panelController.render(); }); $('#panel-close').addEventListener('click',()=>panel.hidden=true);
const help=new HelpWiz({ registry:{ 'demo.help':{ title:'Aide contextuelle',short:'Ouvre une aide dans FloatingPanel.',long:'HelpWiz peut afficher une aide courte, longue et des détails techniques en expérience Webmaster.',technical:{ module:'help-wiz',mode:'demo' } } }, panelFactory:(entry)=>{ panel.hidden=false; $('#help-content').innerHTML=`<h3>${entry.title}</h3><p>${entry.long}</p><pre>${JSON.stringify(entry.technical,null,2)}</pre>`; panelController.render(); } }); help.attach(document,{experience:'webmaster'});

workshop.mountColorPicker($('#theme-pickers'),['accent','bg','fg']);
$('#unlock').addEventListener('click',()=>{ workshop.toggleUnlocked(); $('#unlock').textContent=workshop.unlocked?'Verrouiller édition':'Déverrouiller'; renderConfig(); });
$('#lock-all').addEventListener('click',()=>workshop.lockAll());
$('#density').addEventListener('change',(event)=>{ workshop.sessionPatch.density=event.target.value; workshop.applySession(); workshop.setToken('density-marker',event.target.value,{apply:false}); renderConfig(); });
$('#export-theme').addEventListener('click',()=>$('#theme-json').value=workshop.exportJSON());
$('#import-theme').addEventListener('click',()=>{ try{workshop.importJSON($('#theme-json').value); workshop.mountColorPicker($('#theme-pickers'),['accent','bg','fg']); renderConfig();}catch(error){alert(error.message);} });
$('#reset-theme').addEventListener('click',()=>{ workshop.resetSession(); engine.reset(); engine.apply(document.documentElement,DEFAULT_THEME); workshop.mountColorPicker($('#theme-pickers'),['accent','bg','fg']); renderConfig(); });

await qrWiz.render($('#qr'),{ url:location.href,width:180,margin:1,errorCorrectionLevel:'M' }).catch((error)=>$('#qr').textContent=`QR indisponible : ${error.message}`);
$('#document-preview').addEventListener('click',()=>$('#document-output').textContent=documentWiz.renderHTML(data[0],{ fields:['name','category','minutes','rating','tags'],labels:{name:'Nom',category:'Catégorie',minutes:'Durée',rating:'Note',tags:'Tags'} }));

function renderConfig(){ $('#config-output').textContent=JSON.stringify({ breakpoint:Number($('#breakpoint').value), renderer:rendererSelect.value, theme:engine.resolve({user:workshop.sessionPatch}), workshop:{ unlocked:workshop.unlocked, locks:[...workshop.componentLocks], patch:workshop.sessionPatch }, visitor:visitor.values, search:searchInput.value, category:category.value },null,2); }

studio.render($('#json-editor'));
renderTable(); renderResults(); renderResponsive(); renderConfig();
status.textContent='Catalogue initialisé — utilisez les contrôles pour tester le framework.';
