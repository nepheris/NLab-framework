export class GA4Provider {
  constructor({ measurementId, gtag = null, debug = false } = {}) {
    if (!measurementId) throw new Error('GA4 measurementId is required');
    this.measurementId = measurementId;
    this.gtag = gtag;
    this.debug = Boolean(debug);
  }

  async track(name, data = {}) {
    const dispatch = typeof this.gtag === 'function' ? this.gtag : globalThis.gtag;
    if (typeof dispatch !== 'function') {
      return { sent: false, reason: 'gtag-unavailable', name, data };
    }

    dispatch('event', name, {
      send_to: this.measurementId,
      debug_mode: this.debug,
      ...data
    });
    return { sent: true, name };
  }
}
