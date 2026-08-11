import assert from 'node:assert/strict';
import { RuntimeMonitor } from '../observability/runtime-monitor.js';

const events = [];
const eventBus = { emit:(name,payload)=>events.push({name,payload}) };

const monitor = new RuntimeMonitor({ eventBus, maxErrors:2 });

// Metrics chronométriques : start/end, méta et émission d'événement.
monitor.start('boot');
const boot = monitor.end('boot', { meta:{ phase:'init' } });
assert.equal(boot.name, 'boot');
assert.equal(boot.duration >= 0, true);
assert.deepEqual(boot.meta, { phase:'init' });
assert.equal(events.at(-1).name, 'monitor:metric');
assert.equal(events.at(-1).payload.name, 'boot');

// Un end sans start préalable reste neutre.
assert.equal(monitor.end('missing'), null);

// Compteurs cumulés et deltas négatifs.
assert.equal(monitor.count('records', 3), 3);
assert.equal(monitor.count('records', 2), 5);
assert.equal(monitor.count('records', -1), 4);
assert.equal(monitor.snapshot().metrics.records.value, 4);

// Capture d'erreur : message, contexte, stack et émission d'événement.
const first = monitor.capture(new Error('first'), { module:'json-studio' });
assert.equal(first.message, 'first');
assert.deepEqual(first.context, { module:'json-studio' });
assert.equal(typeof first.stack, 'string');
assert.equal(events.at(-1).name, 'monitor:error');

// Les valeurs non-Error restent capturables.
const second = monitor.capture('plain failure', { severity:'warning' });
assert.equal(second.message, 'plain failure');
assert.equal(second.stack, null);

// maxErrors agit comme une file FIFO bornée.
monitor.capture(new Error('third'));
let snapshot = monitor.snapshot();
assert.equal(snapshot.errors.length, 2);
assert.deepEqual(snapshot.errors.map((item)=>item.message), ['plain failure','third']);

// snapshot ne doit pas exposer directement le tableau interne d'erreurs.
snapshot.errors.push({ message:'external mutation' });
assert.equal(monitor.snapshot().errors.length, 2);

// clear purge métriques, erreurs et marques en cours.
monitor.start('pending');
monitor.clear();
snapshot = monitor.snapshot();
assert.deepEqual(snapshot.metrics, {});
assert.deepEqual(snapshot.errors, []);
assert.equal(monitor.end('pending'), null);

// maxErrors=0 documente le contrat actuel : aucune erreur ne doit être conservée.
const noRetention = new RuntimeMonitor({ maxErrors:0 });
noRetention.capture(new Error('discarded'));
assert.equal(noRetention.snapshot().errors.length, 0);

console.log('runtime monitor robustness tests: ok');
