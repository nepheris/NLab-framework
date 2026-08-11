import assert from 'node:assert/strict';
import {
  AnalyticsWiz,
  ConsentAdapter,
  MemoryAnalyticsProvider
} from '../analytics/analytics-wiz.js';
import { GA4Provider } from '../analytics/providers/ga4.js';

const memory = new MemoryAnalyticsProvider();
const analytics = new AnalyticsWiz({ provider: memory });
const pageResult = await analytics.trackPageView({ path: '/demo' });
assert.equal(pageResult.sent, true);
assert.equal(memory.events.length, 1);
assert.equal(memory.events[0].name, 'page_view');

const disabled = new AnalyticsWiz({ provider: memory, enabled: false });
assert.deepEqual(await disabled.trackEvent('blocked'), { sent: false, reason: 'disabled' });
assert.equal(memory.events.length, 1);

const consent = new ConsentAdapter({ defaultValue: false });
const consentedAnalytics = new AnalyticsWiz({ provider: memory, consent });
assert.deepEqual(
  await consentedAnalytics.trackEvent('before-consent'),
  { sent: false, reason: 'consent-denied' }
);
consent.set(true);
assert.equal(await consentedAnalytics.canTrack(), true);
assert.equal((await consentedAnalytics.trackEvent('after-consent')).sent, true);
assert.equal(memory.events.at(-1).name, 'after-consent');

const noProvider = new AnalyticsWiz({ provider: {} });
assert.deepEqual(
  await noProvider.trackEvent('event'),
  { sent: false, reason: 'provider-unavailable' }
);

const rejectingProvider = {
  async track(name) {
    return { sent: false, reason: 'transport-unavailable', name };
  }
};
const rejected = await new AnalyticsWiz({ provider: rejectingProvider }).trackEvent('event');
assert.equal(rejected.sent, false);
assert.equal(rejected.reason, 'transport-unavailable');
assert.equal(rejected.providerResult.sent, false);

const throwingProvider = {
  async track() {
    throw new Error('network failure');
  }
};
const failed = await new AnalyticsWiz({ provider: throwingProvider }).trackEvent('event');
assert.equal(failed.sent, false);
assert.equal(failed.reason, 'provider-error');
assert.match(failed.error.message, /network failure/);

const consentFailure = new AnalyticsWiz({
  provider: memory,
  consent: { async allowed() { throw new Error('consent storage failure'); } }
});
const consentError = await consentFailure.trackEvent('event');
assert.equal(consentError.sent, false);
assert.equal(consentError.reason, 'consent-error');

assert.deepEqual(
  await analytics.trackEvent('   '),
  { sent: false, reason: 'invalid-event-name' }
);

const previousGtag = globalThis.gtag;
try {
  delete globalThis.gtag;
  const gaUnavailable = new GA4Provider({ measurementId: 'G-NO-GTAG' });
  const unavailable = await gaUnavailable.track('page_view', { path: '/' });
  assert.equal(unavailable.sent, false);
  assert.equal(unavailable.reason, 'gtag-unavailable');

  const calls = [];
  const gaLate = new GA4Provider({ measurementId: 'G-LATE', debug: true });
  globalThis.gtag = (...args) => calls.push(args);
  const lateResult = await gaLate.track('share', { method: 'copy' });
  assert.equal(lateResult.sent, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'event');
  assert.equal(calls[0][1], 'share');
  assert.equal(calls[0][2].send_to, 'G-LATE');
  assert.equal(calls[0][2].debug_mode, true);
  assert.equal(calls[0][2].method, 'copy');
} finally {
  if (previousGtag === undefined) delete globalThis.gtag;
  else globalThis.gtag = previousGtag;
}

console.log('analytics contract tests: ok');
