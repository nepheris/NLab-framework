export class AnalyticsWiz {
  constructor({ provider = null, consent = null, enabled = true } = {}) {
    this.provider = provider;
    this.consent = consent;
    this.enabled = enabled;
  }

  async canTrack() {
    return (await this.#gate()).allowed;
  }

  async trackPageView(data = {}) { return this.#send('page_view', data); }
  async trackEvent(name, data = {}) { return this.#send(name, data); }
  async trackSearch(query, data = {}) { return this.#send('search', { search_term: query, ...data }); }
  async trackFilter(filter, data = {}) { return this.#send('filter', { filter, ...data }); }
  async trackDownload(file, data = {}) { return this.#send('download', { file, ...data }); }
  async trackShare(method, data = {}) { return this.#send('share', { method, ...data }); }
  async trackPrint(data = {}) { return this.#send('print', data); }

  async #gate() {
    if (!this.enabled) return { allowed: false, reason: 'disabled' };
    if (!this.provider || typeof this.provider.track !== 'function') {
      return { allowed: false, reason: 'provider-unavailable' };
    }
    if (!this.consent || typeof this.consent.allowed !== 'function') {
      return { allowed: true, reason: null };
    }

    try {
      const allowed = Boolean(await this.consent.allowed());
      return allowed
        ? { allowed: true, reason: null }
        : { allowed: false, reason: 'consent-denied' };
    } catch (error) {
      return { allowed: false, reason: 'consent-error', error };
    }
  }

  async #send(name, data = {}) {
    const eventName = String(name ?? '').trim();
    if (!eventName) return { sent: false, reason: 'invalid-event-name' };

    const gate = await this.#gate();
    if (!gate.allowed) {
      return {
        sent: false,
        reason: gate.reason,
        ...(gate.error ? { error: gate.error } : {})
      };
    }

    try {
      const providerResult = await this.provider.track(eventName, data ?? {});
      if (providerResult?.sent === false) {
        return {
          sent: false,
          name: eventName,
          reason: providerResult.reason ?? 'provider-rejected',
          providerResult
        };
      }
      return { sent: true, name: eventName, providerResult: providerResult ?? null };
    } catch (error) {
      return { sent: false, name: eventName, reason: 'provider-error', error };
    }
  }
}

export class MemoryAnalyticsProvider {
  constructor() {
    this.events = [];
  }

  async track(name, data = {}) {
    const event = { name, data, timestamp: Date.now() };
    this.events.push(event);
    return { sent: true, name, event };
  }
}

export class ConsentAdapter {
  constructor({ storage = null, key = 'analytics-consent', defaultValue = false } = {}) {
    this.storage = storage;
    this.key = key;
    this.defaultValue = Boolean(defaultValue);
    this.value = undefined;
  }

  allowed() {
    if (this.storage && typeof this.storage.get === 'function') {
      return this.storage.get(this.key, this.defaultValue);
    }
    return this.value ?? this.defaultValue;
  }

  set(value) {
    const allowed = Boolean(value);
    this.value = allowed;
    if (this.storage && typeof this.storage.set === 'function') {
      this.storage.set(this.key, allowed);
    }
    return allowed;
  }
}
