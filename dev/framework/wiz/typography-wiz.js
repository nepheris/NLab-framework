const SCOPES=new Set(['global','type','instance']);
const ALIGNS=new Set(['start','end','left','right','center','justify']);
const TRANSFORMS=new Set(['none','uppercase','lowercase','capitalize']);
const STYLES=new Set(['normal','italic','oblique']);
const DECORATIONS=new Set(['none','underline','overline','line-through']);
const WEIGHT_WORDS=new Set(['normal','bold','bolder','lighter']);
const LENGTH=/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em|%|vw|vh|ch|ex)$/i;
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clean=v=>String(v??'').trim();
const clone=v=>v===undefined?undefined:structuredClone(v);
const safeToken=(v,label)=>{const s=clean(v);if(!s||/[;{}\u0000-\u001f\u007f]/.test(s)||/\b(?:url|expression|image-set)\s*\(/i.test(s))throw new TypographyWizError(`${label} is invalid`,'INVALID_CSS_TOKEN',{value:v});return s};
const length=(v,{label='Length',fallback='0px',allowNormal=false,allowUnitless=false,positive=false}={})=>{
  if(v==null||v==='')return fallback;
  if(allowNormal&&clean(v)==='normal')return 'normal';
  if(typeof v==='number'&&Number.isFinite(v)){if(positive&&v<=0)throw new TypographyWizError(`${label} must be positive`,'INVALID_LENGTH',{value:v});return allowUnitless?String(v):`${v}px`;}
  const s=safeToken(v,label);
  if(allowUnitless&&/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(s)){const n=Number(s);if(positive&&n<=0)throw new TypographyWizError(`${label} must be positive`,'INVALID_LENGTH',{value:v});return s;}
  if(!LENGTH.test(s))throw new TypographyWizError(`${label} has unsupported unit`,'INVALID_LENGTH',{value:v});
  if(positive&&Number.parseFloat(s)<=0)throw new TypographyWizError(`${label} must be positive`,'INVALID_LENGTH',{value:v});
  return s;
};
function family(value){
  const raw=Array.isArray(value)?value:(typeof value==='string'&&value.includes(',')?value.split(',').map(part=>part.trim().replace(/^"|"$/g,'')):[value??'system-ui']);
  const out=raw.map(item=>safeToken(item,'Font family')).filter(Boolean);
  if(!out.length)return 'system-ui';
  return out.map(item=>/^[a-z0-9_-]+$/i.test(item)?item:`"${item.replace(/"/g,'\\"')}"`).join(', ');
}
function weight(value){
  if(value==null||value==='')return 400;
  const text=clean(value).toLowerCase();if(WEIGHT_WORDS.has(text))return text;
  const number=Number(value);if(Number.isInteger(number)&&number>=1&&number<=1000)return number;
  throw new TypographyWizError('Invalid font weight','INVALID_WEIGHT',{value});
}
export class TypographyWizError extends Error{constructor(message,code='TYPOGRAPHY_WIZ_ERROR',details=null){super(message);this.name='TypographyWizError';this.code=code;this.details=details;}}
export class TypographyWiz{
  normalize(input={}){
    if(!plain(input))throw new TypographyWizError('Typography descriptor must be an object','INVALID_TYPOGRAPHY');
    return {
      scope:SCOPES.has(input.scope)?input.scope:'instance',target:clean(input.target)||null,
      fontFamily:family(input.fontFamily??input.family),
      fontSize:length(input.fontSize??input.size,{label:'Font size',fallback:'16px',positive:true}),
      fontWeight:weight(input.fontWeight??input.weight),
      fontStyle:STYLES.has(input.fontStyle??input.style)?(input.fontStyle??input.style):'normal',
      lineHeight:length(input.lineHeight,{label:'Line height',fallback:'1.5',allowUnitless:true,positive:true}),
      letterSpacing:length(input.letterSpacing,{label:'Letter spacing',fallback:'normal',allowNormal:true}),
      textAlign:ALIGNS.has(input.textAlign??input.align)?(input.textAlign??input.align):'start',
      textTransform:TRANSFORMS.has(input.textTransform??input.transform)?(input.textTransform??input.transform):'none',
      textDecoration:DECORATIONS.has(input.textDecoration??input.decoration)?(input.textDecoration??input.decoration):'none'
    };
  }
  style(input={}){const t=this.normalize(input);return {fontFamily:t.fontFamily,fontSize:t.fontSize,fontWeight:String(t.fontWeight),fontStyle:t.fontStyle,lineHeight:t.lineHeight,letterSpacing:t.letterSpacing,textAlign:t.textAlign,textTransform:t.textTransform,textDecoration:t.textDecoration};}
  variables(input={}, {prefix='--nlab-type'}={}){const t=this.normalize(input),p=clean(prefix)||'--nlab-type';return {[`${p}-scope`]:t.scope,[`${p}-family`]:t.fontFamily,[`${p}-size`]:t.fontSize,[`${p}-weight`]:String(t.fontWeight),[`${p}-style`]:t.fontStyle,[`${p}-line-height`]:t.lineHeight,[`${p}-letter-spacing`]:t.letterSpacing,[`${p}-align`]:t.textAlign,[`${p}-transform`]:t.textTransform,[`${p}-decoration`]:t.textDecoration};}
  merge(base={},override={}){if(!plain(base)||!plain(override))throw new TypographyWizError('merge inputs must be objects','INVALID_TYPOGRAPHY');return this.normalize({...base,...override});}
  snapshot(input={}){return clone(this.normalize(input));}
}
