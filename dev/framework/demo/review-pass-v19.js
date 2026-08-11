import { BrowserStorage } from '../core/storage.js';
import { ThemeEngine, DEFAULT_THEME } from '../themes/theme-engine.js';
import { ThemeWorkshop } from '../components/theme-workshop.js';

const V='19';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const storage=new BrowserStorage(localStorage,{prefix:'nlab-demo:'});
const engine=new ThemeEngine({base:DEFAULT_THEME,storage,storageKey:'theme'}).load();
const workshop=new ThemeWorkshop({root:document,engine,storage,storageKey:'workshop-v18'});

function setVersion(){
  document.documentElement.dataset.demoVersion=V;
  document.title=`Framework V2 — Démonstration V${V}`;
  const title=$('#overview h1'); if(title)title.textContent=`Framework V2 — page de démonstration V${V}`;
  const badge=$('.v16-version'); if(badge)badge.textContent=`V${V}`;
  const header=$('.demo-header>strong'); if(header)header.textContent=`Catalogue / Playground · V${V}`;
  const status=$('.v16-status'); if(status)status.title=`Page de démonstration V${V}`;
}

function prepareEditableTypes(){
  const theme=$('#theme-workshop'); if(!theme)return;
  $$('.demo-panel',theme).forEach((el,index)=>{
    el.setAttribute('data-theme-editable','');
    el.dataset.themeType=el.dataset.themeType||'demo-panel';
    el.dataset.themeId=el.dataset.themeId||`theme-panel-${index+1}`;
  });
  const header=$('[data-theme-id="demo-header"]'); if(header)header.dataset.themeType='header';
  const hero=$('[data-theme-id="demo-hero"]'); if(hero)hero.dataset.themeType='hero';
  workshop.applySession();
}

function activeScope(panel){
  return $('.review-scope button.is-active',panel)?.dataset.scope||panel.dataset.reviewScope||'global';
}
function targetFor(panel){return panel.dataset.themeId||panel.id;}
function countFor(target,scope){
  const el=$(`[data-theme-id="${target}"]`); if(!el)return 0;
  if(scope==='global')return $$('[data-theme-editable]').length;
  if(scope==='type')return $$(`[data-theme-editable][data-theme-type="${el.dataset.themeType||''}"]`).length;
  return 1;
}
function status(panel,text){const out=$('[data-v19-scope-status]',panel); if(out)out.textContent=text;}

function ensureScopeControl(panel){
  if(!panel)return;
  let bar=$(':scope > .review-scope',panel);
  if(!bar){
    bar=document.createElement('div');
    bar.className='review-toolbar review-scope';
    bar.innerHTML='<strong>Portée :</strong><button type="button" data-scope="global" class="is-active">Global</button><button type="button" data-scope="type">Même type</button><button type="button" data-scope="instance">Cet élément</button>';
    panel.prepend(bar);
  }
  if(bar.dataset.v19Bound==='1')return;
  bar.dataset.v19Bound='1';
  const buttons=$$('button[data-scope]',bar);
  const initial=panel.dataset.reviewScope||$('.is-active',bar)?.dataset.scope||'global';
  for(const button of buttons){
    button.classList.toggle('is-active',button.dataset.scope===initial);
    button.addEventListener('click',()=>{
      panel.dataset.reviewScope=button.dataset.scope;
      for(const other of buttons)other.classList.toggle('is-active',other===button);
      status(panel,`Portée active : ${button.dataset.scope} · cible ${targetFor(panel)}`);
    });
  }
  panel.dataset.reviewScope=initial;
}

function applyProfile(panel,name){
  const scope=activeScope(panel),target=targetFor(panel);
  if(name==='default'){
    workshop.resetScoped(target,{scope});
    status(panel,`Défaut restauré · portée ${scope} · ${countFor(target,scope)} élément(s)`);
    return;
  }
  const patches={
    XS:{styles:{padding:'4px',borderRadius:'4px',fontSize:'.85rem'},tokens:{border_width:'1px'}},
    L:{styles:{padding:'12px',borderRadius:'12px',fontSize:'1rem'},tokens:{border_width:'1px'}},
    XL:{styles:{padding:'18px',borderRadius:'22px',fontSize:'1.05rem'},tokens:{border_width:'2px'}},
    XXL:{styles:{padding:'24px',borderRadius:'32px',fontSize:'1.12rem',boxShadow:'0 12px 34px rgba(0,0,0,.16)'},tokens:{border_width:'3px'}}
  };
  const id=`v19.${panel.dataset.themeId}.${name.toLowerCase()}.${scope}`;
  workshop.saveProfile(id,{label:`${name} · ${scope}`,scope,target,patch:patches[name]});
  workshop.applyProfile(id);
  status(panel,`${name} appliqué · portée ${scope} · ${countFor(target,scope)} élément(s)`);
}
function mountScopeLab(panel){
  if(!panel?.dataset.themeId)return;
  ensureScopeControl(panel);
  if($('[data-v19-scope-lab]',panel))return;
  const lab=document.createElement('div');
  lab.dataset.v19ScopeLab='1';
  lab.className='demo-subpanel nlab-stack';
  lab.innerHTML=`
    <strong>V19 · Portée native + contrôles historiques</strong>
    <p class="demo-hint">Les profils et les contrôles historiques compatibles utilisent maintenant la même API de portée : instance, même type ou global.</p>
    <div class="demo-controls">
      <button type="button" data-v19-profile="default">Défaut</button>
      <button type="button" data-v19-profile="XS">XS</button>
      <button type="button" data-v19-profile="L">L</button>
      <button type="button" data-v19-profile="XL">XL</button>
      <button type="button" data-v19-profile="XXL">XXL</button>
      <button type="button" data-v19-radius-reset>↺ Coins</button>
    </div>
    <code data-v19-scope-status>Prêt · choisissez une portée puis utilisez un profil ou un réglage du panneau.</code>`;
  panel.append(lab);
  $$('[data-v19-profile]',lab).forEach(button=>button.addEventListener('click',()=>applyProfile(panel,button.dataset.v19Profile)));
  $('[data-v19-radius-reset]',lab).addEventListener('click',()=>{
    const scope=activeScope(panel),target=targetFor(panel);
    workshop.resetScoped(target,{scope,property:'borderRadius',kind:'styles'});
    status(panel,`Coins restaurés · portée ${scope}`);
  });
}

function adjustHex(hex,factor){
  const n=parseInt(String(hex).slice(1),16);
  if(!Number.isFinite(n))return '#000000';
  const values=[(n>>16)&255,(n>>8)&255,n&255].map(value=>Math.max(0,Math.min(255,Math.round(value*factor))));
  return `#${values.map(value=>value.toString(16).padStart(2,'0')).join('')}`;
}
function bridgeStatus(panel,label){status(panel,`${label} · portée ${activeScope(panel)} · ${countFor(targetFor(panel),activeScope(panel))} élément(s)`);}
function applyScopedToken(panel,name,value){workshop.setScopedToken(targetFor(panel),name,value,{scope:activeScope(panel)});}
function applyScopedStyle(panel,name,value){workshop.setScopedStyle(targetFor(panel),name,value,{scope:activeScope(panel)});}

function bridgeHistoricalControls(){
  const theme=$('#theme-workshop'); if(!theme)return;
  const panels=$$('.demo-grid2 > .demo-panel',theme);
  const colorPanel=panels[0],typePanel=panels[1],densityPanel=$('#density')?.closest('.demo-panel');
  if(!colorPanel||!typePanel||!densityPanel)return;

  const intercept=(control,eventName,handler)=>{
    control?.addEventListener(eventName,(event)=>{
      const panel=control.closest('.demo-panel');
      if(!panel||activeScope(panel)==='global')return;
      event.stopImmediatePropagation();
      handler(panel,control,event);
    },true);
  };

  for(const input of $$('#theme-pickers input[type="color"]')){
    intercept(input,'input',(panel,control)=>{
      const token=control.closest('.nlab-color-control')?.dataset.token;
      if(token){applyScopedToken(panel,token,control.value);bridgeStatus(panel,`Couleur ${token} appliquée`);}
    });
  }

  const updateBackground=(panel)=>{
    const one=$('#bg-one').value,two=$('#bg-two').value,mode=$('#background-mode').value,direction=$('#bg-direction').value,light=Number($('#bg-lightness').value)/100;
    $('#bg-lightness-value').textContent=`${Math.round(light*100)} %`;
    const c1=adjustHex(one,light),c2=adjustHex(two,light);
    const background=$('#bg-transparent').checked?'transparent':mode==='gradient'?`linear-gradient(${direction}, ${c1}, ${c2})`:c1;
    applyScopedStyle(panel,'background',background);bridgeStatus(panel,'Background appliqué');
  };
  for(const id of ['background-mode','bg-one','bg-two','bg-direction','bg-lightness','bg-transparent']){
    const control=$(`#${id}`); intercept(control,['bg-one','bg-two','bg-lightness'].includes(id)?'input':'change',updateBackground);
  }
  const bgPresets={light:{mode:'solid',one:'#f7f8fb',two:'#f7f8fb'},dark:{mode:'solid',one:'#172033',two:'#172033'},color:{mode:'solid',one:'#eef4ff',two:'#eef4ff'},gradient:{mode:'gradient',one:'#eef4ff',two:'#f7efff'}};
  for(const button of $$('[data-bg-preset]')){
    intercept(button,'click',(panel)=>{
      const preset=bgPresets[button.dataset.bgPreset]; if(!preset)return;
      $('#background-mode').value=preset.mode;$('#bg-one').value=preset.one;$('#bg-two').value=preset.two;$('#bg-transparent').checked=false;updateBackground(panel);
    });
  }

  const updateBorders=(panel)=>{
    const visible=$('#border-visible').checked,width=visible?Number($('#border-width').value):0,radius=Number($('#border-radius').value);
    $('#border-width-value').textContent=`${width} px`;$('#border-radius-value').textContent=`${radius} px`;
    applyScopedStyle(panel,'borderWidth',`${width}px`);applyScopedStyle(panel,'borderRadius',`${radius}px`);applyScopedStyle(panel,'borderStyle',width>0?'solid':'none');
    bridgeStatus(panel,'Bordures appliquées');
  };
  for(const id of ['border-visible','border-width','border-radius']){
    const control=$(`#${id}`); intercept(control,control?.type==='range'?'input':'change',updateBorders);
  }

  const updateTypography=(panel)=>{
    if($('#font-unified').checked){$('#font-heading').value=$('#font-body').value;$('#font-accent').value=$('#font-body').value;}
    applyScopedToken(panel,'font_body',$('#font-body').value);applyScopedToken(panel,'font_heading',$('#font-heading').value);applyScopedToken(panel,'font_accent',$('#font-accent').value);applyScopedToken(panel,'font_weight_heading',$('#font-weight').value);
    $('#font-weight-value').textContent=$('#font-weight').value;bridgeStatus(panel,'Typographie appliquée');
  };
  for(const id of ['font-body','font-heading','font-accent','font-weight','font-unified']){
    const control=$(`#${id}`); intercept(control,id==='font-weight'?'input':'change',updateTypography);
  }

  const densityDefaults={compact:.86,normal:1,comfortable:1.14};
  const updateDensity=(panel,scale)=>{
    const value=Math.max(.7,Math.min(1.35,Number(scale)||1));
    $('#density-value').textContent=`${Math.round(value*100)} %`;
    applyScopedStyle(panel,'--demo-density',String(value));applyScopedToken(panel,'density_scale',String(value));bridgeStatus(panel,'Densité appliquée');
  };
  intercept($('#density'),'change',(panel)=>updateDensity(panel,densityDefaults[$('#density').value]??1));
  for(const [id,delta] of [['density-minus',-.02],['density-plus',.02]]){
    intercept($(`#${id}`),'click',(panel)=>{
      const current=Number.parseInt($('#density-value').textContent,10)/100||densityDefaults[$('#density').value]||1;
      updateDensity(panel,Math.round((current+delta)*100)/100);
    });
  }
  intercept($('#density-reset'),'click',(panel)=>updateDensity(panel,densityDefaults[$('#density').value]??1));
}

function mount(){
  setVersion();
  prepareEditableTypes();
  const theme=$('#theme-workshop');
  if(!theme)return;
  const panels=$$('.demo-grid2 > .demo-panel',theme);
  const density=$('#density')?.closest('.demo-panel');
  [...panels,density].filter(Boolean).forEach(mountScopeLab);
  bridgeHistoricalControls();
  const note=document.createElement('div');
  note.className='demo-test-note';
  note.innerHTML='<strong>V19 :</strong> la portée native du <code>ThemeWorkshop</code> pilote maintenant aussi les contrôles historiques compatibles (couleurs, background, bordures, typographie et densité), sans écriture globale lorsque la portée Type ou Instance est active.';
  const purpose=$('.demo-section-purpose',theme); purpose?.insertAdjacentElement('afterend',note);
}

mount();
