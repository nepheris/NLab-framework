export const MODES = Object.freeze(['production', 'preview', 'development']);
export const EXPERIENCES = Object.freeze(['visitor', 'webmaster']);

export class EnvironmentError extends Error {
  constructor(message, code = 'ENVIRONMENT_ERROR', details = null) {
    super(message);
    this.name = 'EnvironmentError';
    this.code = code;
    this.details = details;
  }
}

const choice = (value, allowed, label) => {
  if (typeof value !== 'string') {
    throw new EnvironmentError(`${label} must be a string`, `INVALID_${label.toUpperCase()}`, { value, allowed:[...allowed] });
  }
  const normalized = value.trim().toLowerCase();
  if (!allowed.includes(normalized)) {
    throw new EnvironmentError(`Invalid ${label}: ${String(value)}`, `INVALID_${label.toUpperCase()}`, { value, allowed:[...allowed] });
  }
  return normalized;
};

const baseValue = (value, { label, defaultValue = null, emptyAsNull = false } = {}) => {
  if (value == null) return defaultValue;
  if (value instanceof URL) return value.toString();
  if (typeof value !== 'string') {
    throw new EnvironmentError(`${label} must be a string, URL or null`, `INVALID_${label.toUpperCase()}`, { value });
  }
  const normalized = value.trim();
  if (!normalized && emptyAsNull) return null;
  return normalized;
};

export class Environment {
  constructor({ mode = 'production', experience = 'visitor', baseUrl = null, assetsBase = 'assets/', apiBase = null } = {}) {
    this.mode = choice(mode, MODES, 'mode');
    this.experience = choice(experience, EXPERIENCES, 'experience');
    this.baseUrl = baseValue(baseUrl, { label:'baseUrl', defaultValue:null, emptyAsNull:true });
    this.assetsBase = baseValue(assetsBase, { label:'assetsBase', defaultValue:'assets/' });
    this.apiBase = baseValue(apiBase, { label:'apiBase', defaultValue:null, emptyAsNull:true });
  }

  get isProduction() { return this.mode === 'production'; }
  get isPreview() { return this.mode === 'preview'; }
  get isDevelopment() { return this.mode === 'development'; }
  get isVisitorExperience() { return this.experience === 'visitor'; }
  get isWebmasterExperience() { return this.experience === 'webmaster'; }

  toJSON() {
    return {
      mode: this.mode,
      experience: this.experience,
      baseUrl: this.baseUrl,
      assetsBase: this.assetsBase,
      apiBase: this.apiBase
    };
  }
}
