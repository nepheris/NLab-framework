const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

function addCss(){
  const style=document.createElement('style');
  style.textContent=`
  .v20-lab{border:2px solid var(--nlab-border);border-radius:14px;padding:14px;display:grid;gap:14px;background:color-mix(in srgb,var(--nlab-bg) 94%,var(--nlab-accent) 6%)}
  .v20-lab h3,.v20-lab h4{margin:.1rem 0}.v20-hierarchy{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:8px}.v20-node{border:1px solid var(--nlab-border);border-radius:10px;padding:8px;background:var(--nlab-bg)}
  .v20-scope-controls,.v20-layer-controls,.v20-layout-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:end}.v20-scope-controls label,.v20-layer-controls label,.v20-layout-controls label{display:grid;gap:4px;font-size:.82rem}.v20-scope-controls select,.v20-layer-controls select,.v20-layout-controls select,.v20-scope-controls input,.v20-layer-controls input,.v20-layout-controls input{min-height:34px}
  .v20-site-canvas{padding:14px;border:2px dashed #888;border-radius:14px;background:#f4f6f8;display:grid;gap:12px;transition:.2s}.v20-section{padding:12px;border:1px solid #aaa;border-radius:12px;background:#fff;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;transition:.2s}.v20-sample{padding:12px;border:2px solid #777;border-radius:12px;background:#eef4ff;min-height:90px;cursor:pointer;transition:.2s}.v20-sample[aria-selected="true"]{outline:3px solid var(--nlab-accent);outline-offset:2px}.v20-badge{display:inline-block;font:11px/1.2 ui-monospace,monospace;padding:2px 5px;border:1px solid currentColor;border-radius:999px;margin-right:4px}
  .v20-layout-stage{border:1px solid var(--nlab-border);border-radius:12px;overflow:hidden;background:#f7f7f8}.v20-layout-header,.v20-layout-footer{padding:10px 14px;background:#fff;transition:.2s}.v20-layout-header{border-bottom:1px solid var(--nlab-border)}.v20-layout-footer{border-top:1px solid var(--nlab-border)}.v20-layout-body{min-height:180px;padding:16px;background:#f4f6f8}.v20-shadow{box-shadow:0 8px 24px rgba(0,0,0,.16);position:relative;z-index:2}.v20-rounded{margin:8px;border:1px solid var(--nlab-border);border-radius:14px}.v20-locked{outline:2px solid #b45309}.v20-sticky{position:sticky;z-index:4}.v20-layout-header.v20-sticky{top:0}.v20-layout-footer.v20-sticky{bottom:0}
  @media(max-width:760px){.v20-hierarchy{grid-template-columns:1fr 1fr}}
  `;
  document.head.append(style);
}

function version(){
  document.title='nLab Web Framework — Review V20 depuis V16';
  const h=$('#overview h1'); if(h) h.textContent='nLab Web Framework — Review V20 depuis V16';
  $('.demo-header>strong')?.replaceChildren(document.createTextNode('Catalogue / Playground · V20 depuis V16'));
}

function scopeLab(){
  const host=$('#theme-workshop .nlab-container'); if(!host) return;
  const lab=document.createElement('div'); lab.className='v20-lab'; lab.id='scope-lab-v20';
  lab.innerHTML=`<h3>🧬 Scope Lab V20 — comprendre et tester les portées</h3>
  <p><strong>Modèle :</strong> Site → Famille → Type → Sous-type → Instance. Une modification peut viser tout le site, tous les éléments d’un même type, ou une seule instance.</p>
  <div class="v20-hierarchy">
    <div class="v20-node"><strong>🌐 Site</strong><br><small>Fond général, police globale, densité</small></div>
    <div class="v20-node"><strong>📦 Famille</strong><br><small>conteneur / navigation / contenu / média</small></div>
    <div class="v20-node"><strong>🧩 Type</strong><br><small>card, notice, header, footer…</small></div>
    <div class="v20-node"><strong>🔹 Instance</strong><br><small>DMO-SUB-1, DMO-SUB-2…</small></div>
  </div>
  <div class="v20-scope-controls">
    <label>Portée<select id="v20-scope"><option value="global">Global</option><option value="type">Même type</option><option value="instance" selected>Cet élément</option></select></label>
    <label>Fond élément<input id="v20-element-bg" type="color" value="#dbeafe"></label>
    <label>Bordure<input id="v20-border" type="color" value="#2563eb"></label>
    <label>Coins<input id="v20-radius" type="range" min="0" max="32" value="12"><output id="v20-radius-out">12 px</output></label>
    <button id="v20-reset">↺ Reset Scope Lab</button>
  </div>
  <div class="v20-layer-controls">
    <strong>🎨 Couches de fond distinctes :</strong>
    <label>Fond du site<input id="v20-site-bg" type="color" value="#f4f6f8"></label>
    <label>Fond de section<input id="v20-section-bg" type="color" value="#ffffff"></label>
    <label>Fond d’élément<input id="v20-layer-element-bg" type="color" value="#eef4ff"></label>
  </div>
  <div class="v20-site-canvas" id="v20-site-canvas">
    <div class="v20-section" data-v20-section>
      <article class="v20-sample" data-family="content" data-type="demo-sub" data-subtype="primary" data-id="DMO-SUB-1" aria-selected="true"><span class="v20-badge">content</span><span class="v20-badge">demo-sub</span><h4>DMO-SUB-1</h4><p>Même type que DMO-SUB-2.</p></article>
      <article class="v20-sample" data-family="content" data-type="demo-sub" data-subtype="secondary" data-id="DMO-SUB-2"><span class="v20-badge">content</span><span class="v20-badge">demo-sub</span><h4>DMO-SUB-2</h4><p>Doit suivre « Même type ».</p></article>
      <article class="v20-sample" data-family="content" data-type="demo-rsp" data-subtype="responsive" data-id="DMO-RSP-1"><span class="v20-badge">content</span><span class="v20-badge">demo-rsp</span><h4>DMO-RSP-1</h4><p>Type différent : ne doit pas suivre « Même type ».</p></article>
    </div>
  </div>`;
  const purpose=$('#theme-workshop .demo-section-purpose'); (purpose??host.firstElementChild)?.insertAdjacentElement('afterend',lab);
  let selected=$('.v20-sample',lab);
  const select=(el)=>{selected=el; $$('.v20-sample',lab).forEach(x=>x.setAttribute('aria-selected',String(x===el)));};
  $$('.v20-sample',lab).forEach(el=>el.addEventListener('click',()=>select(el)));
  const targets=()=>{const scope=$('#v20-scope',lab).value; if(scope==='global')return $$('.v20-sample',lab); if(scope==='type')return $$('.v20-sample',lab).filter(x=>x.dataset.type===selected.dataset.type); return [selected];};
  const apply=()=>{const bg=$('#v20-element-bg',lab).value,border=$('#v20-border',lab).value,r=$('#v20-radius',lab).value; $('#v20-radius-out',lab).textContent=`${r} px`; for(const el of targets()){el.style.background=bg;el.style.borderColor=border;el.style.borderRadius=`${r}px`;}};
  ['#v20-element-bg','#v20-border','#v20-radius','#v20-scope'].forEach(sel=>$(sel,lab).addEventListener('input',apply));
  $('#v20-site-bg',lab).addEventListener('input',e=>$('#v20-site-canvas',lab).style.background=e.target.value);
  $('#v20-section-bg',lab).addEventListener('input',e=>$$('[data-v20-section]',lab).forEach(x=>x.style.background=e.target.value));
  $('#v20-layer-element-bg',lab).addEventListener('input',e=>$$('.v20-sample',lab).forEach(x=>x.style.background=e.target.value));
  $('#v20-reset',lab).addEventListener('click',()=>{$$('.v20-sample',lab).forEach(x=>x.removeAttribute('style'));$('#v20-site-canvas',lab).removeAttribute('style');$$('[data-v20-section]',lab).forEach(x=>x.removeAttribute('style'));});
}

function layoutLab(){
  const responsive=$('#responsive .nlab-container'); if(!responsive)return;
  const lab=document.createElement('div'); lab.className='v20-lab'; lab.id='layout-lab-v20';
  lab.innerHTML=`<h3>📐 Layout Lab V20 — Header / Footer / verrouillage</h3>
  <div class="v20-layout-controls">
    <label>Cible<select id="v20-layout-target"><option value="header">Header</option><option value="footer">Footer</option></select></label>
    <label><input id="v20-layout-sticky" type="checkbox"> Sticky</label>
    <label><input id="v20-layout-shadow" type="checkbox"> Shadow</label>
    <label><input id="v20-layout-rounded" type="checkbox"> Bords / largeur contenu</label>
    <label><input id="v20-layout-lock" type="checkbox"> Verrouillé</label>
    <label>Hauteur<input id="v20-layout-height" type="range" min="40" max="160" value="64"><output id="v20-layout-height-out">64 px</output></label>
  </div>
  <div class="v20-layout-stage"><header class="v20-layout-header"><strong>Header de test</strong> — sticky / shadow / hauteur / largeur</header><div class="v20-layout-body"><p>Zone de contenu entre header et footer.</p><p>Le footer peut être présent, absent, transparent, sticky ou aligné sur le contenu.</p></div><footer class="v20-layout-footer"><strong>Footer de test</strong> — mêmes primitives de layout</footer></div>`;
  responsive.append(lab);
  const target=()=>$('#v20-layout-target',lab).value==='header'?$('.v20-layout-header',lab):$('.v20-layout-footer',lab);
  const sync=()=>{const el=target(),h=$('#v20-layout-height',lab).value;$('#v20-layout-height-out',lab).textContent=`${h} px`;el.style.minHeight=`${h}px`;el.classList.toggle('v20-sticky',$('#v20-layout-sticky',lab).checked);el.classList.toggle('v20-shadow',$('#v20-layout-shadow',lab).checked);el.classList.toggle('v20-rounded',$('#v20-layout-rounded',lab).checked);el.classList.toggle('v20-locked',$('#v20-layout-lock',lab).checked);};
  $$('.v20-layout-controls input,.v20-layout-controls select',lab).forEach(x=>x.addEventListener('input',sync)); sync();
}

addCss();version();scopeLab();layoutLab();
