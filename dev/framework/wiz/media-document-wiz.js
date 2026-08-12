const MODES=new Set(['inline','thumbnail','gallery','viewer','link','download']);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clean=v=>String(v??'').trim();
const clone=v=>v===undefined?undefined:structuredClone(v);
const pageValue=v=>{if(v==null||v==='')return null;const n=Number(v);if(!Number.isInteger(n)||n<1)throw new MediaDocumentError('PDF page must be a positive integer','INVALID_PAGE',{page:v});return n;};
const modeValue=v=>MODES.has(v)?v:'viewer';
const permissionSet=v=>{const s=plain(v)?v:{};return{open:s.open!==false,download:s.download!==false,share:Boolean(s.share),print:Boolean(s.print)};};

export class MediaDocumentError extends Error{
  constructor(message,code='MEDIA_DOCUMENT_ERROR',details=null){super(message);this.name='MediaDocumentError';this.code=code;this.details=details;}
}

export class MediaDocumentWiz{
  constructor({linkWiz=null,formatRegistry=null}={}){this.linkWiz=linkWiz;this.formatRegistry=formatRegistry;}

  normalize(input={},options={}){
    const s=typeof input==='string'?{url:input}:input;
    if(!plain(s))throw new MediaDocumentError('Media document must be an object or URL string','INVALID_DOCUMENT');
    const url=clean(s.url??s.href);
    if(!url)throw new MediaDocumentError('Media document URL is required','URL_REQUIRED');
    const format=this.#format(s,url);
    const mode=modeValue(options.mode??s.mode??(format.id==='pdf'?'viewer':'inline'));
    const page=format.id==='pdf'?pageValue(options.page??s.page??s.initialPage):null;
    const permissions=permissionSet({...s.permissions,...options.permissions});
    const label=clean(options.label??s.label??s.title??s.filename??format.label??'Document');
    const previewUrl=clean(options.previewUrl??s.previewUrl??s.thumbnailUrl)||null;
    return{
      id:clean(s.id)||null,url,label,mode,page,format:clone(format),permissions,
      preview:{kind:previewUrl?'image':'icon',url:previewUrl,iconKey:previewUrl?null:(format.iconKey??'file'),fallback:!previewUrl},
      metadata:clone(plain(s.metadata)?s.metadata:{})
    };
  }

  presentation(input={},options={}){
    const d=this.normalize(input,options);
    return{
      document:d,mode:d.mode,inline:d.mode==='inline',gallery:d.mode==='gallery',preview:clone(d.preview),
      viewer:d.mode==='viewer'?{url:d.url,formatId:d.format.id,page:d.page}:null,
      primaryLink:this.primaryLink(d),actions:this.actions(d)
    };
  }

  primaryLink(input={}){
    const d=this.#normalized(input);
    if(d.mode==='inline'||d.mode==='gallery')return null;
    if(d.mode==='download')return this.#link(d,'download');
    if(d.mode==='viewer')return this.#link(d,'viewer');
    if(d.mode==='thumbnail')return this.#link(d,d.format.id==='pdf'?'viewer':'new','thumbnail');
    return this.#link(d,'new');
  }

  actions(input={}){
    const d=this.#normalized(input),out=[];
    if(d.permissions.open)out.push(this.#action(d,'open'));
    if(d.permissions.download)out.push(this.#action(d,'download'));
    if(d.permissions.share)out.push(this.#action(d,'share'));
    if(d.permissions.print)out.push(this.#action(d,'print'));
    return out;
  }

  gallery(items=[],options={}){
    return Array.isArray(items)?items.map(item=>this.presentation(item,{...options,mode:'gallery'})):[];
  }

  #action(d,kind){
    if(kind==='open')return{id:'open',label:'Ouvrir',link:this.#link(d,d.format.id==='pdf'?'viewer':'new')};
    if(kind==='download')return{id:'download',label:'Télécharger',link:this.#link(d,'download')};
    return{id:kind,label:kind==='share'?'Partager':'Imprimer',link:this.#actionLink(d,kind)};
  }

  #link(d,target,presentation='text'){
    const descriptor={
      type:'media',href:d.url,target,presentation,label:d.label,ariaLabel:d.label,
      metadata:{formatId:d.format.id,page:d.page,documentId:d.id}
    };
    if(target==='download')descriptor.downloadName=d.format.filename??undefined;
    return clone(this.#linkWiz().normalize(descriptor));
  }

  #actionLink(d,kind){
    return clone(this.#linkWiz().normalize({
      type:'action',actionId:`media.${kind}`,label:kind==='share'?'Partager':'Imprimer',
      metadata:{url:d.url,formatId:d.format.id,page:d.page,documentId:d.id}
    }));
  }

  #linkWiz(){
    if(!this.linkWiz||typeof this.linkWiz.normalize!=='function')throw new MediaDocumentError('LinkWiz with normalize() is required','LINK_WIZ_REQUIRED');
    return this.linkWiz;
  }

  #format(s,url){
    const resolved=this.formatRegistry?.resolve?.({format:s.format??s.formatId??s.type,filename:s.filename??s.name??url,mime:s.mime??s.contentType});
    if(resolved)return clone(resolved);
    const ext=url.split(/[?#]/)[0].split('.').pop()?.toLowerCase();
    const id=s.formatId??s.format??(ext==='pdf'?'pdf':'generic');
    return{id:clean(id)||'generic',label:id==='pdf'?'PDF':'Document',iconKey:id==='pdf'?'pdf':'file',filename:clean(s.filename)||null};
  }

  #normalized(v){return plain(v)&&plain(v.format)&&plain(v.permissions)&&plain(v.preview)?clone(v):this.normalize(v);}
}
