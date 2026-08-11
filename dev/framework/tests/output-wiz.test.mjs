import assert from 'node:assert/strict';
import { MediaWiz } from '../wiz/media-wiz.js';
import { QRWiz } from '../wiz/qr-wiz.js';
import { ShareWiz } from '../wiz/share-wiz.js';
import { DocumentWiz } from '../wiz/document-wiz.js';

const media = new MediaWiz();
assert.match(media.render({ url:'photo.webp', alt:'Photo' }), /<img/);
assert.match(media.render({ url:'file.pdf', label:'Doc' }), /application\/pdf/);

const resolver = { resolve:(url)=>`https://example.test/${url}`, current:()=> 'https://example.test/current' };
const encoder = { encode:async(text,options)=>`<svg data-text="${text}" data-width="${options.width}"></svg>` };
const qr = new QRWiz({ urlResolver:resolver, encoder });
assert.equal(qr.payload(), 'https://example.test/current');
assert.match(await qr.generate({ url:'recipe/A', width:128 }), /data-width="128"/);

const share = new ShareWiz({ urlResolver:resolver, qrWiz:qr });
assert.match(share.email({ title:'Test', description:'Desc', url:'https://example.test/x' }), /^mailto:/);
assert.match(await share.qr({ url:'x' }), /<svg/);

const document = new DocumentWiz({ qrWiz:qr });
const html = document.renderHTML({ name:'Recette test', portions:4 }, { fields:['name','portions'], labels:{ portions:'Portions' } });
assert.match(html, /Recette test/);
assert.match(html, /Portions/);

console.log('output wiz tests: ok');
