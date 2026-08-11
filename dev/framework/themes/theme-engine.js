const clone = (value) => structuredClone(value ?? {});

export function deepMerge(...layers) {
  const merge = (target, source) => {
    for (const [key, value] of Object.entries(source ?? {})) {
      if (value && typeof value === 'object' && !Array.isArray(value)) target[key] = merge({ ...(target[key] ?? {}) }, value);
      else target[key] = clone(value);
    }
    return target;
  };
  return layers.reduce((acc, layer) => merge(acc, layer), {});
}

export class ThemeEngine {
  constructor({ base = {}, site = {}, variants = {}, storage = null, storageKey = null } = {}) { this.base=clone(base);this.site=clone(site);this.variants=clone(variants);this.storage=storage;this.storageKey=storageKey; }
  resolve({ variant = null, section = null, component = null, user = null } = {}) {
    const variantLayer=variant?this.variants[variant]??{}:{}; const sectionLayer=section?variantLayer.sections?.[section]??this.site.sections?.[section]??{}:{}; const componentLayer=component?sectionLayer.components?.[component]??variantLayer.components?.[component]??this.site.components?.[component]??{}:{};
    return deepMerge(this.base,this.site,variantLayer,sectionLayer,componentLayer,user??{});
  }
  apply(target=document.documentElement,resolved=this.resolve()) { const tokens=resolved.tokens??{};for(const [name,value] of Object.entries(tokens))target.style.setProperty(`--nlab-${name.replaceAll('_','-')}`,String(value));if(resolved.density)target.dataset.nlabDensity=resolved.density;if(resolved.scheme)target.dataset.nlabScheme=resolved.scheme;return resolved; }
  setSitePatch(patch){this.site=deepMerge(this.site,patch);return this;} setVariant(name,theme){this.variants[name]=clone(theme);return this;} duplicateVariant(sourceName,targetName){this.variants[targetName]=clone(this.variants[sourceName]??{});return this;} removeVariant(name){delete this.variants[name];return this;}
  exportJSON(space=2){return JSON.stringify({version:1,site:this.site,variants:this.variants},null,space);} importJSON(text){const data=typeof text==='string'?JSON.parse(text):text;this.site=clone(data.site??{});this.variants=clone(data.variants??{});return this;} save(){if(this.storage&&this.storageKey)this.storage.set(this.storageKey,{site:this.site,variants:this.variants});return this;} load(){const saved=this.storage&&this.storageKey?this.storage.get(this.storageKey,null):null;if(saved)this.importJSON(saved);return this;} reset(){this.site={};this.variants={};if(this.storage&&this.storageKey)this.storage.remove?.(this.storageKey);return this;}
}

export const DEFAULT_THEME = Object.freeze({
  scheme:'light',density:'normal',
  tokens:{
    bg:'#ffffff',fg:'#171717',muted:'#666666',border:'#d8d8d8',accent:'#2468d8',
    success:'#166534',info:'#1d4ed8',warning:'#b45309',danger:'#b91c1c',tooltip_bg:'#111827',tooltip_fg:'#ffffff',
    font_body:'Inter,system-ui,sans-serif',font_heading:'Inter,system-ui,sans-serif',font_accent:'Georgia,serif',font_weight_heading:'700',
    density_scale:'1',radius:'12px',border_width:'1px',shadow:'0 8px 24px rgba(0,0,0,.12)',header_height:'64px',hero_min_height:'280px'
  }
});
