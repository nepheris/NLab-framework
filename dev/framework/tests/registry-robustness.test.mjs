import assert from 'node:assert/strict';
import { FrameworkRegistry, REGISTRY_NAMESPACES } from '../core/registry.js';

const registry = new FrameworkRegistry();
assert.deepEqual(registry.namespaceNames(), []);
assert.equal(registry.size(), 0);

// Les lectures inconnues ne doivent pas créer de namespace.
assert.equal(registry.get('services', 'missing', 'fallback'), 'fallback');
assert.equal(registry.has('services', 'missing'), false);
assert.deepEqual(registry.list('services'), []);
assert.equal(registry.remove('services', 'missing'), false);
assert.deepEqual(registry.namespaceNames(), []);

const service = { start() {} };
assert.equal(registry.register(' services ', ' api ', service), service);
assert.equal(registry.has('services', 'api'), true);
assert.equal(registry.get('services', 'api'), service);
assert.equal(registry.size('services'), 1);
assert.equal(registry.size(), 1);
assert.deepEqual(registry.namespaceNames(), ['services']);
assert.deepEqual(registry.list('services'), [{ id: 'api', value: service }]);

assert.throws(() => registry.register('services', 'api', {}), /already exists/);
const replacement = { start: 'new' };
registry.register('services', 'api', replacement, { replace: true });
assert.equal(registry.get('services', 'api'), replacement);

// null/undefined sont des valeurs enregistrées et ne doivent pas déclencher le fallback.
registry.register('services', 'nullable', null);
registry.register('services', 'undefined-value', undefined);
assert.equal(registry.get('services', 'nullable', 'fallback'), null);
assert.equal(registry.get('services', 'undefined-value', 'fallback'), undefined);
assert.equal(registry.size('services'), 3);

registry.register('components', 'card', { name: 'card' });
assert.equal(registry.size(), 4);
assert.deepEqual(new Set(registry.namespaceNames()), new Set(['services', 'components']));

assert.equal(registry.remove('components', 'card'), true);
assert.equal(registry.has('components', 'card'), false);
assert.deepEqual(registry.namespaceNames(), ['services']);
assert.equal(registry.remove('components', 'card'), false);

assert.equal(registry.clear('services'), 3);
assert.equal(registry.size(), 0);
assert.deepEqual(registry.namespaceNames(), []);
assert.equal(registry.clear('services'), 0);

registry.register('wiz', 'search', 1);
registry.register('providers', 'memory', 2);
assert.equal(registry.clear(), 2);
assert.equal(registry.size(), 0);
assert.deepEqual(registry.namespaceNames(), []);

assert.throws(() => registry.namespace(''), /namespace/);
assert.throws(() => registry.namespace(12), /string/);
assert.throws(() => registry.register('services', '', 1), /id/);
assert.throws(() => registry.get('', 'x'), /namespace/);
assert.throws(() => registry.has('services', 7), /id/);

assert.ok(REGISTRY_NAMESPACES.includes('services'));
assert.ok(Object.isFrozen(REGISTRY_NAMESPACES));

console.log('FrameworkRegistry tests: OK');
