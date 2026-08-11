import assert from 'node:assert/strict';
import { SearchWiz } from '../wiz/search-wiz.js';
import { FilterWiz } from '../wiz/filter-wiz.js';
import { RendererWiz } from '../wiz/renderer-wiz.js';
import { TableWiz } from '../wiz/table-wiz.js';
import { JsonStudio } from '../wiz/json-studio.js';
import { DataWiz } from '../wiz/data-wiz.js';

const items = [
  { id:'A', name:'Tarte aux pommes', category:'dessert', tags:['fruit'], score:12 },
  { id:'B', name:'Soupe de carottes', category:'plat', tags:['legume'], score:7 },
  { id:'C', name:'Pommes rôties', category:'dessert', tags:['fruit'], score:9 }
];

const search = new SearchWiz();
const searched = search.search(items, 'pommes', { fields:['name'] });
assert.equal(searched.total, 2);
assert.equal(searched.items[0]._searchScore > 0, true);

const filter = new FilterWiz();
assert.equal(filter.apply(items, [{ field:'category', operator:'eq', value:'dessert' }]).items.length, 2);
assert.equal(filter.apply(items, [{ field:'tags', operator:'overlap', values:['legume'] }]).items[0].id, 'B');

const renderer = new RendererWiz();
assert.equal(renderer.chooseForWidth(400), 'list');
assert.match(renderer.render('cards', items), /Tarte aux pommes/);

const table = new TableWiz({ columns:[{ id:'name', field:'name' }, { id:'score', field:'score' }], pageSize:2 });
table.setSort('score','desc');
assert.equal(table.process(items).page[0].id, 'A');
assert.match(table.exportCSV(items), /"name"/i);

const studio = new JsonStudio({ data:{ id:'A', steps:['one','two'] } });
studio.move('steps', 1, 0);
assert.deepEqual(studio.get('steps'), ['two','one']);
studio.set('id','B');
assert.equal(studio.diff().some((change)=>change.path==='id'), true);

const data = new DataWiz();
const stats = data.describe(items, ['score']);
assert.equal(stats.fields.score.numeric.max, 12);
assert.equal(data.groupBy(items,'category').find((group)=>group.value==='dessert').count, 2);

console.log('data ux tests: ok');
