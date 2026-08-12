import assert from 'node:assert/strict';
import { CodeBlockJsonFolding } from '../components/code-block-json-folding.js';

const parsed = CodeBlockJsonFolding.parse('{"user":{"name":"Ada","tags":["math","code"]},"active":true}');
assert.equal(parsed.ok, true);
const model = parsed.model;
assert.equal(model.find('/user').type, 'object');
assert.equal(model.find('/user/tags').type, 'array');
assert.equal(model.find('/user/tags/1').summary, '"code"');

assert.equal(model.toggle('/user').changed, true);
assert.equal(model.find('/user').collapsed, true);
assert.equal(model.visibleTree().some((node) => node.path === '/user/name'), false);
assert.equal(model.toggle('/user').collapsed, false);
assert.equal(model.visibleTree().some((node) => node.path === '/user/name'), true);

assert.deepEqual(model.setCollapsed('/active', true), { changed:false, reason:'not-container' });
assert.deepEqual(model.setCollapsed('/missing', true), { changed:false, reason:'missing' });

const changed = model.collapseAll();
assert.ok(changed >= 2);
assert.equal(model.find('').collapsed, false);
assert.equal(model.find('/user').collapsed, true);
assert.equal(model.expandAll() >= 2, true);

model.collapseDeeperThan(2);
assert.equal(model.find('/user/tags').collapsed, true);
assert.equal(model.find('/user').collapsed, false);

const snapshot = model.snapshot();
snapshot.value.user.name = 'tampered';
snapshot.root.children[0].summary = 'tampered';
assert.equal(model.snapshot().value.user.name, 'Ada');
assert.notEqual(model.snapshot().root.children[0].summary, 'tampered');

const text = model.renderText();
assert.match(text, /\$:/);
assert.match(text, /user: Object\(2\)/);
assert.match(text, /tags: Array\(2\)/);

const html = new CodeBlockJsonFolding({ value:{ '<unsafe>':'<script>x</script>', 'a/b~c':{ ok:true } } }).renderHtml();
assert.doesNotMatch(html, /<script>/);
assert.match(html, /&lt;unsafe&gt;/);
assert.match(html, /&quot;&lt;script&gt;x&lt;\/script&gt;&quot;/);
assert.match(html, /data-json-path="\/a~1b~0c"/);

const invalid = CodeBlockJsonFolding.parse('{bad}');
assert.equal(invalid.ok, false);
assert.equal(invalid.model, null);

const atomic = new CodeBlockJsonFolding({ value:{ safe:{ x:1 } } });
atomic.setCollapsed('/safe', true);
const before = atomic.snapshot();
const failed = atomic.setValue('{bad}', { preserveCollapsed:true });
assert.equal(failed.changed, false);
assert.deepEqual(atomic.snapshot(), before);
const updated = atomic.setValue('{"safe":{"x":2},"extra":1}', { preserveCollapsed:true });
assert.equal(updated.changed, true);
assert.equal(atomic.find('/safe').collapsed, true);
assert.equal(atomic.snapshot().value.safe.x, 2);

assert.throws(()=>new CodeBlockJsonFolding({ value:{ constructor:1 } }), /Unsafe JSON key/);
assert.throws(()=>new CodeBlockJsonFolding({ value:{ value:Infinity } }), /finite numbers/);
const cyclic = {}; cyclic.self = cyclic;
assert.throws(()=>new CodeBlockJsonFolding({ value:cyclic }), /Circular/);

console.log('code block json folding tests: ok');
