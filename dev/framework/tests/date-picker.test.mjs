import assert from 'node:assert/strict';
import { DatePicker } from '../components/date-picker.js';

assert.equal(DatePicker.isValidIsoDate('2024-02-29'), true);
assert.equal(DatePicker.isValidIsoDate('2023-02-29'), false);
assert.equal(DatePicker.isValidIsoDate('2026-13-01'), false);
assert.equal(DatePicker.isValidIsoDate('12/08/2026'), false);
assert.equal(DatePicker.normalizeDate(' 2026-08-12 '), '2026-08-12');
assert.equal(DatePicker.normalizeDate(null), '');
assert.throws(() => DatePicker.normalizeDate('2026-02-30'), TypeError);
assert.throws(() => DatePicker.normalizeDate('', { allowEmpty: false }), TypeError);

const picker = new DatePicker({
  value: '2026-08-12',
  min: '2026-08-01',
  max: '2026-08-31',
  required: true,
  documentRef: null
});
assert.equal(picker.validate().valid, true);
assert.equal(picker.validate('2026-07-31').errors[0].code, 'min');
assert.equal(picker.validate('2026-09-01').errors[0].code, 'max');
assert.equal(picker.validate('bad').errors[0].code, 'invalid-date');
assert.equal(picker.validate('').errors[0].code, 'required');

const before = picker.value;
const invalidSet = picker.setValue('bad');
assert.equal(invalidSet.valid, false);
assert.equal(invalidSet.changed, false);
assert.equal(picker.value, before);

const changes = [];
picker.setOnChange((detail) => changes.push(detail));
const changed = picker.setValue('2026-08-20');
assert.equal(changed.valid, true);
assert.equal(changed.changed, true);
assert.equal(picker.value, '2026-08-20');
assert.equal(changes.length, 1);
assert.equal(changes[0].source, 'api');
assert.equal(changes[0].value, '2026-08-20');

const same = picker.setValue('2026-08-20');
assert.equal(same.changed, false);
assert.equal(changes.length, 1);

assert.throws(() => picker.setRange({ min: '2026-09-01', max: '2026-08-01' }), RangeError);
const rangeValidation = picker.setRange({ min: '2026-08-15', max: '2026-08-25' });
assert.equal(rangeValidation.valid, true);
assert.equal(picker.min, '2026-08-15');
assert.equal(picker.max, '2026-08-25');

picker.setRange({ min: '2026-08-21', max: '2026-08-25' });
assert.equal(picker.validate().valid, false);
assert.equal(picker.validate().errors[0].code, 'min');
picker.setRange({ min: '2026-08-01', max: '2026-08-31' });

const optional = new DatePicker({ value: '', documentRef: null });
assert.equal(optional.validate().valid, true);
optional.setRequired(true);
assert.equal(optional.validate().valid, false);
optional.setDisabled(true);
assert.equal(optional.state().disabled, true);

const fakeInput = {
  listeners: {},
  addEventListener(type, callback) { this.listeners[type] = callback; }
};
const fakeElement = {
  innerHTML: '',
  events: [],
  querySelector(selector) {
    assert.equal(selector, '.nlab-date-picker__input');
    return fakeInput;
  },
  dispatchEvent(event) { this.events.push(event); return true; }
};
const rendered = new DatePicker({
  value: '2026-08-12',
  min: '2026-08-01',
  max: '2026-08-31',
  required: true,
  id: 'trip-date',
  name: 'trip<date',
  label: 'Départ <script>',
  help: 'Choisir & confirmer',
  documentRef: null
});
rendered.mount(fakeElement);
assert.match(fakeElement.innerHTML, /type="date"/);
assert.match(fakeElement.innerHTML, /min="2026-08-01"/);
assert.match(fakeElement.innerHTML, /max="2026-08-31"/);
assert.match(fakeElement.innerHTML, /required/);
assert.ok(!fakeElement.innerHTML.includes('<script>'));
assert.ok(fakeElement.innerHTML.includes('&lt;script&gt;'));
assert.ok(fakeElement.innerHTML.includes('trip&lt;date'));
assert.ok(fakeElement.innerHTML.includes('Choisir &amp; confirmer'));

const inputChanges = [];
rendered.setOnChange((detail) => inputChanges.push(detail));
fakeInput.listeners.change({ target: { value: '2026-08-13' } });
assert.equal(rendered.value, '2026-08-13');
assert.equal(inputChanges.length, 1);
assert.equal(inputChanges[0].source, 'input');

const snapshot = rendered.state();
snapshot.errors.push({ code: 'tamper' });
assert.equal(rendered.state().errors.some((error) => error.code === 'tamper'), false);

rendered.destroy();
assert.equal(fakeElement.innerHTML, '');
assert.equal(rendered.element, null);

console.log('date picker tests: ok');
