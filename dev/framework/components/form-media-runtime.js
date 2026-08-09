(()=>{
  'use strict';
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const state=new WeakMap();
  const uiButton=id=>window.NLabUI?.makeButton?.(id)||null;
  const emit=(host,name,detail)=>host.dispatchEvent(new CustomEvent(name,{bubbles:true,detail}));
  const fileMeta=f=>({name:f.name,type:f.type||'application/octet-stream',size:f.size,lastModified:f.lastModified||null});

  function acceptFile(file,accept){
    if(!accept)return true;
    const name=(file.name||'').toLowerCase();
    const type=(file.type||'').toLowerCase();
    return accept.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).some(rule=>{
      if(rule.startsWith('.'))return name.endsWith(rule);
      if(rule.endsWith('/*'))return type.startsWith(rule.slice(0,-1));
      return type===rule;
    });
  }

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
        if(!acceptFile(f,host.dataset.accept||'')){emit(host,'nlab:attachment-error',{code:'type_not_allowed',file:fileMeta(f)});continue;}
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
    const record=uiButton('record'), play=uiButton('play'), pause=uiButton('pause'), stop=uiButton('stop'), remove=uiButton('delete');
    const audio=document.createElement('audio'); audio.controls=true; audio.hidden=true;
    const fallback=document.createElement('input'); fallback.type='file'; fallback.accept='audio/*'; fallback.capture='user'; fallback.hidden=true;
    const status=document.createElement('span'); status.className='nlab-field-status'; status.setAttribute('aria-live','polite');
    if(play)play.hidden=true;
    [record,play,pause,stop,remove].filter(Boolean).forEach(b=>host.append(b)); host.append(audio,fallback,status);
    let recorder=null,stream=null,chunks=[],blob=null,url=null,discardOnStop=false;
    const setStatus=s=>{status.textContent=s;emit(host,'nlab:audio-state',{state:s});};
    const stopTracks=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null;};
    function clearBlob(){if(url)URL.revokeObjectURL(url);url=null;blob=null;audio.pause?.();audio.removeAttribute('src');audio.hidden=true;if(play)play.hidden=true;emit(host,'nlab:audio-ready',{blob:null,metadata:null});}
    function setBlob(next,metadata={}){if(url)URL.revokeObjectURL(url);blob=next;url=URL.createObjectURL(blob);audio.src=url;audio.hidden=false;if(play)play.hidden=false;setStatus('Enregistrement prêt');emit(host,'nlab:audio-ready',{blob,metadata:{type:blob.type,size:blob.size,...metadata}});}
    function chooseMime(){const wanted=(host.dataset.mimeTypes||'audio/webm;codecs=opus,audio/webm,audio/mp4,audio/ogg').split(',');return wanted.find(x=>window.MediaRecorder?.isTypeSupported?.(x.trim()))?.trim()||'';}
    async function start(){
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setStatus('Enregistrement direct indisponible');emit(host,'nlab:audio-error',{code:'unsupported'});fallback.click();return;}
      try{
        stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
        chunks=[];discardOnStop=false; const mimeType=chooseMime(); recorder=new MediaRecorder(stream,mimeType?{mimeType}:undefined);
        recorder.addEventListener('dataavailable',e=>{if(e.data?.size)chunks.push(e.data);});
        recorder.addEventListener('stop',()=>{
          stopTracks();
          if(discardOnStop){discardOnStop=false;chunks=[];clearBlob();setStatus('');return;}
          const next=new Blob(chunks,{type:recorder.mimeType||mimeType||'audio/webm'});chunks=[];setBlob(next);
        });
        recorder.start();setStatus('Enregistrement en cours');
      }catch(error){stopTracks();setStatus('Accès au microphone refusé ou indisponible');emit(host,'nlab:audio-error',{code:error?.name||'capture_error',error});}
    }
    fallback.addEventListener('change',()=>{const f=fallback.files?.[0];if(f){setBlob(f,{name:f.name,lastModified:f.lastModified||null,source:'file_fallback'});}fallback.value='';});
    record?.addEventListener('click',()=>{if(!recorder||recorder.state==='inactive')start();else if(recorder.state==='paused'){recorder.resume();setStatus('Enregistrement en cours');}});
    play?.addEventListener('click',()=>{if(blob)audio.play?.();});
    pause?.addEventListener('click',()=>{if(recorder?.state==='recording'){recorder.pause();setStatus('Enregistrement en pause');}else audio.pause?.();});
    stop?.addEventListener('click',()=>{if(recorder&&recorder.state!=='inactive')recorder.stop();else if(!audio.hidden){audio.pause?.();audio.currentTime=0;}});
    remove?.addEventListener('click',()=>{if(recorder&&recorder.state!=='inactive'){discardOnStop=true;recorder.stop();}else{clearBlob();setStatus('');}});
    state.set(host,{type:'audio',get blob(){return blob;}});
  }

  function init(root=document){qa('[data-nlab-attachments]',root).forEach(initAttachments);qa('[data-nlab-audio-recorder]',root).forEach(initAudio);}
  window.NLabFormMedia={init,getAttachments:host=>[...(state.get(host)?.files||[])],getAudio:host=>state.get(host)?.blob||null};
  document.addEventListener('nlab:ready',()=>init());
  if(document.readyState!=='loading')queueMicrotask(()=>window.NLabUI?.state?.buttons&&init());
})();
