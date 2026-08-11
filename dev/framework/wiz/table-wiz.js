import { SearchWiz } from './search-wiz.js';
import { FilterWiz } from './filter-wiz.js';
import { PaginationModel } from '../components/pagination.js';

export class TableWiz {
  constructor({ columns = [], profile = null, pageSize = 24 } = {}) {
    this.columns = columns.map((column, index) => ({ visible:true, sortable:true, searchable:true, order:index, ...column }));
    this.profile = profile;
    this.searchWiz = new SearchWiz();
    this.filterWiz = new FilterWiz();
    this.pagination = new PaginationModel({ pageSize });
    this.sortState = null;
    this.query = '';
    this.filters = [];
  }

  setQuery(query) { this.query = query ?? ''; return this; }
  setFilters(filters) { this.filters = filters ?? []; return this; }
  setSort(field, direction = 'asc') { this.sortState = field ? { field, direction } : null; return this; }
  setColumnVisible(id, visible) { const column=this.columns.find((c)=>c.id===id); if(column) column.visible=Boolean(visible); return this; }
  setColumnWidth(id, width) { const column=this.columns.find((c)=>c.id===id); if(column) column.width=width; return this; }
  setSticky(id, sticky = true) { const column=this.columns.find((c)=>c.id===id); if(column) column.sticky=sticky; return this; }
  reorder(ids) { const rank=new Map(ids.map((id,index)=>[id,index])); this.columns.forEach((column)=>{ if(rank.has(column.id)) column.order=rank.get(column.id); }); return this; }
  visibleColumns() { return [...this.columns].filter((c)=>c.visible!==false).sort((a,b)=>(a.order??0)-(b.order??0)); }

  process(items) {
    let rows = [...items];
    if (this.query) rows = this.searchWiz.search(rows, this.query, { fields:this.columns.filter((c)=>c.searchable!==false).map((c)=>c.field??c.id) }).items;
    if (this.filters.length) rows = this.filterWiz.apply(rows, this.filters).items;
    if (this.sortState) {
      const { field, direction } = this.sortState; const sign=direction==='desc'?-1:1;
      rows.sort((a,b)=>{ const av=a?.[field], bv=b?.[field]; if(av===bv)return 0; if(av==null)return 1; if(bv==null)return -1; return (typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'}))*sign; });
    }
    this.pagination.setTotal(rows.length);
    return { all:rows, page:this.pagination.slice(rows), total:rows.length, pageModel:this.pagination };
  }

  exportCSV(items, { delimiter = ';' } = {}) {
    const columns=this.visibleColumns();
    const quote=(value)=>{ const text=Array.isArray(value)?value.join(', '):String(value??''); return `"${text.replaceAll('"','""')}"`; };
    return [columns.map((c)=>quote(c.label??c.id)).join(delimiter), ...items.map((row)=>columns.map((c)=>quote(row?.[c.field??c.id])).join(delimiter))].join('\n');
  }

  exportJSON(items, space = 2) { return JSON.stringify(items, null, space); }

  render(container, items, { rowClass = null } = {}) {
    if (!container || !globalThis.document) return;
    const { page }=this.process(items); const columns=this.visibleColumns();
    const table=document.createElement('table'); table.className='nlab-tablewiz';
    const thead=document.createElement('thead'); const headRow=document.createElement('tr');
    columns.forEach((column,index)=>{ const th=document.createElement('th'); th.textContent=column.label??column.id; if(column.width) th.style.width=typeof column.width==='number'?`${column.width}px`:column.width; if(column.sticky){ th.style.position='sticky'; th.style.left=`${index*120}px`; th.style.zIndex='2'; } if(column.sortable!==false) th.addEventListener('click',()=>{ const next=this.sortState?.field===column.field&&this.sortState.direction==='asc'?'desc':'asc'; this.setSort(column.field??column.id,next); this.render(container,items,{rowClass}); }); headRow.append(th); }); thead.append(headRow); table.append(thead);
    const tbody=document.createElement('tbody');
    page.forEach((row,rowIndex)=>{ const tr=document.createElement('tr'); if(rowClass) tr.className=rowClass(row,rowIndex)||''; columns.forEach((column,index)=>{ const td=document.createElement('td'); const value=row?.[column.field??column.id]; if(column.type==='image'&&value){ const img=document.createElement('img'); img.src=value; img.alt=column.altField?row?.[column.altField]??'':''; img.loading='lazy'; img.style.maxWidth='72px'; td.append(img); } else td.textContent=Array.isArray(value)?value.join(', '):String(value??''); if(column.sticky){ td.style.position='sticky'; td.style.left=`${index*120}px`; } tr.append(td); }); tbody.append(tr); }); table.append(tbody);
    container.replaceChildren(table);
  }
}
