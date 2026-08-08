(()=>{
  const aliases={
    green:'#216E51',blue:'#316D9A',purple:'#6D4C91',pink:'#A34F78',red:'#A1453F',orange:'#B86B2E',teal:'#24756E',indigo:'#4D5A96'
  };
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const hexToRgb=hex=>{const h=hex.replace('#','').trim();if(!/^[0-9a-f]{6}$/i.test(h))throw new Error('Couleur HEX invalide');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
  const rgbToHex=(r,g,b)=>'#'+[r,g,b].map(v=>Math.round(clamp(v,0,255)).toString(16).padStart(2,'0')).join('').toUpperCase();
  const rgbToHsl=(r,g,b)=>{r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}const l=(max+min)/2;const s=d?d/(1-Math.abs(2*l-1)):0;return [h,s*100,l*100];};
  const hslToRgb=(h,s,l)=>{s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let r=0,g=0,b=0;if(h<60)[r,g,b]=[c,x,0];else if(h<120)[r,g,b]=[x,c,0];else if(h<180)[r,g,b]=[0,c,x];else if(h<240)[r,g,b]=[0,x,c];else if(h<300)[r,g,b]=[x,0,c];else [r,g,b]=[c,0,x];return [(r+m)*255,(g+m)*255,(b+m)*255];};
  const hslHex=(h,s,l)=>rgbToHex(...hslToRgb((h+360)%360,clamp(s,0,100),clamp(l,0,100)));
  const resolve=input=>aliases[String(input||'green').toLowerCase()]||String(input||'#216E51');
  function derive(input='green'){
    const dominant=resolve(input),[r,g,b]=hexToRgb(dominant),[h,s,l]=rgbToHsl(r,g,b);
    const primary=hslHex(h,Math.max(38,s),clamp(l,30,46));
    const soft=hslHex(h,32,94);
    const accent=hslHex(h-120,70,57);
    const control=hslHex(h,10,51);
    const background=hslHex(h,16,96);
    const line=hslHex(h,16,88);
    const ink=hslHex(h,22,12);
    const muted=hslHex(h,8,41);
    return {dominant,primary,soft,accent,control,control_hover:primary,control_hover_bg:soft,background,surface:'#FFFFFF',line,ink,muted,danger:'#A1453F',info:'#316D9A'};
  }
  function apply(input='green',target=document.documentElement){const p=derive(input),map={background:'--nlab-bg',surface:'--nlab-surface',ink:'--nlab-ink',muted:'--nlab-muted',line:'--nlab-line',primary:'--nlab-brand',soft:'--nlab-brand-soft',accent:'--nlab-accent',control:'--nlab-control',control_hover:'--nlab-control-hover',control_hover_bg:'--nlab-control-hover-bg'};for(const [k,v] of Object.entries(map))target.style.setProperty(v,p[k]);target.style.setProperty('--nlab-hero-accent-rgb',hexToRgb(p.accent).join(','));target.style.setProperty('--nlab-hero-brand-rgb',hexToRgb(p.primary).join(','));return p;}
  window.NLabShadowSagePalette={aliases:{...aliases},derive,apply,resolve};
})();
