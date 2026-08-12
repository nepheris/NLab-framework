import assert from 'node:assert/strict';
import { QRStudioSession } from '../components/qr-studio-session.js';
import { QRStudioFilmstrip, QRStudioFilmstripError } from '../components/qr-studio-filmstrip.js';

const events=[];
const session=new QRStudioSession({
  autoLoad:false,
  generate:async(config,{id})=>({id,dark:config.dark,transparent:Boolean(config.transparent)})
});
const film=new QRStudioFilmstrip({session,onChange:event=>events.push(event.type)});

let descriptor=film.descriptor();
assert.equal(descriptor.type,'qr-studio-filmstrip');
assert.equal(descriptor.layout,'compact');
assert.equal(descriptor.allVisible,true);
assert.equal(descriptor.count,6);
assert.deepEqual(descriptor.items.map(item=>item.id),['standard','transparent','colored-background','with-logo','theme-monochrome','custom']);
assert.equal(descriptor.selectedId,'standard');
assert.deepEqual(descriptor.controller.controllers,['arrows','dots','thumbnails','counter']);
assert.equal(descriptor.items[0].markers.selection,'border');
assert.equal(descriptor.items[1].markers.selection,'none');

film.next();
assert.equal(session.active().id,'transparent');
assert.equal(film.selectedId(),'transparent');
film.previous();
assert.equal(film.selectedId(),'standard');
film.select('with-logo');
assert.equal(session.active().id,'with-logo');

const edit=film.beginEdit('with-logo');
assert.equal(edit.status,'editing');
const patched=film.patch({dark:'#123456'},{id:'with-logo'});
assert.equal(patched.status,'editing-dirty');
assert.equal(patched.actions.find(action=>action.id==='validate').enabled,true);
assert.equal(session.active().config.dark,'#123456');

const regenerated=await film.regenerate('with-logo');
assert.equal(regenerated.ok,true);
assert.deepEqual(regenerated.item.preview,{id:'with-logo',dark:'#123456',transparent:false});
assert.equal(regenerated.item.generationCount,1);
assert.equal(regenerated.item.markers.generation,'ready');

const validated=film.validate('with-logo',{persist:false});
assert.equal(validated.ok,true);
assert.equal(validated.item.status,'validated');
assert.equal(validated.item.dirty,false);

film.patch({dark:'#abcdef'},{id:'with-logo'});
const reset=film.reset('with-logo');
assert.equal(reset.config.dark,'#123456');
assert.equal(reset.status,'validated');

const thumbnails=film.descriptor().controller.descriptors.find(entry=>entry.type==='thumbnails');
assert.equal(thumbnails.items.length,6);
assert.equal(thumbnails.items[3].id,'with-logo');
assert.equal(thumbnails.items[3].selected,true);

const previewFilm=new QRStudioFilmstrip({
  session:new QRStudioSession({autoLoad:false}),
  previewOf:state=>({id:state.id,validated:state.validated})
});
assert.deepEqual(previewFilm.items()[0].preview,{id:'standard',validated:true});
previewFilm.destroy();

const brokenPreview=new QRStudioFilmstrip({
  session:new QRStudioSession({autoLoad:false}),
  previewOf:()=>{throw new Error('preview failed');}
});
assert.equal(brokenPreview.items()[0].preview,null);
assert.equal(brokenPreview.items()[0].previewError.message,'preview failed');
brokenPreview.destroy();

const noGenerator=new QRStudioFilmstrip({session:new QRStudioSession({autoLoad:false})});
const noGeneration=await noGenerator.regenerate('standard');
assert.equal(noGeneration.ok,false);
assert.equal(noGeneration.reason,'generator-unavailable');
assert.equal(noGeneration.item.status,'validated');
noGenerator.destroy();

assert.throws(()=>film.select('missing'),error=>error instanceof QRStudioFilmstripError&&error.code==='UNKNOWN_ITEM');
assert.throws(()=>new QRStudioFilmstrip({session:{}}),error=>error.code==='INVALID_SESSION');
assert.ok(events.includes('select'));
assert.ok(events.includes('edit'));
assert.ok(events.includes('regenerate'));
assert.ok(events.includes('validate'));
film.destroy();
console.log('qr studio filmstrip tests: ok');
