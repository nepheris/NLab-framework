import assert from 'node:assert/strict';
import { QRPresetCodec } from '../wiz/qr-preset-codec.js';

const codec = new QRPresetCodec();
assert.equal(QRPresetCodec.documentType, 'nlab.qr-presets');
assert.equal(QRPresetCodec.version, 1);

const base = { id:'default', name:'Default QR', config:{ type:'url', url:'https://example.test', width:256, format:'svg' } };
assert.deepEqual(codec.validatePreset(base), { valid:true, errors:[] });
assert.equal(codec.validatePreset({ id:'bad id', config:{type:'text', text:'ok'} }).valid, false);
assert.match(codec.validatePreset({ id:'x', config:{type:'text', text:''} }).errors[0], /requires/);
assert.match(codec.validatePreset({ id:'x', config:{type:'wifi', ssid:''} }).errors[0], /SSID/);
assert.match(codec.validatePreset({ id:'x', config:{type:'contact'} }).errors[0], /name/);
assert.match(codec.validatePreset({ id:'x', config:{type:'url', width:1} }).errors[0], /width/);
assert.match(codec.validatePreset({ id:'x', config:{type:'url', format:'webp'} }).errors[0], /format/);

const input = { ...base, tags:['main','public'], meta:{ source:'test' } };
const normalized = codec.normalizePreset(input);
input.config.width = 999;
input.tags[0] = 'changed';
assert.equal(normalized.config.width, 256);
assert.deepEqual(normalized.tags, ['main','public']);

const exported = codec.exportCollection([
  base,
  { id:'wifi', label:'Guest Wi-Fi', config:{type:'wifi', ssid:'Guest', security:'open'} }
], { activeId:'wifi', meta:{ project:'nLab' } });
const doc = JSON.parse(exported);
assert.equal(doc.type, 'nlab.qr-presets');
assert.equal(doc.version, 1);
assert.equal(doc.activeId, 'wifi');
assert.equal(doc.presets[1].name, 'Guest Wi-Fi');

const imported = codec.importCollection(exported);
assert.deepEqual(imported, doc);
imported.presets[0].config.url = 'tampered';
assert.equal(JSON.parse(exported).presets[0].config.url, 'https://example.test');

assert.throws(() => codec.exportCollection([base, base]), (error) => error.issues?.some((x)=>/duplicate/.test(x)));
assert.throws(() => codec.exportCollection([base], {activeId:'missing'}), (error) => error.issues?.some((x)=>/activeId/.test(x)));
assert.throws(() => codec.importCollection('{bad'), (error) => /Invalid QR preset JSON/.test(error.message));
assert.throws(() => codec.importCollection({type:'wrong',version:1,presets:[]}), (error) => error.issues?.some((x)=>/document.type/.test(x)));
assert.throws(() => codec.importCollection({type:'nlab.qr-presets',version:2,presets:[]}), (error) => error.issues?.some((x)=>/version/.test(x)));
assert.throws(() => codec.importCollection({type:'nlab.qr-presets',version:1,presets:[base,base]}), (error) => error.issues?.some((x)=>/duplicate/.test(x)));
assert.throws(() => codec.importCollection({type:'nlab.qr-presets',version:1,presets:[{id:'x',config:{type:'text',text:''}}]}), (error) => error.issues?.some((x)=>/presets\[0\]/.test(x)));

const circular = { type:'url' };
circular.self = circular;
assert.equal(codec.validatePreset({id:'circle',config:circular}).valid, false);
assert.throws(() => codec.normalizePreset({id:'nan',config:{type:'url',width:NaN}}));

const compact = codec.exportCollection([base], {space:0});
assert.equal(compact.includes('\n'), false);
const maxIndent = codec.exportCollection([base], {space:99});
assert.match(maxIndent, /\n        "type"/);

console.log('qr preset codec tests: ok');
