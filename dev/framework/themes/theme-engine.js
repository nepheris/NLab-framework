(()=>{
  const S={registry:null,palettes:null,theme:null};
  const load=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw new Error(`${u} ${r.status}`);return r.json();};
  async function init(base='.'){
    S.registry=await load(`${base}/theme-registry.json`);
    S.palettes=await load(`${base}/${S.registry.Data.palette_presets}`);
    return S;
  }
  function resolveDominant(value){
    if(/^#[0-9A-F]{6}$/i.test(String(value||'')))return String(value).toUpperCase();
    const key=String(value||'').toLowerCase();
    const p=(S.palettes?.Data?.presets||[]).find(x=>x.id===key||(x.aliases||[]).includes(key));
    return p?.dominant_color||(S.palettes?.Data?.presets||[])[0]?.dominant_color||'#316D9A';
  }
  async function apply(options={}){
    const base=options.base||'.';if(!S.registry)await init(base);
    const id=options.theme||S.registry.Data.default_theme;
    const entry=(S.registry.Data.themes||[]).find(x=>x.id===id);if(!entry)throw new Error(`Unknown theme ${id}`);
    S.theme=await load(`${base}/${entry.definition}`);
    const dominant=resolveDominant(options.dominant||options.preset||'');
    const adapter=entry.runtime_global&&window[entry.runtime_global];
    if(adapter?.apply)adapter.apply(dominant,options.target||document.documentElement);
    for(const [name,value] of Object.entries(options.css_variables||{}))(options.target||document.documentElement).style.setProperty(name,value);
    return {theme:id,dominant};
  }
  window.NLabThemeEngine={state:S,init,apply,resolveDominant};
})();
