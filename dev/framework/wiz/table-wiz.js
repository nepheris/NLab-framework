import { SearchWiz } from './search-wiz.js';
import { FilterWiz } from './filter-wiz.js';
import { PaginationModel } from '../components/pagination.js';

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

export class TableWiz {
  constructor({ columns = [], profile = null, pageSize = 24 } = {}) {
    this.columns = asArray(columns).map((column, index) => ({
      visible:true,
      sortable:true,
      searchable:true,
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

  setColumnVisible(id, visible) { const column=this.columns.find((c)=>c.id===id); if(column) column.visible=Boolean(visible); return this; }
  setColumnWidth(id, width) { const column=this.columns.find((c)=>c.id===id); if(column) column.width=width; return this; }
  setSticky(id, sticky = true) { const column=this.columns.find((c)=>c.id===id); if(column) column.sticky=sticky; return this; }
  reorder(ids) { const rank=new Map(asArray(ids).map((id,index)=>[id,index])); this.columns.forEach((column)=>{ if(rank.has(column.id)) column.order=rank.get(column.id); }); return this; }
  visibleColumns() { return [...this.columns].filter((c)=>c.visible!==false).sort((a,b)=>(a.order??0)-(b.order??0)); }

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

  render(container, items, { rowClass = null } = {}) {
    if (!container || !globalThis.document) return;
    const { page }=this.process(items); const columns=this.visibleColumns();
    const table=document.createElement('table'); table.className='nlab-tablewiz';
    const thead=document.createElement('thead'); const headRow=document.createElement('tr');
    columns.forEach((column,index)=>{
      const field=column.field??column.id;
      const th=document.createElement('th');
      th.textContent=column.label??column.id;
      if(column.width) th.style.width=typeof column.width==='number'?`${column.width}px`:column.width;
      if(column.sticky){ th.style.position='sticky'; th.style.left=`${index*120}px`; th.style.zIndex='2'; }
      if(column.sortable!==false){
        th.tabIndex=0;
        th.setAttribute('aria-sort', this.sortState?.field===field
          ? (this.sortState.direction==='desc'?'descending':'ascending')
          : 'none');
        const sort=()=>{ this.toggleSort(field); this.render(container,items,{rowClass}); };
        th.addEventListener('click',sort);
        th.addEventListener('keydown',(event)=>{
          if(event.key==='Enter'||event.key===' '){
            event.preventDefault();
            sort();
          }
        });
      }
      headRow.append(th);
    });
    thead.append(headRow); table.append(thead);
    const tbody=document.createElement('tbody');
    page.forEach((row,rowIndex)=>{
      const tr=document.createElement('tr');
      if(rowClass) tr.className=rowClass(row,rowIndex)||'';
      columns.forEach((column,index)=>{
        const td=document.createElement('td');
        const value=row?.[column.field??column.id];
        if(column.type==='image'&&value){
          const img=document.createElement('img'); img.src=value; img.alt=column.altField?row?.[column.altField]??'':''; img.loading='lazy'; img.style.maxWidth='72px'; td.append(img);
        } else td.textContent=Array.isArray(value)?value.join(', '):String(value??'');
        if(column.sticky){ td.style.position='sticky'; td.style.left=`${index*120}px`; }
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(tbody);
    container.replaceChildren(table);
  }
}
