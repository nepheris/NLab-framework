export const MODES = Object.freeze(['production', 'preview', 'development']);
export const EXPERIENCES = Object.freeze(['visitor', 'webmaster']);

export class Environment {
  constructor({ mode = 'production', experience = 'visitor', baseUrl = null, assetsBase = 'assets/', apiBase = null } = {}) {
    if (!MODES.includes(mode)) throw new Error(`Invalid mode: ${mode}`);
    if (!EXPERIENCES.includes(experience)) throw new Error(`Invalid experience: ${experience}`);
    this.mode = mode;
    this.experience = experience;
    this.baseUrl = baseUrl;
    this.assetsBase = assetsBase;
    this.apiBase = apiBase;
  }

  get isProduction() { return this.mode === 'production'; }
  get isPreview() { return this.mode === 'preview'; }
  get isDevelopment() { return this.mode === 'development'; }
  get isWebmasterExperience() { return this.experience === 'webmaster'; }

  toJSON() {
    return { mode: this.mode, experience: this.experience, baseUrl: this.baseUrl, assetsBase: this.assetsBase, apiBase: this.apiBase };
  }
}
