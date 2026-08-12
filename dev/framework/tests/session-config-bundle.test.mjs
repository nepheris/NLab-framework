import assert from 'node:assert/strict';
import {
  SessionConfigBundle,
  SESSION_CONFIG_BUNDLE_TYPE,
  SESSION_CONFIG_BUNDLE_VERSION
} from '../core/session-config-bundle.js';

const bundle = new SessionConfigBundle({ sessionId: 'Review.Session-1' });
assert.deepEqual(bundle.summary(), { sessionId: 'review.session-1', count: 0, references: 0, modules: [] });

const qr = bundle.validate('studio.qr', { z: 2, a: { enabled: true } }, {
  presetId: 'custom-1', label: 'QR validé', metadata: { source: 'qr-studio' }
});
assert.equal(qr.revision, 1);
assert.equal(qr.reference, false);
assert.deepEqual(qr.config, { a: { enabled: true }, z: 2 });

bundle.validate('theme.main', { mode: 'dark' }, { presetId: 'night' });
assert.deepEqual(bundle.summary().modules, ['studio.qr', 'theme.main']);

const qr2 = bundle.validate('studio.qr', { value: 2 }, { presetId: 'custom-2', metadata: { ok: true } });
assert.equal(qr2.revision, 2);
assert.equal(qr2.presetId, 'custom-2');

bundle.markReference('studio.qr');
assert.equal(bundle.get('studio.qr').reference, true);
assert.throws(
  () => bundle.validate('studio.qr', { value: 3 }),
  (error) => error.code === 'REFERENCE_LOCKED'
);
assert.throws(
  () => bundle.remove('studio.qr'),
  (error) => error.code === 'REFERENCE_LOCKED'
);

const qr3 = bundle.validate('studio.qr', { value: 3 }, { replaceReference: true });
assert.equal(qr3.revision, 3);
assert.equal(qr3.reference, true);
bundle.releaseReference('studio.qr');
assert.equal(bundle.get('studio.qr').reference, false);

const snap = bundle.snapshot();
snap.entries[0].config.pollution = true;
assert.equal(bundle.get('studio.qr').config.pollution, undefined);

const text = bundle.serialize({ indent: 99 });
assert.match(text, /\n {8}"type"/);
const payload = JSON.parse(text);
assert.equal(payload.type, SESSION_CONFIG_BUNDLE_TYPE);
assert.equal(payload.version, SESSION_CONFIG_BUNDLE_VERSION);
assert.deepEqual(payload.entries.map((entry) => entry.moduleId), ['studio.qr', 'theme.main']);
assert.equal(bundle.copyText(), bundle.serialize());

const restored = SessionConfigBundle.parse(text);
assert.deepEqual(restored.toJSON(), bundle.toJSON());
restored.validate('theme.main', { mode: 'light' });
assert.equal(restored.get('theme.main').revision, 2);
assert.equal(bundle.get('theme.main').revision, 1);

assert.throws(
  () => SessionConfigBundle.parse({ type: 'other', version: 1, sessionId: 'x', entries: [] }),
  (error) => error.code === 'UNSUPPORTED_TYPE'
);
assert.throws(
  () => SessionConfigBundle.parse({ type: SESSION_CONFIG_BUNDLE_TYPE, version: 2, sessionId: 'x', entries: [] }),
  (error) => error.code === 'UNSUPPORTED_VERSION'
);
assert.throws(
  () => new SessionConfigBundle({ entries: [
    { moduleId: 'x', config: {}, revision: 1 },
    { moduleId: 'X', config: {}, revision: 2 }
  ] }),
  (error) => error.code === 'DUPLICATE_MODULE'
);

const cyclic = {}; cyclic.self = cyclic;
assert.throws(() => bundle.validate('bad.cycle', cyclic), (error) => error.code === 'CYCLE');
assert.throws(() => bundle.validate('bad.number', { n: Infinity }), (error) => error.code === 'NON_FINITE_NUMBER');
const dangerous = JSON.parse('{"__proto__":{"polluted":true}}');
assert.throws(() => bundle.validate('bad.key', dangerous), (error) => error.code === 'SENSITIVE_KEY');
assert.equal(bundle.has('bad/candidate'), false);

bundle.markReference('theme.main');
assert.throws(() => bundle.clear(), (error) => error.code === 'REFERENCE_LOCKED');
assert.equal(bundle.clear({ force: true }), 2);
assert.equal(bundle.summary().count, 0);

console.log('session config bundle tests: ok');
