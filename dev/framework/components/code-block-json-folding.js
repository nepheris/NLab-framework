const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const escapePointerToken = (value) => String(value).replace(/~/g, '~0').replace(/\//g, '~1');
const joinPointer = (parent, token) => `${parent}/${escapePointerToken(token)}`;

function cloneJson(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('JSON values must contain only finite numbers');
    if (['undefined', 'function', 'symbol', 'bigint'].includes(typeof value)) throw new TypeError('Value is not JSON-compatible');
    return value;
  }
  if (seen.has(value)) throw new TypeError('Circular JSON value');
  seen.add(value);
  const output = Array.isArray(value) ? [] : {};
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) throw new TypeError(`Unsafe JSON key: ${key}`);
    output[key] = cloneJson(value[key], seen);
  }
  seen.delete(value);
  return output;
}

function normalizeInput(input) {
  if (typeof input === 'string') {
    const parsed = JSON.parse(input);
    return cloneJson(parsed);
  }
  return cloneJson(input);
}

function nodeType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value === 'object' ? 'object' : typeof value;
}

function primitivePreview(value) {
  if (typeof value === 'string') return JSON.stringify(value);
  if (value === null) return 'null';
  return String(value);
}

function containerSummary(value) {
  return Array.isArray(value) ? `Array(${value.length})` : `Object(${Object.keys(value).length})`;
}

function makeNode(value, { key = null, path = '', depth = 0, collapsed = false } = {}) {
  const type = nodeType(value);
  const isContainer = type === 'array' || type === 'object';
  const node = {
    key,
    path,
    depth,
    type,
    container: isContainer,
    collapsed: isContainer ? Boolean(collapsed) : false,
    summary: isContainer ? containerSummary(value) : primitivePreview(value),
    children: []
  };

  if (isContainer) {
    const entries = Array.isArray(value)
      ? value.map((item, index) => [String(index), item])
      : Object.entries(value);
    node.children = entries.map(([childKey, childValue]) => makeNode(childValue, {
      key: childKey,
      path: joinPointer(path, childKey),
      depth: depth + 1,
      collapsed: false
    }));
  }
  return node;
}

function cloneNode(node) {
  return {
    ...node,
    children: node.children.map(cloneNode)
  };
}

function flattenVisible(node, output = []) {
  output.push(node);
  if (node.container && !node.collapsed) {
    for (const child of node.children) flattenVisible(child, output);
  }
  return output;
}

export class CodeBlockJsonFolding {
  constructor({ value = null, collapseDepth = null } = {}) {
    this.value = normalizeInput(value);
    this.root = makeNode(this.value);
    if (collapseDepth != null) this.collapseDeeperThan(collapseDepth);
  }

  static parse(value, options = {}) {
    try {
      return { ok: true, model: new CodeBlockJsonFolding({ value, ...options }), error: null };
    } catch (error) {
      return { ok: false, model: null, error };
    }
  }

  setValue(value, { preserveCollapsed = false } = {}) {
    let next;
    try {
      next = normalizeInput(value);
    } catch (error) {
      return { changed: false, error };
    }

    const collapsed = preserveCollapsed
      ? new Set(this.visibleTree().filter((node) => node.container && node.collapsed).map((node) => node.path))
      : new Set();
    this.value = next;
    this.root = makeNode(this.value);
    if (preserveCollapsed) {
      for (const path of collapsed) this.setCollapsed(path, true);
    }
    return { changed: true, error: null };
  }

  find(path = '') {
    const target = String(path ?? '');
    if (target === '') return this.root;
    const stack = [this.root];
    while (stack.length) {
      const node = stack.pop();
      if (node.path === target) return node;
      for (let index = node.children.length - 1; index >= 0; index -= 1) stack.push(node.children[index]);
    }
    return null;
  }

  setCollapsed(path, collapsed = true) {
    const node = this.find(path);
    if (!node) return { changed: false, reason: 'missing' };
    if (!node.container) return { changed: false, reason: 'not-container' };
    const next = Boolean(collapsed);
    const changed = node.collapsed !== next;
    node.collapsed = next;
    return { changed, reason: null };
  }

  toggle(path) {
    const node = this.find(path);
    if (!node) return { changed: false, reason: 'missing' };
    if (!node.container) return { changed: false, reason: 'not-container' };
    node.collapsed = !node.collapsed;
    return { changed: true, collapsed: node.collapsed, reason: null };
  }

  collapseAll({ includeRoot = false } = {}) {
    let changed = 0;
    const stack = [this.root];
    while (stack.length) {
      const node = stack.pop();
      if (node.container && (includeRoot || node.path !== '') && !node.collapsed) {
        node.collapsed = true;
        changed += 1;
      }
      for (const child of node.children) stack.push(child);
    }
    return changed;
  }

  expandAll() {
    let changed = 0;
    const stack = [this.root];
    while (stack.length) {
      const node = stack.pop();
      if (node.container && node.collapsed) {
        node.collapsed = false;
        changed += 1;
      }
      for (const child of node.children) stack.push(child);
    }
    return changed;
  }

  collapseDeeperThan(depth = 1) {
    const limit = Math.max(0, Math.floor(Number(depth) || 0));
    let changed = 0;
    const stack = [this.root];
    while (stack.length) {
      const node = stack.pop();
      if (node.container && node.depth >= limit && !node.collapsed) {
        node.collapsed = true;
        changed += 1;
      }
      for (const child of node.children) stack.push(child);
    }
    return changed;
  }

  visibleTree() {
    return flattenVisible(this.root, []).map(cloneNode);
  }

  snapshot() {
    return {
      value: cloneJson(this.value),
      root: cloneNode(this.root),
      visible: this.visibleTree().map((node) => ({
        path: node.path,
        key: node.key,
        depth: node.depth,
        type: node.type,
        collapsed: node.collapsed,
        summary: node.summary
      }))
    };
  }

  renderText({ indent = '  ' } = {}) {
    return this.visibleTree().map((node) => {
      const prefix = String(indent).repeat(node.depth);
      const marker = node.container ? (node.collapsed ? '▶' : '▼') : '•';
      const key = node.key == null ? '$' : node.key;
      return `${prefix}${marker} ${key}: ${node.summary}`;
    }).join('\n');
  }

  renderHtml() {
    return this.visibleTree().map((node) => {
      const marker = node.container ? (node.collapsed ? '▶' : '▼') : '•';
      const key = node.key == null ? '$' : node.key;
      return `<div class="nlab-code-json-node" data-json-path="${escapeHtml(node.path)}" data-json-type="${escapeHtml(node.type)}" data-json-depth="${node.depth}"${node.container ? ` data-json-collapsed="${node.collapsed}"` : ''}><span class="nlab-code-json-node__marker">${marker}</span> <span class="nlab-code-json-node__key">${escapeHtml(key)}</span>: <span class="nlab-code-json-node__summary">${escapeHtml(node.summary)}</span></div>`;
    }).join('');
  }
}
