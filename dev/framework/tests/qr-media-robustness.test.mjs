import assert from 'node:assert/strict';
import { QRWiz, QRCodeEncoderAdapter } from '../wiz/qr-wiz.js';
import { MediaWiz } from '../wiz/media-wiz.js';

// QR payload et résolution URL.
const resolverCalls = [];
const resolver = {
  resolve(value){ resolverCalls.push(['resolve', value]); return `https://example.test/${String(value).replace(/^\//,'')}`; },
  current(options){ resolverCalls.push(['current', options]); return options.stripQuery ? 'https://example.test/page' : 'https://example.test/page?x=1#part'; }
};
const payloadWiz = new QRWiz({ urlResolver:resolver, encoder:{ async encode(){ return '<svg></svg>'; } } });
assert.equal(payloadWiz.payload({ url:'/recipe' }), 'https://example.test/recipe');
assert.equal(payloadWiz.payload({ canonical:true }), 'https://example.test/page');
assert.deepEqual(resolverCalls[1], ['current', { stripHash:true, stripQuery:true }]);

// Payloads QR structurés : texte, email, téléphone, Wi-Fi et contact/vCard.
assert.equal(payloadWiz.payload({ type:'text', text:'Bonjour' }), 'Bonjour');
assert.equal(
  payloadWiz.payload({ type:'email', email:'a@example.test', subject:'Hello world', body:'A&B' }),
  'mailto:a@example.test?subject=Hello%20world&body=A%26B'
);
assert.equal(payloadWiz.payload({ type:'tel', phone:'+33 6 12 34 56 78' }), 'tel:+33612345678');
assert.equal(
  payloadWiz.payload({ type:'wifi', ssid:'Lab;Guest', password:'p:a,ss', security:'WPA2', hidden:true }),
  'WIFI:T:WPA;S:Lab\\;Guest;P:p\\:a\\,ss;H:true;;'
);
assert.equal(payloadWiz.payload({ type:'wifi', ssid:'Public', security:'open' }), 'WIFI:T:nopass;S:Public;H:false;;');
const contactPayload = payloadWiz.payload({
  type:'contact',
  contact:{ firstName:'Ada', lastName:'Lovelace', email:'ada@example.test', note:'Math; code, notes' }
});
assert.match(contactPayload, /^BEGIN:VCARD\r\nVERSION:3\.0\r\nFN:Ada Lovelace/);
assert.match(contactPayload, /N:Lovelace;Ada;;;/);
assert.match(contactPayload, /EMAIL:ada@example\.test/);
assert.match(contactPayload, /NOTE:Math\\; code\\, notes/);
assert.match(contactPayload, /END:VCARD$/);
assert.equal(payloadWiz.payload({ type:'unknown', text:'x' }), '');

// Normalisation déterministe des options.
const normalized = payloadWiz.options({
  width:12,
  margin:-5,
  errorCorrectionLevel:'invalid',
  logoSize:9,
  logoRadius:-1,
  format:'webp',
  transparent:true
});
assert.equal(normalized.width, 64);
assert.equal(normalized.margin, 0);
assert.equal(normalized.errorCorrectionLevel, 'M');
assert.equal(normalized.logoSize, 0.32);
assert.equal(normalized.logoRadius, 0);
assert.equal(normalized.format, 'svg');
assert.equal(normalized.transparent, true);

// Erreurs explicites : encodeur absent et payload vide.
await assert.rejects(() => new QRWiz().generate({ url:'https://example.test' }), /requires an encoder adapter/);
await assert.rejects(() => new QRWiz({ encoder:{ async encode(){ return 'unused'; } } }).generate(), /payload is empty/);
await assert.rejects(() => new QRWiz({ encoder:{ async encode(){ return 'unused'; } } }).generate({ type:'text', text:'' }), /payload is empty/);

// Transparence transmise à l'encodeur et décoration SVG avec logo échappé.
let encoded = null;
const qr = new QRWiz({ encoder:{
  async encode(text, options){ encoded = { text, options }; return '<svg viewBox="0 0 100 100"></svg>'; }
} });
const decorated = await qr.generate({
  url:'https://example.test/a',
  transparent:true,
  logo:'logo"<bad>.svg',
  logoBackground:'#fff',
  logoSize:0.2
});
assert.equal(encoded.text, 'https://example.test/a');
assert.equal(encoded.options.color.light, '#00000000');
assert.match(decorated, /nlab-qr-logo/);
assert.match(decorated, /logo&amp;quot;|logo&quot;/);
assert.match(decorated, /&lt;bad&gt;/);
await qr.generate({ type:'text', text:'hello' });
assert.equal(encoded.text, 'hello');

// Rendu SVG sans DOM global.
const svgContainer = { innerHTML:'', replaceChildren(){ throw new Error('replaceChildren should not be called for SVG'); } };
const svgOutput = await qr.render(svgContainer, { url:'https://example.test/svg' });
assert.equal(svgContainer.innerHTML, svgOutput);

// Rendu data URL sans document : retour neutre, pas de ReferenceError.
const dataWiz = new QRWiz({ encoder:{ async encode(){ return 'data:image/png;base64,AAA'; } } });
const dataContainer = {};
const dataOutput = await dataWiz.render(dataContainer, { url:'https://example.test/png' });
assert.equal(dataOutput, 'data:image/png;base64,AAA');

// Rendu data URL avec ownerDocument.
let replaced = null;
const fakeDoc = { createElement(tag){ return { tagName:tag.toUpperCase(), src:'', alt:'' }; } };
const domContainer = { ownerDocument:fakeDoc, replaceChildren(node){ replaced = node; } };
await dataWiz.render(domContainer, { url:'https://example.test/png', alt:'Code recette' });
assert.equal(replaced.tagName, 'IMG');
assert.equal(replaced.src, 'data:image/png;base64,AAA');
assert.equal(replaced.alt, 'Code recette');

// Adapter : SVG puis fallback DataURL.
let adapterCall = null;
const adapter = new QRCodeEncoderAdapter({
  async toString(text, options){ adapterCall = ['svg', text, options]; return '<svg></svg>'; },
  async toDataURL(text, options){ adapterCall = ['data', text, options]; return 'data:image/png;base64,X'; }
});
await adapter.encode('abc', { width:128, margin:1, errorCorrectionLevel:'Q', color:{dark:'#000',light:'#fff'}, format:'svg' });
assert.equal(adapterCall[0], 'svg');
await adapter.encode('abc', { width:128, margin:1, errorCorrectionLevel:'Q', color:{dark:'#000',light:'#fff'}, format:'png' });
assert.equal(adapterCall[0], 'data');

// MediaWiz : échappement, loading normalisé, ratio/object-fit.
const media = new MediaWiz();
let html = media.render({ url:'photo.jpg?x=1&y=2', alt:'A < B', ratio:'16 / 9', objectFit:'cover' }, { loading:'lazy" onerror="boom' });
assert.match(html, /src="photo\.jpg\?x=1&amp;y=2"/);
assert.match(html, /alt="A &lt; B"/);
assert.match(html, /loading="lazy"/);
assert.doesNotMatch(html, /onerror/);
assert.match(html, /style="aspect-ratio:16\/9;object-fit:cover"/);

// URL dangereuse rejetée, fallback sûr utilisé.
html = media.render({ url:'javascript:alert(1)', fallbackUrl:'/images/fallback.webp', alt:'fallback' });
assert.match(html, /src="\/images\/fallback\.webp"/);
assert.doesNotMatch(html, /javascript:/i);
assert.equal(media.render({ url:'data:text/html,<script>alert(1)</script>', type:'image' }), '');

// Valeurs visuelles invalides ignorées.
html = media.render({ url:'photo.webp', ratio:'calc(1)', objectFit:'expression(x)' });
assert.doesNotMatch(html, /aspect-ratio/);
assert.doesNotMatch(html, /object-fit/);

// PDF en mode lien et légendes de galerie échappées.
html = media.render({ url:'doc.pdf', label:'Guide' }, { mode:'link' });
assert.match(html, /target="_blank" rel="noopener"/);
assert.match(html, />Guide<\/a>/);
const gallery = media.gallery([{ url:'a.jpg', label:'<script>x</script>' }]);
assert.match(gallery, /&lt;script&gt;x&lt;\/script&gt;/);
assert.doesNotMatch(gallery, /<script>/);

console.log('qr media robustness tests: ok');
