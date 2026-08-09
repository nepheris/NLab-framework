(()=>{
  async function mount(target,config={}){
    const root=typeof target==='string'?document.querySelector(target):target;if(!root)return null;
    const base=config.base||'.';const engine=window.NLabThemeEngine;if(!engine)throw new Error('NLabThemeEngine unavailable');
    await engine.init(base);
    const presets=engine.state.palettes?.Data?.presets||[];
    const registry=engine.state.registry?.Data||{};
    root.innerHTML='<div class="nlab-theme-config"><label>Thème<select data-theme-id></select></label><label>Palette<select data-theme-preset></select></label><label>Couleur dominante<input data-theme-color type="color"></label><label>HEX<input data-theme-hex type="text" pattern="#[0-9A-Fa-f]{6}"></label><button type="button" data-theme-apply>Appliquer</button></div>';
    const theme=root.querySelector('[data-theme-id]'),preset=root.querySelector('[data-theme-preset]'),picker=root.querySelector('[data-theme-color]'),hex=root.querySelector('[data-theme-hex]'),btn=root.querySelector('[data-theme-apply]');
    theme.innerHTML=(registry.themes||[]).map(t=>`<option value="${t.id}">${t.id}</option>`).join('');
    preset.innerHTML=presets.map(p=>`<option value="${p.id}">${p.label}</option>`).join('');
    theme.value=config.theme||registry.default_theme;
    preset.value=config.preset||presets[0]?.id||'';
    const sync=()=>{const v=engine.resolveDominant(hex.value||preset.value);picker.value=v;hex.value=v;return engine.apply({base,theme:theme.value,dominant:v,overrides:config.overrides||{}});};
    const initial=engine.resolveDominant(config.dominant||preset.value);picker.value=initial;hex.value=initial;
    preset.addEventListener('change',()=>{const v=engine.resolveDominant(preset.value);picker.value=v;hex.value=v;sync();});
    picker.addEventListener('input',()=>{hex.value=picker.value;sync();});
    hex.addEventListener('change',()=>sync());theme.addEventListener('change',()=>sync());btn.addEventListener('click',()=>sync());
    await sync();return {root,apply:sync};
  }
  window.NLabThemeConfigurator={mount};
})();
