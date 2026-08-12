const positiveInteger = (value, fallback = 1) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.floor(number));
};

const nonNegativeInteger = (value, fallback = 0) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.floor(number));
};

const normalizePageSizes = (values, current) => {
  const source = Array.isArray(values) ? values : [];
  const normalized = [...new Set(source.map((value) => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
  }).filter((value) => value != null && value > 0))];
  if (!normalized.includes(current)) normalized.push(current);
  return normalized.sort((left, right) => left - right);
};

export class PaginationModel {
  constructor({ page = 1, pageSize = 12, total = 0, pageSizes = [12, 24, 48] } = {}) {
    this.pageSize = positiveInteger(pageSize, 12);
    this.total = nonNegativeInteger(total, 0);
    this.page = positiveInteger(page, 1);
    this.pageSizes = normalizePageSizes(pageSizes, this.pageSize);
    this.normalize();
  }

  get pageCount() {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get offset() {
    return (this.page - 1) * this.pageSize;
  }

  get end() {
    return Math.min(this.total, this.offset + this.pageSize);
  }

  normalize() {
    this.pageSize = positiveInteger(this.pageSize, 1);
    this.total = nonNegativeInteger(this.total, 0);
    this.page = Math.min(positiveInteger(this.page, 1), this.pageCount);
    this.pageSizes = normalizePageSizes(this.pageSizes, this.pageSize);
    return this;
  }

  setPage(page) {
    this.page = page;
    return this.normalize();
  }

  setPageSize(size) {
    const oldOffset = this.offset;
    this.pageSize = positiveInteger(size, 1);
    this.page = Math.floor(oldOffset / this.pageSize) + 1;
    return this.normalize();
  }

  setTotal(total) {
    this.total = total;
    return this.normalize();
  }

  slice(items) {
    const source = Array.isArray(items) ? items : [];
    return source.slice(this.offset, this.end);
  }

  pages(maxButtons = 7) {
    const limit = positiveInteger(maxButtons, 1);
    const count = this.pageCount;
    if (count <= limit) return Array.from({ length: count }, (_, index) => index + 1);

    const half = Math.floor(limit / 2);
    let start = Math.max(1, this.page - half);
    let end = Math.min(count, start + limit - 1);
    start = Math.max(1, end - limit + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  toJSON() {
    return {
      page: this.page,
      pageSize: this.pageSize,
      total: this.total,
      pageCount: this.pageCount,
      offset: this.offset,
      end: this.end,
      pageSizes: [...this.pageSizes]
    };
  }
}

export function renderPagination(container, model, {
  onChange = null,
  document: documentRef = globalThis.document,
  CustomEvent: CustomEventRef = globalThis.CustomEvent,
  eventTarget = container,
  ariaLabel = 'Pagination'
} = {}) {
  const canRender = Boolean(
    container
    && model
    && typeof model.setPage === 'function'
    && typeof model.pages === 'function'
    && documentRef
    && typeof documentRef.createElement === 'function'
  );

  if (!canRender) return createNoopController(model);

  let destroyed = false;
  let listeners = [];

  const removeListeners = () => {
    for (const [node, type, listener] of listeners) node.removeEventListener?.(type, listener);
    listeners = [];
  };

  const clear = () => {
    removeListeners();
    container.replaceChildren?.();
  };

  const append = (...nodes) => {
    if (typeof container.append === 'function') container.append(...nodes);
    else for (const node of nodes) container.appendChild?.(node);
  };

  const emit = () => {
    if (typeof onChange === 'function') onChange(model);
    if (!eventTarget || typeof eventTarget.dispatchEvent !== 'function' || typeof CustomEventRef !== 'function') return;
    eventTarget.dispatchEvent(new CustomEventRef('nlab:page', {
      detail: model.toJSON?.() ?? {
        page: model.page,
        pageSize: model.pageSize,
        total: model.total,
        pageCount: model.pageCount
      }
    }));
  };

  const goTo = (page) => {
    if (destroyed) return;
    const previous = model.page;
    model.setPage(page);
    if (model.page !== previous) emit();
    render();
  };

  const makeButton = (label, page, {
    disabled = false,
    current = false,
    aria = null
  } = {}) => {
    const node = documentRef.createElement('button');
    node.type = 'button';
    node.textContent = label;
    node.disabled = Boolean(disabled);
    if (aria) node.setAttribute?.('aria-label', aria);
    if (current) node.setAttribute?.('aria-current', 'page');
    const listener = () => goTo(page);
    node.addEventListener?.('click', listener);
    listeners.push([node, 'click', listener]);
    return node;
  };

  function render() {
    if (destroyed) return controller;
    model.normalize?.();
    clear();
    container.classList?.add?.('nlab-pagination');
    container.setAttribute?.('role', 'navigation');
    container.setAttribute?.('aria-label', ariaLabel);

    append(
      makeButton('«', 1, {
        disabled: model.page === 1,
        aria: 'Première page'
      }),
      makeButton('‹', model.page - 1, {
        disabled: model.page === 1,
        aria: 'Page précédente'
      })
    );

    for (const page of model.pages()) {
      append(makeButton(String(page), page, {
        current: page === model.page,
        aria: page === model.page ? `Page ${page}, page actuelle` : `Page ${page}`
      }));
    }

    append(
      makeButton('›', model.page + 1, {
        disabled: model.page === model.pageCount,
        aria: 'Page suivante'
      }),
      makeButton('»', model.pageCount, {
        disabled: model.page === model.pageCount,
        aria: 'Dernière page'
      })
    );

    const label = documentRef.createElement('span');
    label.textContent = `Page ${model.page}/${model.pageCount} · ${model.total} éléments`;
    label.setAttribute?.('aria-live', 'polite');
    append(label);
    return controller;
  }

  const controller = {
    model,
    render,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clear();
      container.classList?.remove?.('nlab-pagination');
      container.removeAttribute?.('role');
      container.removeAttribute?.('aria-label');
    }
  };

  return render();
}

function createNoopController(model) {
  return {
    model,
    render() { return this; },
    destroy() {}
  };
}
