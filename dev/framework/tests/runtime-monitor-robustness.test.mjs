import assert from 'node:assert/strict';
import { RuntimeMonitor } from '../observability/runtime-monitor.js';

const events = [];
const eventBus = { emit(name, payload){ events.push({ name, payload }); } };
const monitor = new RuntimeMonitor({ eventBus, maxErrors:2 });

// Timing, meta détachées et événement metric.
const sourceMeta = { scope:'load' };
monitor.start('load');
const metric = monitor.end('load', { meta:sourceMeta });
assert.equal(metric.name, 'load');
assert.ok(metric.duration >= 0);
assert.equal(events[0].name, 'monitor:metric');
sourceMeta.scope = 'mutated-source';
metric.meta.scope = 'mutated-return';
events[0].payload.meta.scope = 'mutated-event';
let snapshot = monitor.snapshot();
assert.equal(snapshot.metrics.load.meta.scope, 'load');
assert.equal(monitor.end('missing'), null);

// Compteurs numériques, deltas négatifs et rejet des valeurs non finies.
assert.equal(monitor.count('requests'), 1);
assert.equal(monitor.count('requests', 4), 5);
assert.equal(monitor.count('requests', -2), 3);
assert.equal(monitor.count('requests', '2'), 5);
assert.throws(() => monitor.count('requests', 'not-a-number'), /finite number/);

// Capture Error + chaîne et rétention FIFO.
const sourceContext = { route:'/a' };
const first = monitor.capture(new Error('first'), sourceContext);
sourceContext.route = '/mutated';
first.context.route = '/returned';
assert.equal(events.at(-1).name, 'monitor:error');
monitor.capture('second', { route:'/b' });
monitor.capture(new Error('third'), { route:'/c' });
snapshot = monitor.snapshot();
assert.equal(snapshot.errors.length, 2);
assert.deepEqual(snapshot.errors.map((item) => item.message), ['second','third']);

// Le snapshot ne doit pas exposer les entrées internes par référence.
snapshot.errors[0].message = 'changed';
snapshot.errors[0].context.route = '/changed';
snapshot.metrics.requests.value = 999;
const secondSnapshot = monitor.snapshot();
assert.equal(secondSnapshot.errors[0].message, 'second');
assert.equal(secondSnapshot.errors[0].context.route, '/b');
assert.equal(secondSnapshot.metrics.requests.value, 5);

// Limites maxErrors robustes.
const zero = new RuntimeMonitor({ maxErrors:0 });
zero.capture(new Error('discarded'));
assert.equal(zero.snapshot().errors.length, 0);

const invalidLimit = new RuntimeMonitor({ maxErrors:Number.NaN });
invalidLimit.capture(new Error('kept'));
assert.equal(invalidLimit.maxErrors, 100);
assert.equal(invalidLimit.snapshot().errors.length, 1);

const negativeLimit = new RuntimeMonitor({ maxErrors:-4 });
negativeLimit.capture(new Error('discarded'));
assert.equal(negativeLimit.maxErrors, 0);
assert.equal(negativeLimit.snapshot().errors.length, 0);

const unlimited = new RuntimeMonitor({ maxErrors:Infinity });
for (let i = 0; i < 105; i += 1) unlimited.capture(`e${i}`);
assert.equal(unlimited.snapshot().errors.length, 105);

// clear() réinitialise marks, metrics et erreurs.
monitor.start('pending');
monitor.capture(new Error('before-clear'));
monitor.clear();
snapshot = monitor.snapshot();
assert.deepEqual(snapshot.metrics, {});
assert.deepEqual(snapshot.errors, []);
assert.equal(monitor.end('pending'), null);

console.log('runtime monitor robustness tests: ok');
