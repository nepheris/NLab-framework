export class NavigationWiz {
  constructor({
    root = null,
    documentRef = globalThis.document ?? null,
    intersectionObserverClass = null,
    contentSelector = 'main',
    headingSelector = 'h1,h2,h3',
    activeClass = 'is-active'
  } = {}) {
    this.document = documentRef ?? root?.ownerDocument ?? null;
    this.root = root ?? this.document;
    this.IntersectionObserver = intersectionObserverClass;
    this.contentSelector = contentSelector;
    this.headingSelector = headingSelector;
    this.activeClass = activeClass;
    this.items = [];
    this.container = null;
    this.observer = null;
  }

  buildTree() {
    const content = this.root?.querySelector?.(this.contentSelector);
    if (!content) {
      this.items = [];
      return [];
    }

    const headings = [...(content.querySelectorAll?.(this.headingSelector) ?? [])];
    const usedIds = new Set(headings.map((heading) => String(heading.id ?? '').trim()).filter(Boolean));
    let generatedIndex = 1;
    const nextGeneratedId = () => {
      let id;
      do id = `section-${generatedIndex++}`;
      while (usedIds.has(id));
      usedIds.add(id);
      return id;
    };

    const stack = [];
    const roots = [];
    this.items = headings.map((heading) => {
      if (!String(heading.id ?? '').trim()) heading.id = nextGeneratedId();
      const tagName = String(heading.tagName ?? '').toUpperCase();
      const level = /^H[1-6]$/.test(tagName) ? Number(tagName.slice(1)) : 1;
      const firstText = heading.childNodes?.[0]?.textContent?.trim?.();
      const title = firstText || heading.textContent?.trim?.() || heading.id;
      return { id: heading.id, title, level, element: heading, children: [] };
    });

    for (const item of this.items) {
      while (stack.length && stack.at(-1).level >= item.level) stack.pop();
      (stack.length ? stack.at(-1).children : roots).push(item);
      stack.push(item);
    }
    return roots;
  }

  render(container, tree = this.buildTree()) {
    if (!container) return this;
    const documentRef = container.ownerDocument ?? this.document ?? this.root?.ownerDocument ?? this.root;
    if (!documentRef?.createElement || typeof container.replaceChildren !== 'function') return this;

    this.container = container;
    const make = (nodes = []) => {
      const list = documentRef.createElement('ul');
      for (const node of nodes) {
        const children = Array.isArray(node.children) ? node.children : [];
        const li = documentRef.createElement('li');
        li.dataset.navLevel = String(node.level);
        const link = documentRef.createElement('a');
        link.href = `#${encodeURIComponent(node.id)}`;
        link.textContent = node.title;
        link.dataset.navTarget = node.id;
        if (children.length) {
          const details = documentRef.createElement('details');
          details.open = Number(node.level) <= 2;
          details.dataset.navNode = node.id;
          const summary = documentRef.createElement('summary');
          summary.append(link);
          details.append(summary, make(children));
          li.append(details);
        } else {
          li.append(link);
        }
        list.append(li);
      }
      return list;
    };

    container.replaceChildren(make(tree));
    return this;
  }

  expandAll() {
    for (const item of this.container?.querySelectorAll?.('details') ?? []) item.open = true;
    return this;
  }

  collapseAll() {
    for (const item of this.container?.querySelectorAll?.('details') ?? []) item.open = false;
    return this;
  }

  setDepth(depth = 2) {
    const max = Math.max(1, Math.min(6, Number(depth) || 1));
    for (const item of this.container?.querySelectorAll?.('details') ?? []) {
      item.open = Number(item.closest?.('li')?.dataset?.navLevel || 9) <= max;
    }
    return this;
  }

  defaultState() {
    return this.setDepth(2);
  }

  observe(container = this.container, { rootMargin = '-20% 0px -70% 0px' } = {}) {
    const Observer = this.IntersectionObserver ?? globalThis.IntersectionObserver;
    if (!container?.querySelectorAll || typeof Observer !== 'function') return this;

    this.observer?.disconnect?.();
    const links = new Map(
      [...container.querySelectorAll('[data-nav-target]')]
        .map((link) => [link.dataset.navTarget, link])
    );

    this.observer = new Observer((entries = []) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => (a.boundingClientRect?.top ?? Infinity) - (b.boundingClientRect?.top ?? Infinity))[0];
      if (!visible) return;
      for (const link of links.values()) link.classList?.remove?.(this.activeClass);
      links.get(visible.target?.id)?.classList?.add?.(this.activeClass);
    }, { rootMargin });

    for (const item of this.items) {
      if (item.element) this.observer.observe?.(item.element);
    }
    return this;
  }

  restore(hash = globalThis.location?.hash ?? '') {
    if (!hash || typeof hash !== 'string') return false;
    let id;
    try {
      id = decodeURIComponent(hash.replace(/^#/, ''));
    } catch {
      return false;
    }
    if (!id) return false;

    const target = this.items.find((item) => item.id === id)?.element
      ?? this.root?.getElementById?.(id)
      ?? null;
    target?.scrollIntoView?.({ block: 'start' });
    return Boolean(target);
  }

  destroy() {
    this.observer?.disconnect?.();
    this.observer = null;
    this.container = null;
    return this;
  }
}
