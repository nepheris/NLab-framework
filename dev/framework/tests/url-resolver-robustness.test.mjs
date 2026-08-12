import assert from 'node:assert/strict';
import { URLResolver } from '../core/url-resolver.js';

const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
const setLocation = (value) => Object.defineProperty(globalThis, 'location', { configurable:true, writable:true, value });

try {
  delete globalThis.location;

  // Contrat existant : base absolue + assets relatifs.
  let resolver = new URLResolver({ baseUrl:'https://example.test/app/', assetsBase:'assets/' });
  assert.equal(resolver.baseUrl, 'https://example.test/app/');
  assert.equal(resolver.asset('logo.svg'), 'https://example.test/app/assets/logo.svg');
  assert.equal(resolver.current(), 'https://example.test/app/');

  // API relative et résolution d'une base relative explicite.
  resolver = new URLResolver({ baseUrl:'https://example.test/app/', apiBase:'../api/' });
  assert.equal(resolver.api('recipes/1'), 'https://example.test/api/recipes/1');
  assert.equal(resolver.resolve('child.json', 'sub/'), 'https://example.test/app/sub/child.json');

  // URL objets acceptés sans conversion externe.
  resolver = new URLResolver({ baseUrl:new URL('https://example.test/root/') });
  assert.equal(resolver.resolve(new URL('https://cdn.example.test/a.png')), 'https://cdn.example.test/a.png');

  // baseUrl relative se résout contre la location au moment de la construction.
  setLocation({ href:'https://site.test/base/page.html?x=1#part' });
  resolver = new URLResolver({ baseUrl:'../app/', assetsBase:'static/' });
  assert.equal(resolver.baseUrl, 'https://site.test/app/');
  assert.equal(resolver.asset('main.css'), 'https://site.test/app/static/main.css');

  // current() suit la location courante, avec strip query/hash indépendants.
  setLocation({ href:'https://site.test/live/page?foo=1#section' });
  assert.equal(resolver.current(), 'https://site.test/live/page?foo=1#section');
  assert.equal(resolver.current({ stripHash:true }), 'https://site.test/live/page?foo=1');
  assert.equal(resolver.current({ stripQuery:true }), 'https://site.test/live/page#section');
  assert.equal(resolver.current({ stripHash:true, stripQuery:true }), 'https://site.test/live/page');

  // location invalide après construction : repli sur baseUrl stable.
  setLocation({ href:'http://[' });
  assert.equal(resolver.current(), 'https://site.test/app/');

  // location invalide à la construction + base explicite valide : la base explicite reste exploitable.
  resolver = new URLResolver({ baseUrl:'https://safe.test/base/' });
  assert.equal(resolver.baseUrl, 'https://safe.test/base/');

  // Sans base explicite ni location : fallback déterministe localhost.
  delete globalThis.location;
  resolver = new URLResolver();
  assert.equal(resolver.baseUrl, 'http://localhost/');
  assert.equal(resolver.asset('a.js'), 'http://localhost/assets/a.js');
  assert.equal(resolver.api('x'), null);

  // assetsBase null revient au défaut ; apiBase vide désactive l'API.
  resolver = new URLResolver({ baseUrl:'https://example.test/app/', assetsBase:null, apiBase:'' });
  assert.equal(resolver.asset('a.js'), 'https://example.test/app/assets/a.js');
  assert.equal(resolver.api('x'), null);

  // Entrée réellement invalide : erreur explicite au lieu d'un état partiel.
  assert.throws(() => new URLResolver({ baseUrl:'http://[' }), /Invalid URL/);

  console.log('url resolver robustness tests: ok');
} finally {
  if (originalLocation) Object.defineProperty(globalThis, 'location', originalLocation);
  else delete globalThis.location;
}
