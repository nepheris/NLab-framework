const PRESETS=Object.freeze({
  phone:Object.freeze({width:390,height:844,dpr:3,label:'Téléphone'}),
  tablet:Object.freeze({width:820,height:1180,dpr:2,label:'Tablette'}),
  desktop:Object.freeze({width:1440,height:900,dpr:1,label:'Desktop'}),
  large:Object.freeze({width:1920,height:1080,dpr:1,label:'Large'})
});
const ORIENTATIONS=new Set(['portrait','landscape']);
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const finite=(v,fallback)=>Number.isFinite(Number(v))?Number(v):fallback;
const dimension=(v,name)=>{const n=Math.round(finite(v,0));if(n<1||n>10000)throw new ResponsivePreviewError(`${name} must be between 1 and 10000`,'INVALID_DIMENSION',{name,value:v});return n;};
const clone=v=>structuredClone(v);

export class ResponsivePreviewError extends Error{constructor(message,code='RESPONSIVE_PREVIEW_ERROR',details=null){super(message);this.name='ResponsivePreviewError';this.code=code;this.details=details;}}

export class ResponsivePreview {
  constructor({preset='desktop',orientation='landscape',custom=null,scale=1,onChange=null}={}){this.listeners=new Set();if(typeof onChange==='function')this.listeners.add(onChange);this._preset='desktop';this._orientation='landscape';this._custom=null;this._scale=1;this.setPreset(preset,{emit:false});this.setOrientation(orientation,{emit:false});if(custom)this.setCustom(custom,{emit:false});this.setScale(scale,{emit:false});}
  static presets(){return Object.entries(PRESETS).map(([id,value])=>({id,...clone(value)}));}
  subscribe(listener){if(typeof listener!=='function')throw new ResponsivePreviewError('listener must be a function','INVALID_LISTENER');this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  setPreset(preset,{emit=true}={}){const id=String(preset??'').trim().toLowerCase();if(id!=='custom'&&!PRESETS[id])throw new ResponsivePreviewError('Unknown viewport preset','INVALID_PRESET',{preset});if(id==='custom'&&!this._custom)this._custom={width:1280,height:720,dpr:1,label:'Personnalisé'};this._preset=id;if(emit)this.#emit('preset');return this.snapshot();}
  setOrientation(orientation,{emit=true}={}){const value=String(orientation??'').trim().toLowerCase();if(!ORIENTATIONS.has(value))throw new ResponsivePreviewError('Invalid orientation','INVALID_ORIENTATION',{orientation});this._orientation=value;if(emit)this.#emit('orientation');return this.snapshot();}
  toggleOrientation(){return this.setOrientation(this._orientation==='portrait'?'landscape':'portrait');}
  setCustom({width,height,dpr=1,label='Personnalisé'}={}, {activate=true,emit=true}={}){this._custom={width:dimension(width,'width'),height:dimension(height,'height'),dpr:clamp(finite(dpr,1),0.5,4),label:String(label??'Personnalisé').trim()||'Personnalisé'};if(activate)this._preset='custom';if(emit)this.#emit('custom');return this.snapshot();}
  setScale(scale,{emit=true}={}){this._scale=clamp(finite(scale,1),0.1,2);if(emit)this.#emit('scale');return this.snapshot();}
  viewport(){const source=this._preset==='custom'?this._custom:PRESETS[this._preset];if(!source)throw new ResponsivePreviewError('Custom viewport is not configured','CUSTOM_REQUIRED');let {width,height}=source;if(this._orientation==='portrait'&&width>height)[width,height]=[height,width];if(this._orientation==='landscape'&&height>width)[width,height]=[height,width];return {preset:this._preset,label:source.label,width,height,dpr:source.dpr,orientation:this._orientation,aspectRatio:width/height};}
  fit(container,{padding=0,maxScale=1}={}){const viewport=this.viewport();const pad=Math.max(0,finite(padding,0));const availableWidth=Math.max(1,finite(container?.width,0)-2*pad);const availableHeight=Math.max(1,finite(container?.height,0)-2*pad);const scale=clamp(Math.min(availableWidth/viewport.width,availableHeight/viewport.height,finite(maxScale,1)),0.01,2);return {...viewport,container:{width:availableWidth,height:availableHeight},scale,renderWidth:Math.round(viewport.width*scale),renderHeight:Math.round(viewport.height*scale)};}
  descriptor(){const viewport=this.viewport();return {...viewport,scale:this._scale,renderWidth:Math.round(viewport.width*this._scale),renderHeight:Math.round(viewport.height*this._scale),cssVariables:{'--nlab-preview-width':`${viewport.width}px`,'--nlab-preview-height':`${viewport.height}px`,'--nlab-preview-scale':String(this._scale)}};}
  snapshot(){return {preset:this._preset,orientation:this._orientation,scale:this._scale,custom:this._custom?clone(this._custom):null,viewport:this.viewport()};}
  #emit(type){const event={type,snapshot:this.snapshot()};for(const listener of [...this.listeners])listener(clone(event));}
}
