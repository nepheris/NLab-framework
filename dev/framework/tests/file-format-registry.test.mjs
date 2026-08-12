import assert from 'node:assert/strict';
import { FileFormatRegistry } from '../core/file-format-registry.js';

const registry = new FileFormatRegistry();
assert.equal(registry.has('pdf'), true);
assert.equal(registry.has('wat'), false);
assert.ok(registry.list().length >= 10);
assert.equal(registry.list({ category: 'code' }).some((item) => item.id === 'javascript'), true);

assert.deepEqual(
  { id: registry.resolve('report.PDF?download=1').id, by: registry.resolve('report.PDF?download=1').matchedBy },
  { id: 'pdf', by: 'extension' }
);
assert.equal(registry.resolve({ filename: '/tmp/archive.tar.gz' }).id, 'archive');
assert.equal(registry.resolve({ filename: 'photo.svg', mime: 'image/svg+xml; charset=utf-8' }).id, 'svg');
assert.equal(registry.resolve({ filename: 'photo.svg', mime: 'image/png' }).id, 'image');
assert.equal(registry.resolve({ filename: 'unknown.bin', mime: 'image/webp' }).id, 'image');
assert.equal(registry.resolve({ filename: 'sheet.xlsx' }).id, 'spreadsheet');
assert.equal(registry.resolve({ filename: 'README.md' }).id, 'text');
assert.equal(registry.resolve({ kind: 'folder', filename: 'assets.svg' }).id, 'folder');
assert.equal(registry.resolve({ format: 'json', filename: 'data.txt' }).id, 'json');
assert.equal(registry.resolve('unknown.blob').id, 'generic');

const pdf = registry.get('pdf');
pdf.extensions.push('pollution');
assert.deepEqual(registry.get('pdf').extensions, ['pdf']);
const list = registry.list();
list[0].label = 'pollution';
assert.notEqual(registry.list()[0].label, 'pollution');

const custom = registry.register({
  id: 'geojson',
  label: 'GeoJSON',
  iconKey: 'map-data',
  category: 'data',
  extensions: ['geojson', '.map.json'],
  mimes: ['application/geo+json']
});
assert.equal(custom.builtIn, false);
assert.equal(registry.resolve('zones.GEOJSON').id, 'geojson');
assert.equal(registry.resolve('zones.map.json').id, 'geojson');
assert.equal(registry.resolve({ mime: 'application/geo+json; charset=utf-8' }).id, 'geojson');
assert.throws(() => registry.register({ id: 'other', label: 'Other', iconKey: 'file', extensions: ['pdf'] }), /already registered/);
assert.throws(() => registry.register({ id: 'pdf', label: 'Other PDF', iconKey: 'file', extensions: ['pdf'] }, { replace: true }), /Built-in format cannot be replaced/);
assert.equal(registry.unregister('geojson'), true);
assert.equal(registry.has('geojson'), false);
assert.equal(registry.unregister('geojson'), false);
assert.throws(() => registry.unregister('pdf'), /cannot be removed/);

const customOnly = new FileFormatRegistry({ builtins: false, formats: [
  { id: 'binary', label: 'Binary', iconKey: 'binary', extensions: ['bin'], mimes: ['application/octet-stream'] }
] });
assert.equal(customOnly.resolve('file.bin').id, 'binary');
assert.equal(customOnly.resolve('file.unknown', { fallback: 'binary' }).id, 'binary');
assert.equal(new FileFormatRegistry({ builtins: false }).resolve('file.bin'), null);

assert.throws(() => registry.register(null), /must be an object/);
assert.throws(() => registry.register({ id: '__proto__', label: 'X', iconKey: 'x' }), /Invalid format id/);
assert.throws(() => registry.register({ id: 'x', label: '', iconKey: 'x' }), /label is required/);
assert.throws(() => registry.register({ id: 'x', label: 'X', iconKey: 'x', extensions: ['bad/ext'] }), /Invalid file extension/);
assert.throws(() => registry.register({ id: 'x', label: 'X', iconKey: 'x', mimes: ['bad'] }), /Invalid MIME type/);

const builtins = FileFormatRegistry.builtins();
builtins[0].label = 'mutated';
assert.notEqual(FileFormatRegistry.builtins()[0].label, 'mutated');
assert.equal(FileFormatRegistry.builtins().find((item) => item.id === 'svg').iconKey, 'svg');

console.log('file format registry tests: ok');
