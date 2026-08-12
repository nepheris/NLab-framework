import { SearchWiz } from './search-wiz.js';
import { FilterWiz } from './filter-wiz.js';
import { PaginationModel } from '../components/pagination.js';

const DEFAULT_MIN_COLUMN_WIDTH=56;
const DEFAULT_MAX_COLUMN_WIDTH=1600;
const DEFAULT_COLUMN_WIDTH=120;
const DEFAULT_RESIZE_STEP=12;
const asArray=(value)=>Array.isArray(value)?value:[];
const cloneColumn=(column)=>({...column});
const finiteNumber=(value)=>{const n=Number(value);return Number.isFinite(n)?n:null;};
const positiveNumber=(value,fallback)=>{const n=finiteNumber(value);return n!=null&&n>0?n:fallback;};
const pixelWidth=(value)=>{
  if(typeof value==='number'&&Number.isFinite(value))return value;
  if(typeof value!=='string')return null;
  const match=value.trim().match(/^(-?\d+(?:\.\d+)?)px$/i);
  return match?Number(match[1]):null;
};
const cssWidth=(value)=>typeof value==='number'?`${value}px`:String(value);
const columnId=(column)=>column?.id??column?.field??null;
const normalizeDirection=(direction)=>String(direction??'asc').toLowerCase()==='desc'?'desc':'asc';
const normalizeViewMode=(mode)=>['table','stacked','auto'].includes(String(mode??'table').toLowerCase())?String(mode??'table').toLowerCase():'table';
const searchableFields=(columns)=>columns.filter((column)=>column.searchable!==false).map((column)=>column.field??column.id).filter(Boolean);
const invalidRegex=(value,flags='i')=>{try{if(value instanceof RegExp)return null;new RegExp(String(value??''),flags);return null;}catch(error){return error;}};

export class TableWiz{
  constructor({columns=[],profile=null,pageSize=24,resizable=true,minColumnWidth=DEFAULT_MIN_COLUMN_WIDTH,maxColumnWidth=DEFAULT_MAX_COLUMN_WIDTH,resizeStep=DEFAULT_RESIZE_STEP,viewMode='table',standalone=false,mobileBreakpoint=720}={}){
    this.columns=asArray(columns).map((column,index)=>({visible:true,sortable:true,searchable:true,resizable:true,order:index,...(column&&typeof column==='object'?column:{})}));
    this.initialColumns=this.columns.map(cloneColumn);
    this.profile=profile;
    this.searchWiz=new SearchWiz();
    this.filterWiz=new FilterWiz();
    this.pagination=new PaginationModel({pageSize});
    this.sortState=null;
    this.query='';
    this.queryOptions={};
    this.filters=[];
    this.lastError=null;
    this.resizable=Boolean(resizable);
    this.minColumnWidth=positiveNumber(minColumnWidth,DEFAULT_MIN_COLUMN_WIDTH);
    this.maxColumnWidth=Math.max(this.minColumnWidth,positiveNumber(maxColumnWidth,DEFAULT_MAX_COLUMN_WIDTH));
    this.resizeStep=positiveNumber(resizeStep,DEFAULT_RESIZE_STEP);
    this.viewMode=normalizeViewMode(viewMode);
    this.standalone=Boolean(standalone);
    this.mobileBreakpoint=positiveNumber(mobileBreakpoint,720);
    this._renderCleanup=[];
  }

  setQuery(query,options={}){
    this.query=query??'';
    this.queryOptions=options&&typeof options==='object'&&!Array.isArray(options)?{...options}:{};
    this.pagination.setPage(1);
    return this;
  }
  setFilters(filters){
    this.filters=Array.isArray(filters)?[...filters]:(filters&&typeof filters==='object'?[filters]:[]);
    this.pagination.setPage(1);
    return this;
  }
  setRegexFilter(field,value,flags='i'){
    const normalizedField=typeof field==='string'?field.trim():'';
    if(!normalizedField){
      this.lastError={code:'INVALID_REGEX_FIELD',stage:'filter',message:'Regex filter requires a field.'};
      return this;
    }
    const next=this.filters.filter((filter)=>!(filter?.field===normalizedField&&String(filter?.operator??'').toLowerCase()==='regex'));
    next.push({field:normalizedField,operator:'regex',value,flags});
    return this.setFilters(next);
  }
  setSort(field,direction='asc'){
    this.sortState=field?{field,direction:normalizeDirection(direction)}:null;
    this.pagination.setPage(1);
    return this;
  }
  toggleSort(field){
    if(!field)return this.setSort(null);
    return this.setSort(field,this.sortState?.field===field&&this.sortState.direction==='asc'?'desc':'asc');
  }
  clearSort(){return this.setSort(null);}
  reset({query=true,filters=true,sort=true,page=true,columns=false}={}){
    if(query){this.query='';this.queryOptions={};}
    if(filters)this.filters=[];
    if(sort)this.sortState=null;
    if(columns)this.resetColumns();
    if(page)this.pagination.setPage(1);
    this.lastError=null;
    return this;
  }
  resetColumns(){this.columns=this.initialColumns.map(cloneColumn);return this;}

  setColumnVisible(id,visible){const column=this.#column(id);if(column)column.visible=Boolean(visible);return this;}
  setColumnsVisible(ids,visible=true){
    const targets=new Set(asArray(ids));
    this.columns.forEach((column)=>{if(targets.has(columnId(column)))column.visible=Boolean(visible);});
    return this;
  }
  toggleColumn(id){const column=this.#column(id);if(column)column.visible=column.visible===false;return this;}
  showAllColumns(){this.columns.forEach((column)=>{column.visible=true;});return this;}
  visibleColumnIds(){return this.visibleColumns().map(columnId).filter((id)=>id!=null);}
  columnState(){
    return this.#orderedColumns().map((column)=>({
      id:columnId(column),
      field:column.field??column.id??null,
      label:column.label??column.id??column.field??'',
      visible:column.visible!==false,
      order:column.order??0,
      width:column.width??null,
      sticky:Boolean(column.sticky),
      resizable:this.resizable&&column.resizable!==false
    }));
  }
  toolbarState(){
    const columns=this.columnState();
    return{
      query:this.query,
      filters:this.filters.map((filter)=>filter&&typeof filter==='object'?{...filter}:filter),
      sort:this.sortState?{...this.sortState}:null,
      columns,
      counts:{columns:columns.length,visibleColumns:columns.filter((column)=>column.visible).length},
      view:{mode:this.viewMode,standalone:this.standalone,mobileBreakpoint:this.mobileBreakpoint},
      canReset:Boolean(this.query||this.filters.length||this.sortState||this.#columnStateDirty())
    };
  }

  setViewMode(mode){this.viewMode=normalizeViewMode(mode);return this;}
  setStandalone(enabled=true){this.standalone=Boolean(enabled);return this;}
  setMobileBreakpoint(value){this.mobileBreakpoint=positiveNumber(value,this.mobileBreakpoint);return this;}

  columnWidth(id,fallback=null){
    const column=this.#column(id);
    if(!column)return fallback;
    const numeric=pixelWidth(column.width);
    return numeric==null?fallback:this.#clampWidth(column,numeric);
  }
  setColumnWidth(id,width){
    const column=this.#column(id);
    if(!column)return this;
    if(width==null||width===''){delete column.width;return this;}
    const numeric=pixelWidth(width);
    if(numeric!=null){column.width=this.#clampWidth(column,numeric);return this;}
    if(typeof width==='string'&&width.trim())column.width=width.trim();
    return this;
  }
  resizeColumn(id,width){
    const column=this.#column(id);
    if(!column||!this.resizable||column.resizable===false)return this;
    const numeric=pixelWidth(width);
    if(numeric==null)return this;
    column.width=this.#clampWidth(column,numeric);
    return this;
  }
  adjustColumnWidth(id,delta,{fallback=DEFAULT_COLUMN_WIDTH}={}){
    const current=this.columnWidth(id,positiveNumber(fallback,DEFAULT_COLUMN_WIDTH));
    const change=finiteNumber(delta);
    if(current==null||change==null)return this;
    return this.resizeColumn(id,current+change);
  }
  resetColumnWidth(id){const column=this.#column(id);if(column)delete column.width;return this;}
  setSticky(id,sticky=true){const column=this.#column(id);if(column)column.sticky=sticky;return this;}

  reorder(ids){
    const requested=[];const seen=new Set();
    for(const id of asArray(ids)){if(seen.has(id)||!this.#column(id))continue;seen.add(id);requested.push(id);}
    const ordered=this.#orderedColumns();
    const byId=new Map(ordered.map((column)=>[columnId(column),column]));
    const next=[...requested.map((id)=>byId.get(id)).filter(Boolean),...ordered.filter((column)=>!seen.has(columnId(column)))];
    next.forEach((column,index)=>{column.order=index;});
    return this;
  }
  moveColumn(id,targetIndex){
    const ordered=this.#orderedColumns();
    const currentIndex=ordered.findIndex((column)=>columnId(column)===id);
    const numeric=finiteNumber(targetIndex);
    if(currentIndex<0||numeric==null)return this;
    const [column]=ordered.splice(currentIndex,1);
    ordered.splice(Math.min(ordered.length,Math.max(0,Math.trunc(numeric))),0,column);
    ordered.forEach((entry,index)=>{entry.order=index;});
    return this;
  }
  resetColumnOrder(){
    const baseline=new Map(this.initialColumns.map((column,index)=>[columnId(column),column.order??index]));
    this.columns.forEach((column,index)=>{column.order=baseline.get(columnId(column))??index;});
    return this;
  }
  applyColumnState(state){
    const ordered=[];
    for(const entry of asArray(state).filter((item)=>item&&typeof item==='object')){
      const id=entry.id??entry.field;
      const column=this.#column(id);
      if(!column)continue;
      if('visible' in entry)column.visible=Boolean(entry.visible);
      if('width' in entry)this.setColumnWidth(id,entry.width);
      if('sticky' in entry)column.sticky=Boolean(entry.sticky);
      if(Number.isFinite(Number(entry.order)))ordered.push({id,order:Number(entry.order)});
    }
    if(ordered.length){
      ordered.sort((left,right)=>left.order-right.order);
      this.reorder(ordered.map((entry)=>entry.id));
    }
    return this;
  }
  visibleColumns(){return this.#orderedColumns().filter((column)=>column.visible!==false);}

  process(items){
    let rows=[...asArray(items)];
    this.lastError=null;
    if(this.query){
      try{
        rows=this.searchWiz.search(rows,this.query,{...this.queryOptions,fields:this.queryOptions.fields??searchableFields(this.columns)}).items;
      }catch(error){
        this.lastError={code:'INVALID_SEARCH',stage:'search',message:error?.message??String(error)};
        rows=[];
      }
    }
    if(this.filters.length){
      const invalid=this.filters.find((filter)=>String(filter?.operator??'').toLowerCase()==='regex'&&invalidRegex(filter?.value,filter?.flags??'i'));
      if(invalid){
        const error=invalidRegex(invalid.value,invalid.flags??'i');
        this.lastError={code:'INVALID_REGEX',stage:'filter',field:invalid.field,message:error?.message??'Invalid regular expression.'};
      }
      try{rows=this.filterWiz.apply(rows,this.filters).items;}
      catch(error){this.lastError={code:'FILTER_ERROR',stage:'filter',message:error?.message??String(error)};rows=[];}
    }
    if(this.sortState){
      const {field,direction}=this.sortState;
      const sign=direction==='desc'?-1:1;
      rows.sort((a,b)=>{
        const av=a?.[field],bv=b?.[field];
        if(av===bv)return 0;
        if(av==null)return 1;
        if(bv==null)return -1;
        return(typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'}))*sign;
      });
    }
    this.pagination.setTotal(rows.length);
    return{all:rows,page:this.pagination.slice(rows),total:rows.length,pageModel:this.pagination,error:this.lastError};
  }

  exportCSV(items,{delimiter=';'}={}){
    const columns=this.visibleColumns();
    const quote=(value)=>{const text=Array.isArray(value)?value.join(', '):String(value??'');return `"${text.replaceAll('"','""')}"`;};
    return[columns.map((column)=>quote(column.label??column.id)).join(delimiter),...asArray(items).map((row)=>columns.map((column)=>quote(row?.[column.field??column.id])).join(delimiter))].join('\n');
  }
  exportJSON(items,space=2){return JSON.stringify(items??[],null,space);}
  destroy(){this.#clearRenderCleanup();return this;}

  render(container,items,{rowClass=null,onColumnResize=null,viewMode=this.viewMode,standalone=this.standalone,mobileBreakpoint=this.mobileBreakpoint}={}){
    this.#clearRenderCleanup();
    const documentRef=container?.ownerDocument??globalThis.document;
    if(!container||!documentRef||typeof documentRef.createElement!=='function')return;
    const {page}=this.process(items);
    const columns=this.visibleColumns();
    const effectiveMode=this.#effectiveViewMode(container,viewMode,mobileBreakpoint);
    if(effectiveMode==='stacked'){
      const stacked=this.#renderStacked(documentRef,page,columns,rowClass);
      this.#mount(container,stacked,standalone,documentRef,effectiveMode);
      return;
    }
    const stickyOffsets=this.#stickyOffsets(columns);
    const table=documentRef.createElement('table');
    table.className='nlab-tablewiz';
    if(this.resizable)table.classList?.add?.('nlab-tablewiz--resizable');

    const colgroup=documentRef.createElement('colgroup');
    const colNodes=new Map();
    for(const column of columns){
      const col=documentRef.createElement('col');
      const id=columnId(column);
      if(id!=null)col.setAttribute?.('data-column-id',String(id));
      this.#applyWidthStyles(col,column,false);
      if(id!=null)colNodes.set(id,col);
      colgroup.append?.(col);
    }
    table.append?.(colgroup);

    const rerender=()=>this.render(container,items,{rowClass,onColumnResize,viewMode,standalone,mobileBreakpoint});
    const notifyResize=(column)=>{
      if(typeof onColumnResize!=='function')return;
      const id=columnId(column);
      onColumnResize({id,width:this.columnWidth(id),column:cloneColumn(column)});
    };

    const thead=documentRef.createElement('thead');
    const headRow=documentRef.createElement('tr');
    for(const column of columns){
      const id=columnId(column);
      const field=column.field??column.id;
      const th=documentRef.createElement('th');
      th.textContent=column.label??column.id??field??'';
      if(id!=null)th.setAttribute?.('data-column-id',String(id));
      this.#applyWidthStyles(th,column,true);
      if(column.sticky){th.style.position='sticky';th.style.left=`${stickyOffsets.get(id)??0}px`;th.style.zIndex='2';}

      if(column.sortable!==false){
        th.tabIndex=0;
        th.setAttribute?.('aria-sort',this.sortState?.field===field?(this.sortState.direction==='desc'?'descending':'ascending'):'none');
        const sort=()=>{this.toggleSort(field);rerender();};
        th.addEventListener?.('click',sort);
        th.addEventListener?.('keydown',(event)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault?.();sort();}});
      }

      if(this.resizable&&column.resizable!==false&&id!=null){
        if(!th.style.position)th.style.position='relative';
        const handle=documentRef.createElement('span');
        handle.className='nlab-tablewiz__resize-handle';
        handle.tabIndex=0;
        handle.setAttribute?.('role','separator');
        handle.setAttribute?.('aria-orientation','vertical');
        handle.setAttribute?.('aria-label',`Redimensionner ${column.label??column.id??field??'colonne'}`);
        handle.setAttribute?.('data-column-resizer',String(id));
        Object.assign(handle.style,{position:'absolute',top:'0',right:'0',width:'8px',height:'100%',cursor:'col-resize',touchAction:'none',userSelect:'none'});
        const stop=(event)=>{event.preventDefault?.();event.stopPropagation?.();};
        handle.addEventListener?.('click',(event)=>event.stopPropagation?.());
        handle.addEventListener?.('keydown',(event)=>{
          if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
          stop(event);
          this.adjustColumnWidth(id,event.key==='ArrowLeft'?-this.resizeStep:this.resizeStep,{fallback:this.#measuredWidth(th,column)});
          notifyResize(column);
          rerender();
        });
        handle.addEventListener?.('pointerdown',(event)=>{
          if(event.button!=null&&event.button!==0)return;
          stop(event);
          const startX=finiteNumber(event.clientX)??0;
          const startWidth=this.columnWidth(id,this.#measuredWidth(th,column));
          if(startWidth==null)return;
          const move=(moveEvent)=>{
            const x=finiteNumber(moveEvent.clientX);
            if(x==null)return;
            this.resizeColumn(id,startWidth+(x-startX));
            const width=this.columnWidth(id);
            const col=colNodes.get(id);
            if(col&&width!=null)col.style.width=cssWidth(width);
            if(width!=null){th.style.width=cssWidth(width);th.style.minWidth=cssWidth(width);th.style.maxWidth=cssWidth(width);}
          };
          const cleanup=()=>{
            documentRef.removeEventListener?.('pointermove',move);
            documentRef.removeEventListener?.('pointerup',end);
            documentRef.removeEventListener?.('pointercancel',end);
            this._renderCleanup=this._renderCleanup.filter((fn)=>fn!==cleanup);
          };
          const end=(endEvent)=>{endEvent?.preventDefault?.();cleanup();notifyResize(column);rerender();};
          documentRef.addEventListener?.('pointermove',move);
          documentRef.addEventListener?.('pointerup',end);
          documentRef.addEventListener?.('pointercancel',end);
          this._renderCleanup.push(cleanup);
          handle.setPointerCapture?.(event.pointerId);
        });
        th.append?.(handle);
      }
      headRow.append?.(th);
    }
    thead.append?.(headRow);
    table.append?.(thead);

    const tbody=documentRef.createElement('tbody');
    page.forEach((row,rowIndex)=>{
      const tr=documentRef.createElement('tr');
      if(rowClass)tr.className=rowClass(row,rowIndex)||'';
      for(const column of columns){
        const id=columnId(column);
        const td=documentRef.createElement('td');
        if(id!=null)td.setAttribute?.('data-column-id',String(id));
        const value=row?.[column.field??column.id];
        if(column.type==='image'&&value){
          const img=documentRef.createElement('img');
          img.src=value;
          img.alt=column.altField?row?.[column.altField]??'':'';
          img.loading='lazy';
          img.style.maxWidth='72px';
          td.append?.(img);
        }else td.textContent=Array.isArray(value)?value.join(', '):String(value??'');
        this.#applyWidthStyles(td,column,true);
        if(column.sticky){td.style.position='sticky';td.style.left=`${stickyOffsets.get(id)??0}px`;}
        tr.append?.(td);
      }
      tbody.append?.(tr);
    });
    table.append?.(tbody);
    this.#mount(container,table,standalone,documentRef,effectiveMode);
  }

  #renderStacked(documentRef,page,columns,rowClass){
    const root=documentRef.createElement('div');
    root.className='nlab-tablewiz nlab-tablewiz--stacked';
    Object.assign(root.style,{display:'grid',gap:'12px',width:'100%',boxSizing:'border-box'});
    page.forEach((row,rowIndex)=>{
      const article=documentRef.createElement('article');
      article.className='nlab-tablewiz__stacked-row';
      if(rowClass){
        const custom=rowClass(row,rowIndex)||'';
        if(custom)article.className+=` ${custom}`;
      }
      Object.assign(article.style,{display:'grid',gap:'8px',width:'100%',boxSizing:'border-box'});
      for(const column of columns){
        const field=documentRef.createElement('div');
        field.className='nlab-tablewiz__stacked-field';
        field.setAttribute?.('data-column-id',String(columnId(column)??''));
        Object.assign(field.style,{display:'grid',gridTemplateColumns:'minmax(96px, 0.35fr) minmax(0, 1fr)',gap:'8px',alignItems:'start'});
        const label=documentRef.createElement('strong');
        label.className='nlab-tablewiz__stacked-label';
        label.textContent=column.label??column.id??column.field??'';
        const valueNode=documentRef.createElement('span');
        valueNode.className='nlab-tablewiz__stacked-value';
        const value=row?.[column.field??column.id];
        if(column.type==='image'&&value){
          const img=documentRef.createElement('img');
          img.src=value;
          img.alt=column.altField?row?.[column.altField]??'':'';
          img.loading='lazy';
          img.style.maxWidth='100%';
          valueNode.append?.(img);
        }else valueNode.textContent=Array.isArray(value)?value.join(', '):String(value??'');
        field.append?.(label,valueNode);
        article.append?.(field);
      }
      root.append?.(article);
    });
    return root;
  }

  #mount(container,node,standalone,documentRef,mode){
    if(!standalone){
      container.replaceChildren?.(node);
      return;
    }
    const shell=documentRef.createElement('section');
    shell.className=`nlab-tablewiz-standalone nlab-tablewiz-standalone--${mode}`;
    shell.setAttribute?.('role','region');
    shell.setAttribute?.('aria-label','Tableau de données');
    shell.tabIndex=0;
    Object.assign(shell.style,{width:'100%',maxWidth:'100%',overflow:'auto',boxSizing:'border-box',minHeight:'0'});
    shell.append?.(node);
    container.replaceChildren?.(shell);
  }

  #effectiveViewMode(container,mode,mobileBreakpoint){
    const normalized=normalizeViewMode(mode);
    if(normalized!=='auto')return normalized;
    const width=finiteNumber(container?.clientWidth);
    const breakpoint=positiveNumber(mobileBreakpoint,this.mobileBreakpoint);
    return width!=null&&width>0&&width<=breakpoint?'stacked':'table';
  }

  #column(id){return this.columns.find((column)=>columnId(column)===id);}
  #orderedColumns(){return[...this.columns].sort((left,right)=>(left.order??0)-(right.order??0));}
  #columnStateDirty(){
    const initial=new Map(this.initialColumns.map((column,index)=>[columnId(column),{visible:column.visible!==false,order:column.order??index,width:column.width??null,sticky:Boolean(column.sticky)}]));
    return this.columns.some((column,index)=>{
      const current={visible:column.visible!==false,order:column.order??index,width:column.width??null,sticky:Boolean(column.sticky)};
      const baseline=initial.get(columnId(column));
      return!baseline||current.visible!==baseline.visible||current.order!==baseline.order||current.width!==baseline.width||current.sticky!==baseline.sticky;
    });
  }
  #bounds(column){
    const min=Math.max(1,positiveNumber(column?.minWidth,this.minColumnWidth));
    return{min,max:Math.max(min,positiveNumber(column?.maxWidth,this.maxColumnWidth))};
  }
  #clampWidth(column,width){
    const numeric=finiteNumber(width);
    if(numeric==null)return null;
    const {min,max}=this.#bounds(column);
    return Math.min(max,Math.max(min,numeric));
  }
  #applyWidthStyles(node,column,exact=false){
    if(!node?.style)return;
    const numeric=pixelWidth(column.width);
    if(numeric!=null){
      const width=this.#clampWidth(column,numeric);
      node.style.width=cssWidth(width);
      if(exact){node.style.minWidth=cssWidth(width);node.style.maxWidth=cssWidth(width);}
      return;
    }
    if(typeof column.width==='string'&&column.width.trim())node.style.width=column.width.trim();
    if(exact){
      const {min,max}=this.#bounds(column);
      node.style.minWidth=cssWidth(min);
      node.style.maxWidth=cssWidth(max);
    }
  }
  #measuredWidth(node,column){
    const measured=finiteNumber(node?.getBoundingClientRect?.().width);
    return this.#clampWidth(column,measured!=null&&measured>0?measured:DEFAULT_COLUMN_WIDTH);
  }
  #stickyOffsets(columns){
    const offsets=new Map();let left=0;
    for(const column of columns){
      if(!column.sticky)continue;
      const id=columnId(column);
      offsets.set(id,left);
      left+=this.columnWidth(id,DEFAULT_COLUMN_WIDTH)??DEFAULT_COLUMN_WIDTH;
    }
    return offsets;
  }
  #clearRenderCleanup(){for(const cleanup of this._renderCleanup.splice(0)){try{cleanup();}catch{}}}
}
