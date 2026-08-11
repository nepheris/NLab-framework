import { TableWiz } from './table-wiz.js';

const clone = (value) => structuredClone(value);

export class JsonStudio {
  constructor({ data = null, schema = null, validator = null, resolver = null, saveAdapter = null, table = null } = {}) {
    this.data = clone(data);
    this.original = clone(data);
    this.schema = schema;
    this.validator = validator;
    this.resolver = resolver;
    this.saveAdapter = saveAdapter;
    this.table = table ?? new TableWiz();
    this.view = 'raw';
  }

  setData(data, { resetOriginal = false } = {}) { this.data = clone(data); if (resetOriginal) this.original = clone(data); return this; }
  setView(view) { this.view = view; return this; }
  get(path = null) { if (!path) return clone(this.data); return clone(path.split('.').reduce((acc,key)=>acc?.[key],this.data)); }
  set(path, value) { const keys=path.split('.'); const last=keys.pop(); let cursor=this.data; for(const key of keys){ const index=/^\d+$/.test(key)?Number(key):key; cursor=cursor[index]??=(/^\d+$/.test(keys[0]??'')?[]:{}); } cursor[/^\d+$/.test(last)?Number(last):last]=clone(value); return this; }
  move(path, fromIndex, toIndex) { const array=this.get(path); if(!Array.isArray(array)) throw new Error(`Path is not an array: ${path}`); const [item]=array.splice(fromIndex,1); array.splice(toIndex,0,item); this.set(path,array); return this; }
  add(path, value) { const array=this.get(path); if(!Array.isArray(array)) throw new Error(`Path is not an array: ${path}`); array.push(clone(value)); this.set(path,array); return this; }
  remove(path, index) { const array=this.get(path); if(!Array.isArray(array)) throw new Error(`Path is not an array: ${path}`); array.splice(index,1); this.set(path,array); return this; }
  raw(space = 2) { return JSON.stringify(this.data, null, space); }
  importRaw(text) { this.data = JSON.parse(text); return this; }
  exportRaw(space = 2) { return this.raw(space); }

  diff() {
    const changes=[];
    const walk=(before,after,path='')=>{
      if (Object.is(before,after)) return;
      if (!before || !after || typeof before!=='object' || typeof after!=='object' || Array.isArray(before)!==Array.isArray(after)) { changes.push({ path, before, after }); return; }
      const keys=new Set([...Object.keys(before),...Object.keys(after)]);
      for(const key of keys) walk(before[key],after[key],path?`${path}.${key}`:key);
    };
    walk(this.original,this.data); return changes;
  }

  async validate(context = {}) {
    if (!this.validator) return { valid:true, errors:0, warnings:0, issues:[], skipped:true };
    if (context.collection && Array.isArray(this.data) && this.validator.validateCollectionData) return this.validator.validateCollectionData(context.collection,this.data);
    if (context.collection && !Array.isArray(this.data) && this.validator.validateRecord) return this.validator.validateRecord(context.collection,this.data);
    if (this.validator.validate) return this.validator.validate(this.data,{ schema:this.schema,...context });
    return { valid:true, errors:0, warnings:0, issues:[], skipped:true };
  }

  async resolved(context = {}) {
    if (!this.resolver || !context.collection) return clone(this.data);
    if (Array.isArray(this.data)) return Promise.all(this.data.map((record)=>this.resolver.resolveRecord(context.collection,record)));
    return this.resolver.resolveRecord(context.collection,this.data);
  }

  async save(context = {}) { if(!this.saveAdapter) throw new Error('No save adapter configured'); return this.saveAdapter.save(clone(this.data),context); }

  render(container, { view = this.view, context = {} } = {}) {
    if (!container || !globalThis.document) return;
    container.replaceChildren();
    if (view === 'raw') { const textarea=document.createElement('textarea'); textarea.value=this.raw(); textarea.addEventListener('change',()=>this.importRaw(textarea.value)); container.append(textarea); return; }
    if (view === 'table' && Array.isArray(this.data)) { this.table.render(container,this.data); return; }
    if (view === 'tree') { const pre=document.createElement('pre'); pre.textContent=this.raw(); pre.className='nlab-json-tree'; container.append(pre); return; }
    if (view === 'preview') { const pre=document.createElement('pre'); pre.textContent=this.raw(); container.append(pre); return; }
    if (view === 'form' && this.data && typeof this.data==='object' && !Array.isArray(this.data)) {
      const form=document.createElement('div');
      for(const [key,value] of Object.entries(this.data)){ const label=document.createElement('label'); label.textContent=key; const input=document.createElement(typeof value==='string'&&value.length>120?'textarea':'input'); input.value=typeof value==='object'?JSON.stringify(value):String(value??''); input.addEventListener('change',()=>{ let next=input.value; if(typeof value==='number') next=Number(next); if(typeof value==='boolean') next=next==='true'; if(typeof value==='object'){ try{next=JSON.parse(next);}catch{} } this.set(key,next); }); label.append(input); form.append(label); } container.append(form); return;
    }
    const pre=document.createElement('pre'); pre.textContent=this.raw(); container.append(pre);
  }
}
