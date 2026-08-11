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

manager.remove(duplicate.id);
assert.equal(manager.get(duplicate.id), null);

const reloaded = new PresetManager({ namespace: 'qr', storage, canonical: [{ id: 'qr.standard', settings: { width: 220 } }] });
assert.ok(reloaded.get(custom.id));

console.log('PresetManager tests: OK');
