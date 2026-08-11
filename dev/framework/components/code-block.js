function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
}

function highlightJson(source) {
  const escaped=escapeHtml(source);
  return escaped.replace(/("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,(match,key,string,literal,number)=>{
    if(key) return `<span class="nlab-codeblock__key">${key}</span>`;
    if(string) return `<span class="nlab-codeblock__string">${string}</span>`;
    if(literal) return `<span class="nlab-codeblock__literal">${literal}</span>`;
    if(number) return `<span class="nlab-codeblock__number">${number}</span>`;
    return match;
  });
}

export class CodeBlock {
  constructor({ value='', language='text', filename='export.txt', theme='light', highlighted=false }={}) {
    this.value=String(value);
    this.language=language;
    this.filename=filename;
    this.theme=theme;
    this.highlighted=highlighted;
    this.element=null;
  }

  setValue(value) { this.value=String(value ?? ''); this.render(); return this; }
  setTheme(theme) { this.theme=theme==='dark'?'dark':'light'; this.render(); return this; }
  setHighlighted(value) { this.highlighted=Boolean(value); this.render(); return this; }

  async copy() {
    await navigator.clipboard.writeText(this.value);
    return true;
  }

  download() {
    const blob=new Blob([this.value],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=this.filename || 'export.txt';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  }

  mount(element) { this.element=element; this.render(); return this; }

  formatted() {
    if(this.highlighted && this.language==='json') return highlightJson(this.value);
    return escapeHtml(this.value);
  }

  render() {
    if(!this.element) return;
    this.element.classList.add('nlab-codeblock');
    this.element.dataset.theme=this.theme;
    this.element.innerHTML=`
      <div class="nlab-codeblock__toolbar">
        <span class="nlab-codeblock__meta">${escapeHtml(this.filename)} · ${escapeHtml(this.language)}</span>
        <button type="button" data-code-theme title="Basculer clair/sombre" aria-label="Basculer le thème du bloc de code">◐</button>
        <button type="button" data-code-highlight title="Basculer brut/colorisé" aria-pressed="${this.highlighted}">${this.highlighted?'Couleur':'Brut'}</button>
        <button type="button" data-code-copy title="Copier dans le presse-papiers">⧉</button>
        <button type="button" data-code-download title="Télécharger le contenu">⇩</button>
      </div>
      <pre class="nlab-codeblock__pre"><code>${this.formatted()}</code></pre>
      <div class="nlab-codeblock__feedback" aria-live="polite"></div>`;
    const feedback=this.element.querySelector('.nlab-codeblock__feedback');
    this.element.querySelector('[data-code-theme]')?.addEventListener('click',()=>this.setTheme(this.theme==='dark'?'light':'dark'));
    this.element.querySelector('[data-code-highlight]')?.addEventListener('click',()=>this.setHighlighted(!this.highlighted));
    this.element.querySelector('[data-code-copy]')?.addEventListener('click',async()=>{ try{await this.copy();feedback.textContent='Copié ✓';setTimeout(()=>{ if(feedback) feedback.textContent=''; },1400);}catch{feedback.textContent='Copie indisponible';} });
    this.element.querySelector('[data-code-download]')?.addEventListener('click',()=>{ this.download();feedback.textContent='Téléchargement lancé';setTimeout(()=>{ if(feedback) feedback.textContent=''; },1400); });
  }
}
