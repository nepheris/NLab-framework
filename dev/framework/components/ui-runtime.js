(()=>{
  'use strict';

  const SCRIPT=document.currentScript;
  const CONFIG=window.NLabConfig||{};
  const INLINE=window.NLabRuntimeData||{};
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const icon=name=>window.NLabIcons?.get?.(name)||'';
  const state={manifest:null,buttons:null,components:null,help:null,toolbar:null,experience:'public',devHelp:new Map()};

  const baseUrl=()=>{
    if(CONFIG.frameworkBase)return new URL(CONFIG.frameworkBase,document.baseURI);
    if(SCRIPT?.src)return new URL('../',SCRIPT.src);
    return new URL('../',document.baseURI);
  };
  const resolve=url=>new URL(url,baseUrl()).href;
  const load=async (key,url)=>{
    if(INLINE[key])return INLINE[key];
    const r=await fetch(resolve(url),{cache:'no-store'});
    if(!r.ok)throw new Error(`${url} ${r.status}`);
    return r.json();
  };
  const canonical=(key)=>state.manifest?.Data?.canonical?.[key];
  const experience=()=>CONFIG.experience||document.documentElement.dataset.nlabExperience||document.body?.dataset.nlabExperience||'public';

  function buttonDef(id){return state.buttons?.Data?.buttons?.find(x=>x.id===id)||null}
  function helpEntry(id){return state.help?.Data?.entries?.find(x=>x.help_id===id)||null}
  function defaults(){return state.help?.Data?.defaults||{}}

  function makeButton(buttonId,options={}){
    const def=buttonDef(buttonId);
    if(!def)return null;
    const b=document.createElement('button');
    b.type='button';
    b.className=options.className||'nlab-ui-control';
    b.dataset.buttonId=buttonId;
    if(options.tool)b.dataset.tool=options.tool;
    const label=options.ariaLabel||def.aria_label||def.tooltip||def.label||buttonId;
    b.title=options.title||label;
    b.setAttribute('aria-label',label);
    b.innerHTML=icon(options.icon||def.icon);
    if(options.role)b.dataset.role=options.role;
    return b;
  }

  function setButtonState(button,stateName){
    const def=buttonDef(button.dataset.buttonId);
    const iconName=def?.state_icons?.[stateName]||def?.icon;
    if(iconName)button.innerHTML=icon(iconName);
    button.dataset.state=stateName;
  }

  function initFoldables(root=document){
    qa('details.nlab-fold',root).forEach(d=>{
      if(d.dataset.nlabReady)return;
      d.dataset.nlabReady='1';
      d.dataset.defaultOpen=d.open?'1':'0';
    });
  }
  function setFoldState(mode,root=document){
    qa('details.nlab-fold',root).forEach(d=>{
      if(mode==='open_all')d.open=true;
      else if(mode==='collapse_all')d.open=false;
      else d.open=d.dataset.defaultOpen==='1';
    });
  }

  function renderDevValue(value){
    if(value==null||value===''||(Array.isArray(value)&&!value.length))return '—';
    if(typeof value==='string')return value;
    return JSON.stringify(value,null,2);
  }

  function renderHelpBody(body,id){
    body.replaceChildren();
    const entry=helpEntry(id);
    const fallback=state.devHelp.get(id)?.public||{};
    const pub=entry?.public||fallback;
    const display={...defaults(),...(entry?.display||{})};
    const mode=display.panel_mode||display.public_panel_mode||'short_then_long';
    const shortText=pub?.short_text||id;
    const longText=pub?.long_text||shortText;

    const publicBlock=document.createElement('section');
    publicBlock.className='nlab-help-public';
    if(mode!=='long_only'){
      const p=document.createElement('p');
      p.className='nlab-help-short';
      p.textContent=shortText;
      publicBlock.appendChild(p);
    }
    if(mode==='long_only'){
      const p=document.createElement('p');
      p.className='nlab-help-long';
      p.textContent=longText;
      publicBlock.appendChild(p);
    }else if(mode==='short_then_long'&&longText&&longText!==shortText){
      const details=document.createElement('details');
      details.className='nlab-fold nlab-help-long';
      details.open=(display.long_text_initial_state||'collapsed')==='expanded';
      const summary=document.createElement('summary');
      summary.textContent=defaults().long_text_label||'';
      const p=document.createElement('p');p.textContent=longText;
      details.append(summary,p);publicBlock.appendChild(details);
    }
    body.appendChild(publicBlock);

    if(state.experience==='dev'&&(defaults().dev_overlay||'below_public')!=='hidden'){
      const technical=state.devHelp.get(id)?.dev_overlay||state.devHelp.get(id)?.technical;
      const outer=document.createElement('details');
      outer.className='nlab-fold nlab-help-dev';
      outer.open=(defaults().dev_section_initial_state||'collapsed')==='expanded';
      const summary=document.createElement('summary');
      summary.textContent=defaults().dev_overlay_label||'';
      outer.appendChild(summary);
      if(technical&&typeof technical==='object'){
        Object.entries(technical).forEach(([name,value])=>{
          const section=document.createElement('details');
          section.className='nlab-fold nlab-help-dev-section';
          const s=document.createElement('summary');s.textContent=name;
          const pre=document.createElement('pre');pre.textContent=renderDevValue(value);
          section.append(s,pre);outer.appendChild(section);
        });
      }else{
        const p=document.createElement('p');
        p.textContent='—';
        outer.appendChild(p);
      }
      body.appendChild(outer);
    }
  }

  function bindHelpTriggers(root=document){
    qa('[data-help-id]',root).forEach(el=>{
      if(el.dataset.nlabHelpReady)return;
      el.dataset.nlabHelpReady='1';
      const id=el.dataset.helpId;
      const entry=helpEntry(id);
      const shortText=entry?.public?.short_text;
      if(shortText&&!el.title)el.title=shortText;
      if(shortText&&!el.getAttribute('aria-label')&&el.tagName==='BUTTON')el.setAttribute('aria-label',shortText);
      el.addEventListener('click',e=>{e.preventDefault();window.NLabHelp?.open?.(id)});
    });
  }

  function initHelp(root=document){
    const host=q('[data-nlab-help-panel]',root);
    if(!host||host.dataset.nlabReady)return;
    host.dataset.nlabReady='1';
    host.classList.add('nlab-card');
    Object.assign(host.style,{position:'fixed',right:'14px',top:'84px',width:'min(460px,calc(100vw - 28px))',maxHeight:'75vh',display:'none',zIndex:'110',overflow:'hidden'});

    const header=document.createElement('div');
    Object.assign(header.style,{display:'flex',alignItems:'center',gap:'8px',padding:'10px 12px',borderBottom:'1px solid var(--nlab-line)'});
    const anchor=makeButton('anchor',{role:'drag_handle'});
    const title=document.createElement('strong');title.style.flex='1';title.textContent=defaults().panel_title||'';
    const reset=makeButton('reset');
    const close=makeButton('close');
    [anchor,title,reset,close].filter(Boolean).forEach(x=>header.appendChild(x));
    const body=document.createElement('div');body.dataset.helpBody='1';Object.assign(body.style,{padding:'14px',overflow:'auto',maxHeight:'calc(75vh - 48px)'});
    host.replaceChildren(header,body);

    const closePanel=()=>{host.style.display='none'};
    const open=(id=defaults().global_help_id||'HELP_CONTEXTUAL_HELP')=>{renderHelpBody(body,id);host.dataset.helpId=id;host.style.display='block'};
    close?.addEventListener('click',closePanel);
    reset?.addEventListener('click',()=>{host.style.right='14px';host.style.top='84px'});
    window.NLabHelp={
      open,
      close:closePanel,
      toggle:(id=defaults().global_help_id||'HELP_CONTEXTUAL_HELP')=>host.style.display==='block'?closePanel():open(id),
      registerDev:(id,data)=>{state.devHelp.set(id,data||{});if(host.dataset.helpId===id&&host.style.display==='block')renderHelpBody(body,id)},
      get:id=>helpEntry(id)
    };
    bindHelpTriggers(root);
  }

  function dispatchAction(buttonId,button){
    const event=new CustomEvent('nlab:action',{bubbles:true,detail:{button_id:buttonId,button,experience:state.experience}});
    button.dispatchEvent(event);
  }

  function initToolbar(root=document){
    const host=q('[data-nlab-toolbar]',root);
    if(!host||host.dataset.nlabReady||!state.toolbar)return;
    host.dataset.nlabReady='1';host.classList.add('nlab-card');
    Object.assign(host.style,{position:'fixed',right:'14px',bottom:'14px',display:'flex',gap:'5px',padding:'6px',zIndex:'100'});
    const actions=state.toolbar.Data?.actions||[];
    let foldIndex=0;
    actions.filter(a=>a.enabled!==false).filter(a=>!a.experience||a.experience===state.experience).forEach(action=>{
      const b=makeButton(action.button_id,{role:action.role});
      if(!b)return;
      host.appendChild(b);
      b.addEventListener('click',()=>{
        const id=action.button_id;
        if(id==='help')return window.NLabHelp?.toggle?.();
        if(id==='scroll_top')return scrollTo({top:0,behavior:'smooth'});
        if(id==='scroll_bottom')return scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'});
        if(id==='fold_state'){
          const def=buttonDef(id);const states=def?.states||['default','open_all','collapse_all'];
          foldIndex=(foldIndex+1)%states.length;const next=states[foldIndex];setFoldState(next,root);setButtonState(b,next);return;
        }
        if(id==='more'){
          const collapsed=host.dataset.collapsed==='1';
          host.dataset.collapsed=collapsed?'0':'1';
          [...host.children].forEach(x=>{if(x!==b)x.style.display=collapsed?'':'none'});return;
        }
        dispatchAction(id,b);
      });
    });
  }

  async function loadRuntimeData(){
    state.experience=experience();
    state.manifest=INLINE.manifest||await load('manifest',CONFIG.manifestUrl||'framework-manifest.json');
    const cp=key=>canonical(key);
    state.buttons=INLINE.buttons||await load('buttons',cp('button_registry'));
    state.components=INLINE.components||await load('components',cp('component_registry'));
    state.help=INLINE.help||await load('help',cp('help_registry'));
    const toolbarComponent=state.components.Data?.components?.find(x=>x.id==='floating_toolbar');
    const toolbarPath=toolbarComponent?.default_config;
    if(toolbarPath){
      const componentRegistryUrl=new URL(cp('component_registry'),baseUrl());
      const toolbarUrl=new URL(toolbarPath,componentRegistryUrl).href;
      if(INLINE.toolbar)state.toolbar=INLINE.toolbar;
      else {const r=await fetch(toolbarUrl,{cache:'no-store'});if(r.ok)state.toolbar=await r.json();}
    }
    if(CONFIG.devHelpData&&typeof CONFIG.devHelpData==='object')Object.entries(CONFIG.devHelpData).forEach(([id,data])=>state.devHelp.set(id,data));
  }

  async function boot(root=document){
    try{
      await loadRuntimeData();
      initFoldables(root);initHelp(root);initToolbar(root);bindHelpTriggers(root);
      document.dispatchEvent(new CustomEvent('nlab:ready',{detail:{experience:state.experience}}));
    }catch(error){
      console.warn('nLab UI runtime not initialized:',error);
      document.dispatchEvent(new CustomEvent('nlab:error',{detail:{source:'ui-runtime',error}}));
    }
  }

  window.NLabUI={boot,setFoldState,state,makeButton,buttonDef,setButtonState};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>boot());else boot();
})();