import assert from 'node:assert/strict';
import { SEOWiz } from '../wiz/seo-wiz.js';
import { ShareWiz } from '../wiz/share-wiz.js';

const seo = new SEOWiz();

// Modèle SEO et breadcrumbs.
let model = seo.model({ title:'Titre', url:'https://example.test/a', shareImage:'/share.jpg' });
assert.equal(model.title, 'Titre');
assert.equal(model.canonical, 'https://example.test/a');
assert.equal(model.image, '/share.jpg');
assert.equal(model.language, 'fr');
assert.equal(model.robots, 'index,follow');
assert.deepEqual(seo.model({ breadcrumbs:{} }).breadcrumbs, []);
assert.equal(seo.breadcrumbJsonLd({ breadcrumbs:[] }), null);
const breadcrumb = seo.breadcrumbJsonLd({ breadcrumbs:[{ name:'Accueil', url:'/' }, { name:'Fiche', url:'/fiche' }] });
assert.equal(breadcrumb['@type'], 'BreadcrumbList');
assert.deepEqual(breadcrumb.itemListElement.map((item)=>item.position), [1,2]);

// apply() doit être neutre hors DOM.
model = seo.apply({ title:'SSR', canonical:'https://example.test/ssr' }, undefined);
assert.equal(model.title, 'SSR');
assert.equal(model.canonical, 'https://example.test/ssr');

// Faux DOM minimal pour tester création puis nettoyage des métadonnées.
const nodes = [];
const matches = (node, selector) => {
  if (selector === 'link[rel="canonical"]') return node.tagName === 'link' && node.rel === 'canonical';
  if (selector === 'script[data-nlab-jsonld]') return node.tagName === 'script' && node.dataset.nlabJsonld === 'true';
  let match = selector.match(/^meta\[(name|property)="([^"]+)"\]$/);
  if (match) return node.tagName === 'meta' && node.attributes[match[1]] === match[2];
  return false;
};
const head = {
  querySelector(selector){ return nodes.find((node)=>matches(node, selector)) ?? null; },
  append(node){ if(!nodes.includes(node)) nodes.push(node); }
};
const fakeDoc = {
  title:'Initial',
  documentElement:{ lang:'' },
  head,
  createElement(tag){
    return {
      tagName:tag,
      attributes:{},
      dataset:{},
      content:'',
      href:'',
      rel:'',
      type:'',
      textContent:'',
      setAttribute(name,value){ this.attributes[name]=String(value); },
      remove(){ const index=nodes.indexOf(this); if(index >= 0) nodes.splice(index,1); }
    };
  }
};

seo.apply({
  title:'Page A',
  description:'Description A',
  canonical:'https://example.test/a',
  image:'https://example.test/a.jpg',
  jsonLd:{ '@context':'https://schema.org', '@type':'Article' }
}, fakeDoc);
assert.equal(fakeDoc.documentElement.lang, 'fr');
assert.equal(fakeDoc.title, 'Page A');
assert.equal(head.querySelector('meta[name="description"]').content, 'Description A');
assert.equal(head.querySelector('meta[property="og:url"]').content, 'https://example.test/a');
assert.equal(head.querySelector('link[rel="canonical"]').href, 'https://example.test/a');
assert.ok(head.querySelector('script[data-nlab-jsonld]'));

seo.apply({ title:'Page B', description:'', canonical:'', image:null, jsonLd:null }, fakeDoc);
assert.equal(fakeDoc.title, 'Page B');
assert.equal(head.querySelector('meta[name="description"]'), null);
assert.equal(head.querySelector('meta[property="og:description"]'), null);
assert.equal(head.querySelector('meta[property="og:url"]'), null);
assert.equal(head.querySelector('meta[property="og:image"]'), null);
assert.equal(head.querySelector('meta[name="twitter:image"]'), null);
assert.equal(head.querySelector('link[rel="canonical"]'), null);
assert.equal(head.querySelector('script[data-nlab-jsonld]'), null);

// Share metadata et ordre des images.
const urlResolver = { current(){ return 'https://example.test/current#part'; } };
const share = new ShareWiz({ urlResolver });
let data = share.metadata({ title:'Partage', sectionImage:'section.jpg', siteImage:'site.jpg', fallbackImage:'fallback.jpg' });
assert.equal(data.url, 'https://example.test/current#part');
assert.equal(data.canonical_url, data.url);
assert.equal(data.image, 'section.jpg');
data = share.metadata({ url:'https://explicit.test/', image:'direct.jpg' });
assert.equal(data.url, 'https://explicit.test/');
assert.equal(data.image, 'direct.jpg');

const email = share.email({ title:'A&B', description:'ligne 1', url:'https://example.test/?a=1&b=2' });
assert.match(email, /^mailto:\?subject=A%26B&body=/);
assert.match(decodeURIComponent(email.split('&body=')[1]), /ligne 1\n\nhttps:\/\/example\.test\/\?a=1&b=2/);

// Simulation contrôlée de navigator pour Clipboard et Web Share.
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const setNavigator = (value) => Object.defineProperty(globalThis, 'navigator', { configurable:true, writable:true, value });
try {
  setNavigator(undefined);
  let result = await share.copyUrl({ url:'https://example.test/no-clipboard' });
  assert.deepEqual(result, { ok:false, reason:'clipboard-unavailable', value:'https://example.test/no-clipboard' });
  result = await share.native({ url:'https://example.test/no-share' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'web-share-unavailable');

  let copied = null;
  setNavigator({ clipboard:{ async writeText(value){ copied=value; } } });
  result = await share.copyUrl({ url:'https://example.test/copied' });
  assert.equal(result.ok, true);
  assert.equal(copied, 'https://example.test/copied');

  setNavigator({ clipboard:{ async writeText(){ throw new Error('denied'); } } });
  result = await share.copyUrl({ url:'https://example.test/denied' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'clipboard-error');
  assert.match(result.error.message, /denied/);

  let nativePayload = null;
  const nativeNavigator = { async share(payload){ nativePayload=payload; } };
  setNavigator(nativeNavigator);
  result = await share.native({ title:'T', description:'D', url:'https://example.test/shared' });
  assert.equal(result.ok, true);
  assert.deepEqual(nativePayload, { title:'T', text:'D', url:'https://example.test/shared' });

  setNavigator({ async share(){ throw new Error('cancelled'); } });
  result = await share.native({ url:'https://example.test/cancelled' });
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'web-share-error');
  assert.match(result.error.message, /cancelled/);
} finally {
  if(originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete globalThis.navigator;
}

// QR absent puis délégation.
await assert.rejects(() => share.qr({ url:'x' }), /QRWiz not configured/);
let qrConfig = null;
const shareWithQr = new ShareWiz({ qrWiz:{ async generate(config){ qrConfig=config; return 'QR'; } } });
assert.equal(await shareWithQr.qr({ url:'https://example.test/qr' }), 'QR');
assert.deepEqual(qrConfig, { url:'https://example.test/qr' });

console.log('seo share contracts tests: ok');
