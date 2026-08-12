const MODES = Object.freeze(['overlay', 'push']);
const SIDES = Object.freeze(['left', 'right', 'top', 'bottom']);

function normalizeMode(value) {
  return MODES.includes(String(value ?? '').trim().toLowerCase()) ? String(value).trim().toLowerCase() : 'overlay';
}

function normalizeSide(value) {
  return SIDES.includes(String(value ?? '').trim().toLowerCase()) ? String(value).trim().toLowerCase() : 'right';
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function viewportDimension(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : Infinity;
}

function clearStyle(style, property) {
  if (style?.removeProperty) style.removeProperty(property);
  else if (style && property in style) style[property] = '';
}

function setStyle(style, property, value) {
  if (style?.setProperty) style.setProperty(property, value);
  else if (style) style[property] = value;
}

export class InspectorDockLayout {
  constructor({ mode = 'overlay', side = 'right', size = 360, gap = 0 } = {}) {
    this.mode = normalizeMode(mode);
    this.side = normalizeSide(side);
    this.size = Math.max(0, finite(size, 360));
    this.gap = Math.max(0, finite(gap, 0));
  }

  static modes() { return [...MODES]; }
  static sides() { return [...SIDES]; }

  setMode(mode) { this.mode = normalizeMode(mode); return this; }
  setSide(side) { this.side = normalizeSide(side); return this; }
  setSize(size) { this.size = Math.max(0, finite(size, this.size)); return this; }
  setGap(gap) { this.gap = Math.max(0, finite(gap, this.gap)); return this; }

  plan({ viewportWidth = Infinity, viewportHeight = Infinity } = {}) {
    const vertical = this.side === 'left' || this.side === 'right';
    const viewport = vertical ? viewportDimension(viewportWidth) : viewportDimension(viewportHeight);
    const min = vertical ? 160 : 120;
    const requested = this.size || min;
    const max = viewport === Infinity ? Infinity : Math.max(min, viewport);
    const size = clamp(requested, min, max);
    const gap = Math.max(0, this.gap);
    const inset = this.mode === 'push' ? size + gap : 0;

    const panel = vertical
      ? {
          position: 'fixed', top: '0px', bottom: '0px',
          left: this.side === 'left' ? '0px' : 'auto',
          right: this.side === 'right' ? '0px' : 'auto',
          width: `${size}px`, height: 'auto'
        }
      : {
          position: 'fixed', left: '0px', right: '0px',
          top: this.side === 'top' ? '0px' : 'auto',
          bottom: this.side === 'bottom' ? '0px' : 'auto',
          width: 'auto', height: `${size}px`
        };

    const contentInset = { top:0, right:0, bottom:0, left:0 };
    contentInset[this.side] = inset;

    return {
      mode: this.mode,
      side: this.side,
      size,
      gap,
      panel,
      contentInset,
      cssVariables: {
        '--nlab-inspector-dock-size': `${size}px`,
        '--nlab-inspector-dock-gap': `${gap}px`,
        '--nlab-inspector-push-top': `${contentInset.top}px`,
        '--nlab-inspector-push-right': `${contentInset.right}px`,
        '--nlab-inspector-push-bottom': `${contentInset.bottom}px`,
        '--nlab-inspector-push-left': `${contentInset.left}px`
      }
    };
  }

  snapshot(options = {}) {
    const plan = this.plan(options);
    return { mode:plan.mode, side:plan.side, size:plan.size, gap:plan.gap, contentInset:{...plan.contentInset} };
  }

  apply({ panel = null, content = null, viewportWidth = Infinity, viewportHeight = Infinity } = {}) {
    const plan = this.plan({ viewportWidth, viewportHeight });
    if (!panel && !content) return { applied:false, reason:'no-target', plan };

    if (panel?.dataset) {
      panel.dataset.dockMode = plan.mode;
      panel.dataset.dockSide = plan.side;
    }
    if (content?.dataset) content.dataset.inspectorDockMode = plan.mode;

    if (panel?.style) {
      for (const [property, value] of Object.entries(plan.panel)) setStyle(panel.style, property, value);
      for (const [property, value] of Object.entries(plan.cssVariables)) setStyle(panel.style, property, value);
    }

    if (content?.style) {
      for (const side of SIDES) {
        const property = `margin-${side}`;
        const inset = plan.contentInset[side];
        if (inset > 0) setStyle(content.style, property, `${inset}px`);
        else clearStyle(content.style, property);
      }
      for (const [property, value] of Object.entries(plan.cssVariables)) setStyle(content.style, property, value);
    }

    return { applied:true, reason:null, plan };
  }
}
