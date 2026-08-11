import assert from 'node:assert/strict';
import { SearchWiz } from '../wiz/search-wiz.js';
import { FilterWiz } from '../wiz/filter-wiz.js';

const rows = [
  { id:'REC001', name:'Crème de carottes', category:'entrée', score:10, tags:['légume','chaud'], meta:{active:true}, date:'2026-08-01' },
  { id:'REC002', name:'Salade de pommes', category:'dessert', score:20, tags:['fruit','froid'], meta:{active:false}, date:'2026-08-05' },
  { id:'REC003', name:'Soupe tomate', category:'entrée', score:30, tags:['légume','chaud'], meta:{active:true}, date:'2026-08-10' },
  { id:'REC004', name:'Pomme rôtie "minute"', category:'dessert', score:null, tags:['fruit'], meta:{}, date:null },
  { id:'REC005', name:'Борщ maison', category:'soupe', score:'40', tags:['chaud'], meta:{active:true}, date:'2026-08-12' },
];

const search = new SearchWiz();
let result = search.search(rows, 'creme');
assert.deepEqual(result.items.map((item)=>item.id), ['REC001']);
assert.ok(result.items[0]._searchScore > 0);

// fields accepte une chaîne et les stopwords sont réellement ignorés.
result = search.search(rows, 'la pomme', { fields:'name', stopwords:['la'] });
assert.deepEqual(result.items.map((item)=>item.id).sort(), ['REC002','REC004']);
assert.deepEqual(result.meta.fields, ['name']);
assert.deepEqual(result.meta.stopwords, ['la']);

// Unicode hors alphabet latin conservé par le tokenizer.
result = search.search(rows, 'борщ', { fields:['name'], locale:'fr' });
assert.deepEqual(result.items.map((item)=>item.id), ['REC005']);

// Une RegExp globale ne doit pas alterner les résultats via lastIndex.
result = search.search([
  { id:'A', name:'soupe rouge' },
  { id:'B', name:'soupe verte' },
  { id:'C', name:'soupe jaune' },
], /soupe/g, { fields:['name'], regex:true });
assert.deepEqual(result.items.map((item)=>item.id), ['A','B','C']);

// Exact, total avant limite et limite 0 explicite.
result = search.search(rows, 'REC002', { fields:['id'], exact:true });
assert.equal(result.items.length, 1);
assert.equal(result.items[0]._searchScore, 100);
result = search.search(rows, 'pomme', { limit:1 });
assert.equal(result.items.length, 1);
assert.equal(result.total, 2);
result = search.search(rows, 'pomme', { limit:0 });
assert.equal(result.items.length, 0);
assert.equal(result.total, 2);

// Entrées non-tableau : résultat neutre plutôt qu'exception.
result = search.search(null, 'x');
assert.deepEqual(result.items, []);
assert.equal(result.total, 0);

const filter = new FilterWiz();
result = filter.apply(rows, [{ field:'category', operator:'eq', value:'entrée' }]);
assert.deepEqual(result.items.map((item)=>item.id), ['REC001','REC003']);

// Filtre unique objet accepté, chemin imbriqué et logique normalisée.
result = filter.apply(rows, { field:'meta.active', operator:'eq', value:true });
assert.deepEqual(result.items.map((item)=>item.id), ['REC001','REC003','REC005']);
assert.equal(result.meta.logic, 'and');

result = filter.apply(rows, [
  { field:'category', operator:'eq', value:'dessert' },
  { field:'tags', operator:'overlap', values:['chaud'] },
], { logic:'OR' });
assert.deepEqual(result.items.map((item)=>item.id).sort(), ['REC001','REC002','REC003','REC004','REC005']);
assert.equal(result.meta.logic, 'or');

// Comparaisons numériques : chaînes numériques autorisées, null/chaîne vide refusés.
result = filter.apply(rows, [{ field:'score', operator:'gte', value:20 }]);
assert.deepEqual(result.items.map((item)=>item.id), ['REC002','REC003','REC005']);
result = filter.apply(rows, [{ field:'score', operator:'between', min:15, max:30 }]);
assert.deepEqual(result.items.map((item)=>item.id), ['REC002','REC003']);
result = filter.apply([{id:'X', score:''},{id:'Y', score:null}], [{ field:'score', operator:'gte', value:0 }]);
assert.deepEqual(result.items, []);

// Dates nulles et bornes invalides ne doivent pas devenir 1970 implicitement.
result = filter.apply(rows, [{ field:'date', operator:'date-between', min:'2026-08-02', max:'2026-08-09' }]);
assert.deepEqual(result.items.map((item)=>item.id), ['REC002']);
result = filter.apply([{id:'X', date:null}], [{ field:'date', operator:'date-between', min:'1970-01-01', max:'1970-01-02' }]);
assert.deepEqual(result.items, []);

// Regex globale stable et regex invalide fail-closed.
result = filter.apply([
  { id:'A', name:'pomme rouge' },
  { id:'B', name:'pomme verte' },
], [{ field:'name', operator:'regex', value:/pomme/g }]);
assert.deepEqual(result.items.map((item)=>item.id), ['A','B']);
result = filter.apply(rows, [{ field:'name', operator:'regex', value:'[invalid' }]);
assert.deepEqual(result.items, []);

// Opérateur inconnu, contains vide et listes invalides : fail-closed.
result = filter.apply(rows, [{ field:'name', operator:'typo-op', value:'pomme' }]);
assert.deepEqual(result.items, []);
result = filter.apply(rows, [{ field:'name', operator:'contains', value:'' }]);
assert.deepEqual(result.items, []);
result = filter.apply(rows, [{ field:'id', operator:'in', values:'REC001' }]);
assert.deepEqual(result.items, []);

// Aucun filtre valide : conserver les données sans exposer le tableau source.
const original = [...rows];
result = filter.apply(rows, [{ operator:'eq', value:'x' }]);
assert.deepEqual(result.items, rows);
result.items.pop();
assert.equal(rows.length, original.length);

console.log('search filter robustness tests: ok');
