(()=>{
  const hex=h=>{h=String(h).replace('#','');if(!/^[0-9a-f]{6}$/i.test(h))throw new Error('Invalid HEX');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
  const out=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('').toUpperCase();
  const mix=(a,b,t)=>{const x=hex(a),y=hex(b);return out(x.map((v,i)=>v+(y[i]-v)*t));};
  function derive(d){return {brand:d,brand_soft:mix(d,'#FFFFFF',.88),accent:mix(d,'#000000',.18),control:mix(d,'#808080',.72),control_hover:d,control_hover_bg:mix(d,'#FFFFFF',.9),background:mix(d,'#FFFFFF',.95),surface:'#FFFFFF',line:mix(d,'#FFFFFF',.82),ink:mix(d,'#000000',.78),muted:mix(d,'#808080',.65)};}
  function apply(d,target=document.documentElement){const p=derive(d),m={brand:'--nlab-brand',brand_soft:'--nlab-brand-soft',accent:'--nlab-accent',control:'--nlab-control',control_hover:'--nlab-control-hover',control_hover_bg:'--nlab-control-hover-bg',background:'--nlab-bg',surface:'--nlab-surface',line:'--nlab-line',ink:'--nlab-ink',muted:'--nlab-muted'};for(const [k,v] of Object.entries(m))target.style.setProperty(v,p[k]);return p;}
  window.NLabPaletteDeriver={derive,apply,mix};
})();
