import assert from 'node:assert/strict';
import { JsonStudio, JsonStudioError } from '../wiz/json-studio.js';

// Validation must target the edited buffer, not reload a provider collection.
let validateCollectionCalls = 0;
const validated = [];
const validator = {
  async validateCollection() {
    validateCollectionCalls += 1;
    throw new Error('JsonStudio must not call validateCollection() for its edited buffer');
  },
  async validateRecord(collection, record, { recordIndex = null } = {}) {
    validated.push({ collection, record:structuredClone(record), recordIndex });
    const issues = record.score < 0
      ? [{ level:'error', code:'NEGATIVE_SCORE', collection, recordIndex, field:'score', details:null }]
      : record.score === 0
        ? [{ level:'warning', code:'ZERO_SCORE', collection, recordIndex, field:'score', details:null }]
        : [];
    const errors = issues.filter((issue) => issue.level === 'error').length;
    const warnings = issues.filter((issue) => issue.level === 'warning').length;
    return { scope:'record', collection, valid:errors === 0, checked:1, errors, warnings, issues };
  }
};

const validationStudio = new JsonStudio({
  data:[
    { id:'A', score:4 },
    { id:'B', score:-1 },
    { id:'C', score:0 }
  ],
  validator,
  table:{}
});

const report = await validationStudio.validate({ collection:'recipes' });
assert.equal(validateCollectionCalls, 0);
assert.equal(validated.length, 3);
assert.deepEqual(validated.map((entry) => entry.recordIndex), [0, 1, 2]);
assert.equal(report.source, 'buffer');
assert.equal(report.checked, 3);
assert.equal(report.errors, 1);
assert.equal(report.warnings, 1);
assert.equal(report.valid, false);
assert.deepEqual(report.issues.map((issue) => issue.code), ['NEGATIVE_SCORE', 'ZERO_SCORE']);

// A single edited record also delegates directly to validateRecord().
const singleStudio = new JsonStudio({ data:{ id:'S', score:2 }, validator, table:{} });
const singleReport = await singleStudio.validate({ collection:'recipes', recordIndex:7 });
assert.equal(singleReport.valid, true);
assert.equal(validated.at(-1).recordIndex, 7);

// DataResolver output is mapped for display without mutating raw IDs or resolved objects.
const resolver = {
  async resolveRecord(collection, record) {
    assert.equal(collection, 'recipes');
    return {
      collection,
      data:structuredClone(record),
      resolved:{
        category_id:{ id:'C1', name:'Desserts' },
        tag_ids:[
          { id:'T1', label:'Rapide' },
          null
        ],
        author_id:{ id:'U1', meta:{ display:'Alice' } }
      },
      issues:[]
    };
  }
};

const relationData = [{
  id:'R1',
  category_id:'C1',
  tag_ids:['T1', 'T2'],
  author_id:'U1'
}];
const relationStudio = new JsonStudio({ data:relationData, resolver, table:{} });
const displayed = await relationStudio.resolvedDisplay(
  { collection:'recipes' },
  {
    mappings:{
      category_id:{ mode:'id+label', labelField:'name' },
      tag_ids:{ mode:'label', labelField:'label' },
      author_id:{ mode:'label', labelField:'meta.display' }
    }
  }
);

assert.equal(displayed.length, 1);
assert.equal(displayed[0].display.category_id, 'C1 — Desserts');
assert.deepEqual(displayed[0].display.tag_ids, ['Rapide', 'T2']);
assert.equal(displayed[0].display.author_id, 'Alice');
assert.deepEqual(displayed[0].data, relationData[0]);
assert.deepEqual(relationStudio.get(), relationData);

// Mapping modes remain deterministic and preserve many-cardinality arrays.
assert.equal(
  relationStudio.displayResolvedValue('C1', { id:'C1', name:'Desserts' }, { mode:'id', labelField:'name' }),
  'C1'
);
assert.deepEqual(
  relationStudio.displayResolvedValue(
    ['T1', 'T2'],
    [{ id:'T1', label:'Rapide' }],
    { mode:'id+label', labelField:'label', separator:' / ' }
  ),
  ['T1 / Rapide', 'T2']
);
const objectValue = relationStudio.displayResolvedValue(
  'C1',
  { id:'C1', name:'Desserts' },
  { mode:'object' }
);
assert.deepEqual(objectValue, { id:'C1', name:'Desserts' });
objectValue.name = 'mutated';
assert.equal(
  relationStudio.displayResolvedValue('C1', { id:'C1', name:'Desserts' }, { mode:'label', labelField:'name' }),
  'Desserts'
);

// A result with no resolved relation remains usable and receives an independent display copy.
const plain = relationStudio.mapResolvedRecord({ data:{ id:'X', value:1 }, resolved:{}, issues:[] });
assert.deepEqual(plain.display, { id:'X', value:1 });
plain.display.value = 9;
assert.equal(plain.data.value, 1);

// Resolver contract failures are explicit.
const badResolverStudio = new JsonStudio({ data:{ id:'X' }, resolver:{}, table:{} });
await assert.rejects(
  () => badResolverStudio.resolved({ collection:'recipes' }),
  (error) => error instanceof JsonStudioError && error.code === 'RESOLVER_CONTRACT_REQUIRED'
);

console.log('json studio relation/display tests: ok');
