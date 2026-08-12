import assert from 'node:assert/strict';
import { SessionConfigRegistry } from '../core/session-config-registry.js';
import { SessionConfigBundle } from '../core/session-config-bundle.js';
import {
  SessionConfigTransfer,
  SessionConfigTransferError,
  SESSION_CONFIG_TRANSFER_MIME
} from '../core/session-config-transfer.js';

const bytes = (value) => new TextEncoder().encode(String(value)).byteLength;
const clipboardWrites = [];
const downloads = [];
const events = [];

const registry = new SessionConfigRegistry({ clock: () => 12345 });
registry.publish('theme.workshop', { dark: false, accent: '#123456' }, { reference: true });
registry.publish('qr.studio', { preset: 'transparent' }, { reference: false });

const transfer = new SessionConfigTransfer({
  registry,
  filename: 'nested/path/session-config',
  clipboard: {
    async writeText(text) {
      clipboardWrites.push(text);
    }
  },
  async downloader(descriptor) {
    downloads.push(descriptor);
    return true;
  },
  onEvent(event) {
    events.push(event.type);
  }
});

assert.deepEqual(transfer.capabilities(), {
  mode: 'registry',
  copy: true,
  download: true,
  importText: true,
  importFile: true,
  maxBytes: 2 * 1024 * 1024,
  filename: 'session-config.json'
});

const referencesOnly = transfer.descriptor({ referencesOnly: true, indent: 0 });
assert.equal(referencesOnly.mime, SESSION_CONFIG_TRANSFER_MIME);
assert.equal(referencesOnly.filename, 'session-config.json');
assert.equal(referencesOnly.bytes, bytes(referencesOnly.text));
assert.deepEqual(Object.keys(JSON.parse(referencesOnly.text).modules), ['theme.workshop']);

const copyResult = await transfer.copy({ referencesOnly: true });
assert.equal(copyResult.ok, true);
assert.equal(clipboardWrites.length, 1);
assert.deepEqual(Object.keys(JSON.parse(clipboardWrites[0]).modules), ['theme.workshop']);

const downloadResult = await transfer.download({ filename: '../export/session' });
assert.equal(downloadResult.ok, true);
assert.equal(downloadResult.filename, 'session.json');
assert.equal(downloads[0].mime, SESSION_CONFIG_TRANSFER_MIME);
assert.equal(downloads[0].filename, 'session.json');
assert.equal(JSON.parse(downloads[0].text).schema, 'nlab.session-config');

const replacement = new SessionConfigRegistry({ clock: () => 777 });
replacement.publish('header.studio', { compact: true }, { reference: true });
const replacementText = replacement.exportText();
const importTextResult = transfer.importText(replacementText, { replace: true });
assert.equal(importTextResult.ok, true);
assert.equal(registry.has('header.studio'), true);
assert.equal(registry.has('theme.workshop'), false);

const fileText = replacement.exportText();
const importFileResult = await transfer.importFile({
  name: 'session.json',
  size: bytes(fileText),
  async text() { return fileText; }
});
assert.equal(importFileResult.ok, true);
assert.equal(importFileResult.source, 'file');
assert.equal(importFileResult.name, 'session.json');
assert.ok(events.includes('copy'));
assert.ok(events.includes('download'));
assert.ok(events.includes('import'));

const unavailable = new SessionConfigTransfer({ registry });
assert.equal((await unavailable.copy()).reason, 'clipboard-unavailable');
assert.equal((await unavailable.download()).reason, 'downloader-unavailable');
assert.equal((await unavailable.importFile({ name: 'x.json' })).reason, 'reader-unavailable');
assert.equal(unavailable.importText('{bad json').reason, 'invalid-data');
assert.equal(unavailable.snapshot().lastError.reason, 'invalid-data');

const tiny = new SessionConfigTransfer({ registry, maxBytes: 10 });
assert.equal(tiny.importText('12345678901').reason, 'too-large');
assert.equal((await tiny.importFile({
  name: 'large.json',
  size: 11,
  async text() { throw new Error('must not read'); }
})).reason, 'too-large');

const bundle = new SessionConfigBundle({
  sessionId: 'demo',
  entries: [{
    moduleId: 'qr.studio',
    presetId: 'standard',
    label: 'QR standard',
    reference: true,
    config: { width: 256, errorCorrectionLevel: 'M' }
  }]
});
const bundleTransfer = new SessionConfigTransfer({ bundle });
assert.equal(bundleTransfer.capabilities().mode, 'bundle');
assert.equal(JSON.parse(bundleTransfer.exportText()).type, 'nlab.session-config-bundle');

const nextBundle = new SessionConfigBundle({
  sessionId: 'demo',
  entries: [
    { moduleId: 'header.studio', reference: true, config: { compact: true } },
    { moduleId: 'qr.studio', reference: true, config: { width: 320 } }
  ]
});
const bundleImport = bundleTransfer.importText(nextBundle.serialize());
assert.equal(bundleImport.ok, true);
assert.equal(bundleTransfer.snapshot().source.count, 2);
assert.equal(bundleTransfer.importText('{"type":"wrong","version":1}').reason, 'invalid-data');

assert.throws(
  () => new SessionConfigTransfer(),
  (error) => error instanceof SessionConfigTransferError && error.code === 'INVALID_SOURCE_COUNT'
);
assert.throws(
  () => new SessionConfigTransfer({ registry, bundle }),
  (error) => error.code === 'INVALID_SOURCE_COUNT'
);
assert.throws(
  () => new SessionConfigTransfer({ registry: {} }),
  (error) => error.code === 'INVALID_REGISTRY'
);
assert.throws(
  () => new SessionConfigTransfer({ bundle: { serialize() {} } }),
  (error) => error.code === 'INVALID_BUNDLE_PARSER'
);

console.log('session config transfer tests: ok');
