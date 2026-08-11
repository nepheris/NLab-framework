export class AnalyticsWiz {
  constructor({ provider = null, consent = null, enabled = true } = {}) { this.provider=provider; this.consent=consent; this.enabled=enabled; }
  async canTrack() { if(!this.enabled||!this.provider)return false; return this.consent?.allowed ? Boolean(await this.consent.allowed()) : true; }
  async trackPageView(data = {}) { return this.#send('page_view',data); }
  async trackEvent(name, data = {}) { return this.#send(name,data); }
  async trackSearch(query, data = {}) { return this.#send('search',{ search_term:query,...data }); }
  async trackFilter(filter, data = {}) { return this.#send('filter',{ filter,...data }); }
  async trackDownload(file, data = {}) { return this.#send('download',{ file,...data }); }
  async trackShare(method, data = {}) { return this.#send('share',{ method,...data }); }
  async trackPrint(data = {}) { return this.#send('print',data); }
  async #send(name,data){ if(!(await this.canTrack()))return { sent:false, reason:'disabled-or-no-consent' }; await this.provider.track(name,data); return { sent:true, name }; }
}

export class MemoryAnalyticsProvider {
  constructor(){ this.events=[]; }
  async track(name,data={}){ this.events.push({ name, data, timestamp:Date.now() }); }
}

export class ConsentAdapter {
  constructor({ storage = null, key = 'analytics-consent', defaultValue = false } = {}) { this.storage=storage; this.key=key; this.defaultValue=defaultValue; }
  allowed(){ return this.storage?.get(this.key,this.defaultValue) ?? this.defaultValue; }
  set(value){ this.storage?.set(this.key,Boolean(value)); return Boolean(value); }
}
