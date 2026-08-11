import assert from 'node:assert/strict';
import { SEOWiz } from '../wiz/seo-wiz.js';
import { ShareWiz } from '../wiz/share-wiz.js';

// SEO — modèle, fallbacks et JSON-LD breadcrumbs.
const seo = new SEOWiz();
const model = seo.model({
  title:'Recette test',
  description:'Description',
  url:'https://example.test/recette',
  shareImage:'https://example.test/image.webp',
  breadcrumbs:[
    { name:'Accueil', url:'https://example.test/' },
    { name:'Recette test', url:'https://example.test/recette' },
  ],
});
assert.equal(model.canonical, 'https://example.test/recette');
assert.equal(model.language, 'fr');
assert.equal(model.robots, 'index,follow');
assert.equal(model.image, 'https://example.test/image.webp');
const breadcrumbs = seo.breadcrumbJsonLd(model);
assert.equal(breadcrumbs['@type'], 'BreadcrumbList');
assert.deepEqual(breadcrumbs.itemListElement.map((item)=>item.position), [1,2]);
assert.equal(seo.breadcrumbJsonLd({}), null);

// Share — résolution URL, priorité image et URL canonique.
const resolver = { current:({stripHash})=>`https://resolved.test/current?stripHash=${stripHash}` };
const share = new ShareWiz({ urlResolver:resolver });
let meta = share.metadata({ title:'Titre', sectionImage:'section.webp' });
assert.equal(meta.url, 'https://resolved.test/current?stripHash=false');
assert.equal(meta.canonical_url, meta.url);
assert.equal(meta.image, 'section.webp');
meta = share.metadata({ image:'direct.webp', sectionImage:'section.webp', siteImage:'site.webp' });
assert.equal(meta.image, 'direct.webp');

// Email : encodage du sujet, description et URL.
const email = share.email({ title:'A & B', description:'Ligne 1', url:'https://example.test/a?x=1&y=2' });
assert.match(email, /^mailto:\?subject=A%20%26%20B&body=/);
assert.ok(email.includes(encodeURIComponent('Ligne 1\n\nhttps://example.test/a?x=1&y=2')));

// Clipboard absent : fallback explicite, sans exception.
const originalNavigator = globalThis.navigator;
try {
  Object.defineProperty(globalThis, 'navigator', { value:undefined, configurable:true });
  const copied = await share.copyUrl({ url:'https://example.test/copy' });
  assert.deepEqual(copied, { ok:false, reason:'clipboard-unavailable', value:'https://example.test/copy' });

  // Web Share absent : même contrat de fallback, sans ReferenceError.
  const nativeResult = await share.native({ title:'Titre', url:'https://example.test/share' });
  assert.equal(nativeResult.ok, false);
  assert.equal(nativeResult.reason, 'web-share-unavailable');
  assert.equal(nativeResult.data.url, 'https://example.test/share');
} finally {
  if (originalNavigator === undefined) delete globalThis.navigator;
  else Object.defineProperty(globalThis, 'navigator', { value:originalNavigator, configurable:true });
}

// QR absent : erreur contractuelle explicite.
await assert.rejects(async()=>share.qr({ url:'https://example.test' }), /QRWiz not configured/);

console.log('seo/share contract tests: ok');
