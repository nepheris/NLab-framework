import assert from 'node:assert/strict';
import { EventBus } from '../core/event-bus.js';

let now = 100;
const bus = new EventBus({ clock: () => now });
const calls = [];
const exact = (event) => calls.push(['exact', event]);
const wildcard = (event) => calls.push(['wildcard', event]);

const offExact = bus.on('  ready  ', exact);
bus.on('*', wildcard);
assert.equal(bus.listenerCount('ready'), 1);
assert.equal(bus.listenerCount('*'), 1);
assert.equal(bus.listenerCount(), 2);
assert.deepEqual(bus.events().sort(), ['*', 'ready']);

const result = bus.emit(' ready ', { ok: true }, { source: 'test' });
assert.equal(result.delivered, 2);
assert.equal(result.errors.length, 0);
assert.equal(result.event.name, 'ready');
assert.equal(result.event.timestamp, 100);
assert.deepEqual(result.event.payload, { ok: true });
assert.deepEqual(result.event.meta, { source: 'test' });
assert.equal(calls.length, 2);
assert.equal(calls[0][0], 'exact');
assert.equal(calls[1][0], 'wildcard');

// A listener fautif est isolé et compte comme tentative de livraison.
bus.on('ready', () => { throw new Error('listener failure'); });
const failed = bus.emit('ready');
assert.equal(failed.delivered, 3);
assert.equal(failed.errors.length, 1);
assert.match(failed.errors[0].message, /listener failure/);

// once() se désabonne avant d'appeler le consumer, même si celui-ci lève.
let onceCalls = 0;
bus.once('once', () => { onceCalls += 1; throw new Error('once failure'); });
const onceFirst = bus.emit('once');
const onceSecond = bus.emit('once');
assert.equal(onceCalls, 1);
assert.equal(onceFirst.errors.length, 1);
assert.equal(onceSecond.errors.length, 0);
assert.equal(bus.listenerCount('once'), 0);

// La liste est snapshotée : les abonnements ajoutés pendant emit attendent le prochain tour.
const snapshotBus = new EventBus({ clock: () => 7 });
const snapshotCalls = [];
const late = () => snapshotCalls.push('late');
snapshotBus.on('tick', () => {
  snapshotCalls.push('first');
  snapshotBus.on('tick', late);
});
snapshotBus.emit('tick');
assert.deepEqual(snapshotCalls, ['first']);
snapshotBus.emit('tick');
assert.deepEqual(snapshotCalls, ['first', 'first', 'late']);

// Set déduplique un même listener pour un même événement.
const duplicateBus = new EventBus();
let duplicates = 0;
const duplicate = () => { duplicates += 1; };
duplicateBus.on('x', duplicate);
duplicateBus.on('x', duplicate);
assert.equal(duplicateBus.listenerCount('x'), 1);
duplicateBus.emit('x');
assert.equal(duplicates, 1);

// emit('*') ne doit pas concaténer deux fois le bucket wildcard.
const starBus = new EventBus();
let starCalls = 0;
starBus.on('*', () => { starCalls += 1; });
assert.equal(starBus.emit('*').delivered, 1);
assert.equal(starCalls, 1);

assert.equal(offExact(), true);
assert.equal(offExact(), false);
assert.equal(bus.listenerCount('ready'), 1); // listener fautif restant
assert.equal(bus.off('missing'), false);
assert.throws(() => bus.off('ready', 'not-a-listener'), /listener/);

assert.equal(bus.clear('ready'), 1);
assert.equal(bus.listenerCount('ready'), 0);
assert.equal(bus.clear('missing'), 0);
assert.equal(bus.clear(), 1); // wildcard
assert.equal(bus.listenerCount(), 0);
assert.deepEqual(bus.events(), []);

assert.throws(() => bus.on('', () => {}), /eventName/);
assert.throws(() => bus.on('x', null), /listener/);
assert.throws(() => bus.emit('   '), /eventName/);
assert.throws(() => bus.listenerCount(42), /string/);
assert.throws(() => new EventBus({ clock: 1 }), /clock/);

now = 321;
const timed = new EventBus({ clock: () => now });
assert.equal(timed.emit('time').event.timestamp, 321);

console.log('EventBus tests: OK');
