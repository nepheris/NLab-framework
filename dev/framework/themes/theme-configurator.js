(()=>{
  const applyDominant=value=>window.NLabShadowSagePalette?.apply?.(value);
  async function loadPresets(url='theme-palette-presets.json'){
    const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('Palette presets '+r.status);return r.json();
  }
  function mount(target,config={}){
    const root=typeof target==='string'?document.querySelector(target):target;if(!root)return null;
    const source=config.source||'theme-palette-presets.json';
    root.innerHTML='<div class="nlab-theme-config"><label>Palette prédéfinie<select data-theme-preset></select></label><label>Couleur dominante<input data-theme-color type="color" value="#216E51"></label><label>HEX<input data-theme-hex type="text" value="#216E51" pattern="#[0-9A-Fa-f]{6}"></label><button type="button" data-theme-apply>Appliquer</button></div>';
    const preset=root.querySelector('[data-theme-preset]'),picker=root.querySelector('[data-theme-color]'),hex=root.querySelector('[data-theme-hex]'),btn=root.querySelector('[data-theme-apply]');
    loadPresets(source).then(j=>{preset.innerHTML=j.Data.presets.map(p=>`<option value="${p.dominant_color}">${p.label}</option>`).join('');const init=config.dominant_color||j.Data.presets[0]?.dominant_color||'#216E51';preset.value=init;picker.value=init;hex.value=init;applyDominant(init)}).catch(()=>{});
    const sync=v=>{if(/^#[0-9a-f]{6}$/i.test(v)){picker.value=v;hex.value=v;applyDominant(v)}};
    preset.addEventListener('change',()=>sync(preset.value));picker.addEventListener('input',()=>sync(picker.value));hex.addEventListener('change',()=>sync(hex.value.trim()));btn.addEventListener('click',()=>sync(hex.value.trim()));
    return {root,apply:sync};
  }
  window.NLabThemeConfigurator={mount,applyDominant,loadPresets};
})();