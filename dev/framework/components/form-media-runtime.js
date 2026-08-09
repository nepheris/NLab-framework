(()=>{
  'use strict';
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const state=new WeakMap();
  const uiButton=id=>window.NLabUI?.makeButton?.(id)||null;
  const emit=(host,name,detail)=>host.dispatchEvent(new CustomEvent(name,{bubbles:true,detail}));
  const fileMeta=f=>({name:f.name,type:f.type||'application/octet-stream',size:f.size,lastModified:f.lastModified||null});

  function initAttachments(host){
    if(host.dataset.nlabReady)return;
    host.dataset.nlabReady='1';
    const files=[];
    const input=document.createElement('input');
    input.type='file'; input.hidden=true;
    input.multiple=host.dataset.multiple!=='false';
    if(host.dataset.accept)input.accept=host.dataset.accept;
    if(host.dataset.capture)input.capture=host.dataset.capture;
    const pick=uiButton('attach_file');
    const list=document.createElement('div'); list.className='nlab-attachment-list';
    const status=document.createElement('div'); status.className='nlab-field-status'; status.setAttribute('aria-live','polite');
    if(pick)host.append(pick); host.append(input,list,status);
    const maxFiles=Number(host.dataset.maxFiles||0), maxBytes=Number(host.dataset.maxFileSize||0), totalLimit=Number(host.dataset.totalSizeLimit||0);

    function render(){
      list.replaceChildren();
      files.forEach((f,i)=>{
        const row=document.createElement('div'); row.className='nlab-attachment-row';
        const name=document.createElement('span'); name.textContent=`${f.name} (${Math.ceil(f.size/1024)} Ko)`;
        const del=uiButton('delete');
        if(del)del.addEventListener('click',()=>{files.splice(i,1);render();changed();});
        row.append(name); if(del)row.append(del); list.append(row);
      });
      status.textContent=files.length?`${files.length} fichier(s) sélectionné(s)`:'';
    }
    function changed(){emit(host,'nlab:attachments-change',{files:[...files],metadata:files.map(fileMeta)});}
    function add(incoming){
      for(const f of incoming){
        if(maxFiles&&files.length>=maxFiles){emit(host,'nlab:attachment-error',{code:'max_files',file:fileMeta(f)});break;}
        if(maxBytes&&f.size>maxBytes){emit(host,'nlab:attachment-error',{code:'file_too_large',file:fileMeta(f)});continue;}
        if(totalLimit&&(files.reduce((n,x)=>n+x.size,0)+f.size)>totalLimit){emit(host,'nlab:attachment-error',{code:'total_too_large',file:fileMeta(f)});continue;}
        files.push(f);
      }
      render();changed();input.value='';
    }
    pick?.addEventListener('click',()=>input.click());
    input.addEventListener('change',()=>add(input.files||[]));
    ['dragenter','dragover'].forEach(ev=>host.addEventListener(ev,e=>{e.preventDefault();host.dataset.drag='1';}));
    ['dragleave','drop'].forEach(ev=>host.addEventListener(ev,e=>{e.preventDefault();host.dataset.drag='0';}));
    host.addEventListener('drop',e=>add(e.dataTransfer?.files||[]));
    state.set(host,{type:'attachments',files});
  }

  function initAudio(host){
    if(host.dataset.nlabReady)return;
    host.dataset.nlabReady='1';
    const record=uiButton('record'), pause=uiButton('pause'), stop=uiButton('stop'), remove=uiButton('delete');
    const audio=document.createElement('audio'); audio.controls=true; audio.hidden=true;
    const status=document.createElement('span'); status.className='nlab-field-status'; status.setAttribute('aria-live','polite');
    [record,pause,stop,remove].filter(Boolean).forEach(b=>host.append(b)); host.append(audio,status);
    let recorder=null,stream=null,chunks=[],blob=null,url=null;
    const setStatus=s=>{status.textContent=s;emit(host,'nlab:audio-state',{state:s});};
    function clearBlob(){if(url)URL.revokeObjectURL(url);url=null;blob=null;audio.removeAttribute('src');audio.hidden=true;emit(host,'nlab:audio-ready',{blob:null,metadata:null});}
    function chooseMime(){const wanted=(host.dataset.mimeTypes||'audio/webm;codecs=opus,audio/webm,audio/mp4,audio/ogg').split(',');return wanted.find(x=>window.MediaRecorder?.isTypeSupported?.(x.trim()))?.trim()||'';}
    async function start(){
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setStatus('Enregistrement direct indisponible');emit(host,'nlab:audio-error',{code:'unsupported'});return;}
      try{
        stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
        chunks=[]; const mimeType=chooseMime(); recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
        recorder.addEventListener('dataavailable',e=>{if(e.data?.size)chunks.push(e.data);});
        recorder.addEventListener('stop',()=>{
          blob=new Blob(chunks,{type:recorder.mimeType||mimeType||'audio/webm'}); if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);audio.src=url;audio.hidden=false;
          stream?.getTracks().forEach(t=>t.stop());stream=null;setStatus('Enregistrement prêt');emit(host,'nlab:audio-ready',{blob,metadata:{type:blob.type,size:blob.size}});
        });
        recorder.start();setStatus('Enregistrement en cours');
      }catch(error){stream?.getTracks().forEach(t=>t.stop());stream=null;setStatus('Accès au microphone refusé ou indisponible');emit(host,'nlab:audio-error',{code:error?.name||'capture_error',error});}
    }
    record?.addEventListener('click',()=>{if(!recorder||recorder.state==='inactive')start();else if(recorder.state==='paused'){recorder.resume();setStatus('Enregistrement en cours');}});
    pause?.addEventListener('click',()=>{if(recorder?.state==='recording'){recorder.pause();setStatus('Enregistrement en pause');}});
    stop?.addEventListener('click',()=>{if(recorder&&recorder.state!=='inactive')recorder.stop();});
    remove?.addEventListener('click',()=>{if(recorder&&recorder.state!=='inactive')recorder.stop();clearBlob();setStatus('');});
    state.set(host,{type:'audio',get blob(){return blob;}});
  }

  function init(root=document){qa('[data-nlab-attachments]',root).forEach(initAttachments);qa('[data-nlab-audio-recorder]',root).forEach(initAudio);}
  window.NLabFormMedia={init,getAttachments:host=>[...(state.get(host)?.files||[])],getAudio:host=>state.get(host)?.blob||null};
  document.addEventListener('nlab:ready',()=>init());
  if(document.readyState!=='loading')queueMicrotask(()=>window.NLabUI?.state?.buttons&&init());
})();
