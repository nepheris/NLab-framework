const SCOPES=new Set(['global','type','instance']);
const LENGTH=/^(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)$/i;
const BUILTINS={
  compact:{gap:'6px',paddingX:'8px',paddingY:'6px',controlHeight:'30px',rowHeight:'32px',sectionGap:'10px'},
  normal:{gap:'10px',paddingX:'12px',paddingY:'9px',controlHeight:'36px',rowHeight:'40px',sectionGap:'16px'},
  comfortable:{gap:'14px',paddingX:'16px',paddingY:'12px',controlHeight:'42px',rowHeight:'48px',sectionGap:'22px'}
};
const TOKEN_KEYS=Object.keys(BUILTINS.normal);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clean=v=>String(v??'').trim();
const clone=v=>v===undefined?undefined:structuredClone(v);
const length=(value,{positive=false,fallback}={})=>{if(value==null||value==='')return fallback;if(typeof value==='number'&&Number.isFinite(value)){if(value<0||(positive&&value<=0))throw new DensityWizError('Invalid density length','INVALID_LENGTH',{value});return `${value}px`;}const s=clean(value);if(!LENGTH.test(s))throw new DensityWizError('Invalid density length','INVALID_LENGTH',{value});const n=Number.parseFloat(s);if(n<0||(positive&&n<=0))throw new DensityWizError('Invalid density length','INVALID_LENGTH',{value});return s;};
function normalizeTokens(input={},fallback=BUILTINS.normal){const source=plain(input)?input:{};const out={};for(const key of TOKEN_KEYS)out[key]=length(source[key],{positive:key==='controlHeight'||key==='rowHeight',fallback:fallback[key]});return out;}
function normalizeName(value){const name=clean(value).toLowerCase().replace(/\s+/g,'-');if(!/^[a-z0-9][a-z0-9_-]*$/.test(name))throw new DensityWizError('Invalid preset name','INVALID_PRESET_NAME',{value});return name;}
export class DensityWizError extends Error{constructor(message,code='DENSITY_WIZ_ERROR',details=null){super(message);this.name='DensityWizError';this.code=code;this.details=details;}}
export class DensityWiz{
  constructor({presets=null}={}){this.presets=new Map(Object.entries(BUILTINS).map(([name,tokens])=>[name,clone(tokens)]));if(plain(presets))for(const[name,value]of Object.entries(presets))this.registerPreset(name,value,{replace:true});}
  static builtins(){return clone(BUILTINS)}
  presetNames(){return [...this.presets.keys()].sort()}
  getPreset(name){const value=this.presets.get(normalizeName(name));return value?clone(value):null;}
  registerPreset(name,descriptor,{replace=false}={}){const key=normalizeName(name);if(this.presets.has(key)&&!replace)throw new DensityWizError('Preset already exists','DUPLICATE_PRESET',{name:key});const fallback=this.presets.get(key)??BUILTINS.normal;this.presets.set(key,normalizeTokens(descriptor,fallback));return this;}
  removePreset(name){const key=normalizeName(name);if(Object.hasOwn(BUILTINS,key))throw new DensityWizError('Built-in preset cannot be removed','BUILTIN_PRESET',{name:key});this.presets.delete(key);return this;}
  resetPreset(name){const key=normalizeName(name);if(Object.hasOwn(BUILTINS,key))this.presets.set(key,clone(BUILTINS[key]));else this.presets.delete(key);return this;}
  normalize(input='normal'){
    const source=typeof input==='string'?{preset:input}:input;if(!plain(source))throw new DensityWizError('Density descriptor must be a string or object','INVALID_DENSITY');
    const preset=normalizeName(source.preset??'normal');const base=this.presets.get(preset);if(!base)throw new DensityWizError('Unknown density preset','UNKNOWN_PRESET',{preset});
    const overrides=plain(source.tokens)?source.tokens:Object.fromEntries(TOKEN_KEYS.filter(key=>Object.hasOwn(source,key)).map(key=>[key,source[key]]));
    return {preset,scope:SCOPES.has(source.scope)?source.scope:'instance',target:clean(source.target)||null,tokens:normalizeTokens(overrides,base)};
  }
  variables(input='normal',{prefix='--nlab-density'}={}){const d=this.normalize(input),p=clean(prefix)||'--nlab-density';const out={[`${p}-preset`]:d.preset,[`${p}-scope`]:d.scope};for(const[key,value]of Object.entries(d.tokens))out[`${p}-${key.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}`]=value;return out;}
  snapshot(input='normal'){return clone(this.normalize(input));}
}
