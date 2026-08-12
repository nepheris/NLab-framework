import assert from 'node:assert/strict';
import { DataIndex, DataIndexError } from '../core/data-index.js';

const index = new DataIndex();
const recipes = [
  { id:'REC001', slug:'soupe', label:'Soupe' },
  { id:'REC002', slug:'salade', label:'Salade' },
  { id:null, slug:'ignore-null', label:'Sans id' },
  { slug:'ignore-missing', label:'Sans id 2' },
];

let built = index.build('recipes', recipes);
assert.equal(built.size, 2);
assert.equal(built.get('REC001').label, 'Soupe');
assert.equal(index.get('recipes').get('REC002').label, 'Salade');
assert.equal(index.has('recipes'), true);
assert.equal(index.size(), 1);
assert.equal(index.size('recipes'), 1);

index.build('recipes', recipes, 'slug');
assert.equal(index.get('recipes', 'slug').get('salade').id, 'REC002');
assert.equal(index.size(), 2);
assert.equal(index.size('recipes'), 2);

// Une construction invalide ne doit pas écraser l'index déjà publié.
const before = index.get('recipes');
assert.throws(
  () => index.build('recipes', [{ id:'REC001' }, { id:'REC001' }]),
  (error) => {
    assert.ok(error instanceof DataIndexError);
    assert.equal(error.code, 'DUPLICATE_INDEX_KEY');
    assert.deepEqual(error.details, {
      collection:'recipes', field:'id', value:'REC001', firstIndex:0, recordIndex:1
    });
    return true;
  }
);
assert.equal(index.get('recipes'), before, 'duplicate build must keep the previous published index');
assert.equal(index.get('recipes').size, 2);

assert.throws(() => index.build('recipes', null), (error) => error.code === 'INVALID_RECORDS');
assert.throws(() => index.build('', []), (error) => error.code === 'INVALID_COLLECTION');
assert.throws(() => index.build('recipes', [], '  '), (error) => error.code === 'INVALID_FIELD');
assert.throws(() => index.get(' '), (error) => error.code === 'INVALID_COLLECTION');
assert.throws(() => index.clear(''), (error) => error.code === 'INVALID_COLLECTION');

// clear(collection) ne doit supprimer que la collection exacte.
index.build('recipes-archive', [{ id:'OLD001' }]);
index.build('ingredients', [{ id:'ING001' }]);
assert.equal(index.size(), 4);
index.clear('recipes');
assert.equal(index.has('recipes'), false);
assert.equal(index.has('recipes', 'slug'), false);
assert.equal(index.has('recipes-archive'), true);
assert.equal(index.has('ingredients'), true);
assert.equal(index.size(), 2);

assert.equal(index.clear(), index);
assert.equal(index.size(), 0);
assert.equal(index.get('ingredients'), null);

console.log('data index robustness tests: ok');
