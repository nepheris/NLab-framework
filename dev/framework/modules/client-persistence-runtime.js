(()=>{
  'use strict';
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const memory=new Map();
  const button=id=>window.NLabUI?.makeButton?.(id)||null;
  const emit=(host,name,detail)=>host.dispatchEvent(new CustomEvent(name,{bubbles:true,detail}));

  function serialize(form){
    const data={};
    const fd=new FormData(form);
    for(const [k,v] of fd.entries()){
      if(v instanceof File)continue;
      if(Object.hasOwn(data,k))data[k]=Array.isArray(data[k])?[...data[k],v]:[data[k],v]; else data[k]=v;
    }
    qa('input[type="checkbox"]',form).forEach(el=>{if(!el.name)return;if(!el.checked&&!Object.hasOwn(data,el.name))data[el.name]=false;});
    return data;
  }
  function apply(form,data){
    for(const el of form.elements){
      if(!el.name||el.type==='file')continue;
      const v=data[el.name]; if(v===undefined)continue;
      if(el.type==='checkbox')el.checked=Array.isArray(v)?v.includes(el.value):v===true||v===el.value;
      else if(el.type==='radio')el.checked=v===el.value;
      else if(el.multiple&&el.options){const vals=Array.isArray(v)?v:[v];[...el.options].forEach(o=>o.selected=vals.includes(o.value));}
      else el.value=Array.isArray(v)?v[0]:v;
    }
    form.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function storage(host){return host.dataset.draftStorage||'memory';}
  function key(host){return `nlab:draft:${host.dataset.draftKey||host.id||'default'}`;}
  function write(host,payload){const k=key(host);if(storage(host)==='local_storage')localStorage.setItem(k,JSON.stringify(payload));else memory.set(k,payload);}
  function read(host){const k=key(host);if(storage(host)==='local_storage'){const raw=localStorage.getItem(k);return raw?JSON.parse(raw):null;}return memory.get(k)||null;}
  function clear(host){const k=key(host);if(storage(host)==='local_storage')localStorage.removeItem(k);else memory.delete(k);}
  function download(payload,name){const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),0);}

  function initOne(host){
    if(host.dataset.nlabReady)return;host.dataset.nlabReady='1';
    const form=host.matches('form')?host:host.querySelector('form')||document.getElementById(host.dataset.formTarget||'');
    if(!form)return;
    const controls=document.createElement('div');controls.className='nlab-draft-controls';
    const ids=['save_draft','restore_draft','clear_draft','export_draft','import_draft'];
    const buttons=Object.fromEntries(ids.map(id=>[id,button(id)]));Object.values(buttons).filter(Boolean).forEach(b=>controls.append(b));host.append(controls);
    const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='application/json,.json';fileInput.hidden=true;host.append(fileInput);
    const snapshot=()=>({schema_id:host.dataset.schemaId||null,saved_at:new Date().toISOString(),fields:serialize(form),binary_restored:false});
    buttons.save_draft?.addEventListener('click',()=>{const p=snapshot();write(host,p);emit(host,'nlab:draft-saved',{storage:storage(host),payload:p});});
    buttons.restore_draft?.addEventListener('click',()=>{try{const p=read(host);if(p?.fields){apply(form,p.fields);emit(host,'nlab:draft-restored',{storage:storage(host),payload:p});}}catch(error){emit(host,'nlab:draft-error',{code:'restore_failed',error});}});
    buttons.clear_draft?.addEventListener('click',()=>{clear(host);emit(host,'nlab:draft-cleared',{storage:storage(host)});});
    buttons.export_draft?.addEventListener('click',()=>download(snapshot(),`${host.dataset.draftKey||'draft'}.json`));
    buttons.import_draft?.addEventListener('click',()=>fileInput.click());
    fileInput.addEventListener('change',async()=>{const f=fileInput.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text());if(p?.fields){apply(form,p.fields);emit(host,'nlab:draft-imported',{payload:p});}}catch(error){emit(host,'nlab:draft-error',{code:'import_failed',error});}fileInput.value='';});
    if(host.dataset.autoSave==='true')form.addEventListener('change',()=>{if(storage(host)==='local_storage')write(host,snapshot());});
  }
  function init(root=document){qa('[data-nlab-draft]',root).forEach(initOne);}
  window.NLabDrafts={init,serialize,apply};
  document.addEventListener('nlab:ready',()=>init());
  if(document.readyState!=='loading')queueMicrotask(()=>window.NLabUI?.state?.buttons&&init());
})();
