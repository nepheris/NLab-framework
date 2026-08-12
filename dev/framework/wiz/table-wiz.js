import { SearchWiz } from './search-wiz.js';
import { FilterWiz } from './filter-wiz.js';
import { PaginationModel } from '../components/pagination.js';

const DEFAULT_MIN_COLUMN_WIDTH = 56;
const DEFAULT_MAX_COLUMN_WIDTH = 1600;
const DEFAULT_COLUMN_WIDTH = 120;
const DEFAULT_RESIZE_STEP = 12;

const asArray = (value) => Array.isArray(value) ? value : [];
const cloneColumn = (column) => ({ ...column });
const normalizeDirection = (direction) => String(direction ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
const searchableFields = (columns) => columns
  .filter((column) => column.searchable !== false)
  .map((column) => column.field ?? column.id)
  .filter(Boolean);
const invalidRegex = (value, flags = 'i') => {
  try {
    if (value instanceof RegExp) return null;
    new RegExp(String(value ?? ''), flags);
    return null;
  } catch (error) {
    return error;
  }
};
const finiteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const positiveNumber = (value, fallback) => {
  const number = finiteNumber(value);
  return number != null && number > 0 ? number : fallback;
};
const pixelWidth = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)px$/i);
  return match ? Number(match[1]) : null;
};
const cssWidth = (value) => typeof value === 'number' ? `${value}px` : String(value);
const columnId = (column) => column?.id ?? column?.field ?? null;

export class TableWiz {
  constructor({
    columns = [],
    profile = null,
    pageSize = 24,
    resizable = true,
    minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
    maxColumnWidth = DEFAULT_MAX_COLUMN_WIDTH,
    resizeStep = DEFAULT_RESIZE_STEP
  } = {}) {
    this.columns = asArray(columns).map((column, index) => ({
      visible:true,
      sortable:true,
      searchable:true,
      resizable:true,
      order:index,
      ...(column && typeof column === 'object' ? column : {})
    }));
    this.initialColumns = this.columns.map(cloneColumn);
    this.profile = profile;
    this.searchWiz = new SearchWiz();
    this.filterWiz = new FilterWiz();
    this.pagination = new PaginationModel({ pageSize });
    this.sortState = null;
    this.query = '';
    this.queryOptions = {};
    this.filters = [];
    this.lastError = null;
    this.resizable = Boolean(resizable);
    this.minColumnWidth = positiveNumber(minColumnWidth, DEFAULT_MIN_COLUMN_WIDTH);
    this.maxColumnWidth = Math.max(this.minColumnWidth, positiveNumber(maxColumnWidth, DEFAULT_MAX_COLUMN_WIDTH));
    this.resizeStep = positiveNumber(resizeStep, DEFAULT_RESIZE_STEP);
    this._renderCleanup = [];
  }

  setQuery(query, options = {}) {
    this.query = query ?? '';
    this.queryOptions = options && typeof options === 'object' && !Array.isArray(options) ? { ...options } : {};
    this.pagination.setPage(1);
    return this;
  }

  setFilters(filters) {
    this.filters = Array.isArray(filters) ? [...filters] : (filters && typeof filters === 'object' ? [filters] : []);
    this.pagination.setPage(1);
    return this;
  }

  setRegexFilter(field, value, flags = 'i') {
    const normalizedField = typeof field === 'string' ? field.trim() : '';
    if (!normalizedField) {
      this.lastError = { code:'INVALID_REGEX_FIELD', stage:'filter', message:'Regex filter requires a field.' };
      return this;
    }
    const next = this.filters.filter((filter) => !(
      filter?.field === normalizedField
      && String(filter?.operator ?? '').toLowerCase() === 'regex'
    ));
    next.push({ field:normalizedField, operator:'regex', value, flags });
    return this.setFilters(next);
  }

  setSort(field, direction = 'asc') {
    this.sortState = field ? { field, direction:normalizeDirection(direction) } : null;
    this.pagination.setPage(1);
    return this;
  }

  toggleSort(field) {
    if (!field) return this.setSort(null);
    const direction = this.sortState?.field === field && this.sortState.direction === 'asc' ? 'desc' : 'asc';
    return this.setSort(field, direction);
  }

  clearSort() { return this.setSort(null); }

  reset({ query = true, filters = true, sort = true, page = true, columns = false } = {}) {
    if (query) {
      this.query = '';
      this.queryOptions = {};
    }
    if (filters) this.filters = [];
    if (sort) this.sortState = null;
    if (columns) this.resetColumns();
    if (page) this.pagination.setPage(1);
    this.lastError = null;
    return this;
  }

  resetColumns() {
    this.columns = this.initialColumns.map(cloneColumn);
    return this;
  }

  setColumnVisible(id, visible) {
    const column=this.#column(id);
    if(column) column.visible=Boolean(visible);
    return this;
  }

  columnWidth(id, fallback = null) {
    const column = this.#column(id);
    if (!column) return fallback;
    const numeric = pixelWidth(column.width);
    return numeric == null ? fallback : this.#clampWidth(column, numeric);
  }

  setColumnWidth(id, width) {
    const column = this.#column(id);
    if (!column) return this;
    if (width == null || width === '') {
      delete column.width;
      return this;
    }
    const numeric = pixelWidth(width);
    if (numeric != null) {
      column.width = this.#clampWidth(column, numeric);
      return this;
    }
    if (typeof width === 'string' && width.trim()) column.width = width.trim();
    return this;
  }

  resizeColumn(id, width) {
    const column = this.#column(id);
    if (!column || !this.resizable || column.resizable === false) return this;
    const numeric = pixelWidth(width);
    if (numeric == null) return this;
    column.width = this.#clampWidth(column, numeric);
    return this;
  }

  adjustColumnWidth(id, delta, { fallback = DEFAULT_COLUMN_WIDTH } = {}) {
    const current = this.columnWidth(id, positiveNumber(fallback, DEFAULT_COLUMN_WIDTH));
    const change = finiteNumber(delta);
    if (current == null || change == null) return this;
    return this.resizeColumn(id, current + change);
  }

  resetColumnWidth(id) {
    const column = this.#column(id);
    if (column) delete column.width;
    return this;
  }

  setSticky(id, sticky = true) {
    const column=this.#column(id);
    if(column) column.sticky=sticky;
    return this;
  }

  reorder(ids) {
    const rank=new Map(asArray(ids).map((id,index)=>[id,index]));
    this.columns.forEach((column)=>{ if(rank.has(column.id)) column.order=rank.get(column.id); });
    return this;
  }

  visibleColumns() {
    return [...this.columns].filter((c)=>c.visible!==false).sort((a,b)=>(a.order??0)-(b.order??0));
  }

  process(items) {
    let rows = [...asArray(items)];
    this.lastError = null;

    if (this.query) {
      try {
        rows = this.searchWiz.search(rows, this.query, {
          ...this.queryOptions,
          fields:this.queryOptions.fields ?? searchableFields(this.columns)
        }).items;
      } catch (error) {
        this.lastError = { code:'INVALID_SEARCH', stage:'search', message:error?.message ?? String(error) };
        rows = [];
      }
    }

    if (this.filters.length) {
      const invalid = this.filters.find((filter) => (
        String(filter?.operator ?? '').toLowerCase() === 'regex'
        && invalidRegex(filter?.value, filter?.flags ?? 'i')
      ));
      if (invalid) {
        const error = invalidRegex(invalid.value, invalid.flags ?? 'i');
        this.lastError = {
          code:'INVALID_REGEX',
          stage:'filter',
          field:invalid.field,
          message:error?.message ?? 'Invalid regular expression.'
        };
      }
      try {
        rows = this.filterWiz.apply(rows, this.filters).items;
      } catch (error) {
        this.lastError = { code:'FILTER_ERROR', stage:'filter', message:error?.message ?? String(error) };
        rows = [];
      }
    }

    if (this.sortState) {
      const { field, direction } = this.sortState;
      const sign = direction === 'desc' ? -1 : 1;
      rows.sort((a,b) => {
        const av=a?.[field], bv=b?.[field];
        if(av===bv)return 0;
        if(av==null)return 1;
        if(bv==null)return -1;
        return (typeof av==='number'&&typeof bv==='number'
          ? av-bv
          : String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'})) * sign;
      });
    }

    this.pagination.setTotal(rows.length);
    return {
      all:rows,
      page:this.pagination.slice(rows),
      total:rows.length,
      pageModel:this.pagination,
      error:this.lastError
    };
  }

  exportCSV(items, { delimiter = ';' } = {}) {
    const columns=this.visibleColumns();
    const quote=(value)=>{ const text=Array.isArray(value)?value.join(', '):String(value??''); return `"${text.replaceAll('"','""')}"`; };
    return [
      columns.map((c)=>quote(c.label??c.id)).join(delimiter),
      ...asArray(items).map((row)=>columns.map((c)=>quote(row?.[c.field??c.id])).join(delimiter))
    ].join('\n');
  }

  exportJSON(items, space = 2) { return JSON.stringify(items ?? [], null, space); }

  destroy() {
    this.#clearRenderCleanup();
    return this;
  }

  render(container, items, { rowClass = null, onColumnResize = null } = {}) {
    this.#clearRenderCleanup();
    const documentRef = container?.ownerDocument ?? globalThis.document;
    if (!container || !documentRef || typeof documentRef.createElement !== 'function') return;

    const { page }=this.process(items);
    const columns=this.visibleColumns();
    const stickyOffsets=this.#stickyOffsets(columns);

    const table=documentRef.createElement('table');
    table.className='nlab-tablewiz';
    if (this.resizable) table.classList?.add?.('nlab-tablewiz--resizable');

    const colgroup=documentRef.createElement('colgroup');
    const colNodes=new Map();
    for (const column of columns) {
      const col=documentRef.createElement('col');
      const id=columnId(column);
      if (id != null) col.setAttribute?.('data-column-id', String(id));
      this.#applyWidthStyles(col, column, false);
      if (id != null) colNodes.set(id, col);
      colgroup.append?.(col);
    }
    table.append?.(colgroup);

    const rerender=()=>this.render(container,items,{rowClass,onColumnResize});
    const notifyResize=(column)=>{
      if (typeof onColumnResize !== 'function') return;
      const id=columnId(column);
      onColumnResize({
        id,
        width:this.columnWidth(id),
        column:cloneColumn(column)
      });
    };

    const thead=documentRef.createElement('thead');
    const headRow=documentRef.createElement('tr');

    columns.forEach((column)=>{
      const id=columnId(column);
      const field=column.field??column.id;
      const th=documentRef.createElement('th');
      th.textContent=column.label??column.id??field??'';
      if (id != null) th.setAttribute?.('data-column-id', String(id));
      this.#applyWidthStyles(th, column, true);

      if(column.sticky){
        th.style.position='sticky';
        th.style.left=`${stickyOffsets.get(id) ?? 0}px`;
        th.style.zIndex='2';
      }

      if(column.sortable!==false){
        th.tabIndex=0;
        th.setAttribute?.('aria-sort', this.sortState?.field===field
          ? (this.sortState.direction==='desc'?'descending':'ascending')
          : 'none');
        const sort=()=>{ this.toggleSort(field); rerender(); };
        th.addEventListener?.('click',sort);
        th.addEventListener?.('keydown',(event)=>{
          if(event.key==='Enter'||event.key===' '){
            event.preventDefault?.();
            sort();
          }
        });
      }

      if(this.resizable && column.resizable!==false && id != null){
        if (!th.style.position) th.style.position='relative';
        const handle=documentRef.createElement('span');
        handle.className='nlab-tablewiz__resize-handle';
        handle.tabIndex=0;
        handle.setAttribute?.('role','separator');
        handle.setAttribute?.('aria-orientation','vertical');
        handle.setAttribute?.('aria-label',`Redimensionner ${column.label??column.id??field??'colonne'}`);
        handle.setAttribute?.('data-column-resizer',String(id));
        handle.style.position='absolute';
        handle.style.top='0';
        handle.style.right='0';
        handle.style.width='8px';
        handle.style.height='100%';
        handle.style.cursor='col-resize';
        handle.style.touchAction='none';
        handle.style.userSelect='none';

        const stop=(event)=>{
          event.preventDefault?.();
          event.stopPropagation?.();
        };
        handle.addEventListener?.('click',(event)=>event.stopPropagation?.());
        handle.addEventListener?.('keydown',(event)=>{
          if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight') return;
          stop(event);
          const delta=event.key==='ArrowLeft'?-this.resizeStep:this.resizeStep;
          this.adjustColumnWidth(id,delta,{ fallback:this.#measuredWidth(th,column) });
          notifyResize(column);
          rerender();
        });
        handle.addEventListener?.('pointerdown',(event)=>{
          if(event.button != null && event.button!==0) return;
          stop(event);
          const startX=finiteNumber(event.clientX) ?? 0;
          const startWidth=this.columnWidth(id,this.#measuredWidth(th,column));
          if(startWidth==null) return;

          const move=(moveEvent)=>{
            const x=finiteNumber(moveEvent.clientX);
            if(x==null) return;
            this.resizeColumn(id,startWidth+(x-startX));
            const width=this.columnWidth(id);
            const col=colNodes.get(id);
            if(col&&width!=null) col.style.width=cssWidth(width);
            if(width!=null){
              th.style.width=cssWidth(width);
              th.style.minWidth=cssWidth(width);
              th.style.maxWidth=cssWidth(width);
            }
          };
          const cleanup=()=>{
            documentRef.removeEventListener?.('pointermove',move);
            documentRef.removeEventListener?.('pointerup',end);
            documentRef.removeEventListener?.('pointercancel',end);
            this._renderCleanup=this._renderCleanup.filter((fn)=>fn!==cleanup);
          };
          const end=(endEvent)=>{
            endEvent?.preventDefault?.();
            cleanup();
            notifyResize(column);
            rerender();
          };
          documentRef.addEventListener?.('pointermove',move);
          documentRef.addEventListener?.('pointerup',end);
          documentRef.addEventListener?.('pointercancel',end);
          this._renderCleanup.push(cleanup);
          handle.setPointerCapture?.(event.pointerId);
        });
        th.append?.(handle);
      }
      headRow.append?.(th);
    });
    thead.append?.(headRow);
    table.append?.(thead);

    const tbody=documentRef.createElement('tbody');
    page.forEach((row,rowIndex)=>{
      const tr=documentRef.createElement('tr');
      if(rowClass) tr.className=rowClass(row,rowIndex)||'';
      columns.forEach((column)=>{
        const id=columnId(column);
        const td=documentRef.createElement('td');
        if (id != null) td.setAttribute?.('data-column-id', String(id));
        const value=row?.[column.field??column.id];
        if(column.type==='image'&&value){
          const img=documentRef.createElement('img');
          img.src=value;
          img.alt=column.altField?row?.[column.altField]??'':'';
          img.loading='lazy';
          img.style.maxWidth='72px';
          td.append?.(img);
        } else td.textContent=Array.isArray(value)?value.join(', '):String(value??'');
        this.#applyWidthStyles(td,column,true);
        if(column.sticky){
          td.style.position='sticky';
          td.style.left=`${stickyOffsets.get(id) ?? 0}px`;
        }
        tr.append?.(td);
      });
      tbody.append?.(tr);
    });
    table.append?.(tbody);
    container.replaceChildren?.(table);
  }

  #column(id) {
    return this.columns.find((column)=>column.id===id || (!column.id && column.field===id));
  }

  #bounds(column) {
    const min=Math.max(1,positiveNumber(column?.minWidth,this.minColumnWidth));
    const requestedMax=positiveNumber(column?.maxWidth,this.maxColumnWidth);
    return { min, max:Math.max(min,requestedMax) };
  }

  #clampWidth(column,width) {
    const numeric=finiteNumber(width);
    if(numeric==null) return null;
    const { min,max }=this.#bounds(column);
    return Math.min(max,Math.max(min,numeric));
  }

  #applyWidthStyles(node,column,exact=false) {
    if(!node?.style) return;
    const numeric=pixelWidth(column.width);
    if(numeric!=null){
      const width=this.#clampWidth(column,numeric);
      node.style.width=cssWidth(width);
      if(exact){
        node.style.minWidth=cssWidth(width);
        node.style.maxWidth=cssWidth(width);
      }
      return;
    }
    if(typeof column.width==='string'&&column.width.trim()) node.style.width=column.width.trim();
    if(exact){
      const { min,max }=this.#bounds(column);
      node.style.minWidth=cssWidth(min);
      node.style.maxWidth=cssWidth(max);
    }
  }

  #measuredWidth(node,column) {
    const measured=finiteNumber(node?.getBoundingClientRect?.().width);
    const fallback=measured!=null&&measured>0?measured:DEFAULT_COLUMN_WIDTH;
    return this.#clampWidth(column,fallback);
  }

  #stickyOffsets(columns) {
    const offsets=new Map();
    let left=0;
    for(const column of columns){
      if(!column.sticky) continue;
      const id=columnId(column);
      offsets.set(id,left);
      left+=this.columnWidth(id,DEFAULT_COLUMN_WIDTH)??DEFAULT_COLUMN_WIDTH;
    }
    return offsets;
  }

  #clearRenderCleanup() {
    for(const cleanup of this._renderCleanup.splice(0)){
      try{ cleanup(); }catch{}
    }
  }
}
