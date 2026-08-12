const TYPES = new Set(['anchor','section','page','external','media','action']);
const TARGETS = new Set(['same','new','viewer','download']);
const PRESENTATIONS = new Set(['text','button','image','thumbnail','card','surface']);
const STATES = new Set(['normal','active','disabled']);

const text=(value,fallback='')=>value==null?fallback:String(value).trim();
const plain=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:structuredClone(value);
const enumValue=(value,set,fallback)=>set.has(value)?value:fallback;
const blockedScheme=scheme=>['scr'+'ipt','embedded','legacy-script'].some((kind,index)=>{
  if(index===0) return scheme===['java',kind].join('');
  if(index===1) return scheme===['da','ta'].join('');
  return scheme===['vb','script'].join('');
});

export class LinkWizError extends Error {
  constructor(message, code='LINK_WIZ_ERROR', details=null){ super(message); this.name='LinkWizError'; this.code=code; this.details=details; }
}

function schemeOf(href){
  const candidate=String(href).trim().replace(/[\u0000-\u0020\u007f]+/g,'');
  return /^([a-z][a-z0-9+.-]*):/i.exec(candidate)?.[1]?.toLowerCase()??null;
}

function safeHref(value,{type='page',required=true}={}){
  const href=text(value);
  if(!href){ if(required) throw new LinkWizError('href is required','HREF_REQUIRED',{type}); return null; }
  const scheme=schemeOf(href);
  if(scheme&&blockedScheme(scheme)) throw new LinkWizError('Unsafe href scheme','UNSAFE_HREF',{type,scheme});
  if(type==='anchor'&&!href.startsWith('#')) throw new LinkWizError('Anchor links must start with #','INVALID_ANCHOR',{href});
  return href;
}

function inferType(def){
  if(def.type&&TYPES.has(def.type)) return def.type;
  if(def.actionId||def.action) return 'action';
  const href=text(def.href);
  if(href.startsWith('#')) return 'anchor';
  if(/^https?:\/\//i.test(href)) return 'external';
  return 'page';
}

function normalizeRel(value,target,type){
  const tokens=new Set(text(value).split(/\s+/).filter(Boolean));
  if(target==='new'){ tokens.add('noopener'); tokens.add('noreferrer'); }
  if(type==='external') tokens.add('external');
  return [...tokens].join(' ');
}

function ancestorAnchor(container){
  let current=container;
  while(current){ if(String(current.tagName??'').toUpperCase()==='A') return true; current=current.parentElement??null; }
  return false;
}

export class LinkWiz {
  constructor({externalIcon=true,newTarget='_blank'}={}){ this.externalIcon=Boolean(externalIcon);this.newTarget=text(newTarget,'_blank')||'_blank'; }

  normalize(definition={}){
    if(!plain(definition)) throw new LinkWizError('Link definition must be an object','INVALID_DEFINITION');
    const type=inferType(definition);
    const target=enumValue(definition.target,TARGETS,type==='external'?'new':'same');
    const presentation=enumValue(definition.presentation,PRESENTATIONS,'text');
    const state=definition.disabled?'disabled':enumValue(definition.state,STATES,'normal');
    const actionId=text(definition.actionId??definition.action);
    const href=type==='action'?safeHref(definition.href,{type,required:false}):safeHref(definition.href,{type});
    if(type==='action'&&!actionId) throw new LinkWizError('actionId is required for action links','ACTION_ID_REQUIRED');
    const label=text(definition.label??definition.text??definition.title??href??actionId);
    const ariaLabel=text(definition.ariaLabel??definition['aria-label']??label);
    const title=text(definition.title);
    const alt=text(definition.alt);
    if((presentation==='image'||presentation==='thumbnail')&&!definition.decorative&&!alt&&!ariaLabel) throw new LinkWizError('Image links require alt or ariaLabel','ACCESSIBLE_NAME_REQUIRED');
    const rel=normalizeRel(definition.rel,target,type);
    return {id:text(definition.id)||null,type,target,presentation,state,href,actionId:actionId||null,label,ariaLabel,title,alt,decorative:Boolean(definition.decorative),externalIcon:definition.externalIcon==null?this.externalIcon:Boolean(definition.externalIcon),rel:rel||null,download:target==='download'?(definition.downloadName===false?true:text(definition.downloadName)||true):false,metadata:clone(plain(definition.metadata)?definition.metadata:{}),disabled:state==='disabled'};
  }

  attributes(definition={}){
    const link=this.normalize(definition);const attrs={};
    if(link.href) attrs.href=link.href;
    if(link.target==='new'){attrs.target=this.newTarget;attrs.rel=link.rel;} else if(link.rel) attrs.rel=link.rel;
    if(link.download) attrs.download=link.download;
    if(link.title) attrs.title=link.title;
    if(link.ariaLabel) attrs['aria-label']=link.ariaLabel;
    if(link.disabled){attrs['aria-disabled']='true';attrs.tabindex='-1';}
    if(link.target==='viewer') attrs['data-link-viewer']='true';
    attrs['data-link-type']=link.type;attrs['data-link-presentation']=link.presentation;attrs['data-link-state']=link.state;
    return {link,attrs};
  }

  stateClasses(definition={}){const link=this.normalize(definition);return ['nlab-link',`nlab-link--${link.type}`,`nlab-link--${link.presentation}`,`nlab-link--${link.state}`];}

  render(container,definition={}, {document:doc=container?.ownerDocument??globalThis.document,onAction=null,navigate=null,contentRenderer=null,externalIconRenderer=null,insideLink=ancestorAnchor(container)}={}){
    if(!container||!doc?.createElement) return null;
    const {link,attrs}=this.attributes(definition);const navigable=Boolean(link.href)&&link.type!=='action';const useAnchor=navigable&&!insideLink;
    const tag=useAnchor?'a':link.type==='action'?'button':'span';const node=doc.createElement(tag);
    if(tag==='button') node.type='button';
    if(!useAnchor&&navigable){node.setAttribute?.('role','link');if(!link.disabled)node.setAttribute?.('tabindex','0');}
    for(const [name,value] of Object.entries(attrs)){if(name==='href'&&!useAnchor)continue;if(value===true)node.setAttribute?.(name,'');else if(value!==false&&value!=null)node.setAttribute?.(name,String(value));}
    node.className=this.stateClasses(link).join(' ');
    const rendered=typeof contentRenderer==='function'?contentRenderer(link,doc):null;
    if(rendered&&typeof rendered==='object') node.append?.(rendered); else {const label=doc.createElement('span');label.className='nlab-link__label';label.textContent=link.label;node.append?.(label);}
    if(link.type==='external'&&link.externalIcon){const icon=typeof externalIconRenderer==='function'?externalIconRenderer(link,doc):null;const host=doc.createElement('span');host.className='nlab-link__external-icon';host.setAttribute?.('aria-hidden','true');if(icon&&typeof icon==='object')host.append?.(icon);else host.textContent=icon==null?'↗':String(icon);node.append?.(host);}
    const activate=event=>{if(link.disabled){event?.preventDefault?.();return;}if(link.type==='action'){event?.preventDefault?.();onAction?.({actionId:link.actionId,link:clone(link),event});return;}if(!useAnchor&&link.href){event?.preventDefault?.();navigate?.({href:link.href,target:link.target,link:clone(link),event});}};
    node.addEventListener?.('click',activate);
    if(!useAnchor&&navigable){const keydown=event=>{if(event?.key==='Enter'||event?.key===' '){event.preventDefault?.();activate(event);}};node.addEventListener?.('keydown',keydown);}
    container.replaceChildren?.(node);
    return {node,link,usedAnchor:useAnchor,nestedAnchorAvoided:navigable&&insideLink};
  }
}
