(()=>{
  const S={registry:null,palettes:null,tokens:null,theme:null};
  const load=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error(`${u} ${r.status}`);return r.json();};
  async function init(base='.'){
    S.registry=await load(`${base}/theme-registry.json`);
    S.palettes=await load(`${base}/${S.registry.Data.palette_presets}`);
    S.tokens=await load(`${base}/${S.registry.Data.design_tokens}`);
    return S;
  }
  function resolveDominant(value){
    if(/^#[0-9A-F]{6}$/i.test(String(value||'')))return String(value).toUpperCase();
    const key=String(value||'').toLowerCase();
    const p=(S.palettes?.Data?.presets||[]).find(x=>x.id===key||(x.aliases||[]).includes(key));
    return p?.dominant_color||(S.palettes?.Data?.presets||[])[0]?.dominant_color||'#316D9A';
  }
  function tokenMap(){const map={};const walk=(node,path=[])=>Object.entries(node||{}).forEach(([k,v])=>{if(v&&typeof v==='object'&&v.css)map[[...path,k].join('.')]=v.css;else if(v&&typeof v==='object')walk(v,[...path,k]);});walk(S.tokens?.Data?.tokens||{});return map;}
  function applyOverrides(values,target){const map=tokenMap();for(const [id,value] of Object.entries(values||{})){const css=map[id];if(css)target.style.setProperty(css,value);}return values||{};}
  async function apply(options={}){
    const base=options.base||'.';if(!S.registry)await init(base);
    const id=options.theme||S.registry.Data.default_theme;
    const entry=(S.registry.Data.themes||[]).find(x=>x.id===id);if(!entry)throw new Error(`Unknown theme ${id}`);
    S.theme=await load(`${base}/${entry.definition}`);
    const target=options.target||document.documentElement,dominant=resolveDominant(options.dominant||options.preset||S.theme.Data?.dominant_preset||'');
    const adapter=entry.runtime_global&&window[entry.runtime_global];if(entry.dominant_color_mode==='derive'&&adapter?.apply)adapter.apply(dominant,target);
    applyOverrides(S.theme.Data?.token_overrides,target);applyOverrides(options.overrides,target);
    return {theme:id,dominant,token_overrides:S.theme.Data?.token_overrides||{}};
  }
  window.NLabThemeEngine={state:S,init,apply,resolveDominant,applyOverrides};
})();
