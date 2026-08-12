import assert from 'node:assert/strict';
import { FloatingPanelState, mountFloatingPanel } from '../components/floating-panel.js';

const state=new FloatingPanelState({x:-4,y:'bad',width:1,height:1,docked:'weird',open:false});
assert.deepEqual(state.toJSON(),{x:0,y:24,width:280,height:180,locked:false,minimized:false,docked:null,pinned:false,open:false});
state.apply({x:10,y:20,width:400,height:240,docked:'left',open:true});assert.equal(state.docked,'left');assert.equal(state.open,true);
state.dock('bad');assert.equal(state.docked,null);state.dock();assert.equal(state.docked,'right');state.undock();
state.move(900,900,{width:500,height:400});assert.equal(state.x,100);assert.equal(state.y,160);
state.toggleLock();state.move(0,0,{width:500,height:400});assert.equal(state.x,100);state.toggleLock();state.togglePin();state.move(0,0);assert.equal(state.x,100);state.togglePin();
state.resize(50,50,{width:1000,height:1000});assert.equal(state.width,280);assert.equal(state.height,180);state.close();assert.equal(state.open,false);state.reopen();assert.equal(state.open,true);

class Element{constructor(tag='div',doc=null){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.parentElement=null;this.style={};this.dataset={};this.hidden=false;this.attrs=new Map();this.listeners=new Map();this.classList={add:()=>{}};}append(...n){for(const x of n){x.parentElement=this;this.children.push(x)}}setAttribute(k,v){this.attrs.set(k,String(v))}getAttribute(k){return this.attrs.get(k)??null}addEventListener(t,f){if(!this.listeners.has(t))this.listeners.set(t,new Set());this.listeners.get(t).add(f)}removeEventListener(t,f){this.listeners.get(t)?.delete(f)}dispatch(t,e={}){for(const f of [...(this.listeners.get(t)??[])])f(e)}closest(sel){if(sel.includes(this.tagName.toLowerCase()))return this;return null}querySelector(sel){if(sel==='[data-panel-bar]')return this.bar??null;if(sel==='[data-panel-resize]')return this.resizeHandle??null;if(sel==='.nlab-floating-panel__body')return this.body??null;return null}querySelectorAll(sel){return sel==='[data-panel-action]'?(this.actions??[]):[]}}
class Doc{createElement(tag){return new Element(tag,this)}}
class Win{constructor(){this.innerWidth=800;this.innerHeight=600;this.listeners=new Map()}addEventListener(t,f){if(!this.listeners.has(t))this.listeners.set(t,new Set());this.listeners.get(t).add(f)}removeEventListener(t,f){this.listeners.get(t)?.delete(f)}dispatch(t,e={}){for(const f of [...(this.listeners.get(t)??[])])f(e)}}
const doc=new Doc(),win=new Win(),root=new Element('div',doc);root.bar=new Element('div',doc);root.resizeHandle=new Element('div',doc);root.body=new Element('div',doc);root.firstElementChild=root.bar;
const action=(name)=>{const e=new Element('button',doc);e.setAttribute('data-panel-action',name);return e};root.actions=['lock','pin','minimize','dock-left','undock','close'].map(action);
const storage={value:{x:30,y:40,width:410,height:250,pinned:true},get(){return this.value},set(k,v){this.value=v;return true}};const changes=[];let closes=0;
const controller=mountFloatingPanel(root,{storage,storageKey:'p',document:doc,window:win,onChange:v=>changes.push(v),onClose:()=>closes++});
assert.equal(controller.state.x,30);assert.equal(controller.state.pinned,true);assert.equal(root.dataset.open,'true');assert.equal(root.bar.getAttribute('aria-label'),'Déplacer le panneau');assert.equal(root.resizeHandle.getAttribute('aria-label'),'Redimensionner le panneau');
root.actions[1].dispatch('click',{preventDefault(){}});assert.equal(controller.state.pinned,false);assert.equal(root.actions[1].getAttribute('aria-pressed'),'false');
root.actions[0].dispatch('click',{preventDefault(){}});assert.equal(controller.state.locked,true);root.actions[0].dispatch('click',{preventDefault(){}});assert.equal(controller.state.locked,false);
root.actions[3].dispatch('click',{preventDefault(){}});assert.equal(controller.state.docked,'left');assert.equal(root.style.left,'0px');root.actions[4].dispatch('click',{preventDefault(){}});assert.equal(controller.state.docked,null);assert.equal(root.style.right,'');
root.bar.dispatch('pointerdown',{target:root.bar,clientX:10,clientY:10,preventDefault(){}});win.dispatch('pointermove',{clientX:40,clientY:30});win.dispatch('pointerup',{});assert.equal(controller.state.x,60);assert.equal(controller.state.y,60);
root.resizeHandle.dispatch('pointerdown',{clientX:0,clientY:0,preventDefault(){},stopPropagation(){}});win.dispatch('pointermove',{clientX:30,clientY:20});win.dispatch('pointerup',{});assert.equal(controller.state.width,440);assert.equal(controller.state.height,270);
root.actions[5].dispatch('click',{preventDefault(){}});assert.equal(controller.state.open,false);assert.equal(root.hidden,true);assert.equal(closes,1);controller.open();assert.equal(root.hidden,false);controller.close();assert.equal(closes,2);assert.ok(changes.length>0);
controller.destroy();const x=controller.state.x;win.dispatch('pointermove',{clientX:700,clientY:500});assert.equal(controller.state.x,x);controller.destroy();
const noDom=mountFloatingPanel(null,{state:{open:false}});assert.equal(noDom.state.open,false);noDom.open();assert.equal(noDom.state.open,true);noDom.lock();assert.equal(noDom.state.locked,true);noDom.undock();
const badStorage={get(){throw new Error('no')},set(){throw new Error('no')}};const safeRoot=new Element('div',doc);safeRoot.firstElementChild=null;assert.doesNotThrow(()=>mountFloatingPanel(safeRoot,{storage:badStorage,storageKey:'x',document:doc,window:win}).close());
console.log('floating panel robustness tests: ok');
