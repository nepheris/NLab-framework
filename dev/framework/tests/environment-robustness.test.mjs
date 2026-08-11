import assert from 'node:assert/strict';
import { Environment, EnvironmentError, MODES, EXPERIENCES } from '../core/environment.js';

const defaults = new Environment();
assert.equal(defaults.mode, 'production');
assert.equal(defaults.experience, 'visitor');
assert.equal(defaults.baseUrl, null);
assert.equal(defaults.assetsBase, 'assets/');
assert.equal(defaults.apiBase, null);
assert.equal(defaults.isProduction, true);
assert.equal(defaults.isPreview, false);
assert.equal(defaults.isDevelopment, false);
assert.equal(defaults.isVisitorExperience, true);
assert.equal(defaults.isWebmasterExperience, false);

const normalized = new Environment({
  mode:' Preview ',
  experience:' WEBMASTER ',
  baseUrl:' https://example.test/app/ ',
  assetsBase:' ./static/ ',
  apiBase:' /api/ '
});
assert.equal(normalized.mode, 'preview');
assert.equal(normalized.experience, 'webmaster');
assert.equal(normalized.baseUrl, 'https://example.test/app/');
assert.equal(normalized.assetsBase, './static/');
assert.equal(normalized.apiBase, '/api/');
assert.equal(normalized.isPreview, true);
assert.equal(normalized.isWebmasterExperience, true);

const urlValues = new Environment({
  mode:'development',
  baseUrl:new URL('https://example.test/app/'),
  assetsBase:new URL('https://cdn.example.test/assets/'),
  apiBase:new URL('https://api.example.test/v1/')
});
assert.equal(urlValues.baseUrl, 'https://example.test/app/');
assert.equal(urlValues.assetsBase, 'https://cdn.example.test/assets/');
assert.equal(urlValues.apiBase, 'https://api.example.test/v1/');
assert.equal(urlValues.isDevelopment, true);

const emptyBases = new Environment({ baseUrl:'   ', assetsBase:'  ', apiBase:'' });
assert.equal(emptyBases.baseUrl, null);
assert.equal(emptyBases.assetsBase, '');
assert.equal(emptyBases.apiBase, null);

assert.deepEqual(normalized.toJSON(), {
  mode:'preview', experience:'webmaster', baseUrl:'https://example.test/app/', assetsBase:'./static/', apiBase:'/api/'
});
assert.ok(Object.isFrozen(MODES));
assert.ok(Object.isFrozen(EXPERIENCES));
assert.throws(() => MODES.push('test'));

assert.throws(
  () => new Environment({ mode:'staging' }),
  (error) => error instanceof EnvironmentError && error.code === 'INVALID_MODE' && error.details.allowed.includes('preview')
);
assert.throws(() => new Environment({ experience:'admin' }), (error) => error.code === 'INVALID_EXPERIENCE');
assert.throws(() => new Environment({ mode:1 }), (error) => error.code === 'INVALID_MODE');
assert.throws(() => new Environment({ baseUrl:{} }), (error) => error.code === 'INVALID_BASEURL');
assert.throws(() => new Environment({ assetsBase:[] }), (error) => error.code === 'INVALID_ASSETSBASE');
assert.throws(() => new Environment({ apiBase:42 }), (error) => error.code === 'INVALID_APIBASE');

console.log('environment robustness tests: ok');
