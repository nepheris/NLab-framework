const DEFAULT_SELECTOR = 'input,select,textarea,button,[data-control]';

const text = (value) => String(value ?? '').trim();

function sortedObject(input) {
  const output = {};
  for (const key of Object.keys(input ?? {}).sort()) output[key] = input[key];
  return output;
}

function optionDescriptor(option) {
  return {
    value: String(option?.value ?? ''),
    label: text(option?.label ?? option?.textContent ?? option?.text ?? option?.value),
    disabled: Boolean(option?.disabled),
    selected: Boolean(option?.selected)
  };
}

function selectedValue(element, type, tag) {
  const nativeType = text(element?.type).toLowerCase();
  if (nativeType === 'checkbox' || nativeType === 'radio' || type === 'checkbox' || type === 'radio') return Boolean(element?.checked);
  if (tag === 'select' && Boolean(element?.multiple)) {
    return Array.from(element?.selectedOptions ?? []).map((option) => String(option?.value ?? ''));
  }
  return element?.value == null ? '' : String(element.value);
}

function controlLabel(element) {
  const explicit = text(element?.dataset?.label ?? element?.getAttribute?.('aria-label'));
  if (explicit) return explicit;
  const label = Array.from(element?.labels ?? [])[0];
  if (label) return text(label.textContent);
  return text(element?.placeholder ?? element?.title ?? element?.textContent);
}

function sourceId(element) {
  return text(element?.dataset?.controlId ?? element?.id ?? element?.name);
}

function normalizedType(element, tag) {
  const override = text(element?.dataset?.controlType).toLowerCase();
  if (override) return override;
  const nativeType = text(element?.type).toLowerCase();
  return nativeType || tag || 'control';
}

function collectElements(root, selector) {
  if (!root) return [];
  if (typeof root.querySelectorAll === 'function') return Array.from(root.querySelectorAll(selector));
  if (Array.isArray(root)) return [...root];
  if (typeof root[Symbol.iterator] === 'function') return Array.from(root);
  return [];
}

export class InspectorControlInventory {
  scan(root, { selector = DEFAULT_SELECTOR, includeDisabled = true } = {}) {
    const elements = collectElements(root, selector);
    const seen = new Map();
    const result = [];

    elements.forEach((element, index) => {
      if (!includeDisabled && Boolean(element?.disabled)) return;
      const tag = text(element?.tagName).toLowerCase() || 'control';
      const type = normalizedType(element, tag);
      const originalId = sourceId(element);
      const baseId = originalId || `control-${index + 1}`;
      const count = (seen.get(baseId) ?? 0) + 1;
      seen.set(baseId, count);
      const id = count === 1 ? baseId : `${baseId}#${count}`;
      const descriptor = {
        id,
        sourceId: originalId || null,
        tag,
        type,
        name: text(element?.name) || null,
        label: controlLabel(element) || null,
        value: selectedValue(element, type, tag),
        disabled: Boolean(element?.disabled),
        required: Boolean(element?.required),
        readOnly: Boolean(element?.readOnly),
        hidden: Boolean(element?.hidden),
        constraints: {},
        dataset: sortedObject(element?.dataset ?? {})
      };

      const constraintKeys = ['min','max','step','minLength','maxLength','pattern','placeholder'];
      for (const key of constraintKeys) {
        const value = element?.[key];
        if (value !== undefined && value !== null && value !== '' && value !== -1) descriptor.constraints[key] = value;
      }
      if (tag === 'select') descriptor.options = Array.from(element?.options ?? []).map(optionDescriptor);
      result.push(descriptor);
    });

    return result;
  }

  summarize(inventory = []) {
    const rows = Array.isArray(inventory) ? inventory : [];
    const byType = {};
    let disabled = 0;
    let required = 0;
    let hidden = 0;
    for (const row of rows) {
      const type = text(row?.type) || 'control';
      byType[type] = (byType[type] ?? 0) + 1;
      if (row?.disabled) disabled += 1;
      if (row?.required) required += 1;
      if (row?.hidden) hidden += 1;
    }
    return { total: rows.length, enabled: rows.length - disabled, disabled, required, hidden, byType: sortedObject(byType) };
  }
}

export { DEFAULT_SELECTOR as INSPECTOR_CONTROL_SELECTOR };
