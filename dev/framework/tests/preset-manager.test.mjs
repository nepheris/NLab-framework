import assert from 'node:assert/strict';
import { PresetManager } from '../components/preset-manager.js';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  get(key, fallback = null) { return this.map.has(key) ? structuredClone(this.map.get(key)) : fallback; }
  set(key, value) { this.map.set(key, structuredClone(value)); return true; }
}

const storage = new MemoryStorage();
const manager = new PresetManager({
  namespace: 'qr',
  storage,
  canonical: [
    { id: 'qr.standard', label: 'Standard', settings: { width: 220, margin: 2 } },
    { id: 'qr.transparent', label: 'Transparent', settings: { width: 220, transparent: true } },
  ],
});

assert.equal(manager.list().length, 2);
assert.equal(manager.get('qr.standard').canonical, true);
assert.throws(() => manager.update('qr.standard', { width: 300 }), /immutable/);

const custom = manager.create({ label: 'Mon QR', settings: { width: 260, margin: 1 } });
assert.equal(custom.id, 'qr.mon-qr');
assert.equal(manager.getActive().id, custom.id);

manager.update(custom.id, { margin: 4 });
assert.equal(manager.get(custom.id).settings.margin, 4);
assert.equal(manager.get(custom.id).validated, false);

manager.validate(custom.id);
assert.equal(manager.get(custom.id).validated, true);

const duplicate = manager.duplicate(custom.id);
assert.notEqual(duplicate.id, custom.id);
assert.deepEqual(duplicate.settings, manager.get(custom.id).settings);

manager.rename(duplicate.id, 'QR secondaire');
assert.equal(manager.get(duplicate.id).label, 'QR secondaire');

const exported = manager.exportJSON();
const imported = new PresetManager({ namespace: 'qr', canonical: [{ id: 'qr.standard', settings: { width: 220 } }] });
imported.importJSON(exported);
assert.ok(imported.get(custom.id));
assert.equal(imported.get(custom.id).settings.margin, 4);
assert.equal(imported.get('qr.standard').settings.width, 220);

manager.remove(duplicate.id);
assert.equal(manager.get(duplicate.id), null);

const reloaded = new PresetManager({ namespace: 'qr', storage, canonical: [{ id: 'qr.standard', settings: { width: 220 } }] });
assert.ok(reloaded.get(custom.id));

// Un import invalide doit être atomique, même avec replace=true.
const atomic = new PresetManager({
  namespace: 'qr',
  canonical: [{ id: 'qr.standard', label: 'Standard', settings: { width: 220 } }],
  presets: [{ id: 'qr.existing', label: 'Existing', settings: { width: 111 } }]
});
atomic.setActive('qr.existing');
const beforeAtomic = atomic.exportJSON();
assert.throws(() => atomic.importJSON({
  version: 1,
  type: 'nlab-preset-collection',
  namespace: 'qr',
  activeId: 'qr.new',
  presets: [
    { id: 'qr.new', label: 'New', settings: { width: 300 } },
    { label: 'Missing id', settings: {} }
  ]
}, { replace: true }), /id is required/);
assert.equal(atomic.exportJSON(), beforeAtomic);

// Un activeId importé doit exister dans l'état préparé.
assert.throws(() => atomic.importJSON({
  version: 1,
  type: 'nlab-preset-collection',
  namespace: 'qr',
  activeId: 'qr.missing',
  presets: [{ id: 'qr.new', settings: { width: 300 } }]
}, { replace: true }), /Unknown active preset/);
assert.equal(atomic.exportJSON(), beforeAtomic);

// Validation structurelle de la collection.
assert.throws(() => atomic.importJSON({ version: 2, type: 'nlab-preset-collection', namespace: 'qr', presets: [] }), /version/);
assert.throws(() => atomic.importJSON({ version: 1, type: 'other', namespace: 'qr', presets: [] }), /Unsupported/);
assert.throws(() => atomic.importJSON({ version: 1, type: 'nlab-preset-collection', namespace: 'other', presets: [] }), /namespace mismatch/);
assert.throws(() => atomic.importJSON({ version: 1, type: 'nlab-preset-collection', namespace: 'qr', presets: {} }), /must be an array/);
assert.throws(() => atomic.importJSON({ version: 1, type: 'nlab-preset-collection', namespace: 'qr', activeId: 12, presets: [] }), /activeId/);

// Les doublons dans un même paquet sont rejetés sans mutation.
assert.throws(() => atomic.importJSON({
  version: 1,
  type: 'nlab-preset-collection',
  namespace: 'qr',
  presets: [
    { id: 'qr.dup', settings: { width: 1 } },
    { id: 'qr.dup', settings: { width: 2 } }
  ]
}), /Duplicate imported preset/);
assert.equal(atomic.exportJSON(), beforeAtomic);

// replace=true remplace les presets utilisateur, conserve les canoniques et remet activeId à null s'il est absent.
const replacement = {
  version: 1,
  type: 'nlab-preset-collection',
  namespace: 'qr',
  presets: [
    { id: 'qr.standard', canonical: true, settings: { width: 999 } },
    { id: 'qr.replaced', label: 'Replaced', settings: { width: 444 } }
  ]
};
atomic.importJSON(replacement, { replace: true });
assert.equal(atomic.get('qr.existing'), null);
assert.equal(atomic.get('qr.replaced').settings.width, 444);
assert.equal(atomic.get('qr.standard').settings.width, 220);
assert.equal(atomic.getActive(), null);

atomic.importJSON({
  version: 1,
  type: 'nlab-preset-collection',
  namespace: 'qr',
  activeId: 'qr.active',
  presets: [{ id: 'qr.active', settings: { width: 555 } }]
}, { replace: true });
assert.equal(atomic.getActive().id, 'qr.active');
assert.equal(atomic.get('qr.replaced'), null);

console.log('PresetManager tests: OK');
