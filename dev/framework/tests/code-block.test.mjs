import assert from 'node:assert/strict';
import { CodeBlock } from '../components/code-block.js';

assert.equal(CodeBlock.normalizeLanguage('js'), 'javascript');
assert.equal(CodeBlock.normalizeLanguage('PY'), 'python');
assert.equal(CodeBlock.normalizeLanguage('shell'), 'bash');
assert.equal(CodeBlock.normalizeLanguage('unknown'), 'text');

const presets = CodeBlock.languagePresets();
assert.equal(presets.json.extension, 'json');
assert.match(presets.json.mime, /application\/json/);
assert.ok(presets.javascript.aliases.includes('js'));

const auto = new CodeBlock({ value: '{"b":2,"a":1}', language: 'json' });
assert.equal(auto.language, 'json');
assert.equal(auto.filename, 'export.json');
auto.setLanguage('js');
assert.equal(auto.language, 'javascript');
assert.equal(auto.filename, 'export.js');
auto.setFilename('custom.data');
auto.setLanguage('python');
assert.equal(auto.filename, 'custom.data');
auto.setFilename('');
assert.equal(auto.filename, 'export.py');
auto.useLanguageFilename('snippet');
assert.equal(auto.filename, 'snippet.py');

const raw = new CodeBlock({ value: '<script>"x" & y</script>' });
assert.equal(raw.formatted(), '&lt;script&gt;&quot;x&quot; &amp; y&lt;/script&gt;');

const highlighted = new CodeBlock({ value: '{"name":"nLab","active":true,"count":2}', language: 'json', highlighted: true });
const highlightedHtml = highlighted.formatted();
assert.match(highlightedHtml, /nlab-codeblock__key/);
assert.match(highlightedHtml, /nlab-codeblock__string/);
assert.match(highlightedHtml, /nlab-codeblock__literal/);
assert.match(highlightedHtml, /nlab-codeblock__number/);

const json = new CodeBlock({ value: '{"b":2,"a":1}', language: 'json' });
const formatted = json.formatJson({ indent: 2 });
assert.equal(formatted.formatted, true);
assert.equal(json.value, '{\n  "b": 2,\n  "a": 1\n}');
const preview = json.formatJson({ indent: 0, apply: false });
assert.equal(preview.formatted, true);
assert.equal(preview.value, '{"b":2,"a":1}');
assert.notEqual(json.value, preview.value);

const invalidJson = new CodeBlock({ value: '{bad}', language: 'json' });
const invalidResult = invalidJson.formatJson();
assert.equal(invalidResult.formatted, false);
assert.equal(invalidResult.reason, 'invalid-json');
assert.equal(invalidJson.value, '{bad}');

const notJson = new CodeBlock({ value: 'echo ok', language: 'bash' });
assert.deepEqual(
  { formatted: notJson.formatJson().formatted, reason: notJson.formatJson().reason },
  { formatted: false, reason: 'not-json' }
);

const clipboardWrites = [];
const copyBlock = new CodeBlock({
  value: 'copy me',
  clipboard: { async writeText(value) { clipboardWrites.push(value); } }
});
assert.equal(await copyBlock.copy(), true);
assert.deepEqual(clipboardWrites, ['copy me']);
const noClipboard = new CodeBlock({ value: 'x', clipboard: {}, documentRef: null });
const previousNavigator = globalThis.navigator;
try {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: undefined });
  assert.equal(await noClipboard.copy(), false);
} finally {
  if (previousNavigator === undefined) delete globalThis.navigator;
  else Object.defineProperty(globalThis, 'navigator', { configurable: true, value: previousNavigator });
}

const payload = new CodeBlock({ value: 'const x = 1;', language: 'js' }).exportText();
assert.equal(payload.language, 'javascript');
assert.equal(payload.filename, 'export.js');
assert.match(payload.mime, /javascript/);

class FakeBlob {
  constructor(parts, options) {
    this.parts = parts;
    this.type = options.type;
  }
}

const appended = [];
const clicked = [];
const revoked = [];
const fakeDocument = {
  body: { append(node) { appended.push(node); } },
  createElement(tag) {
    assert.equal(tag, 'a');
    return {
      href: '', download: '',
      click() { clicked.push(this.download); },
      remove() {}
    };
  }
};
const fakeUrl = {
  createObjectURL(blob) {
    assert.equal(blob.parts[0], '{"ok":true}');
    assert.match(blob.type, /application\/json/);
    return 'blob:test';
  },
  revokeObjectURL(url) { revoked.push(url); }
};

const downloadBlock = new CodeBlock({
  value: '{"ok":true}',
  language: 'json',
  documentRef: fakeDocument,
  urlRef: fakeUrl,
  BlobRef: FakeBlob
});
assert.equal(downloadBlock.download(), true);
assert.equal(appended.length, 1);
assert.equal(clicked[0], 'export.json');
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(revoked, ['blob:test']);

const unavailableDownload = new CodeBlock({ documentRef: null, urlRef: null, BlobRef: null });
const previousDocument = globalThis.document;
const previousUrl = globalThis.URL;
const previousBlob = globalThis.Blob;
try {
  Object.defineProperty(globalThis, 'document', { configurable: true, value: undefined });
  Object.defineProperty(globalThis, 'URL', { configurable: true, value: undefined });
  Object.defineProperty(globalThis, 'Blob', { configurable: true, value: undefined });
  assert.equal(unavailableDownload.download(), false);
} finally {
  if (previousDocument === undefined) delete globalThis.document;
  else Object.defineProperty(globalThis, 'document', { configurable: true, value: previousDocument });
  if (previousUrl === undefined) delete globalThis.URL;
  else Object.defineProperty(globalThis, 'URL', { configurable: true, value: previousUrl });
  if (previousBlob === undefined) delete globalThis.Blob;
  else Object.defineProperty(globalThis, 'Blob', { configurable: true, value: previousBlob });
}

const scale = new CodeBlock({ fontScale: 999 });
assert.equal(scale.fontScale, 160);
scale.setFontScale(1);
assert.equal(scale.fontScale, 70);

console.log('code block tests: ok');
