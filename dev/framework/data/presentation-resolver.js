function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function cloneConfig(value, ancestors = new WeakSet()) {
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new TypeError('Presentation configuration must not be circular');
    ancestors.add(value);
    const copy = value.map((item) => cloneConfig(item, ancestors));
    ancestors.delete(value);
    return copy;
  }
  if (!isPlainObject(value)) return value;
  if (ancestors.has(value)) throw new TypeError('Presentation configuration must not be circular');
  ancestors.add(value);
  const copy = {};
  for (const [key, item] of Object.entries(value)) copy[key] = cloneConfig(item, ancestors);
  ancestors.delete(value);
  return copy;
}

function configObject(value, label) {
  if (value == null) return {};
  if (!isPlainObject(value)) throw new TypeError(`${label} must be an object`);
  return cloneConfig(value);
}

function viewObject(value, label) {
  if (value == null) return {};
  if (!isPlainObject(value)) throw new TypeError(`${label} must be an object`);
  return cloneConfig(value);
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined);
}

function outputValue(value) {
  return cloneConfig(value);
}

export class PresentationResolver {
  constructor({ defaults = {}, byType = {} } = {}) {
    this.defaults = configObject(defaults, 'defaults');
    const typeConfigs = configObject(byType, 'byType');
    this.byType = {};
    for (const [type, config] of Object.entries(typeConfigs)) {
      this.byType[type] = configObject(config, `byType.${type}`);
    }
  }

  resolve({ type = 'collection', schema = {}, override = {} } = {}) {
    const typeKey = String(type ?? 'collection').trim() || 'collection';
    const schemaConfig = configObject(schema, 'schema');
    const overrideConfig = configObject(override, 'override');
    const typeConfig = this.byType[typeKey] ?? {};
    const base = { ...this.defaults, ...typeConfig };

    return {
      renderer: outputValue(firstDefined(
        overrideConfig.renderer,
        schemaConfig.renderer,
        base.renderer,
        'table'
      )),
      view: {
        ...viewObject(base.view, 'base.view'),
        ...viewObject(schemaConfig.view, 'schema.view'),
        ...viewObject(overrideConfig.view, 'override.view')
      },
      sort: outputValue(firstDefined(
        overrideConfig.sort,
        schemaConfig.defaultSort,
        base.sort,
        null
      )),
      groupBy: outputValue(firstDefined(
        overrideConfig.groupBy,
        schemaConfig.defaultGroupBy,
        base.groupBy,
        null
      )),
      filter: outputValue(firstDefined(
        overrideConfig.filter,
        base.filter,
        null
      ))
    };
  }
}
