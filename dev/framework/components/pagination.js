export class PaginationModel {
  constructor({ page = 1, pageSize = 12, total = 0, pageSizes = [12, 24, 48] } = {}) {
    this.page = page; this.pageSize = pageSize; this.total = total; this.pageSizes = pageSizes;
    this.normalize();
  }
  get pageCount() { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get offset() { return (this.page - 1) * this.pageSize; }
  get end() { return Math.min(this.total, this.offset + this.pageSize); }
  normalize() { this.pageSize = Math.max(1, Number(this.pageSize) || 1); this.page = Math.min(Math.max(1, Number(this.page) || 1), this.pageCount); return this; }
  setPage(page) { this.page = page; return this.normalize(); }
  setPageSize(size) { const oldOffset = this.offset; this.pageSize = Math.max(1, Number(size) || 1); this.page = Math.floor(oldOffset / this.pageSize) + 1; return this.normalize(); }
  setTotal(total) { this.total = Math.max(0, Number(total) || 0); return this.normalize(); }
  slice(items) { return items.slice(this.offset, this.end); }
  pages(maxButtons = 7) {
    const count = this.pageCount;
    if (count <= maxButtons) return Array.from({ length: count }, (_, i) => i + 1);
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, this.page - half);
    let end = Math.min(count, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
}

export function renderPagination(container, model, { onChange = null } = {}) {
  if (!container || !globalThis.document) return;
  container.classList.add('nlab-pagination'); container.replaceChildren();
  const button = (label, page, disabled = false, current = false) => {
    const node = document.createElement('button'); node.type = 'button'; node.textContent = label; node.disabled = disabled;
    if (current) node.setAttribute('aria-current', 'page');
    node.addEventListener('click', () => { model.setPage(page); onChange?.(model); renderPagination(container, model, { onChange }); });
    return node;
  };
  container.append(button('«', 1, model.page === 1), button('‹', model.page - 1, model.page === 1));
  for (const page of model.pages()) container.append(button(String(page), page, false, page === model.page));
  container.append(button('›', model.page + 1, model.page === model.pageCount), button('»', model.pageCount, model.page === model.pageCount));
  const label = document.createElement('span'); label.textContent = `Page ${model.page}/${model.pageCount} · ${model.total} éléments`; container.append(label);
}
