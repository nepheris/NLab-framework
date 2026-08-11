const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export class DocumentWiz {
  constructor({ qrWiz = null } = {}) { this.qrWiz=qrWiz; }
  selectFields(data, fields = null) {
    if (!fields?.length) return { ...data };
    return Object.fromEntries(fields.filter((field)=>data?.[field] !== undefined).map((field)=>[field,data[field]]));
  }
  renderHTML(data, profile = {}) {
    const selected=this.selectFields(data,profile.fields);
    const title=selected[profile.titleField ?? 'name'] ?? selected[profile.titleField ?? 'title'] ?? profile.title ?? 'Document';
    const rows=Object.entries(selected).filter(([key])=>key !== (profile.titleField ?? 'name')).map(([key,value])=>`<section><h2>${escapeHTML(profile.labels?.[key] ?? key)}</h2><div>${Array.isArray(value)?escapeHTML(value.join(', ')):typeof value==='object'?`<pre>${escapeHTML(JSON.stringify(value,null,2))}</pre>`:escapeHTML(value)}</div></section>`).join('');
    return `<!doctype html><html lang="${escapeHTML(profile.lang ?? 'fr')}"><head><meta charset="utf-8"><title>${escapeHTML(title)}</title><style>${profile.css ?? 'body{font-family:system-ui,sans-serif;max-width:800px;margin:auto;padding:2rem}img{max-width:100%}@media print{body{padding:0}}'}</style></head><body>${profile.logo?`<img src="${escapeHTML(profile.logo)}" alt="">`:''}<h1>${escapeHTML(title)}</h1>${rows}${profile.footer?`<footer>${escapeHTML(profile.footer)}</footer>`:''}</body></html>`;
  }
  openPrint(data, profile = {}) {
    const html=this.renderHTML(data,profile); const win=globalThis.open?.('','_blank'); if(!win) return { ok:false, html };
    win.document.open(); win.document.write(html); win.document.close(); win.focus(); setTimeout(()=>win.print(),0); return { ok:true, window:win };
  }
  async renderWithQR(data, profile = {}) {
    if(!profile.qr || !this.qrWiz) return this.renderHTML(data,profile);
    const qr=await this.qrWiz.generate(profile.qr); const html=this.renderHTML(data,profile);
    return html.replace('</body>',`<aside class="nlab-document-qr">${typeof qr==='string'?qr:''}</aside></body>`);
  }
}
