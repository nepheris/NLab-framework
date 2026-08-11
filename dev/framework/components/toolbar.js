export class ToolbarModel {
  constructor(actions = [], { favorites = [], maxVisible = 6 } = {}) {
    this.actions = actions.map((action, index) => ({ priority: 100 + index, visible: true, ...action }));
    this.favorites = new Set(favorites);
    this.maxVisible = maxVisible;
  }

  ordered() {
    return [...this.actions].filter((action) => action.visible !== false).sort((a, b) => {
      const af = this.favorites.has(a.id) ? 0 : 1;
      const bf = this.favorites.has(b.id) ? 0 : 1;
      return af - bf || (a.priority ?? 100) - (b.priority ?? 100);
    });
  }

  split() {
    const ordered = this.ordered();
    return { visible: ordered.slice(0, this.maxVisible), overflow: ordered.slice(this.maxVisible) };
  }

  favorite(id, value = true) { value ? this.favorites.add(id) : this.favorites.delete(id); return this; }
  setVisible(id, value) { const item = this.actions.find((action) => action.id === id); if (item) item.visible = value; return this; }
  reorder(ids) {
    const rank = new Map(ids.map((id, index) => [id, index]));
    this.actions.forEach((action) => { if (rank.has(action.id)) action.priority = rank.get(action.id); });
    return this;
  }
}

export function renderToolbar(container, model, { onAction = null } = {}) {
  if (!container || !globalThis.document) return;
  container.classList.add('nlab-toolbar');
  container.replaceChildren();
  const { visible, overflow } = model.split();
  const makeButton = (action) => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.action = action.id;
    button.textContent = [action.icon, action.label ?? action.id].filter(Boolean).join(' ');
    button.title = action.help ?? action.label ?? action.id;
    button.addEventListener('click', () => onAction?.(action));
    return button;
  };
  visible.forEach((action) => container.append(makeButton(action)));
  if (overflow.length) {
    const details = document.createElement('details'); details.className = 'nlab-toolbar__overflow';
    const summary = document.createElement('summary'); summary.textContent = '…'; summary.title = 'Plus d’actions'; details.append(summary);
    const menu = document.createElement('div'); menu.className = 'nlab-stack';
    overflow.forEach((action) => menu.append(makeButton(action))); details.append(menu); container.append(details);
  }
}
