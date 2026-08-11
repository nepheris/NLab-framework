import assert from 'node:assert/strict';
import { ThemeEngine, deepMerge, DEFAULT_THEME } from '../themes/theme-engine.js';
import { VisitorPreferences } from '../themes/visitor-preferences.js';
import { IconRegistry, CORE_ICONS } from '../icons/icon-registry.js';

const merged = deepMerge({ a:{ b:1 }, x:1 }, { a:{ c:2 }, x:3 });
assert.deepEqual(merged, { a:{ b:1, c:2 }, x:3 });

const engine = new ThemeEngine({ base:DEFAULT_THEME, site:{ tokens:{ accent:'#111111' } }, variants:{ compact:{ density:'compact', tokens:{ radius:'6px' } } } });
const resolved = engine.resolve({ variant:'compact', user:{ tokens:{ accent:'#222222' } } });
assert.equal(resolved.density, 'compact');
assert.equal(resolved.tokens.radius, '6px');
assert.equal(resolved.tokens.accent, '#222222');
engine.setVariant('dark', { scheme:'dark' });
assert.equal(JSON.parse(engine.exportJSON()).variants.dark.scheme, 'dark');

const prefs = new VisitorPreferences({ allowed:{ accent:true, density:true } });
prefs.set('accent', '#abcdef').set('density', 'compact');
assert.equal(prefs.themePatch().tokens.accent, '#abcdef');
assert.equal(prefs.themePatch().density, 'compact');

const icons = new IconRegistry(); icons.registerPack(CORE_ICONS);
assert.equal(icons.has('search'), true);
assert.match(icons.get('search'), /currentColor/);

console.log('theme presentation tests: ok');
