import assert from 'node:assert/strict';
import {
  SearchAdvancedOptions,
  SEARCH_ADVANCED_OPTIONS_TYPE,
  SEARCH_ADVANCED_OPTIONS_VERSION
} from '../wiz/search-advanced-options.js';

const defaults = SearchAdvancedOptions.defaults();
assert.deepEqual(defaults, {
  mode: 'contains', fields: null, limit: null, locale: 'fr', stopwords: [],
  suggest: { enabled: true, inheritFields: true, fields: null, minChars: 1, limit: 8, match: 'contains' }
});

const options = new SearchAdvancedOptions({
  mode: 'EXACT',
  fields: ['name', 'tags', 'name', '  title  '],
  limit: '12.9',
  locale: 'fr-FR',
  stopwords: [' le ', 'LA', 'le'],
  suggest: { enabled: true, inheritFields: false, fields: ['name', 'alias'], minChars: 2.9, limit: 5, match: 'PREFIX' }
});

assert.deepEqual(options.forSearch(), {
  fields: ['name', 'tags', 'title'], mode: 'text', exact: true, regex: false,
  limit: 12, locale: 'fr-FR', stopwords: ['le', 'LA']
});
assert.deepEqual(options.forSuggest(), {
  fields: ['name', 'alias'], limit: 5, minChars: 2, locale: 'fr-FR', match: 'prefix'
});

const snap = options.snapshot();
snap.fields.push('pollution');
snap.suggest.fields.push('pollution');
assert.deepEqual(options.snapshot().fields, ['name', 'tags', 'title']);
assert.deepEqual(options.snapshot().suggest.fields, ['name', 'alias']);

options.update({ mode: 'regex', fields: ['body'], suggest: { inheritFields: true, enabled: true } });
assert.deepEqual(options.forSearch(), {
  fields: ['body'], mode: 'regex', exact: false, regex: true,
  limit: 12, locale: 'fr-FR', stopwords: ['le', 'LA']
});
assert.deepEqual(options.forSuggest(), {
  fields: ['body'], limit: 5, minChars: 2, locale: 'fr-FR', match: 'prefix'
});

options.update({ suggest: { enabled: false } });
assert.equal(options.forSuggest(), null);

const serialized = options.serialize({ indent: 99 });
const raw = JSON.parse(serialized);
assert.equal(raw.type, SEARCH_ADVANCED_OPTIONS_TYPE);
assert.equal(raw.version, SEARCH_ADVANCED_OPTIONS_VERSION);
assert.match(serialized, /\n {8}"type"/);

const parsed = SearchAdvancedOptions.parse(serialized);
assert.deepEqual(parsed.snapshot(), options.snapshot());
parsed.update({ stopwords: ['x'] });
assert.notDeepEqual(parsed.snapshot(), options.snapshot());

assert.throws(() => SearchAdvancedOptions.parse({ type: 'wrong', version: 1, options: {} }), /Unsupported/);
assert.throws(() => SearchAdvancedOptions.parse({ type: SEARCH_ADVANCED_OPTIONS_TYPE, version: 2, options: {} }), /Unsupported/);
assert.throws(() => new SearchAdvancedOptions(null), /must be an object/);
assert.throws(() => new SearchAdvancedOptions({ fields: Array(257).fill('x') }), /exceeds 256 items/);
assert.throws(() => new SearchAdvancedOptions({ fields: ['x'.repeat(257)] }), /exceeds 256 characters/);

const fallback = new SearchAdvancedOptions({ mode: 'wat', locale: 'not_a_locale', limit: Infinity, suggest: { match: 'wat', minChars: -4, limit: 2_000_000 } });
assert.deepEqual(fallback.forSearch(), {
  fields: null, mode: 'text', exact: false, regex: false,
  limit: null, locale: 'fr', stopwords: []
});
assert.deepEqual(fallback.forSuggest(), {
  fields: null, limit: 1_000_000, minChars: 0, locale: 'fr', match: 'contains'
});

const resettable = new SearchAdvancedOptions({ mode: 'exact', fields: ['name'] });
resettable.update({ mode: 'regex', fields: ['body'] });
resettable.reset();
assert.equal(resettable.snapshot().mode, 'exact');
assert.deepEqual(resettable.snapshot().fields, ['name']);
resettable.resetDefaults();
assert.deepEqual(resettable.snapshot(), defaults);

console.log('search advanced options tests: ok');
