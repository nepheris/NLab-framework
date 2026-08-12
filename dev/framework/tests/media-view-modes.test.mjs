import assert from 'node:assert/strict';
import { MediaWiz } from '../wiz/media-wiz.js';

const media = new MediaWiz();

let html = media.render({url:'photo.webp',alt:'Photo'});
assert.match(html,/^<img /);
assert.match(html,/src="photo\.webp"/);

html = media.render({url:'photo.webp',alt:'Photo'},{mode:'thumbnail'});
assert.match(html,/nlab-media-thumbnail--image/);
assert.match(html,/<img /);
assert.match(html,/target="_blank" rel="noopener"/);

html = media.render({url:'icon.svg',alt:'Icon'},{mode:'viewer'});
assert.match(html,/^<img /);
html = media.render({type:'svg',inline:'<svg><circle/></svg>'},{mode:'inline'});
assert.equal(html,'<svg><circle/></svg>');
html = media.render({url:'icon.svg',inline:'<svg>trusted</svg>',label:'SVG'},{mode:'new-tab'});
assert.doesNotMatch(html,/<svg>trusted/);
assert.match(html,/nlab-media-link--svg/);

html = media.render({url:'doc.pdf',label:'Guide'},{mode:'viewer'});
assert.match(html,/nlab-media-viewer--pdf/);
assert.match(html,/type="application\/pdf"/);
html = media.render({url:'doc.pdf',label:'Guide'},{mode:'thumbnail'});
assert.match(html,/nlab-media-thumbnail--pdf/);
assert.match(html,/>Guide<\/span>/);
html = media.render({url:'doc.pdf',label:'Guide'},{mode:'link'});
assert.match(html,/nlab-media-link--pdf/);
assert.match(html,/target="_blank" rel="noopener"/);
html = media.render({url:'doc.pdf',label:'Guide',downloadName:'guide<final>.pdf'},{mode:'download'});
assert.match(html,/class="nlab-media-download"/);
assert.match(html,/download="guide&lt;final&gt;\.pdf"/);
assert.doesNotMatch(html,/target=/);

html = media.render({url:'/files/archive.zip',label:'Archive'},{mode:'download'});
assert.match(html,/download="archive\.zip"/);
html = media.render({url:'/files/data.csv?x=1#y',label:'Data'},{mode:'download'});
assert.match(html,/download="data\.csv"/);

html = media.render({url:'movie.mp4',label:'Film'},{mode:'new-tab'});
assert.match(html,/nlab-media-link--video/);
html = media.render({url:'sound.mp3',label:'Son'},{mode:'thumbnail'});
assert.match(html,/nlab-media-thumbnail--audio/);

html = media.render({url:'javascript:alert(1)',fallbackUrl:'safe.pdf',label:'Safe'},{mode:'new-tab'});
assert.match(html,/href="safe\.pdf"/);
assert.doesNotMatch(html,/javascript:/i);
assert.equal(media.render({url:'data:text/html,<script>x</script>'},{mode:'download'}),'');

html = media.render({url:'photo.jpg',ratio:'16 / 9',objectFit:'cover'},{mode:'unknown'});
assert.match(html,/^<img /);
assert.match(html,/aspect-ratio:16\/9;object-fit:cover/);

const gallery = media.gallery([{url:'a.jpg',label:'A'}],{mode:'thumbnail'});
assert.match(gallery,/nlab-media-thumbnail--image/);
assert.match(gallery,/<figcaption>A<\/figcaption>/);

console.log('media view modes tests: ok');
