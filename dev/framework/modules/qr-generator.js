(()=>{
  'use strict';
  const encoders=new Map();
  const token=v=>{
    if(typeof v!=='string')return v;
    if(!v.startsWith('theme.'))return v;
    const key=v.slice(6).replaceAll('_','-');
    return getComputedStyle(document.documentElement).getPropertyValue(`--nlab-${key}`).trim()||v;
  };
  const resolveSource=(config={},context={})=>{
    const source=config.source||{};
    const mode=source.mode||'page_url';
    if(mode==='page_url')return context.pageUrl||location.href;
    if(mode==='url'||mode==='custom')return source.value||'';
    if(mode==='field')return context.fields?.[source.value]??'';
    return source.value||'';
  };
  const normalize=config=>({
    size:256,error_correction:'M',quiet_zone:4,foreground:'theme.primary',background_mode:'solid',background:'theme.surface',module_shape:'square',eye_shape:'square',logo:{enabled:false,source:null,scale:.18,monochrome:false,color:'theme.primary'},download_formats:['svg','png'],...config,
    logo:{enabled:false,source:null,scale:.18,monochrome:false,color:'theme.primary',...(config?.logo||{})}
  });
  async function render(target,config={},context={}){
    const cfg=normalize(config),data=resolveSource(cfg,context);
    if(!data)throw new Error('QR source is empty.');
    const name=cfg.encoder||'default',adapter=encoders.get(name)||encoders.get('default');
    if(!adapter)throw new Error('No QR encoder adapter registered. Register one with NLabQR.registerEncoder().');
    const resolved={...cfg,data,foreground:token(cfg.foreground),background:cfg.background_mode==='transparent'?'transparent':token(cfg.background),logo:{...cfg.logo,color:token(cfg.logo.color)}};
    const out=await adapter.encode(resolved);
    const el=typeof target==='string'?document.querySelector(target):target;
    if(!el)return out;
    if(typeof out==='string'){el.innerHTML=out;return out}
    if(out instanceof Node){el.replaceChildren(out);return out}
    if(out?.svg){el.innerHTML=out.svg;return out}
    if(out?.canvas instanceof HTMLCanvasElement){el.replaceChildren(out.canvas);return out}
    return out;
  }
  window.NLabQR={registerEncoder:(name,adapter)=>{if(!adapter?.encode)throw new Error('QR adapter must expose encode(config).');encoders.set(name,adapter)},render,resolveSource,normalize};
})();
