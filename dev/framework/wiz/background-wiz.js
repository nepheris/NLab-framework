const TYPES=new Set(['transparent','solid','gradient','image']);
const SCOPES=new Set(['global','type','instance']);
const GRADIENTS=new Set(['linear','radial']);
const IMAGE_SIZES=new Set(['cover','contain','auto']);
const IMAGE_REPEATS=new Set(['no-repeat','repeat','repeat-x','repeat-y']);
const IMAGE_POSITIONS=new Set(['center','top','bottom','left','right','top left','top right','bottom left','bottom right']);
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>v===undefined?undefined:structuredClone(v);
const clean=v=>String(v??'').trim();
const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
const cssToken=(v,label='CSS value')=>{const s=clean(v);if(!s||/[;{}\u0000-\u001f\u007f]/.test(s))throw new BackgroundWizError(`${label} is invalid`,'INVALID_CSS_TOKEN',{value:v});return s};
const colorToken=(v,label='Color')=>{const s=cssToken(v,label);if(/\b(?:url|image-set|expression|linear-gradient|radial-gradient|conic-gradient)\s*\(/i.test(s))throw new BackgroundWizError(`${label} must be a color`,'INVALID_COLOR',{value:v});return s};
const safeUrl=value=>{const url=clean(value);if(!url)throw new BackgroundWizError('Image url is required','IMAGE_URL_REQUIRED');const candidate=url.replace(/[\u0000-\u0020\u007f]+/g,'');const scheme=/^([a-z][a-z0-9+.-]*):/i.exec(candidate)?.[1]?.toLowerCase()??null;if(scheme&&[ ['java','script'].join(''),['vb','script'].join('') ].includes(scheme))throw new BackgroundWizError('Unsafe image url','UNSAFE_IMAGE_URL',{scheme});if(scheme==='data'&&!/^data:image\//i.test(candidate))throw new BackgroundWizError('Only image data URLs are allowed','UNSAFE_IMAGE_URL',{scheme});return url;};
const quoteUrl=url=>`url("${String(url).replace(/\\/g,'\\\\').replace(/"/g,'\\"')}")`;

export class BackgroundWizError extends Error{constructor(message,code='BACKGROUND_WIZ_ERROR',details=null){super(message);this.name='BackgroundWizError';this.code=code;this.details=details;}}

function normalizeStop(stop,index,total){
  const source=typeof stop==='string'?{color:stop}:stop;
  if(!plain(source))throw new BackgroundWizError('Gradient stop must be a string or object','INVALID_GRADIENT_STOP',{index});
  const color=colorToken(source.color,'Gradient color');
  const fallback=total<=1?0:(index/(total-1))*100;
  const position=Math.min(100,Math.max(0,finite(source.position,fallback)));
  return {color,position};
}

function normalizeGradient(source={}){
  const kind=GRADIENTS.has(source.kind)?source.kind:'linear';
  const rawStops=Array.isArray(source.stops)?source.stops:Array.isArray(source.colors)?source.colors:[];
  if(rawStops.length<2)throw new BackgroundWizError('Gradient requires at least two stops','GRADIENT_STOPS_REQUIRED');
  const stops=rawStops.map((stop,index)=>normalizeStop(stop,index,rawStops.length)).sort((a,b)=>a.position-b.position);
  const angle=((finite(source.angle,180)%360)+360)%360;
  const shape=clean(source.shape)||'ellipse';
  if(kind==='radial')cssToken(shape,'Radial shape');
  return {kind,angle,shape,stops};
}

export class BackgroundWiz{
  normalize(input={}){
    const source=typeof input==='string'?{type:input}:input;
    if(!plain(source))throw new BackgroundWizError('Background descriptor must be an object','INVALID_BACKGROUND');
    const type=TYPES.has(source.type)?source.type:'transparent';
    const scope=SCOPES.has(source.scope)?source.scope:'instance';
    const out={type,scope,target:clean(source.target)||null};
    if(type==='transparent')return out;
    if(type==='solid')return {...out,color:colorToken(source.color??source.value,'Background color')};
    if(type==='gradient')return {...out,gradient:normalizeGradient(source.gradient??source)};
    const image=plain(source.image)?source.image:source;
    return {...out,image:{url:safeUrl(image.url),size:IMAGE_SIZES.has(image.size)?image.size:'cover',position:IMAGE_POSITIONS.has(image.position)?image.position:'center',repeat:IMAGE_REPEATS.has(image.repeat)?image.repeat:'no-repeat',attachment:clean(image.attachment)==='fixed'?'fixed':'scroll',color:image.color?colorToken(image.color,'Fallback color'):null}};
  }
  css(input={}){
    const bg=this.normalize(input);
    if(bg.type==='transparent')return 'transparent';
    if(bg.type==='solid')return bg.color;
    if(bg.type==='gradient'){
      const stops=bg.gradient.stops.map(stop=>`${stop.color} ${formatNumber(stop.position)}%`).join(', ');
      return bg.gradient.kind==='radial'?`radial-gradient(${bg.gradient.shape}, ${stops})`:`linear-gradient(${formatNumber(bg.gradient.angle)}deg, ${stops})`;
    }
    const i=bg.image;
    return `${i.color?`${i.color} `:''}${quoteUrl(i.url)} ${i.position} / ${i.size} ${i.repeat} ${i.attachment}`;
  }
  style(input={}){
    const bg=this.normalize(input);
    if(bg.type==='transparent')return {background:'transparent'};
    if(bg.type==='solid')return {background:bg.color};
    if(bg.type==='gradient')return {background:this.css(bg)};
    return {background:this.css(bg),backgroundImage:quoteUrl(bg.image.url),backgroundPosition:bg.image.position,backgroundSize:bg.image.size,backgroundRepeat:bg.image.repeat,backgroundAttachment:bg.image.attachment,...(bg.image.color?{backgroundColor:bg.image.color}:{})};
  }
  variables(input={}, {prefix='--nlab-background'}={}){
    const bg=this.normalize(input);const p=clean(prefix)||'--nlab-background';
    return {[`${p}-type`]:bg.type,[`${p}-scope`]:bg.scope,[`${p}-value`]:this.css(bg)};
  }
  snapshot(input={}){return clone(this.normalize(input));}
}
function formatNumber(value){return Number.isInteger(value)?String(value):String(Number(value.toFixed(4)));}
