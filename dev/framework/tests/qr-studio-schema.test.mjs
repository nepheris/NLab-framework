import assert from 'node:assert/strict';
import { QRStudioSchema, QRStudioSchemaError } from '../components/qr-studio-schema.js';

const schema = new QRStudioSchema();
const fields = schema.fields();
assert.equal(fields.length, 11);
assert.equal(schema.field('dark').label, 'Couleur QR code');
assert.equal(schema.field('light').label, 'Couleur arrière-plan');
assert.equal(schema.field('transparent').label, 'Arrière-plan transparent');
assert.equal(schema.field('errorCorrectionLevel').label, "Correction d'erreur");
assert.deepEqual(schema.errorCorrectionLevels().map((entry) => entry.value), ['L','M','Q','H']);
assert.match(schema.errorCorrectionLevels()[3].help, /logo/i);
assert.equal(schema.fields({group:'logo'}).length, 4);
assert.deepEqual(schema.field('logoSize').visibleWhen, {field:'logo',operator:'truthy'});

const presets = schema.presets();
assert.deepEqual(presets.map((preset) => preset.id), ['standard','transparent','colored-background','with-logo','theme-monochrome','custom']);
assert.equal(schema.preset('transparent').config.transparent, true);
assert.equal(schema.preset('with-logo').config.errorCorrectionLevel, 'H');
assert.deepEqual(schema.preset('with-logo').meta.requires, ['logo']);
assert.deepEqual(schema.preset('theme-monochrome').meta.themeBindings, {dark:'text',light:'surface'});

const draft = schema.draftFromPreset('standard', {dark:'#123456',transparent:true});
assert.equal(draft.config.dark, '#123456');
assert.equal(draft.config.transparent, true);
assert.equal(schema.preset('standard').config.dark, '#000000');
const panel = schema.controlPanel({presetId:'with-logo'});
assert.equal(panel.presetLabel, 'Avec logo');
assert.deepEqual(panel.actions.map((action)=>action.id), ['edit','regenerate','validate','reset']);
assert.equal(panel.fields.length, fields.length);
const snap = schema.snapshot();
snap.fields[0].label = 'mutated';
assert.equal(schema.field('dark').label, 'Couleur QR code');
assert.equal(schema.preset('unknown'), null);
assert.throws(() => schema.draftFromPreset('unknown'), (error) => error instanceof QRStudioSchemaError && error.code==='UNKNOWN_PRESET');
assert.throws(() => new QRStudioSchema({fields:[{id:'x',type:'wat'}],presets:[]}), (error) => error.code==='INVALID_FIELD_TYPE');
assert.throws(() => new QRStudioSchema({fields:[{id:'x',type:'text'},{id:'x',type:'text'}],presets:[]}), (error) => error.code==='DUPLICATE_ID');

console.log('qr studio schema tests: ok');
