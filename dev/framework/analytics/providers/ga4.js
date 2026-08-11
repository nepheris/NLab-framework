export class GA4Provider {
  constructor({ measurementId, gtag = globalThis.gtag, debug = false } = {}) {
    if(!measurementId) throw new Error('GA4 measurementId is required');
    this.measurementId=measurementId; this.gtag=gtag; this.debug=debug;
  }
  async track(name,data={}) {
    if(typeof this.gtag!=='function') return { sent:false, reason:'gtag-unavailable', name, data };
    this.gtag('event',name,{ send_to:this.measurementId, debug_mode:this.debug, ...data });
    return { sent:true, name };
  }
}
