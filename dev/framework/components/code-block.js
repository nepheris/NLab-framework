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

function highlightScript(source, language) {
  let escaped=escapeHtml(source);
  const comment=language==='python'?/#.*$/gm:/#.*$|\/\/.*$/gm;
  escaped=escaped.replace(comment,(m)=>`<span class="nlab-codeblock__comment">${m}</span>`);
  escaped=escaped.replace(/(&quot;[^&]*?&quot;|'[^']*?')/g,'<span class="nlab-codeblock__string">$1</span>');
  const words={
    javascript:'const|let|var|function|return|if|else|for|while|class|new|import|from|export|async|await|true|false|null',
    python:'def|return|if|elif|else|for|while|class|import|from|as|True|False|None|with|lambda|in|not|and|or',
    bash:'if|then|else|fi|for|do|done|case|esac|function|echo|export|local|readonly|in'
  }[language] || '';
  if(words) escaped=escaped.replace(new RegExp(`\\b(${words})\\b`,'g'),'<span class="nlab-codeblock__keyword">$1</span>');
  escaped=escaped.replace(/\b(\d+(?:\.\d+)?)\b/g,'<span class="nlab-codeblock__number">$1</span>');
  return escaped;
}

export class CodeBlock {
  constructor({ value='', language='text', filename='export.txt', theme='light', highlighted=false, editable=false }={}) {
    this.value=String(value); this.language=language; this.filename=filename; this.theme=theme; this.highlighted=highlighted; this.editable=Boolean(editable); this.editing=false; this.element=null;
  }
  setValue(value) { this.value=String(value ?? ''); this.render(); return this; }
  setTheme(theme) { this.theme=theme==='dark'?'dark':'light'; this.render(); return this; }
  setHighlighted(value) { this.highlighted=Boolean(value); this.render(); return this; }
  setLanguage(language) { this.language=language || 'text'; this.render(); return this; }
  setEditable(value=true){ this.editable=Boolean(value); if(!this.editable)this.editing=false; this.render(); return this; }
  setEditing(value=true){ if(!this.editable)return this; this.editing=Boolean(value); this.render(); return this; }

  async copy() { await navigator.clipboard.writeText(this.value); return true; }
  download() {
    const blob=new Blob([this.value],{type:'text/plain;charset=utf-8'}); const url=URL.createObjectURL(blob); const link=document.createElement('a');
    link.href=url; link.download=this.filename || 'export.txt'; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),0);
  }
  mount(element) { this.element=element; this.render(); return this; }
  formatted() {
    if(!this.highlighted) return escapeHtml(this.value);
    if(this.language==='json') return highlightJson(this.value);
    if(['javascript','python','bash'].includes(this.language)) return highlightScript(this.value,this.language);
    return escapeHtml(this.value);
  }
  feedback(message,kind='ok') {
    const node=this.element?.querySelector('.nlab-codeblock__feedback'); if(!node) return;
    node.textContent=message; node.dataset.kind=kind; node.hidden=false; clearTimeout(this.feedbackTimer); this.feedbackTimer=setTimeout(()=>{ if(node){node.hidden=true;node.textContent='';}},1800);
  }
  render() {
    if(!this.element) return;
    this.element.classList.add('nlab-codeblock'); this.element.dataset.theme=this.theme;
    this.element.innerHTML=`
      <div class="nlab-codeblock__toolbar">
        <span class="nlab-codeblock__meta">${escapeHtml(this.filename)} · ${escapeHtml(this.language)}</span>
        <button type="button" data-code-theme title="Basculer le thème local">${this.theme==='dark'?'☀':'◐'} <span>${this.theme==='dark'?'Thème sombre':'Thème clair'}</span></button>
        <button type="button" data-code-highlight title="Visualisation brute / colorisée" aria-pressed="${this.highlighted}">${this.highlighted?'◈':'◇'} <span>${this.highlighted?'Colorisé':'Brut'}</span></button>
        ${this.editable?`<button type="button" data-code-edit title="Modifier le contenu">✎ <span>${this.editing?'Valider':'Modifier'}</span></button>`:''}
        <button type="button" data-code-copy title="Copier tout dans le presse-papiers">⧉ <span>Copier tout</span></button>
        <button type="button" data-code-download title="Télécharger le contenu">⇩ <span>Télécharger</span></button>
      </div>
      ${this.editing?`<textarea class="nlab-codeblock__editor" spellcheck="false">${escapeHtml(this.value)}</textarea>`:`<pre class="nlab-codeblock__pre"><code>${this.formatted()}</code></pre>`}
      <div class="nlab-codeblock__feedback" role="status" aria-live="polite" hidden></div>`;
    this.element.querySelector('[data-code-theme]')?.addEventListener('click',()=>{const next=this.theme==='dark'?'light':'dark';this.setTheme(next);this.feedback(`Thème ${next==='dark'?'sombre':'clair'} activé ✓`);});
    this.element.querySelector('[data-code-highlight]')?.addEventListener('click',()=>{const next=!this.highlighted;this.setHighlighted(next);this.feedback(`${next?'Colorisation':'Vue brute'} activée ✓`);});
    this.element.querySelector('[data-code-edit]')?.addEventListener('click',()=>{if(this.editing){const editor=this.element.querySelector('.nlab-codeblock__editor');if(editor)this.value=editor.value;this.setEditing(false);this.feedback('Modifications appliquées ✓');}else this.setEditing(true);});
    this.element.querySelector('[data-code-copy]')?.addEventListener('click',async()=>{ try{await this.copy();this.feedback('Copié dans le presse-papiers ✓');}catch{this.feedback('Copie indisponible','error');} });
    this.element.querySelector('[data-code-download]')?.addEventListener('click',()=>{ this.download();this.feedback('Téléchargement lancé ✓'); });
  }
}
