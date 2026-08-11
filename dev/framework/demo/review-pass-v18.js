import { BrowserStorage } from '../core/storage.js';
import { ThemeEngine, DEFAULT_THEME } from '../themes/theme-engine.js';
import { ThemeWorkshop } from '../components/theme-workshop.js';

const V='18';
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
function status(panel,text){const out=$('[data-v18-scope-status]',panel); if(out)out.textContent=text;}
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
  const id=`v18.${panel.dataset.themeId}.${name.toLowerCase()}.${scope}`;
  workshop.saveProfile(id,{label:`${name} · ${scope}`,scope,target,patch:patches[name]});
  workshop.applyProfile(id);
  status(panel,`${name} appliqué · portée ${scope} · ${countFor(target,scope)} élément(s)`);
}
function mountScopeLab(panel){
  if(!panel?.dataset.themeId||$('[data-v18-scope-lab]',panel))return;
  const lab=document.createElement('div');
  lab.dataset.v18ScopeLab='1';
  lab.className='demo-subpanel nlab-stack';
  lab.innerHTML=`
    <strong>V18 · Portée réelle du Theme Workshop</strong>
    <p class="demo-hint">Ces profils passent par le composant framework : instance, même type ou global. Le profil mémorise aussi sa portée.</p>
    <div class="demo-controls">
      <button type="button" data-v18-profile="default">Défaut</button>
      <button type="button" data-v18-profile="XS">XS</button>
      <button type="button" data-v18-profile="L">L</button>
      <button type="button" data-v18-profile="XL">XL</button>
      <button type="button" data-v18-profile="XXL">XXL</button>
      <button type="button" data-v18-radius-reset>↺ Coins</button>
    </div>
    <code data-v18-scope-status>Prêt · choisissez une portée puis un profil.</code>`;
  panel.append(lab);
  $$('[data-v18-profile]',lab).forEach(button=>button.addEventListener('click',()=>applyProfile(panel,button.dataset.v18Profile)));
  $('[data-v18-radius-reset]',lab).addEventListener('click',()=>{
    const scope=activeScope(panel),target=targetFor(panel);
    workshop.resetScoped(target,{scope,property:'borderRadius',kind:'styles'});
    status(panel,`Coins restaurés · portée ${scope}`);
  });
  $$('.review-scope button[data-scope]',panel).forEach(button=>button.addEventListener('click',()=>{
    setTimeout(()=>status(panel,`Portée active : ${button.dataset.scope} · cible ${targetFor(panel)}`),0);
  }));
}

function mount(){
  setVersion();
  prepareEditableTypes();
  const theme=$('#theme-workshop');
  if(!theme)return;
  const panels=$$('.demo-grid2 > .demo-panel',theme);
  const density=$('#density')?.closest('.demo-panel');
  [...panels,density].filter(Boolean).forEach(mountScopeLab);
  const note=document.createElement('div');
  note.className='demo-test-note';
  note.innerHTML='<strong>V18 :</strong> la portée n’est plus une simulation de la démo. Elle est stockée dans <code>ThemeWorkshop.sessionPatch.scopes</code> avec cascade <code>global → type → instance</code> et reset par propriété.';
  const purpose=$('.demo-section-purpose',theme); purpose?.insertAdjacentElement('afterend',note);
}

mount();
