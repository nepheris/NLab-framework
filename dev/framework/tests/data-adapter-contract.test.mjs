import assert from 'node:assert/strict';
import { DataAdapter, DataAdapterError } from '../core/data-adapter.js';

const options = { strict: true };
const adapter = new DataAdapter(options);
options.strict = false;
assert.equal(adapter.options.strict, true);
assert.equal(adapter.type, 'abstract');
assert.equal(await adapter.canHandle({}), false);

await assert.rejects(
  () => adapter.normalize({ value: 1 }, { source: 'test' }),
  (error) => {
    assert.ok(error instanceof DataAdapterError);
    assert.equal(error.name, 'DataAdapterError');
    assert.equal(error.code, 'NOT_IMPLEMENTED');
    assert.equal(error.details.operation, 'normalize');
    assert.equal(error.details.adapterType, 'abstract');
    assert.deepEqual(error.details.context, { source: 'test' });
    return true;
  }
);

const context = { mode: 'x' };
try {
  await adapter.normalize({}, context);
} catch (error) {
  context.mode = 'mutated';
  assert.equal(error.details.context.mode, 'x');
}

assert.throws(() => new DataAdapter([]), /options must be an object/);
assert.throws(() => new DataAdapter('bad'), /options must be an object/);
await assert.rejects(() => adapter.normalize({}, []), /options must be an object/);

class ConcreteAdapter extends DataAdapter {
  get type() { return 'concrete'; }
  async canHandle(source) { return source?.type === 'json'; }
  async normalize(input, context = {}) { return { input, context, options: this.options }; }
}
const concrete = new ConcreteAdapter({ trim: true });
assert.equal(await concrete.canHandle({ type: 'json' }), true);
assert.equal(await concrete.canHandle({ type: 'csv' }), false);
assert.deepEqual(await concrete.normalize('x', { id: 1 }), {
  input: 'x',
  context: { id: 1 },
  options: { trim: true }
});

const customError = new DataAdapterError('boom', 'CUSTOM', { id: 1 });
assert.equal(customError.message, 'boom');
assert.equal(customError.code, 'CUSTOM');
assert.deepEqual(customError.details, { id: 1 });

console.log('DataAdapter tests: OK');
