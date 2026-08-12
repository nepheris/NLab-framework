import assert from 'node:assert/strict';
import {
  AssetLogoProfile,
  ASSET_LOGO_VARIANTS,
  ASSET_LOGO_PROFILE_TYPE,
  ASSET_LOGO_PROFILE_VERSION
} from '../core/asset-logo-profile.js';

assert.deepEqual(ASSET_LOGO_VARIANTS, ['original', 'color-transparent', 'color-background', 'monochrome', 'favicon']);
const profile = new AssetLogoProfile({ id: 'nlab-logo' });
assert.equal(profile.audit().usable, false);
profile.setVariant('original', { source: '/assets/logo.svg', mime: 'image/svg+xml', width: 512, height: 180 });
profile.setVariant('color-transparent', { source: 'https://cdn.example/logo.png', mime: 'image/png', transparent: false });
profile.setVariant('color-background', { source: '/assets/logo-bg.svg', background: '#ffffff' });
profile.setVariant('monochrome', { source: 'data:image/svg+xml;base64,PHN2Zz4=', recolorable: false, foreground: 'currentColor' });
profile.setVariant('favicon', { source: '/favicon.ico', mime: 'image/x-icon', sizes: [32, 16, 32] });

assert.equal(profile.getVariant('color-transparent').transparent, true);
assert.equal(profile.getVariant('monochrome').recolorable, true);
assert.deepEqual(profile.getVariant('favicon').sizes, [16, 32]);
assert.equal(profile.audit().complete, true);
assert.equal(profile.audit().usable, true);
assert.deepEqual(profile.audit().warnings, []);

const matrix = profile.previewMatrix({ variants: ['original', 'monochrome'] });
assert.equal(matrix.length, 8);
assert.deepEqual(matrix.map((item) => item.id), [
  'original:light:square', 'original:light:rounded', 'original:dark:square', 'original:dark:rounded',
  'monochrome:light:square', 'monochrome:light:rounded', 'monochrome:dark:square', 'monochrome:dark:rounded'
]);
const matrixCopy = profile.previewMatrix({ variants: ['original'], backgrounds: ['dark'], shapes: ['rounded'] });
matrixCopy[0].asset.metadata.polluted = true;
assert.equal(profile.getVariant('original').metadata.polluted, undefined);

const serialized = profile.serialize();
const payload = JSON.parse(serialized);
assert.equal(payload.type, ASSET_LOGO_PROFILE_TYPE);
assert.equal(payload.version, ASSET_LOGO_PROFILE_VERSION);
const restored = AssetLogoProfile.parse(serialized);
assert.deepEqual(restored.toJSON(), profile.toJSON());
restored.removeVariant('favicon');
assert.equal(restored.audit().complete, false);
assert.deepEqual(restored.audit().missing, ['favicon']);
assert.equal(profile.hasVariant('favicon'), true);

assert.throws(() => profile.setVariant('other', { source: '/x.png' }), (err) => err.code === 'INVALID_VARIANT');
assert.throws(() => profile.setVariant('original', { source: 'javascript:alert(1)' }), (err) => err.code === 'UNSAFE_SOURCE');
assert.throws(() => profile.setVariant('original', { source: 'data:text/html,x' }), (err) => err.code === 'UNSAFE_SOURCE');
assert.throws(() => profile.setVariant('original', { source: '/x.txt', mime: 'text/plain' }), (err) => err.code === 'INVALID_MIME');
assert.throws(() => profile.setVariant('color-background', { source: '/x.png' }), (err) => err.code === 'BACKGROUND_REQUIRED');
assert.throws(() => new AssetLogoProfile().setVariant('favicon', { source: '/f.ico' }), (err) => err.code === 'FAVICON_SIZE_REQUIRED');
assert.throws(() => profile.previewMatrix({ backgrounds: ['blue'] }), (err) => err.code === 'INVALID_BACKGROUND');
const cyclic = {}; cyclic.self = cyclic;
assert.throws(() => profile.setVariant('original', { source: '/x.png', metadata: cyclic }), (err) => err.code === 'CYCLE');

const partial = new AssetLogoProfile({ variants: { original: { source: '/logo.svg' } } });
assert.deepEqual(partial.audit().missing, ['color-transparent', 'color-background', 'monochrome', 'favicon']);
console.log('asset logo profile tests: ok');
