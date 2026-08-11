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
import { CodeBlock } from '../components/code-block.js';
import { createCoreIconRegistry } from '../icons/icon-registry.js';

const $=(selector)=>document.querySelector(selector); const $$=(selector)=>[...document.querySelectorAll(selector)];
const storage=new BrowserStorage(localStorage,{prefix:'nlab-demo:'});
const data=await fetch('data/mixed.json').then((response)=>response.json());
const icons=createCoreIconRegistry();
const engine=new ThemeEngine({base:DEFAULT_THEME,storage,storageKey:'theme'}).load();
engine.apply(document.documentElement,engine.resolve());
const workshop=new ThemeWorkshop({root:document,engine,storage,storageKey:'workshop',iconRegistry:icons});
const visitor=new VisitorPreferences({allowed:{accent:true,density:true,scheme:true},storage,storageKey:'visitor'});
const renderer=new RendererWiz(); const searchWiz=new SearchWiz(); const filterWiz=new FilterWiz(); const dataWiz=new DataWiz();
const table=new TableWiz({columns:[{id:'id',field:'id',label:'ID',sticky:true,width:90},{id:'name',field:'name',label:'Nom',width:220},{id:'category',field:'category',label:'Catégorie'},{id:'tags',field:'tags',label:'Tags'},{id:'minutes',field:'minutes',label:'Min.'},{id:'rating',field:'rating',label:'Note'},{id:'active',field:'active',label:'Actif'},{id:'image',field:'image',label:'Image',type:'image',altField:'name'}],pageSize:12});
const studio=new JsonStudio({data:structuredClone(data),table});
const qrWiz=new QRWiz({encoder:new QRCodeEncoderAdapter(QRCode),urlResolver:{current:()=>location.href,resolve:(value)=>new URL(value,location.href).toString()}});
const documentWiz=new DocumentWiz({qrWiz});
const demoLogoSvg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="22" fill="#2563eb"/><path d="M22 70V26h13l26 27V26h13v44H61L35 43v27z" fill="white"/></svg>`;
const demoLogo=`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(demoLogoSvg)}`;

function applyIcons(root=document){for(const target of root.querySelectorAll('[data-icon]')){const id=target.dataset.icon;target.innerHTML=icons.render(id);target.classList.add('demo-icon');}}
applyIcons();

const sectionHelp={};
const sectionIds=['OVR','THEME','RSP','DATA','TABLE','JSON','DW','PANEL','QR','DOC','CODE','CFG'];
$$('#demo-content > section').forEach((section,index)=>{
  const human=section.dataset.nlabId||`DMO-${sectionIds[index]??String(index+1).padStart(3,'0')}-001`; const technical=section.dataset.nlabTechnical||`demo.section.${section.id}`;
  section.dataset.nlabId=human;section.dataset.nlabTechnical=technical;
  const heading=section.querySelector('h1,h2'); if(heading&&!heading.querySelector('.demo-human-id')){const badge=document.createElement('span');badge.className='demo-human-id';badge.textContent=human;heading.append(badge);}
  if(!section.querySelector(':scope > .nlab-container > .demo-section-info')&&!section.querySelector(':scope > .nlab-container > .demo-section-title .demo-info-button')){
    const container=section.querySelector(':scope > .nlab-container'); if(container){const button=document.createElement('button');button.type='button';button.className='demo-section-info demo-info-button';button.dataset.helpId=`demo.section.${human}`;button.innerHTML=icons.render('info');button.title=`${human} — informations et tests`;container.prepend(button);}
  }
  sectionHelp[`demo.section.${human}`]={title:`${human} — ${heading?.childNodes?.[0]?.textContent?.trim()||section.id}`,short:'Informations de test de cette section.',long:`Section ${human}. Utilisez cet identifiant dans vos retours. Vérifiez les contrôles visibles et le résultat attendu dans cette zone.`,technical:{id:human,technicalId:technical,element:`#${section.id}`}};
});

const status=$('#status'); const searchInput=$('#search'),category=$('#category'),rendererSelect=$('#renderer');
function filteredData(){let rows=data;if(searchInput.value){const mode=$('#search-mode').value;try{rows=searchWiz.search(rows,searchInput.value,{fields:['name','category','tags','notes'],exact:mode==='exact',regex:mode==='regex'}).items;}catch(error){status.textContent=`Recherche invalide : ${error.message}`;return [];}}if(category.value)rows=filterWiz.apply(rows,[{field:'category',operator:'eq',value:category.value}]).items;return rows;}
function renderResults(){const rows=filteredData();$('#results').style.setProperty('--demo-card-min',`${$('#card-size').value}px`);$('#results').dataset.images=$('#toggle-images').dataset.on;$('#results').innerHTML=renderer.render(rendererSelect.value,rows,{titleField:'name',textField:'notes',imageField:'image'});status.textContent=`${rows.length} résultat(s) · vue ${rendererSelect.value}`;renderResponsive();renderConfig();}
for(const control of [searchInput,category,rendererSelect,$('#search-mode'),$('#card-size')])control.addEventListener(control.type==='search'||control.type==='range'?'input':'change',renderResults);
$('#toggle-images').addEventListener('click',()=>{const on=$('#toggle-images').dataset.on!=='true';$('#toggle-images').dataset.on=String(on);$('#toggle-images span:last-child').textContent=`Images ${on?'ON':'OFF'}`;renderResults();});

const stage=$('#demo-stage');
function renderResponsive(){const width=Number($('#local-breakpoint').value);stage.style.width=`${width}px`;$('#stage-label').textContent=`Zone simulée — ${width}px`;const mode=renderer.chooseForWidth(width,{breakpoints:{0:'list',480:'compact-cards',760:'cards',1100:'filmstrip'}});$('#responsive-info').textContent=`${width}px → renderer conseillé : ${mode}`;$('#responsive-results').innerHTML=renderer.render(mode,filteredData(),{titleField:'name',textField:'notes',imageField:'image'});}
$('#local-breakpoint').addEventListener('change',renderResponsive);$('#sync-breakpoint').addEventListener('click',()=>{$('#local-breakpoint').value=$('#breakpoint').value;renderResponsive();});$('#breakpoint').addEventListener('change',()=>{$('#local-breakpoint').value=$('#breakpoint').value;renderResponsive();renderConfig();});

function renderTable(){table.setQuery($('#table-search').value);table.render($('#table'),data);} $('#table-search').addEventListener('input',renderTable);$('#table-export').addEventListener('click',()=>{const output=$('#csv-preview');output.hidden=false;output.textContent=table.exportCSV(table.process(data).all);});$('#table-advanced').addEventListener('click',()=>{$('#table-advanced-panel').hidden=!$('#table-advanced-panel').hidden;});

for(const button of $$('[data-json-view]'))button.addEventListener('click',()=>{studio.setView(button.dataset.jsonView);studio.render($('#json-editor'));});$('#json-diff').addEventListener('click',()=>{$('#json-diff-output').textContent='Diff = comparaison entre la donnée de référence chargée au départ et la version actuellement modifiée.\n\n'+JSON.stringify(studio.diff(),null,2);});
$('#stats').textContent=JSON.stringify(dataWiz.describe(data,['minutes','rating','category']),null,2);$('#groups').innerHTML=dataWiz.groupBy(data,'category').map((group)=>`<span class="demo-badge">${group.value}: ${group.count}</span>`).join('');

const nav=new NavigationWiz({root:document,contentSelector:'#demo-content'});nav.render($('#demo-nav'));nav.observe($('#demo-nav'));
$('#nav-toggle').addEventListener('click',()=>{$('#side-nav').classList.toggle('is-collapsed');$('#nav-toggle').textContent=$('#side-nav').classList.contains('is-collapsed')?'▶':'◀';});
$('#nav-collapse-all').addEventListener('click',()=>nav.collapseAll?.());$('#nav-expand-all').addEventListener('click',()=>nav.expandAll?.());$('#nav-default').addEventListener('click',()=>nav.defaultState?.());

const panel=$('#panel');const restoredPanel=storage.get('floating-panel',null);const panelState=new FloatingPanelState(restoredPanel??{x:40,y:100,width:430,height:340});const panelController=mountFloatingPanel(panel,{state:panelState,storage,storageKey:'floating-panel'});
function syncPanelButtons(){const locked=panelController.state.locked,pinned=panelController.state.pinned,min=panelController.state.minimized;$('#panel-lock').innerHTML=icons.render(locked?'lock':'unlock');$('#panel-lock').dataset.state=locked?'locked':'unlocked';$('#panel-lock').title=locked?'Déverrouiller le panneau':'Verrouiller le panneau';$('#panel-pin').innerHTML=icons.render(pinned?'unpin':'pin');$('#panel-pin').dataset.state=pinned?'pinned':'free';$('#panel-pin').title=pinned?'Libérer la position':'Épingler à cette position';$('#panel-collapse').innerHTML=icons.render(min?'expand':'collapse');}
$('#open-panel').addEventListener('click',()=>{panel.hidden=false;panelController.render();syncPanelButtons();});$('#panel-close').addEventListener('click',()=>panel.hidden=true);$('#panel-lock').addEventListener('click',()=>{panelController.lock(!panelController.state.locked);syncPanelButtons();});$('#panel-pin').addEventListener('click',()=>{panelController.pin(!panelController.state.pinned);syncPanelButtons();});$('#panel-collapse').addEventListener('click',()=>{panelController.minimize(!panelController.state.minimized);syncPanelButtons();});syncPanelButtons();

const help=new HelpWiz({registry:{'demo.help':{title:'InspectorPanel',short:'Panneau flottant de diagnostic.',long:'InspectorPanel centralise aide, test, IDs et détails techniques. Il peut être déplacé, verrouillé, épinglé, plié et redimensionné.',technical:{component:'FloatingPanel + HelpWiz'}},'demo.qr':{title:'DMO-QR-001 — QR Studio',short:'Tester la génération QR dynamique.',long:'Testez presets, transparence, couleurs, niveau de correction, logo, visibilité des previews et régénération.',technical:{id:'DMO-QR-001',technicalId:'demo.output.qr-studio',component:'QRWiz',encoder:'qrcode@1.5.4 via ESM'}},...sectionHelp},panelFactory:(entry)=>{panel.hidden=false;$('#help-content').innerHTML=`<h3>${entry.title}</h3><p>${entry.long}</p><pre>${JSON.stringify(entry.technical,null,2)}</pre>`;panelController.render();syncPanelButtons();}});help.attach(document,{experience:'webmaster'});

workshop.mountColorPicker($('#theme-pickers'),['accent','bg','fg','border']);
function setWorkshopToken(name,value){workshop.setToken(name,value);renderConfig();}
$('#unlock').addEventListener('click',()=>{workshop.toggleUnlocked();$('#unlock span:last-child').textContent=workshop.unlocked?'Édition déverrouillée':'Déverrouiller';$('#unlock').dataset.on=String(workshop.unlocked);applyIcons($('#unlock'));});
$('#lock-all').addEventListener('click',()=>workshop.lockAll());
$('#export-theme').addEventListener('click',()=>{$('#theme-json').value=workshop.exportJSON();themeExportBlock.setValue($('#theme-json').value);});
$('#import-theme').addEventListener('click',()=>{try{workshop.importJSON($('#theme-json').value);workshop.mountColorPicker($('#theme-pickers'),['accent','bg','fg','border']);applyTypography();applyBackground();renderConfig();}catch(error){alert(error.message);}});
$('#reset-theme').addEventListener('click',()=>{workshop.resetSession();engine.reset();engine.apply(document.documentElement,DEFAULT_THEME);workshop.mountColorPicker($('#theme-pickers'),['accent','bg','fg','border']);resetThemeControls();renderConfig();});
$('#refresh-page').addEventListener('click',()=>{const button=$('#refresh-page');button.classList.add('is-pressed');setTimeout(()=>location.reload(),120);});
$('#info-toggle').addEventListener('click',()=>{const on=$('#info-toggle').dataset.on!=='true';$('#info-toggle').dataset.on=String(on);document.documentElement.dataset.demoInfo=String(on);$('#info-toggle span:last-child').textContent=`Info ${on?'ON':'OFF'}`;});document.documentElement.dataset.demoInfo='true';

const densityDefaults={compact:.86,normal:1,comfortable:1.14};let densityScale=Number(workshop.sessionPatch.tokens?.density_scale??1);
function applyDensity(){document.documentElement.style.setProperty('--demo-density',String(densityScale));$('#density-value').textContent=`${Math.round(densityScale*100)} %`;setWorkshopToken('density_scale',String(densityScale));}
$('#density').addEventListener('change',()=>{densityScale=densityDefaults[$('#density').value]??1;workshop.sessionPatch.density=$('#density').value;applyDensity();});$('#density-minus').addEventListener('click',()=>{densityScale=Math.max(.7,Math.round((densityScale-.02)*100)/100);applyDensity();});$('#density-plus').addEventListener('click',()=>{densityScale=Math.min(1.35,Math.round((densityScale+.02)*100)/100);applyDensity();});$('#density-reset').addEventListener('click',()=>{densityScale=densityDefaults[$('#density').value]??1;applyDensity();});
function applyTypography(){setWorkshopToken('font_body',$('#font-body').value);setWorkshopToken('font_heading',$('#font-heading').value);setWorkshopToken('font_accent',$('#font-accent').value);setWorkshopToken('font_weight_heading',$('#font-weight').value);$('#font-weight-value').textContent=$('#font-weight').value;}
for(const id of ['font-body','font-heading','font-accent','font-weight'])$( `#${id}`).addEventListener(id==='font-weight'?'input':'change',applyTypography);
function applyBackground(){const one=$('#bg-one').value,two=$('#bg-two').value,mode=$('#background-mode').value,direction=$('#bg-direction').value;const background=mode==='gradient'?`linear-gradient(${direction}, ${one}, ${two})`:one;document.body.style.setProperty('--demo-page-background',background);workshop.setToken('page_background',background);renderConfig();}
for(const id of ['background-mode','bg-one','bg-two','bg-direction'])$( `#${id}`).addEventListener(id.startsWith('bg-')&&id!=='bg-direction'?'input':'change',applyBackground);
const bgPresets={light:{mode:'solid',one:'#f7f8fb',two:'#f7f8fb'},dark:{mode:'solid',one:'#172033',two:'#172033'},color:{mode:'solid',one:'#eef4ff',two:'#eef4ff'},gradient:{mode:'gradient',one:'#eef4ff',two:'#f7efff'}};
for(const button of $$('[data-bg-preset]'))button.addEventListener('click',()=>{const p=bgPresets[button.dataset.bgPreset];$('#background-mode').value=p.mode;$('#bg-one').value=p.one;$('#bg-two').value=p.two;applyBackground();});
function resetThemeControls(){$('#font-body').value='Inter,system-ui,sans-serif';$('#font-heading').value='Inter,system-ui,sans-serif';$('#font-accent').value='Georgia,serif';$('#font-weight').value='700';densityScale=1;$('#density').value='normal';$('#background-mode').value='gradient';$('#bg-one').value='#eef4ff';$('#bg-two').value='#f7f2ff';applyTypography();applyDensity();applyBackground();}

const qrControls={url:$('#qr-url'),width:$('#qr-width'),margin:$('#qr-margin'),ecc:$('#qr-ecc'),dark:$('#qr-dark'),light:$('#qr-light'),transparent:$('#qr-transparent'),logo:$('#qr-logo-enabled')};qrControls.url.value=location.href;
const qrPresets={standard:{dark:'#111827',light:'#ffffff',transparent:false,logo:false,ecc:'M'},transparent:{dark:'#111827',light:'#ffffff',transparent:true,logo:false,ecc:'M'},colored:{dark:'#0f766e',light:'#ecfeff',transparent:false,logo:false,ecc:'Q'},logo:{dark:'#1d4ed8',light:'#ffffff',transparent:false,logo:true,ecc:'H'},mono:{dark:null,light:'#ffffff',transparent:true,logo:false,ecc:'M'}};
function currentAccent(){return engine.resolve({user:workshop.sessionPatch}).tokens?.accent||'#2563eb';}
function customQRConfig(){return {url:qrControls.url.value||location.href,width:Number(qrControls.width.value),margin:Number(qrControls.margin.value),errorCorrectionLevel:qrControls.ecc.value,dark:qrControls.dark.value,light:qrControls.light.value,transparent:qrControls.transparent.checked,logo:qrControls.logo.checked?demoLogo:null,logoSize:.22,logoBackground:'#ffffff',logoRadius:14,format:'svg'};}
function presetConfig(name){const p=qrPresets[name];return {url:qrControls.url.value||location.href,width:180,margin:2,errorCorrectionLevel:p.ecc,dark:p.dark||currentAccent(),light:p.light,transparent:p.transparent,logo:p.logo?demoLogo:null,logoSize:.22,logoBackground:'#ffffff',logoRadius:14,format:'svg'};}
async function renderQR(target,config){const node=$(target);try{await qrWiz.render(node,config);}catch(error){node.textContent=`QR indisponible : ${error.message}`;}}
const qrConfigBlock=new CodeBlock({value:'{}',language:'json',filename:'qr-preset.json',theme:'dark',highlighted:true}).mount($('#qr-config-block'));
async function renderQRStudio(){const button=$('#qr-refresh');button.disabled=true;button.classList.add('is-pressed');$('#qr-margin-value').value=qrControls.margin.value;await Promise.all([renderQR('#qr-standard',presetConfig('standard')),renderQR('#qr-transparent-preview',presetConfig('transparent')),renderQR('#qr-colored',presetConfig('colored')),renderQR('#qr-logo',presetConfig('logo')),renderQR('#qr-mono',presetConfig('mono')),renderQR('#qr-custom',customQRConfig())]);qrConfigBlock.setValue(JSON.stringify({...customQRConfig(),logo:qrControls.logo.checked?'demo-logo.svg':null},null,2));button.disabled=false;setTimeout(()=>button.classList.remove('is-pressed'),180);renderConfig();}
function applyQRControlPreset(name){if(name==='custom')return;const p=qrPresets[name];qrControls.dark.value=p.dark||currentAccent();qrControls.light.value=p.light;qrControls.transparent.checked=p.transparent;qrControls.logo.checked=p.logo;qrControls.ecc.value=p.ecc;renderQRStudio();}
$('#qr-active-preset').addEventListener('change',()=>applyQRControlPreset($('#qr-active-preset').value));for(const element of Object.values(qrControls))element.addEventListener(element.type==='text'||element.type==='range'||element.type==='color'?'input':'change',renderQRStudio);$('#qr-refresh').addEventListener('click',renderQRStudio);for(const box of $$('[data-qr-visible]'))box.addEventListener('change',()=>{const card=$(`[data-qr-card="${box.dataset.qrVisible}"]`);if(card)card.hidden=!box.checked;});

$('#document-preview').addEventListener('click',()=>$('#document-output').textContent=documentWiz.renderHTML(data[0],{fields:['name','category','minutes','rating','tags'],labels:{name:'Nom',category:'Catégorie',minutes:'Durée',rating:'Note',tags:'Tags'}}));

const samples={json:{filename:'demo.json',language:'json',value:'{\n  "id": "DMO-001",\n  "active": true,\n  "count": 3\n}'},javascript:{filename:'demo.js',language:'javascript',value:'const items = [1, 2, 3];\nfunction total(values) {\n  return values.reduce((a, b) => a + b, 0);\n}\nconsole.log(total(items));'},python:{filename:'demo.py',language:'python',value:'items = [1, 2, 3]\ndef total(values):\n    return sum(values)\n\nprint(total(items))'},bash:{filename:'demo.sh',language:'bash',value:'#!/usr/bin/env bash\nset -euo pipefail\nfor item in one two three; do\n  echo "$item"\ndone'},text:{filename:'demo.txt',language:'text',value:'Lorem ipsum — exemple de bloc texte brut.\nDeuxième ligne de démonstration.'}};
const sampleBlock=new CodeBlock({...samples.json,theme:'light',highlighted:true}).mount($('#code-block-demo'));
for(const button of $$('[data-code-sample]'))button.addEventListener('click',()=>{const sample=samples[button.dataset.codeSample];sampleBlock.filename=sample.filename;sampleBlock.language=sample.language;sampleBlock.value=sample.value;sampleBlock.highlighted=sample.language!=='text';sampleBlock.render();});
const configBlock=new CodeBlock({value:'{}',language:'json',filename:'framework-config.json',theme:'dark',highlighted:true}).mount($('#config-code-block'));const themeExportBlock=new CodeBlock({value:'{}',language:'json',filename:'theme-workshop.json',theme:'dark',highlighted:true});
function renderConfig(){const config={breakpoint:Number($('#breakpoint').value),localBreakpoint:Number($('#local-breakpoint').value),renderer:rendererSelect.value,theme:engine.resolve({user:workshop.sessionPatch}),workshop:{unlocked:workshop.unlocked,locks:[...workshop.componentLocks],patch:workshop.sessionPatch},visitor:visitor.values,search:{query:searchInput.value,mode:$('#search-mode').value},category:category.value,cardSize:Number($('#card-size').value),images:$('#toggle-images').dataset.on==='true',qr:{...customQRConfig(),logo:qrControls.logo.checked?'demo-logo.svg':null}};configBlock.setValue(JSON.stringify(config,null,2));}

studio.render($('#json-editor'));renderTable();applyBackground();applyTypography();applyDensity();renderResults();renderResponsive();await renderQRStudio();renderConfig();status.textContent='Catalogue initialisé — utilisez les IDs et boutons Info pour documenter vos tests.';
