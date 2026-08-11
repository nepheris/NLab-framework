export class NavigationWiz {
  constructor({ root = document, contentSelector = 'main', headingSelector = 'h1,h2,h3', activeClass = 'is-active' } = {}) {
    this.root = root; this.contentSelector = contentSelector; this.headingSelector = headingSelector; this.activeClass = activeClass; this.items = [];
  }

  buildTree() {
    const content = this.root.querySelector(this.contentSelector); if (!content) return [];
    const headings = [...content.querySelectorAll(this.headingSelector)];
    const stack = []; const roots = [];
    this.items = headings.map((heading, index) => {
      if (!heading.id) heading.id = `section-${index + 1}`;
      return { id:heading.id, title:heading.textContent.trim(), level:Number(heading.tagName.slice(1)), element:heading, children:[] };
    });
    for (const item of this.items) {
      while (stack.length && stack.at(-1).level >= item.level) stack.pop();
      (stack.length ? stack.at(-1).children : roots).push(item);
      stack.push(item);
    }
    return roots;
  }

  render(container, tree = this.buildTree()) {
    if (!container) return;
    const makeList = (nodes) => {
      const list = document.createElement('ul');
      for (const node of nodes) {
        const li = document.createElement('li');
        const link = document.createElement('a'); link.href = `#${encodeURIComponent(node.id)}`; link.textContent = node.title; link.dataset.navTarget = node.id;
        li.append(link); if (node.children.length) li.append(makeList(node.children)); list.append(li);
      }
      return list;
    };
    container.replaceChildren(makeList(tree));
    return this;
  }

  observe(container, { rootMargin = '-20% 0px -70% 0px' } = {}) {
    if (!globalThis.IntersectionObserver) return this;
    const links = new Map([...container.querySelectorAll('[data-nav-target]')].map((link) => [link.dataset.navTarget, link]));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      for (const link of links.values()) link.classList.remove(this.activeClass);
      links.get(visible.target.id)?.classList.add(this.activeClass);
    }, { rootMargin });
    for (const item of this.items) observer.observe(item.element);
    this.observer = observer; return this;
  }

  restore(hash = globalThis.location?.hash ?? '') {
    if (!hash) return false;
    const id = decodeURIComponent(hash.slice(1)); const target = this.root.getElementById?.(id) ?? this.root.querySelector?.(`#${CSS.escape(id)}`);
    target?.scrollIntoView?.({ block:'start' }); return Boolean(target);
  }

  destroy() { this.observer?.disconnect(); }
}
