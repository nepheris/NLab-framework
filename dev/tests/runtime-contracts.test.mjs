import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const FW=path.resolve(HERE,'../framework');

function element(tag='div'){
  const listeners={};
  const node={
    tagName:tag.toUpperCase(),type:'',className:'',dataset:{},style:{},attributes:{},children:[],hidden:false,
    value:'',files:null,options:[],elements:[],id:'',currentTime:0,
    classList:{add(){}},
    setAttribute(k,v){this.attributes[k]=String(v);},getAttribute(k){return this.attributes[k]??null;},removeAttribute(k){delete this.attributes[k];},
    append(...items){this.children.push(...items);},appendChild(item){this.children.push(item);return item;},replaceChildren(...items){this.children=[...items];},
    addEventListener(type,fn){(listeners[type]??=[]).push(fn);},
    dispatchEvent(evt){evt.target??=this;for(const fn of listeners[evt.type]||[])fn(evt);return true;},
    click(){this.dispatchEvent({type:'click',preventDefault(){}});},remove(){},
    querySelector(){return null;},querySelectorAll(){return [];},matches(){return false;},
    pause(){},play(){return Promise.resolve();}
  };
  return node;
}

const body=element('body');body.dataset={};
const documentElement=element('html');documentElement.dataset={};
const document={
  currentScript:null,baseURI:'https://example.test/dev/framework/components/test.html',readyState:'loading',
  body,documentElement,
  createElement:element,querySelector(){return null;},querySelectorAll(){return [];},getElementById(){return null;},addEventListener(){},dispatchEvent(){return true;}
};
class CustomEventMock{constructor(type,options={}){this.type=type;this.detail=options.detail;this.bubbles=!!options.bubbles;}}
class EventMock{constructor(type,options={}){this.type=type;this.bubbles=!!options.bubbles;}}

const context={
  console,URL,Blob,setTimeout,clearTimeout,queueMicrotask,
  document,CustomEvent:CustomEventMock,Event:EventMock,
  navigator:{},
  localStorage:{setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');},getItem(){throw new Error('blocked');}},
  FormData:class{constructor(){this.items=[];}entries(){return this.items[Symbol.iterator]();}},
  File:class FileMock{},
  window:{NLabConfig:{},NLabRuntimeData:{},NLabIcons:{get:name=>`<svg data-icon="${name}"></svg>`}},
  scrollTo(){}
};
context.window.window=context.window;
vm.createContext(context);

function run(rel){vm.runInContext(fs.readFileSync(path.join(FW,rel),'utf8'),context,{filename:rel});}

run('components/ui-runtime.js');
assert.equal(typeof context.window.NLabUI?.makeButton,'function','NLabUI.makeButton must be exported for reusable controls');
context.window.NLabUI.state.buttons={Data:{buttons:[
  {id:'attach_file',icon:'attachment',label:'Joindre un fichier'},
  {id:'delete',icon:'trash',label:'Supprimer'},
  {id:'record',icon:'record',label:'Enregistrer'},
  {id:'play',icon:'play',label:'Lire'},
  {id:'pause',icon:'pause',label:'Pause'},
  {id:'stop',icon:'stop',label:'Arrêter'},
  {id:'save_draft',icon:'save',label:'Enregistrer le brouillon'},
  {id:'restore_draft',icon:'refresh',label:'Reprendre le brouillon'},
  {id:'clear_draft',icon:'trash',label:'Effacer le brouillon'},
  {id:'export_draft',icon:'download',label:'Exporter le brouillon'},
  {id:'import_draft',icon:'upload',label:'Importer un brouillon'}
]}};
const testButton=context.window.NLabUI.makeButton('attach_file');
assert.equal(testButton.dataset.buttonId,'attach_file');
assert.match(testButton.innerHTML,/attachment/);

run('components/form-media-runtime.js');
const attachmentHost=element();attachmentHost.dataset={accept:'image/*',maxFiles:'2'};
const audioHost=element();audioHost.dataset={};
const mediaRoot={querySelectorAll(selector){if(selector==='[data-nlab-attachments]')return [attachmentHost];if(selector==='[data-nlab-audio-recorder]')return [audioHost];return [];}};
context.window.NLabFormMedia.init(mediaRoot);
assert.equal(attachmentHost.dataset.nlabReady,'1');
assert.equal(audioHost.dataset.nlabReady,'1');
attachmentHost.dispatchEvent({type:'drop',preventDefault(){},dataTransfer:{files:[{name:'bad.pdf',type:'application/pdf',size:100}]}});
assert.equal(context.window.NLabFormMedia.getAttachments(attachmentHost).length,0,'drop validation must reject files outside accept');
attachmentHost.dispatchEvent({type:'drop',preventDefault(){},dataTransfer:{files:[{name:'ok.png',type:'image/png',size:100}]}});
assert.equal(context.window.NLabFormMedia.getAttachments(attachmentHost).length,1,'allowed dropped file must be retained');
const recordButton=audioHost.children.find(x=>x?.dataset?.buttonId==='record');
assert.ok(recordButton,'audio recorder must use central record button');
recordButton.click();

run('modules/client-persistence-runtime.js');
const form=element('form');form.elements=[];form.addEventListener=()=>{};form.dispatchEvent=()=>true;
const draftHost=element();draftHost.dataset={draftStorage:'local_storage',draftKey:'smoke'};draftHost.matches=()=>false;draftHost.querySelector=()=>form;
const draftRoot={querySelectorAll(selector){return selector==='[data-nlab-draft]'?[draftHost]:[];}};
context.window.NLabDrafts.init(draftRoot);
assert.equal(context.window.NLabDrafts.effectiveStorage(draftHost),'memory','blocked localStorage must degrade to memory');
assert.ok(draftHost.children.some(x=>x?.className==='nlab-draft-controls'),'draft controls must render with central buttons');

console.log('nLab runtime smoke tests: PASS');
