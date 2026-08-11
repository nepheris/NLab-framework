import assert from 'node:assert/strict';
import { PresentationResolver } from '../data/presentation-resolver.js';

const defaults = {
  renderer: 'table',
  view: { density: 'normal', columns: ['id', 'name'] },
  sort: [{ field: 'name', dir: 'asc' }],
  groupBy: 'category',
  filter: { active: true }
};
const byType = {
  card: {
    renderer: 'cards',
    view: { density: 'comfortable', image: { ratio: '4/3' } },
    sort: [{ field: 'title', dir: 'asc' }]
  }
};
const resolver = new PresentationResolver({ defaults, byType });

// Les configs d'entrée ne doivent pas fuiter par référence.
defaults.view.columns.push('mutated');
defaults.sort[0].dir = 'desc';
byType.card.view.image.ratio = '1/1';

const card = resolver.resolve({ type: 'card' });
assert.equal(card.renderer, 'cards');
assert.deepEqual(card.view, {
  density: 'comfortable',
  columns: ['id', 'name'],
  image: { ratio: '4/3' }
});
assert.deepEqual(card.sort, [{ field: 'title', dir: 'asc' }]);
assert.equal(card.groupBy, 'category');
assert.deepEqual(card.filter, { active: true });

// Schema puis override ont priorité ; les vues fusionnent.
const resolved = resolver.resolve({
  type: 'card',
  schema: {
    renderer: 'list',
    view: { density: 'compact', badge: true },
    defaultSort: [{ field: 'createdAt', dir: 'desc' }],
    defaultGroupBy: 'month'
  },
  override: {
    renderer: 'gallery',
    view: { badge: false, columns: ['title'] },
    sort: [{ field: 'rank', dir: 'asc' }],
    groupBy: 'owner',
    filter: { public: true }
  }
});
assert.equal(resolved.renderer, 'gallery');
assert.deepEqual(resolved.view, {
  density: 'compact',
  columns: ['title'],
  image: { ratio: '4/3' },
  badge: false
});
assert.deepEqual(resolved.sort, [{ field: 'rank', dir: 'asc' }]);
assert.equal(resolved.groupBy, 'owner');
assert.deepEqual(resolved.filter, { public: true });

// null explicite annule les valeurs héritées ; false est préservé.
const cleared = resolver.resolve({
  type: 'card',
  override: { renderer: false, sort: null, groupBy: null, filter: null }
});
assert.equal(cleared.renderer, false);
assert.equal(cleared.sort, null);
assert.equal(cleared.groupBy, null);
assert.equal(cleared.filter, null);

// undefined continue de déclencher le fallback.
const fallback = resolver.resolve({
  type: 'card',
  override: { renderer: undefined, sort: undefined }
});
assert.equal(fallback.renderer, 'cards');
assert.deepEqual(fallback.sort, [{ field: 'title', dir: 'asc' }]);

// Type vide revient à collection / defaults.
const collection = resolver.resolve({ type: '   ' });
assert.equal(collection.renderer, 'table');
assert.equal(collection.view.density, 'normal');

// Les sorties complexes sont indépendantes d'un appel à l'autre.
const first = resolver.resolve({ type: 'card' });
const second = resolver.resolve({ type: 'card' });
first.view.columns.push('local');
first.view.image.ratio = '2/1';
first.sort[0].field = 'mutated';
first.filter.active = false;
assert.deepEqual(second.view.columns, ['id', 'name']);
assert.equal(second.view.image.ratio, '4/3');
assert.equal(second.sort[0].field, 'title');
assert.equal(second.filter.active, true);

// Configs invalides et cycles sont rejetés tôt.
assert.throws(() => new PresentationResolver({ defaults: [] }), /defaults must be an object/);
assert.throws(() => new PresentationResolver({ byType: [] }), /byType must be an object/);
assert.throws(() => new PresentationResolver({ byType: { card: [] } }), /byType\.card must be an object/);
assert.throws(() => resolver.resolve({ schema: [] }), /schema must be an object/);
assert.throws(() => resolver.resolve({ override: [] }), /override must be an object/);
assert.throws(() => resolver.resolve({ schema: { view: [] } }), /schema\.view must be an object/);

const circular = {};
circular.self = circular;
assert.throws(
  () => new PresentationResolver({ defaults: { view: circular } }),
  /must not be circular/
);

console.log('PresentationResolver tests: OK');
