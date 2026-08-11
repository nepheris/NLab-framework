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

const demoLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#2563eb"/><path d="M22 70V26h13l26 27V26h13v44H61L35 43v27z" fill="white"/></svg>`;
const demoLogo = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(demoLogoSvg)}`;

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
const help=new HelpWiz({ registry:{
  'demo.help':{ title:'Aide contextuelle',short:'Ouvre une aide dans FloatingPanel.',long:'HelpWiz peut afficher une aide courte, longue et des détails techniques en expérience Webmaster.',technical:{ module:'help-wiz',mode:'demo' } },
  'demo.qr':{ title:'DMO-QR-001 — QR Studio',short:'Tester la génération QR dynamique.',long:'Tous les QR de cette section sont générés en direct dans le navigateur. Testez les presets Standard, Transparent, Couleurs, Avec logo et Monochrome thème, puis modifiez taille, marge, correction, couleurs, transparence et logo dans le mode personnalisé.',technical:{ id:'DMO-QR-001',technicalId:'demo.output.qr-studio',component:'QRWiz',encoder:'qrcode@1.5.4 via ESM',files:['wiz/qr-wiz.js','demo/demo.js','demo/index.html','demo/demo.css'] } }
}, panelFactory:(entry)=>{ panel.hidden=false; $('#help-content').innerHTML=`<h3>${entry.title}</h3><p>${entry.long}</p><pre>${JSON.stringify(entry.technical,null,2)}</pre>`; panelController.render(); } }); help.attach(document,{experience:'webmaster'});

workshop.mountColorPicker($('#theme-pickers'),['accent','bg','fg']);
$('#unlock').addEventListener('click',()=>{ workshop.toggleUnlocked(); $('#unlock').textContent=workshop.unlocked?'Verrouiller édition':'Déverrouiller'; renderConfig(); });
$('#lock-all').addEventListener('click',()=>workshop.lockAll());
$('#density').addEventListener('change',(event)=>{ workshop.sessionPatch.density=event.target.value; workshop.applySession(); workshop.setToken('density-marker',event.target.value,{apply:false}); renderConfig(); });
$('#export-theme').addEventListener('click',()=>$('#theme-json').value=workshop.exportJSON());
$('#import-theme').addEventListener('click',()=>{ try{workshop.importJSON($('#theme-json').value); workshop.mountColorPicker($('#theme-pickers'),['accent','bg','fg']); renderConfig(); renderQRStudio();}catch(error){alert(error.message);} });
$('#reset-theme').addEventListener('click',()=>{ workshop.resetSession(); engine.reset(); engine.apply(document.documentElement,DEFAULT_THEME); workshop.mountColorPicker($('#theme-pickers'),['accent','bg','fg']); renderConfig(); renderQRStudio(); });

const qrControls={
  url:$('#qr-url'), width:$('#qr-width'), margin:$('#qr-margin'), ecc:$('#qr-ecc'), dark:$('#qr-dark'), light:$('#qr-light'), transparent:$('#qr-transparent'), logo:$('#qr-logo-enabled')
};
qrControls.url.value=location.href;

const qrPresets={
  standard:{ dark:'#111827',light:'#ffffff',transparent:false,logo:false,ecc:'M' },
  transparent:{ dark:'#111827',light:'#ffffff',transparent:true,logo:false,ecc:'M' },
  colored:{ dark:'#0f766e',light:'#ecfeff',transparent:false,logo:false,ecc:'Q' },
  logo:{ dark:'#1d4ed8',light:'#ffffff',transparent:false,logo:true,ecc:'H' },
  mono:{ dark:null,light:'#ffffff',transparent:true,logo:false,ecc:'M' }
};

function currentAccent(){ return engine.resolve({user:workshop.sessionPatch}).accent || '#2563eb'; }
function customQRConfig(){ return { url:qrControls.url.value || location.href, width:Number(qrControls.width.value), margin:Number(qrControls.margin.value), errorCorrectionLevel:qrControls.ecc.value, dark:qrControls.dark.value, light:qrControls.light.value, transparent:qrControls.transparent.checked, logo:qrControls.logo.checked ? demoLogo : null, logoSize:0.22, logoBackground:'#ffffff', logoRadius:14, format:'svg' }; }
function presetConfig(name){ const preset=qrPresets[name]; return { url:qrControls.url.value || location.href,width:180,margin:2,errorCorrectionLevel:preset.ecc,dark:preset.dark || currentAccent(),light:preset.light,transparent:preset.transparent,logo:preset.logo?demoLogo:null,logoSize:0.22,logoBackground:'#ffffff',logoRadius:14,format:'svg' }; }
async function renderQR(target,config){ const node=$(target); try{ await qrWiz.render(node,config); }catch(error){ node.textContent=`QR indisponible : ${error.message}`; } }
async function renderQRStudio(){
  $('#qr-margin-value').value=qrControls.margin.value;
  await Promise.all([
    renderQR('#qr-standard',presetConfig('standard')),
    renderQR('#qr-transparent-preview',presetConfig('transparent')),
    renderQR('#qr-colored',presetConfig('colored')),
    renderQR('#qr-logo',presetConfig('logo')),
    renderQR('#qr-mono',presetConfig('mono')),
    renderQR('#qr-custom',customQRConfig())
  ]);
  $('#qr-config').textContent=JSON.stringify({...customQRConfig(),logo:qrControls.logo.checked?'demo-logo.svg':null},null,2);
}
function applyQRControlPreset(name){ const preset=qrPresets[name]; qrControls.dark.value=preset.dark || currentAccent(); qrControls.light.value=preset.light; qrControls.transparent.checked=preset.transparent; qrControls.logo.checked=preset.logo; qrControls.ecc.value=preset.ecc; renderQRStudio(); }
for(const button of document.querySelectorAll('[data-qr-preset]')) button.addEventListener('click',()=>applyQRControlPreset(button.dataset.qrPreset));
for(const element of Object.values(qrControls)) element.addEventListener(element.type==='text'?'input':'change',renderQRStudio);
$('#qr-margin').addEventListener('input',renderQRStudio);
$('#qr-refresh').addEventListener('click',renderQRStudio);

$('#document-preview').addEventListener('click',()=>$('#document-output').textContent=documentWiz.renderHTML(data[0],{ fields:['name','category','minutes','rating','tags'],labels:{name:'Nom',category:'Catégorie',minutes:'Durée',rating:'Note',tags:'Tags'} }));

function renderConfig(){ $('#config-output').textContent=JSON.stringify({ breakpoint:Number($('#breakpoint').value), renderer:rendererSelect.value, theme:engine.resolve({user:workshop.sessionPatch}), workshop:{ unlocked:workshop.unlocked, locks:[...workshop.componentLocks], patch:workshop.sessionPatch }, visitor:visitor.values, search:searchInput.value, category:category.value, qr:customQRConfig() },null,2); }

studio.render($('#json-editor'));
renderTable(); renderResults(); renderResponsive(); await renderQRStudio(); renderConfig();
status.textContent='Catalogue initialisé — utilisez les contrôles pour tester le framework.';
