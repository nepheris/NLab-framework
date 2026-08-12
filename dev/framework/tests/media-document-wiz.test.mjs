import assert from 'node:assert/strict';
import {MediaDocumentWiz,MediaDocumentError} from '../wiz/media-document-wiz.js';

const calls=[];
const linkWiz={normalize(d){calls.push(structuredClone(d));return{...structuredClone(d),normalized:true};}};
const formatRegistry={resolve(input){
  const filename=String(input.filename??'');
  if(filename.includes('.pdf'))return{id:'pdf',label:'PDF',iconKey:'pdf',filename:'guide.pdf'};
  if(filename.includes('.png'))return{id:'image',label:'Image',iconKey:'image',filename:'photo.png'};
  return{id:'generic',label:'Fichier',iconKey:'file',filename:null};
}};
const w=new MediaDocumentWiz({linkWiz,formatRegistry});
const pdf=w.normalize({id:'d1',url:'/guide.pdf',initialPage:3,permissions:{share:true,print:true}});
assert.equal(pdf.mode,'viewer');assert.equal(pdf.page,3);assert.equal(pdf.preview.iconKey,'pdf');
const p=w.presentation(pdf);
assert.equal(p.viewer.page,3);assert.equal(p.primaryLink.target,'viewer');assert.deepEqual(p.actions.map(a=>a.id),['open','download','share','print']);assert.equal(p.actions[1].link.target,'download');assert.equal(p.actions[2].link.actionId,'media.share');assert.ok(calls.every(call=>call.type==='media'||call.type==='action'));
const thumb=w.presentation({url:'/guide.pdf',mode:'thumbnail',previewUrl:'/guide.png'});assert.equal(thumb.preview.kind,'image');assert.equal(thumb.primaryLink.target,'viewer');assert.equal(thumb.primaryLink.presentation,'thumbnail');
const image=w.presentation({url:'/photo.png',mode:'link',permissions:{download:false}});assert.equal(image.primaryLink.target,'new');assert.deepEqual(image.actions.map(a=>a.id),['open']);
assert.equal(w.presentation({url:'/photo.png',mode:'inline'}).primaryLink,null);
const dl=w.presentation({url:'/guide.pdf',mode:'download'});assert.equal(dl.primaryLink.target,'download');assert.equal(dl.primaryLink.downloadName,'guide.pdf');
const gallery=w.gallery([{url:'/photo.png'},{url:'/guide.pdf'}]);assert.equal(gallery.length,2);assert.ok(gallery.every(item=>item.mode==='gallery'&&item.primaryLink===null));
assert.throws(()=>w.normalize({url:'/guide.pdf',page:0}),e=>e instanceof MediaDocumentError&&e.code==='INVALID_PAGE');assert.throws(()=>w.normalize({}),e=>e.code==='URL_REQUIRED');assert.throws(()=>new MediaDocumentWiz({formatRegistry}).presentation({url:'/guide.pdf'}),e=>e.code==='LINK_WIZ_REQUIRED');assert.equal(new MediaDocumentWiz({linkWiz}).normalize('/x.pdf').format.id,'pdf');
const metadata=w.normalize({url:'/guide.pdf',metadata:{a:{b:1}}});metadata.metadata.a.b=9;assert.equal(w.normalize({url:'/guide.pdf',metadata:{a:{b:1}}}).metadata.a.b,1);
console.log('media document wiz tests: ok');
