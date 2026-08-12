const TYPES=['arrows','dots','scrollbar','slider','thumbnails','counter'];
const TYPE_SET=new Set(TYPES);
const clone=v=>v===undefined?undefined:structuredClone(v);
const integer=(value,fallback=0)=>Number.isFinite(Number(value))?Math.trunc(Number(value)):fallback;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export class FilmstripControllerError extends Error {
  constructor(message,code='FILMSTRIP_ERROR',details=null){super(message);this.name='FilmstripControllerError';this.code=code;this.details=details;}
}

function normalizeControllers(value){
  const source=value==null?TYPES:Array.isArray(value)?value:[value];
  const result=[];const seen=new Set();
  for(const entry of source){const type=String(entry??'').trim().toLowerCase();if(!TYPE_SET.has(type))throw new FilmstripControllerError('Unknown filmstrip controller','INVALID_CONTROLLER',{type});if(!seen.has(type)){seen.add(type);result.push(type);}}
  return result;
}

export class FilmstripController {
  constructor({count=0,index=0,loop=false,controllers=TYPES,onChange=null,metadata={}}={}){
    this.listeners=new Set();if(typeof onChange==='function')this.listeners.add(onChange);
    this._count=Math.max(0,integer(count,0));this._loop=Boolean(loop);this._controllers=normalizeControllers(controllers);this._metadata=clone(metadata??{});
    this._index=this._count?clamp(integer(index,0),0,this._count-1):0;
  }
  subscribe(listener){if(typeof listener!=='function')throw new FilmstripControllerError('listener must be a function','INVALID_LISTENER');this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  get count(){return this._count;} get index(){return this._index;} get loop(){return this._loop;}
  setCount(count,{preserve='clamp'}={}){const next=Math.max(0,integer(count,0));const previous=this._index;this._count=next;if(!next)this._index=0;else if(preserve==='start')this._index=0;else this._index=clamp(this._index,0,next-1);this.#emit('count',{previousIndex:previous});return this.snapshot();}
  setControllers(controllers){this._controllers=normalizeControllers(controllers);this.#emit('controllers');return this.snapshot();}
  setLoop(loop){this._loop=Boolean(loop);this.#emit('loop');return this.snapshot();}
  go(index,{reason='go'}={}){if(!this._count)return this.snapshot();const raw=integer(index,this._index);const next=this._loop?((raw%this._count)+this._count)%this._count:clamp(raw,0,this._count-1);const previous=this._index;if(next===previous)return this.snapshot();this._index=next;this.#emit('index',{previousIndex:previous,reason});return this.snapshot();}
  next(options={}){return this.go(this._index+1,{reason:options.reason??'next'});}
  previous(options={}){return this.go(this._index-1,{reason:options.reason??'previous'});}
  first(){return this.go(0,{reason:'first'});} last(){return this.go(Math.max(0,this._count-1),{reason:'last'});}
  progress(){if(this._count<=1)return this._count?1:0;return this._index/(this._count-1);}
  controller(type){const normalized=String(type??'').trim().toLowerCase();if(!TYPE_SET.has(normalized))throw new FilmstripControllerError('Unknown filmstrip controller','INVALID_CONTROLLER',{type});if(!this._controllers.includes(normalized))return null;const common={type:normalized,index:this._index,count:this._count,disabled:this._count===0};
    if(normalized==='arrows')return {...common,previousDisabled:!this._loop&&this._index<=0,nextDisabled:!this._loop&&this._index>=this._count-1};
    if(normalized==='dots')return {...common,items:Array.from({length:this._count},(_,i)=>({index:i,active:i===this._index,label:`${i+1} / ${this._count}`}))};
    if(normalized==='scrollbar'||normalized==='slider')return {...common,min:0,max:Math.max(0,this._count-1),value:this._index,progress:this.progress()};
    if(normalized==='thumbnails')return {...common,items:Array.from({length:this._count},(_,i)=>({index:i,selected:i===this._index}))};
    return {...common,current:this._count?this._index+1:0,text:`${this._count?this._index+1:0} / ${this._count}`};
  }
  descriptors(){return this._controllers.map(type=>this.controller(type));}
  snapshot(){return {count:this._count,index:this._index,loop:this._loop,progress:this.progress(),controllers:[...this._controllers],canPrevious:this._count>0&&(this._loop||this._index>0),canNext:this._count>0&&(this._loop||this._index<this._count-1),metadata:clone(this._metadata)};}
  #emit(type,details={}){const event={type,...details,snapshot:this.snapshot()};for(const listener of [...this.listeners])listener(clone(event));}
}
