export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function applyBoxConfig(element, config = {}) {
  if (!element) return element;
  const style = element.style;
  const map = {
    width: 'width', minWidth: 'minWidth', maxWidth: 'maxWidth',
    height: 'height', minHeight: 'minHeight', maxHeight: 'maxHeight',
    padding: 'padding', margin: 'margin', gap: 'gap'
  };
  for (const [key, cssKey] of Object.entries(map)) {
    if (config[key] !== undefined && config[key] !== null) style[cssKey] = typeof config[key] === 'number' ? `${config[key]}px` : String(config[key]);
  }
  if (config.hidden !== undefined) element.hidden = Boolean(config.hidden);
  if (config.locked !== undefined) element.dataset.locked = String(Boolean(config.locked));
  return element;
}

export function createLayoutElement(type, { className = '', id = null, content = null, config = {} } = {}) {
  if (!globalThis.document) throw new Error('DOM is required');
  const tagByType = { header: 'header', footer: 'footer', hero: 'section', section: 'section', sidebar: 'aside', container: 'div' };
  const tag = tagByType[type] ?? 'div';
  const element = document.createElement(tag);
  element.className = [`nlab-${type}`, className].filter(Boolean).join(' ');
  if (id) element.id = id;
  if (typeof content === 'string') element.innerHTML = content;
  else if (content instanceof Node) element.append(content);
  return applyBoxConfig(element, config);
}
