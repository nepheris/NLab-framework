import assert from 'node:assert/strict';
import { LinkWiz, LinkWizError } from '../wiz/link-wiz.js';

const wiz=new LinkWiz();
const external=wiz.normalize({href:'https://example.com/docs',label:'Docs'});
assert.equal(external.type,'external');assert.equal(external.target,'new');assert.match(external.rel,/noopener/);assert.match(external.rel,/noreferrer/);assert.match(external.rel,/external/);
assert.equal(wiz.normalize({href:'#part'}).type,'anchor');
assert.equal(wiz.normalize({href:'/inside'}).type,'page');
assert.throws(()=>wiz.normalize({type:'anchor',href:'/no'}),e=>e instanceof LinkWizError&&e.code==='INVALID_ANCHOR');
const blocked=['java','script:alert(1)'].join('');
assert.throws(()=>wiz.normalize({href:blocked}),e=>e.code==='UNSAFE_HREF');
assert.throws(()=>wiz.normalize({href:['java','script:alert(1)'].join('\n')}),e=>e.code==='UNSAFE_HREF');
assert.throws(()=>wiz.normalize({type:'action'}),e=>e.code==='ACTION_ID_REQUIRED');
assert.equal(wiz.normalize({type:'action',actionId:'save'}).href,null);
const download=wiz.attributes({type:'media',href:'/x.pdf',target:'download',downloadName:'doc.pdf'});assert.equal(download.attrs.download,'doc.pdf');
const viewer=wiz.attributes({type:'media',href:'/x.pdf',target:'viewer'});assert.equal(viewer.attrs['data-link-viewer'],'true');
const disabled=wiz.attributes({href:'/x',disabled:true});assert.equal(disabled.attrs['aria-disabled'],'true');assert.equal(disabled.attrs.tabindex,'-1');
assert.throws(()=>wiz.normalize({href:'/img',presentation:'image',label:'',ariaLabel:'',alt:''}),e=>e.code==='ACCESSIBLE_NAME_REQUIRED');

class E{constructor(tag='div',doc=null){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attributes=new Map();this.listeners=new Map();this.parentElement=null;this.className='';this.textContent='';}append(...nodes){for(const n of nodes){if(n&&typeof n==='object')n.parentElement=this;this.children.push(n)}}replaceChildren(...nodes){this.children=[];this.append(...nodes)}setAttribute(k,v){this.attributes.set(k,String(v))}addEventListener(t,f){if(!this.listeners.has(t))this.listeners.set(t,new Set());this.listeners.get(t).add(f)}dispatch(t,e={}){for(const f of this.listeners.get(t)??[])f(e)}}
class D{createElement(tag){return new E(tag,this)}}
const doc=new D();
const c=new E('div',doc);const rendered=wiz.render(c,{href:'https://example.com',label:'Example'});assert.equal(rendered.node.tagName,'A');assert.equal(rendered.node.attributes.get('target'),'_blank');assert.equal(rendered.node.children.at(-1).textContent,'↗');
let action=null;const ac=new E('div',doc);const ar=wiz.render(ac,{type:'action',actionId:'save',label:'Save'},{onAction:e=>action=e.actionId});ar.node.dispatch('click',{preventDefault(){}});assert.equal(action,'save');assert.equal(ar.node.tagName,'BUTTON');
const parentAnchor=new E('a',doc);const nestedContainer=new E('div',doc);nestedContainer.parentElement=parentAnchor;let nav=null;const nested=wiz.render(nestedContainer,{href:'/inside',label:'Inside'},{navigate:e=>nav=e.href});assert.equal(nested.node.tagName,'SPAN');assert.equal(nested.nestedAnchorAvoided,true);assert.equal(nestedContainer.children.filter(x=>x.tagName==='A').length,0);nested.node.dispatch('click',{preventDefault(){}});assert.equal(nav,'/inside');
const dis=new E('div',doc);let called=false;const dr=wiz.render(dis,{type:'action',actionId:'delete',disabled:true},{onAction:()=>called=true});dr.node.dispatch('click',{preventDefault(){}});assert.equal(called,false);
const meta={a:{b:1}};const m=wiz.normalize({href:'/m',metadata:meta});meta.a.b=9;assert.equal(m.metadata.a.b,1);
console.log('link wiz tests: ok');
