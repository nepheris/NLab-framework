import assert from 'node:assert/strict';
import { CodeBlockColorPacks } from '../components/code-block-color-packs.js';

assert.deepEqual(CodeBlockColorPacks.tokenKinds(), [
  'key','string','literal','number','comment','keyword','tag','property'
]);

const builtins = CodeBlockColorPacks.builtinPacks();
assert.ok(builtins.default);
assert.ok(builtins.classic);
assert.ok(builtins.contrast);
builtins.classic.light.keyword = '#000';
assert.notEqual(CodeBlockColorPacks.builtinPacks().classic.light.keyword, '#000');

assert.deepEqual(CodeBlockColorPacks.validatePack({ light:{ keyword:'#123456' } }), { valid:true, errors:[] });
assert.equal(CodeBlockColorPacks.validatePack({ light:{ unknown:'#fff' } }).valid, false);
assert.equal(CodeBlockColorPacks.validatePack({ light:{ keyword:'red; background:url(x)' } }).valid, false);

const packs = new CodeBlockColorPacks({ active:'classic', theme:'light' });
assert.equal(packs.color('keyword'), '#7c3aed');
assert.equal(packs.color('missing'), null);
assert.equal(packs.cssVariables()['--nlab-code-token-string'], '#047857');
assert.equal(packs.snapshot().active, 'classic');

packs.register('brand', {
  label:'Brand',
  light:{ keyword:'#112233', string:'rgb(10, 20, 30)', comment:'var(--muted)' },
  dark:{ keyword:'#ddeeff' }
});
assert.equal(packs.setActive('brand'), true);
assert.equal(packs.setTheme('dark').color('keyword'), '#ddeeff');
assert.equal(packs.color('string'), 'rgb(10, 20, 30)');
assert.equal(packs.color('comment'), 'var(--muted)');
assert.equal(packs.setActive('missing'), false);
assert.equal(packs.active, 'brand');

assert.throws(() => packs.register('bad id', { light:{} }), /id is invalid/);
assert.throws(() => packs.register('brand', { light:{} }), /already exists/);
assert.throws(
  () => packs.register('unsafe', { light:{ keyword:'red;display:none' } }),
  (error) => Array.isArray(error.issues) && error.issues[0].includes('safe CSS color')
);
assert.equal(packs.remove('classic'), false);
assert.equal(packs.remove('brand'), true);
assert.equal(packs.active, 'default');

const nodes = {
  keyword: [{ style: makeStyle() }],
  string: [{ style: makeStyle() }, { style: makeStyle() }]
};
const root = {
  dataset:{},
  style:makeStyle(),
  querySelectorAll(selector) {
    const match = selector.match(/__([a-z]+)$/);
    return match ? (nodes[match[1]] ?? []) : [];
  }
};

const applyPacks = new CodeBlockColorPacks({ active:'classic', theme:'dark' });
let result = applyPacks.apply(root);
assert.deepEqual(result, { applied:true, reason:null, count:3, pack:'classic', theme:'dark' });
assert.equal(root.dataset.colorPack, 'classic');
assert.equal(root.dataset.colorTheme, 'dark');
assert.equal(root.style.values['--nlab-code-token-keyword'], '#c4b5fd');
assert.equal(nodes.keyword[0].style.values.color, '#c4b5fd');
assert.equal(nodes.string[1].style.values.color, '#6ee7b7');

result = applyPacks.apply(root, { pack:'default', theme:'light' });
assert.equal(result.pack, 'default');
assert.equal(root.style.values['--nlab-code-token-keyword'], undefined);
assert.equal(nodes.keyword[0].style.values.color, undefined);
assert.equal(nodes.string[0].style.values.color, undefined);

assert.deepEqual(applyPacks.apply(null), { applied:false, reason:'no-root', count:0 });

const customOnlyLight = new CodeBlockColorPacks({ packs:{ one:{ light:{ number:'hsl(210, 80%, 40%)' } } }, active:'one', theme:'dark' });
assert.equal(customOnlyLight.color('number'), 'hsl(210, 80%, 40%)');
assert.equal(customOnlyLight.list().find((entry)=>entry.id==='one').builtin, false);

function makeStyle() {
  return {
    values:{},
    setProperty(name, value) { this.values[name] = value; },
    removeProperty(name) { delete this.values[name]; }
  };
}

console.log('code block color packs tests: ok');
