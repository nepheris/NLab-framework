import { SearchWiz } from './search-wiz.js';
import { FilterWiz } from './filter-wiz.js';
import { PaginationModel } from '../components/pagination.js';

const DEFAULT_MIN_COLUMN_WIDTH = 56;
const DEFAULT_MAX_COLUMN_WIDTH = 1600;
const DEFAULT_COLUMN_WIDTH = 120;
const DEFAULT_RESIZE_STEP = 12;
const PROFILE_VERSION = 1;
const UNSAFE_PATH_PARTS = new Set(['__proto__', 'prototype', 'constructor']);

const asArray = (value) => Array.isArray(value) ? value : [];
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const cloneColumn = (column) => ({ ...column });
const finiteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const positiveNumber = (value, fallback) => {
  const number = finiteNumber(value);
  return number != null && number > 0 ? number : fallback;
};
const pixelWidth = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)px$/i);
  return match ? Number(match[1]) : null;
};
const cssWidth = (value) => typeof value === 'number' ? `${value}px` : String(value);
const columnId = (column) => column?.id ?? column?.field ?? null;
const normalizeDirection = (direction) => String(direction ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
const normalizeViewMode = (mode) => {
  const value = String(mode ?? 'table').toLowerCase();
  return ['table', 'stacked', 'auto'].includes(value) ? value : 'table';
};
const searchableFields = (columns) => columns
  .filter((column) => column.searchable !== false)
  .map((column) => column.field ?? column.id)
  .filter(Boolean);
const invalidRegex = (value, flags = 'i') => {
  try {
    if (value instanceof RegExp) return null;
    new RegExp(String(value ?? ''), flags);
    return null;
  } catch (error) {
    return error;
  }
};
const pathParts = (path) => {
  const parts = String(path ?? '').split('.').filter(Boolean);
  return parts.length && parts.every((part) => !UNSAFE_PATH_PARTS.has(part)) ? parts : null;
};
const getPath = (object, path) => {
  const parts = pathParts(path);
  if (!parts) return undefined;
  return parts.reduce((current, part) => current?.[part], object);
};
const setPath = (object, path, value) => {
  const parts = pathParts(path);
  if (!parts || !object || typeof object !== 'object') return false;
  let current = object;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) current[part] = {};
    current = current[part];
  }
  current[parts.at(-1)] = value;
  return true;
};
const cloneForPath = (object, path) => {
  if (!isPlainObject(object)) return object;
  const parts = pathParts(path);
  if (!parts) return { ...object };
  const root = { ...object };
  let source = object;
  let target = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    const sourceNext = source?.[part];
    const targetNext = isPlainObject(sourceNext) ? { ...sourceNext } : {};
    target[part] = targetNext;
    source = sourceNext;
    target = targetNext;
  }
  return root;
};
const safeClone = (value, seen = new WeakMap()) => {
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new TypeError('Circular profile data is not supported');
    seen.set(value, true);
    const result = value.map((item) => safeClone(item, seen));
    seen.delete(value);
    return result;
  }
  if (!isPlainObject(value)) return value;
  if (seen.has(value)) throw new TypeError('Circular profile data is not supported');
  seen.set(value, true);
  const result = {};
  for (const [key, item] of Object.entries(value)) result[key] = safeClone(item, seen);
  seen.delete(value);
  return result;
};
const normalizedProfileName = (name) => {
  const value = typeof name === 'string' ? name.trim() : '';
  return value || null;
};
const storageLike = (storage) => Boolean(
  storage
  && typeof storage.getItem === 'function'
  && typeof storage.setItem === 'function'
);
const editType = (column) => String(column?.editor?.type ?? column?.type ?? 'text').toLowerCase();
const booleanValue = (value) => {
  if (typeof value === 'boolean') return { ok:true, value };
  if (value === 1 || value === 0) return { ok:true, value:Boolean(value) };
  const text = String(value ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'oui', 'on'].includes(text)) return { ok:true, value:true };
  if (['false', '0', 'no', 'non', 'off'].includes(text)) return { ok:true, value:false };
  return { ok:false, message:'Expected a boolean value.' };
};

export class TableWiz {
  constructor({
    columns = [],
    profile = null,
    profiles = null,
    profileStorage = null,
    profileStorageKey = 'nlab.tablewiz.profiles',
    pageSize = 24,
    resizable = true,
    minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
    maxColumnWidth = DEFAULT_MAX_COLUMN_WIDTH,
    resizeStep = DEFAULT_RESIZE_STEP,
    viewMode = 'table',
    standalone = false,
    mobileBreakpoint = 720,
    editable = false,
    rowKey = 'id',
    onEdit = null
  } = {}) {
    this.columns = asArray(columns).map((column, index) => ({
      visible:true,
      sortable:true,
      searchable:true,
      resizable:true,
      order:index,
      ...(column && typeof column === 'object' ? column : {})
    }));
    this.initialColumns = this.columns.map(cloneColumn);
    this.profile = profile;
    this.activeProfile = null;
    this.profiles = new Map();
    this.profileStorage = profileStorage;
    this.profileStorageKey = String(profileStorageKey ?? 'nlab.tablewiz.profiles');
    this.searchWiz = new SearchWiz();
    this.filterWiz = new FilterWiz();
    this.pagination = new PaginationModel({ pageSize });
    this.sortState = null;
    this.query = '';
    this.queryOptions = {};
    this.filters = [];
    this.lastError = null;
    this.resizable = Boolean(resizable);
    this.minColumnWidth = positiveNumber(minColumnWidth, DEFAULT_MIN_COLUMN_WIDTH);
    this.maxColumnWidth = Math.max(this.minColumnWidth, positiveNumber(maxColumnWidth, DEFAULT_MAX_COLUMN_WIDTH));
    this.resizeStep = positiveNumber(resizeStep, DEFAULT_RESIZE_STEP);
    this.viewMode = normalizeViewMode(viewMode);
    this.standalone = Boolean(standalone);
    this.mobileBreakpoint = positiveNumber(mobileBreakpoint, 720);
    this.editable = Boolean(editable);
    this.rowKey = typeof rowKey === 'string' && rowKey.trim() ? rowKey.trim() : 'id';
    this.onEdit = typeof onEdit === 'function' ? onEdit : null;
    this._renderCleanup = [];

    this.registerProfiles(profiles);
  }

  setQuery(query, options = {}) {
    this.query = query ?? '';
    this.queryOptions = options && typeof options === 'object' && !Array.isArray(options) ? { ...options } : {};
    this.pagination.setPage(1);
    this.#markProfileDirty();
    return this;
  }

  setFilters(filters) {
    this.filters = Array.isArray(filters) ? [...filters] : (filters && typeof filters === 'object' ? [filters] : []);
    this.pagination.setPage(1);
    this.#markProfileDirty();
    return this;
  }

  setRegexFilter(field, value, flags = 'i') {
    const normalizedField = typeof field === 'string' ? field.trim() : '';
    if (!normalizedField) {
      this.lastError = { code:'INVALID_REGEX_FIELD', stage:'filter', message:'Regex filter requires a field.' };
      return this;
    }
    const next = this.filters.filter((filter) => !(
      filter?.field === normalizedField
      && String(filter?.operator ?? '').toLowerCase() === 'regex'
    ));
    next.push({ field:normalizedField, operator:'regex', value, flags });
    return this.setFilters(next);
  }

  setSort(field, direction = 'asc') {
    this.sortState = field ? { field, direction:normalizeDirection(direction) } : null;
    this.pagination.setPage(1);
    this.#markProfileDirty();
    return this;
  }

  toggleSort(field) {
    if (!field) return this.setSort(null);
    const direction = this.sortState?.field === field && this.sortState.direction === 'asc' ? 'desc' : 'asc';
    return this.setSort(field, direction);
  }

  clearSort() { return this.setSort(null); }

  reset({
    query = true,
    filters = true,
    sort = true,
    page = true,
    columns = false,
    view = false
  } = {}) {
    if (query) {
      this.query = '';
      this.queryOptions = {};
    }
    if (filters) this.filters = [];
    if (sort) this.sortState = null;
    if (columns) this.resetColumns();
    if (view) {
      this.viewMode = 'table';
      this.standalone = false;
    }
    if (page) this.pagination.setPage(1);
    this.activeProfile = null;
    this.lastError = null;
    return this;
  }

  resetColumns() {
    this.columns = this.initialColumns.map(cloneColumn);
    this.#markProfileDirty();
    return this;
  }

  setColumnVisible(id, visible) {
    const column = this.#column(id);
    if (column) {
      column.visible = Boolean(visible);
      this.#markProfileDirty();
    }
    return this;
  }

  setColumnsVisible(ids, visible = true) {
    const targets = new Set(asArray(ids));
    let changed = false;
    this.columns.forEach((column) => {
      if (targets.has(columnId(column))) {
        column.visible = Boolean(visible);
        changed = true;
      }
    });
    if (changed) this.#markProfileDirty();
    return this;
  }

  toggleColumn(id) {
    const column = this.#column(id);
    if (column) {
      column.visible = column.visible === false;
      this.#markProfileDirty();
    }
    return this;
  }

  showAllColumns() {
    this.columns.forEach((column) => { column.visible = true; });
    this.#markProfileDirty();
    return this;
  }

  visibleColumnIds() {
    return this.visibleColumns().map(columnId).filter((id) => id != null);
  }

  editableColumnIds() {
    return this.#orderedColumns()
      .filter((column) => this.#columnEditable(column))
      .map(columnId)
      .filter((id) => id != null);
  }

  columnState() {
    return this.#orderedColumns().map((column) => ({
      id:columnId(column),
      field:column.field ?? column.id ?? null,
      label:column.label ?? column.id ?? column.field ?? '',
      visible:column.visible !== false,
      order:column.order ?? 0,
      width:column.width ?? null,
      sticky:Boolean(column.sticky),
      resizable:this.resizable && column.resizable !== false,
      editable:this.#columnEditable(column),
      type:editType(column)
    }));
  }

  toolbarState() {
    const columns = this.columnState();
    return {
      query:this.query,
      filters:this.filters.map((filter) => filter && typeof filter === 'object' ? { ...filter } : filter),
      sort:this.sortState ? { ...this.sortState } : null,
      columns,
      counts:{
        columns:columns.length,
        visibleColumns:columns.filter((column) => column.visible).length,
        editableColumns:columns.filter((column) => column.editable).length
      },
      view:{
        mode:this.viewMode,
        standalone:this.standalone,
        mobileBreakpoint:this.mobileBreakpoint
      },
      profiles:{
        active:this.activeProfile,
        names:this.profileNames()
      },
      canReset:Boolean(
        this.query
        || this.filters.length
        || this.sortState
        || this.#columnStateDirty()
        || this.viewMode !== 'table'
        || this.standalone
      )
    };
  }

  setViewMode(mode) {
    this.viewMode = normalizeViewMode(mode);
    this.#markProfileDirty();
    return this;
  }

  setStandalone(enabled = true) {
    this.standalone = Boolean(enabled);
    this.#markProfileDirty();
    return this;
  }

  setMobileBreakpoint(value) {
    this.mobileBreakpoint = positiveNumber(value, this.mobileBreakpoint);
    this.#markProfileDirty();
    return this;
  }

  setEditable(enabled = true) {
    this.editable = Boolean(enabled);
    return this;
  }

  columnWidth(id, fallback = null) {
    const column = this.#column(id);
    if (!column) return fallback;
    const numeric = pixelWidth(column.width);
    return numeric == null ? fallback : this.#clampWidth(column, numeric);
  }

  setColumnWidth(id, width) {
    const column = this.#column(id);
    if (!column) return this;
    if (width == null || width === '') {
      delete column.width;
      this.#markProfileDirty();
      return this;
    }
    const numeric = pixelWidth(width);
    if (numeric != null) {
      column.width = this.#clampWidth(column, numeric);
      this.#markProfileDirty();
      return this;
    }
    if (typeof width === 'string' && width.trim()) {
      column.width = width.trim();
      this.#markProfileDirty();
    }
    return this;
  }

  resizeColumn(id, width) {
    const column = this.#column(id);
    if (!column || !this.resizable || column.resizable === false) return this;
    const numeric = pixelWidth(width);
    if (numeric == null) return this;
    column.width = this.#clampWidth(column, numeric);
    this.#markProfileDirty();
    return this;
  }

  adjustColumnWidth(id, delta, { fallback = DEFAULT_COLUMN_WIDTH } = {}) {
    const current = this.columnWidth(id, positiveNumber(fallback, DEFAULT_COLUMN_WIDTH));
    const change = finiteNumber(delta);
    if (current == null || change == null) return this;
    return this.resizeColumn(id, current + change);
  }

  resetColumnWidth(id) {
    const column = this.#column(id);
    if (column) {
      delete column.width;
      this.#markProfileDirty();
    }
    return this;
  }

  setSticky(id, sticky = true) {
    const column = this.#column(id);
    if (column) {
      column.sticky = Boolean(sticky);
      this.#markProfileDirty();
    }
    return this;
  }

  reorder(ids) {
    const requested = [];
    const seen = new Set();
    for (const id of asArray(ids)) {
      if (seen.has(id) || !this.#column(id)) continue;
      seen.add(id);
      requested.push(id);
    }
    const ordered = this.#orderedColumns();
    const byId = new Map(ordered.map((column) => [columnId(column), column]));
    const next = [
      ...requested.map((id) => byId.get(id)).filter(Boolean),
      ...ordered.filter((column) => !seen.has(columnId(column)))
    ];
    next.forEach((column, index) => { column.order = index; });
    this.#markProfileDirty();
    return this;
  }

  moveColumn(id, targetIndex) {
    const ordered = this.#orderedColumns();
    const currentIndex = ordered.findIndex((column) => columnId(column) === id);
    const numeric = finiteNumber(targetIndex);
    if (currentIndex < 0 || numeric == null) return this;
    const [column] = ordered.splice(currentIndex, 1);
    ordered.splice(Math.min(ordered.length, Math.max(0, Math.trunc(numeric))), 0, column);
    ordered.forEach((entry, index) => { entry.order = index; });
    this.#markProfileDirty();
    return this;
  }

  resetColumnOrder() {
    const baseline = new Map(this.initialColumns.map((column, index) => [columnId(column), column.order ?? index]));
    this.columns.forEach((column, index) => { column.order = baseline.get(columnId(column)) ?? index; });
    this.#markProfileDirty();
    return this;
  }

  applyColumnState(state) {
    const ordered = [];
    for (const entry of asArray(state).filter((item) => item && typeof item === 'object')) {
      const id = entry.id ?? entry.field;
      const column = this.#column(id);
      if (!column) continue;
      if ('visible' in entry) column.visible = Boolean(entry.visible);
      if ('width' in entry) this.setColumnWidth(id, entry.width);
      if ('sticky' in entry) column.sticky = Boolean(entry.sticky);
      if (Number.isFinite(Number(entry.order))) ordered.push({ id, order:Number(entry.order) });
    }
    if (ordered.length) {
      ordered.sort((left, right) => left.order - right.order);
      this.reorder(ordered.map((entry) => entry.id));
    }
    this.#markProfileDirty();
    return this;
  }

  visibleColumns() {
    return this.#orderedColumns().filter((column) => column.visible !== false);
  }

  process(items) {
    let rows = [...asArray(items)];
    this.lastError = null;

    if (this.query) {
      try {
        rows = this.searchWiz.search(rows, this.query, {
          ...this.queryOptions,
          fields:this.queryOptions.fields ?? searchableFields(this.columns)
        }).items;
      } catch (error) {
        this.lastError = { code:'INVALID_SEARCH', stage:'search', message:error?.message ?? String(error) };
        rows = [];
      }
    }

    if (this.filters.length) {
      const invalid = this.filters.find((filter) => (
        String(filter?.operator ?? '').toLowerCase() === 'regex'
        && invalidRegex(filter?.value, filter?.flags ?? 'i')
      ));
      if (invalid) {
        const error = invalidRegex(invalid.value, invalid.flags ?? 'i');
        this.lastError = {
          code:'INVALID_REGEX',
          stage:'filter',
          field:invalid.field,
          message:error?.message ?? 'Invalid regular expression.'
        };
      }
      try {
        rows = this.filterWiz.apply(rows, this.filters).items;
      } catch (error) {
        this.lastError = { code:'FILTER_ERROR', stage:'filter', message:error?.message ?? String(error) };
        rows = [];
      }
    }

    if (this.sortState) {
      const { field, direction } = this.sortState;
      const sign = direction === 'desc' ? -1 : 1;
      rows.sort((left, right) => {
        const leftValue = getPath(left, field);
        const rightValue = getPath(right, field);
        if (leftValue === rightValue) return 0;
        if (leftValue == null) return 1;
        if (rightValue == null) return -1;
        return (
          typeof leftValue === 'number' && typeof rightValue === 'number'
            ? leftValue - rightValue
            : String(leftValue).localeCompare(String(rightValue), undefined, { numeric:true, sensitivity:'base' })
        ) * sign;
      });
    }

    this.pagination.setTotal(rows.length);
    return {
      all:rows,
      page:this.pagination.slice(rows),
      total:rows.length,
      pageModel:this.pagination,
      error:this.lastError
    };
  }

  coerceCellValue(id, rawValue, { row = null, currentValue = undefined } = {}) {
    const column = this.#column(id);
    if (!column) return this.#editFailure('UNKNOWN_COLUMN', `Unknown column: ${String(id)}`, { columnId:id });
    const field = column.field ?? column.id;
    const context = { column:cloneColumn(column), field, row, currentValue };
    try {
      let value = rawValue;
      const parser = typeof column.parse === 'function'
        ? column.parse
        : typeof column.editor?.parse === 'function'
          ? column.editor.parse
          : null;
      if (parser) value = parser(rawValue, context);
      else {
        const type = editType(column);
        const nullable = Boolean(column.nullable ?? column.editor?.nullable);
        const required = Boolean(column.required ?? column.editor?.required);
        if ((value === '' || value == null) && nullable && !required) value = null;
        else if (type === 'number' || type === 'integer') {
          if (value === '' || value == null || typeof value === 'boolean') {
            return this.#editFailure('INVALID_NUMBER', `Column ${String(id)} requires a number.`, { columnId:id, value:rawValue });
          }
          const number = Number(value);
          if (!Number.isFinite(number) || (type === 'integer' && !Number.isInteger(number))) {
            return this.#editFailure(
              type === 'integer' ? 'INVALID_INTEGER' : 'INVALID_NUMBER',
              `Column ${String(id)} requires ${type === 'integer' ? 'an integer' : 'a number'}.`,
              { columnId:id, value:rawValue }
            );
          }
          value = number;
        } else if (type === 'boolean') {
          const parsed = booleanValue(value);
          if (!parsed.ok) return this.#editFailure('INVALID_BOOLEAN', parsed.message, { columnId:id, value:rawValue });
          value = parsed.value;
        } else if (type === 'tags' || type === 'list') {
          const separator = String(column.separator ?? column.editor?.separator ?? ',');
          const values = Array.isArray(value) ? value : String(value ?? '').split(separator);
          const normalized = values
            .map((item) => typeof item === 'string' ? item.trim() : item)
            .filter((item) => item !== '' && item != null);
          value = column.unique === false ? normalized : [...new Set(normalized)];
        } else if (type === 'json') {
          if (typeof value === 'string') {
            try { value = JSON.parse(value); }
            catch (error) {
              return this.#editFailure('INVALID_JSON', error?.message ?? 'Invalid JSON.', { columnId:id, value:rawValue });
            }
          } else value = safeClone(value);
        } else if (type === 'date') {
          value = String(value ?? '');
          if (value && !Number.isFinite(new Date(value).getTime())) {
            return this.#editFailure('INVALID_DATE', `Column ${String(id)} requires a valid date.`, { columnId:id, value:rawValue });
          }
        } else {
          value = value == null ? '' : String(value);
        }
      }

      const required = Boolean(column.required ?? column.editor?.required);
      if (required && (value == null || value === '' || (Array.isArray(value) && value.length === 0))) {
        return this.#editFailure('REQUIRED_VALUE', `Column ${String(id)} requires a value.`, { columnId:id });
      }

      const validator = typeof column.validate === 'function'
        ? column.validate
        : typeof column.editor?.validate === 'function'
          ? column.editor.validate
          : null;
      if (validator) {
        const validation = validator(value, { ...context, rawValue });
        if (validation === false) {
          return this.#editFailure('VALIDATION_FAILED', `Validation failed for ${String(id)}.`, { columnId:id, value });
        }
        if (typeof validation === 'string' && validation) {
          return this.#editFailure('VALIDATION_FAILED', validation, { columnId:id, value });
        }
        if (validation instanceof Error) {
          return this.#editFailure('VALIDATION_FAILED', validation.message, { columnId:id, value });
        }
      }

      this.lastError = null;
      return { ok:true, value, column:cloneColumn(column), field, error:null };
    } catch (error) {
      return this.#editFailure('EDIT_PARSER_ERROR', error?.message ?? String(error), { columnId:id, value:rawValue });
    }
  }

  editRecord(row, id, rawValue, {
    mutate = false,
    onChange = null,
    rowIndex = null,
    items = null
  } = {}) {
    if (!isPlainObject(row)) return this.#editFailure('INVALID_ROW', 'Editable row must be an object.', { columnId:id, rowIndex });
    const column = this.#column(id);
    if (!column) return this.#editFailure('UNKNOWN_COLUMN', `Unknown column: ${String(id)}`, { columnId:id, rowIndex });
    if (!this.#columnEditable(column)) {
      return this.#editFailure('COLUMN_NOT_EDITABLE', `Column ${String(id)} is not editable.`, { columnId:id, rowIndex });
    }
    const field = column.field ?? column.id;
    if (!pathParts(field)) return this.#editFailure('UNSAFE_FIELD_PATH', `Unsafe field path: ${String(field)}`, { columnId:id, rowIndex });
    const previous = getPath(row, field);
    const coerced = this.coerceCellValue(id, rawValue, { row, currentValue:previous });
    if (!coerced.ok) return { ...coerced, row, rowIndex };

    const nextRow = mutate ? row : cloneForPath(row, field);
    if (!setPath(nextRow, field, coerced.value)) {
      return this.#editFailure('EDIT_WRITE_FAILED', `Could not write field ${String(field)}.`, { columnId:id, rowIndex });
    }
    const event = {
      columnId:columnId(column),
      field,
      rowIndex,
      previous,
      value:coerced.value,
      row:nextRow,
      items,
      column:cloneColumn(column)
    };
    const callback = typeof onChange === 'function' ? onChange : this.onEdit;
    if (typeof callback === 'function') callback(event);
    this.lastError = null;
    return { ok:true, row:nextRow, value:coerced.value, previous, event, error:null };
  }

  editCell(items, rowIndex, id, rawValue, { mutate = false, onChange = null } = {}) {
    const source = asArray(items);
    const index = Number(rowIndex);
    if (!Number.isInteger(index) || index < 0 || index >= source.length) {
      return this.#editFailure('INVALID_ROW_INDEX', 'Row index is outside the source collection.', { columnId:id, rowIndex });
    }
    const nextItems = mutate ? source : [...source];
    const edit = this.editRecord(source[index], id, rawValue, {
      mutate,
      onChange,
      rowIndex:index,
      items:nextItems
    });
    if (!edit.ok) return { ...edit, items:source };
    if (!mutate) nextItems[index] = edit.row;
    return { ...edit, items:nextItems, rowIndex:index };
  }

  editRow(items, rowIndex, changes, { mutate = false, onChange = null } = {}) {
    const source = asArray(items);
    const index = Number(rowIndex);
    if (!Number.isInteger(index) || index < 0 || index >= source.length) {
      return this.#editFailure('INVALID_ROW_INDEX', 'Row index is outside the source collection.', { rowIndex });
    }
    if (!isPlainObject(changes)) return this.#editFailure('INVALID_CHANGES', 'Row changes must be an object.', { rowIndex });

    let working = safeClone(source[index]);
    const events = [];
    for (const [id, rawValue] of Object.entries(changes)) {
      const edit = this.editRecord(working, id, rawValue, {
        mutate:true,
        onChange:(event) => events.push(event),
        rowIndex:index,
        items:source
      });
      if (!edit.ok) return { ...edit, items:source, row:source[index], events:[] };
      working = edit.row;
    }

    const nextItems = mutate ? source : [...source];
    if (mutate) {
      Object.keys(source[index]).forEach((key) => { delete source[index][key]; });
      Object.assign(source[index], working);
      working = source[index];
    } else nextItems[index] = working;

    const callback = typeof onChange === 'function' ? onChange : this.onEdit;
    if (typeof callback === 'function') {
      for (const event of events) callback({ ...event, row:working, items:nextItems });
    }
    this.lastError = null;
    return { ok:true, items:nextItems, row:working, rowIndex:index, events, error:null };
  }

  snapshotProfile({
    includeQuery = true,
    includeFilters = true,
    includeSort = true,
    includeColumns = true,
    includeView = true,
    includePagination = true
  } = {}) {
    const snapshot = { version:PROFILE_VERSION };
    if (includeQuery) {
      snapshot.query = this.query;
      snapshot.queryOptions = safeClone(this.queryOptions);
    }
    if (includeFilters) snapshot.filters = safeClone(this.filters);
    if (includeSort) snapshot.sort = this.sortState ? { ...this.sortState } : null;
    if (includeColumns) snapshot.columns = safeClone(this.columnState());
    if (includeView) snapshot.view = {
      mode:this.viewMode,
      standalone:this.standalone,
      mobileBreakpoint:this.mobileBreakpoint
    };
    if (includePagination) snapshot.pagination = {
      page:this.pagination.page,
      pageSize:this.pagination.pageSize
    };
    return snapshot;
  }

  registerProfile(name, profile = this.snapshotProfile()) {
    const normalized = normalizedProfileName(name);
    if (!normalized) {
      this.lastError = { code:'INVALID_PROFILE_NAME', stage:'profile', message:'Profile name is required.' };
      return this;
    }
    const validation = this.#validateProfile(profile);
    if (!validation.ok) {
      this.lastError = validation.error;
      return this;
    }
    this.profiles.set(normalized, safeClone(profile));
    this.lastError = null;
    return this;
  }

  registerProfiles(profiles) {
    if (!profiles) return this;
    if (profiles instanceof Map) {
      for (const [name, profile] of profiles.entries()) this.registerProfile(name, profile);
      return this;
    }
    if (isPlainObject(profiles)) {
      for (const [name, profile] of Object.entries(profiles)) this.registerProfile(name, profile);
    }
    return this;
  }

  removeProfile(name) {
    const normalized = normalizedProfileName(name);
    if (normalized) {
      this.profiles.delete(normalized);
      if (this.activeProfile === normalized) this.activeProfile = null;
    }
    return this;
  }

  profileNames() {
    return [...this.profiles.keys()].sort((left, right) => left.localeCompare(right));
  }

  profileState(name) {
    const normalized = normalizedProfileName(name);
    const profile = normalized ? this.profiles.get(normalized) : null;
    return profile ? safeClone(profile) : null;
  }

  applyProfile(profileOrName, {
    query = true,
    filters = true,
    sort = true,
    columns = true,
    view = true,
    pagination = true
  } = {}) {
    const name = typeof profileOrName === 'string' ? normalizedProfileName(profileOrName) : null;
    const profile = name ? this.profiles.get(name) : profileOrName;
    const validation = this.#validateProfile(profile);
    if (!validation.ok) {
      this.lastError = validation.error;
      return this;
    }

    const copy = safeClone(profile);
    if (query && 'query' in copy) {
      this.query = copy.query ?? '';
      this.queryOptions = isPlainObject(copy.queryOptions) ? { ...copy.queryOptions } : {};
    }
    if (filters && 'filters' in copy) this.filters = Array.isArray(copy.filters) ? safeClone(copy.filters) : [];
    if (sort && 'sort' in copy) {
      const field = copy.sort?.field;
      this.sortState = field ? { field, direction:normalizeDirection(copy.sort.direction) } : null;
    }
    if (columns && Array.isArray(copy.columns)) this.applyColumnState(copy.columns);
    if (view && isPlainObject(copy.view)) {
      if ('mode' in copy.view) this.viewMode = normalizeViewMode(copy.view.mode);
      if ('standalone' in copy.view) this.standalone = Boolean(copy.view.standalone);
      if ('mobileBreakpoint' in copy.view) this.mobileBreakpoint = positiveNumber(copy.view.mobileBreakpoint, this.mobileBreakpoint);
    }
    if (pagination && isPlainObject(copy.pagination)) {
      if ('pageSize' in copy.pagination) this.pagination.setPageSize(copy.pagination.pageSize);
      if ('page' in copy.pagination) this.pagination.setPage(copy.pagination.page);
    } else this.pagination.setPage(1);

    this.activeProfile = name;
    this.lastError = null;
    return this;
  }

  serializeProfiles(space = 0) {
    return JSON.stringify(Object.fromEntries(
      [...this.profiles.entries()].map(([name, profile]) => [name, safeClone(profile)])
    ), null, space);
  }

  importProfiles(value, { merge = true } = {}) {
    let parsed = value;
    if (typeof value === 'string') {
      try { parsed = JSON.parse(value); }
      catch (error) {
        this.lastError = { code:'INVALID_PROFILE_JSON', stage:'profile', message:error?.message ?? 'Invalid profile JSON.' };
        return this;
      }
    }
    if (!isPlainObject(parsed)) {
      this.lastError = { code:'INVALID_PROFILES', stage:'profile', message:'Profiles payload must be an object.' };
      return this;
    }

    const staged = new Map(merge ? this.profiles : []);
    for (const [name, profile] of Object.entries(parsed)) {
      const normalized = normalizedProfileName(name);
      const validation = this.#validateProfile(profile);
      if (!normalized || !validation.ok) {
        this.lastError = validation.ok
          ? { code:'INVALID_PROFILE_NAME', stage:'profile', message:'Profile name is required.' }
          : validation.error;
        return this;
      }
      staged.set(normalized, safeClone(profile));
    }
    this.profiles = staged;
    this.lastError = null;
    return this;
  }

  saveProfiles({
    storage = this.profileStorage,
    key = this.profileStorageKey
  } = {}) {
    if (!storageLike(storage)) {
      this.lastError = { code:'PROFILE_STORAGE_UNAVAILABLE', stage:'profile', message:'Profile storage must implement getItem/setItem.' };
      return false;
    }
    try {
      storage.setItem(String(key), this.serializeProfiles());
      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError = { code:'PROFILE_STORAGE_WRITE_FAILED', stage:'profile', message:error?.message ?? String(error) };
      return false;
    }
  }

  loadProfiles({
    storage = this.profileStorage,
    key = this.profileStorageKey,
    merge = true
  } = {}) {
    if (!storageLike(storage)) {
      this.lastError = { code:'PROFILE_STORAGE_UNAVAILABLE', stage:'profile', message:'Profile storage must implement getItem/setItem.' };
      return this;
    }
    try {
      const raw = storage.getItem(String(key));
      if (raw == null || raw === '') {
        this.lastError = null;
        return this;
      }
      return this.importProfiles(raw, { merge });
    } catch (error) {
      this.lastError = { code:'PROFILE_STORAGE_READ_FAILED', stage:'profile', message:error?.message ?? String(error) };
      return this;
    }
  }

  clearStoredProfiles({
    storage = this.profileStorage,
    key = this.profileStorageKey
  } = {}) {
    if (!storage || typeof storage.removeItem !== 'function') {
      this.lastError = { code:'PROFILE_STORAGE_UNAVAILABLE', stage:'profile', message:'Profile storage must implement removeItem.' };
      return false;
    }
    try {
      storage.removeItem(String(key));
      this.lastError = null;
      return true;
    } catch (error) {
      this.lastError = { code:'PROFILE_STORAGE_DELETE_FAILED', stage:'profile', message:error?.message ?? String(error) };
      return false;
    }
  }

  exportSelection(items, { rowIndexes = null, columnIds = null, processed = false } = {}) {
    const rows = processed ? this.process(items).all : asArray(items);
    const selectedRows = this.#exportRows(rows, rowIndexes);
    const columns = this.#exportColumns(columnIds);
    return selectedRows.map((row) => Object.fromEntries(
      columns.map((column) => {
        const field = column.field ?? column.id;
        return [field, getPath(row, field)];
      })
    ));
  }

  exportRow(items, index, { columnIds = null, processed = false } = {}) {
    return this.exportSelection(items, { rowIndexes:[index], columnIds, processed })[0] ?? null;
  }

  exportColumn(items, id, { rowIndexes = null, processed = false } = {}) {
    const column = this.#column(id);
    if (!column) return [];
    const rows = processed ? this.process(items).all : asArray(items);
    const field = column.field ?? column.id;
    return this.#exportRows(rows, rowIndexes).map((row) => getPath(row, field));
  }

  exportCSV(items, {
    delimiter = ';',
    rowIndexes = null,
    columnIds = null,
    processed = false
  } = {}) {
    const columns = this.#exportColumns(columnIds);
    const rows = this.#exportRows(processed ? this.process(items).all : asArray(items), rowIndexes);
    const quote = (value) => {
      const text = this.#exportText(value);
      return `"${text.replaceAll('"', '""')}"`;
    };
    return [
      columns.map((column) => quote(column.label ?? column.id ?? column.field)).join(delimiter),
      ...rows.map((row) => columns.map((column) => quote(getPath(row, column.field ?? column.id))).join(delimiter))
    ].join('\n');
  }

  exportJSON(items, space = 2) {
    return JSON.stringify(items ?? [], null, space);
  }

  exportSelectionJSON(items, { space = 2, ...options } = {}) {
    return JSON.stringify(this.exportSelection(items, options), null, space);
  }

  exportHTML(items, {
    title = 'TableWiz export',
    rowIndexes = null,
    columnIds = null,
    processed = false,
    landscape = true,
    lang = 'fr'
  } = {}) {
    const columns = this.#exportColumns(columnIds);
    const rows = this.#exportRows(processed ? this.process(items).all : asArray(items), rowIndexes);
    const escape = (value) => this.#escapeHtml(this.#exportText(value));
    const head = columns
      .map((column) => `<th scope="col">${escape(column.label ?? column.id ?? column.field)}</th>`)
      .join('');
    const body = rows
      .map((row) => `<tr>${columns.map((column) => `<td>${escape(getPath(row, column.field ?? column.id))}</td>`).join('')}</tr>`)
      .join('\n');
    const safeTitle = this.#escapeHtml(String(title ?? 'TableWiz export'));
    const safeLang = String(lang ?? 'fr').replace(/[^A-Za-z0-9-]/g, '') || 'fr';
    const pageSize = landscape ? 'landscape' : 'auto';
    return `<!doctype html>
<html lang="${safeLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>body{font-family:system-ui,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top}thead{display:table-header-group}tr{break-inside:avoid}@page{size:${pageSize};margin:12mm}@media print{body{margin:0}}</style>
</head>
<body>
<h1>${safeTitle}</h1>
<table>
<thead><tr>${head}</tr></thead>
<tbody>${body}</tbody>
</table>
</body>
</html>`;
  }

  exportPrintHTML(items, options = {}) {
    return this.exportHTML(items, { ...options, landscape:options.landscape ?? true });
  }

  destroy() {
    this.#clearRenderCleanup();
    return this;
  }

  render(container, items, {
    rowClass = null,
    onColumnResize = null,
    onCellEdit = null,
    editable = this.editable,
    viewMode = this.viewMode,
    standalone = this.standalone,
    mobileBreakpoint = this.mobileBreakpoint
  } = {}) {
    this.#clearRenderCleanup();
    const documentRef = container?.ownerDocument ?? globalThis.document;
    if (!container || !documentRef || typeof documentRef.createElement !== 'function') return;

    const { page } = this.process(items);
    const columns = this.visibleColumns();
    const effectiveMode = this.#effectiveViewMode(container, viewMode, mobileBreakpoint);
    const renderOptions = { rowClass, onColumnResize, onCellEdit, editable, viewMode, standalone, mobileBreakpoint };
    const rerender = () => this.render(container, items, renderOptions);

    if (effectiveMode === 'stacked') {
      const stacked = this.#renderStacked(documentRef, page, columns, rowClass);
      this.#mount(container, stacked, standalone, documentRef, effectiveMode);
      return;
    }

    const stickyOffsets = this.#stickyOffsets(columns);
    const table = documentRef.createElement('table');
    table.className = 'nlab-tablewiz';
    if (this.resizable) table.classList?.add?.('nlab-tablewiz--resizable');
    if (editable) table.classList?.add?.('nlab-tablewiz--editable');

    const colgroup = documentRef.createElement('colgroup');
    const colNodes = new Map();
    for (const column of columns) {
      const col = documentRef.createElement('col');
      const id = columnId(column);
      if (id != null) col.setAttribute?.('data-column-id', String(id));
      this.#applyWidthStyles(col, column, false);
      if (id != null) colNodes.set(id, col);
      colgroup.append?.(col);
    }
    table.append?.(colgroup);

    const notifyResize = (column) => {
      if (typeof onColumnResize !== 'function') return;
      const id = columnId(column);
      onColumnResize({ id, width:this.columnWidth(id), column:cloneColumn(column) });
    };

    const thead = documentRef.createElement('thead');
    const headRow = documentRef.createElement('tr');
    for (const column of columns) {
      const id = columnId(column);
      const field = column.field ?? column.id;
      const th = documentRef.createElement('th');
      th.textContent = column.label ?? column.id ?? field ?? '';
      if (id != null) th.setAttribute?.('data-column-id', String(id));
      this.#applyWidthStyles(th, column, true);
      if (column.sticky) {
        th.style.position = 'sticky';
        th.style.left = `${stickyOffsets.get(id) ?? 0}px`;
        th.style.zIndex = '2';
      }

      if (column.sortable !== false) {
        th.tabIndex = 0;
        th.setAttribute?.(
          'aria-sort',
          this.sortState?.field === field
            ? (this.sortState.direction === 'desc' ? 'descending' : 'ascending')
            : 'none'
        );
        const sort = () => {
          this.toggleSort(field);
          rerender();
        };
        th.addEventListener?.('click', sort);
        th.addEventListener?.('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault?.();
            sort();
          }
        });
      }

      if (this.resizable && column.resizable !== false && id != null) {
        if (!th.style.position) th.style.position = 'relative';
        const handle = documentRef.createElement('span');
        handle.className = 'nlab-tablewiz__resize-handle';
        handle.tabIndex = 0;
        handle.setAttribute?.('role', 'separator');
        handle.setAttribute?.('aria-orientation', 'vertical');
        handle.setAttribute?.('aria-label', `Redimensionner ${column.label ?? column.id ?? field ?? 'colonne'}`);
        handle.setAttribute?.('data-column-resizer', String(id));
        Object.assign(handle.style, {
          position:'absolute',
          top:'0',
          right:'0',
          width:'8px',
          height:'100%',
          cursor:'col-resize',
          touchAction:'none',
          userSelect:'none'
        });
        const stop = (event) => {
          event.preventDefault?.();
          event.stopPropagation?.();
        };
        handle.addEventListener?.('click', (event) => event.stopPropagation?.());
        handle.addEventListener?.('keydown', (event) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          stop(event);
          this.adjustColumnWidth(
            id,
            event.key === 'ArrowLeft' ? -this.resizeStep : this.resizeStep,
            { fallback:this.#measuredWidth(th, column) }
          );
          notifyResize(column);
          rerender();
        });
        handle.addEventListener?.('pointerdown', (event) => {
          if (event.button != null && event.button !== 0) return;
          stop(event);
          const startX = finiteNumber(event.clientX) ?? 0;
          const startWidth = this.columnWidth(id, this.#measuredWidth(th, column));
          if (startWidth == null) return;
          const move = (moveEvent) => {
            const x = finiteNumber(moveEvent.clientX);
            if (x == null) return;
            this.resizeColumn(id, startWidth + (x - startX));
            const width = this.columnWidth(id);
            const col = colNodes.get(id);
            if (col && width != null) col.style.width = cssWidth(width);
            if (width != null) {
              th.style.width = cssWidth(width);
              th.style.minWidth = cssWidth(width);
              th.style.maxWidth = cssWidth(width);
            }
          };
          const cleanup = () => {
            documentRef.removeEventListener?.('pointermove', move);
            documentRef.removeEventListener?.('pointerup', end);
            documentRef.removeEventListener?.('pointercancel', end);
            this._renderCleanup = this._renderCleanup.filter((fn) => fn !== cleanup);
          };
          const end = (endEvent) => {
            endEvent?.preventDefault?.();
            cleanup();
            notifyResize(column);
            rerender();
          };
          documentRef.addEventListener?.('pointermove', move);
          documentRef.addEventListener?.('pointerup', end);
          documentRef.addEventListener?.('pointercancel', end);
          this._renderCleanup.push(cleanup);
          handle.setPointerCapture?.(event.pointerId);
        });
        th.append?.(handle);
      }
      headRow.append?.(th);
    }
    thead.append?.(headRow);
    table.append?.(thead);

    const tbody = documentRef.createElement('tbody');
    page.forEach((row, rowIndex) => {
      const tr = documentRef.createElement('tr');
      if (rowClass) tr.className = rowClass(row, rowIndex) || '';
      const sourceIndex = this.#sourceIndex(items, row);
      for (const column of columns) {
        const id = columnId(column);
        const field = column.field ?? column.id;
        const td = documentRef.createElement('td');
        if (id != null) td.setAttribute?.('data-column-id', String(id));
        const value = getPath(row, field);

        if (
          id != null
          && sourceIndex >= 0
          && this.#columnEditable(column, editable)
        ) {
          const editor = this.#createEditor(documentRef, column, value);
          editor.setAttribute?.('data-cell-editor', String(id));
          editor.setAttribute?.('data-row-index', String(sourceIndex));
          editor.addEventListener?.('click', (event) => event.stopPropagation?.());
          editor.addEventListener?.('change', () => {
            const rawValue = editType(column) === 'boolean' ? Boolean(editor.checked) : editor.value;
            const edit = this.editCell(items, sourceIndex, id, rawValue, {
              mutate:true,
              onChange:onCellEdit
            });
            if (!edit.ok) {
              editor.setAttribute?.('aria-invalid', 'true');
              editor.setAttribute?.('title', edit.error?.message ?? 'Valeur invalide');
              return;
            }
            rerender();
          });
          td.append?.(editor);
        } else if (column.type === 'image' && value) {
          const img = documentRef.createElement('img');
          img.src = value;
          img.alt = column.altField ? getPath(row, column.altField) ?? '' : '';
          img.loading = 'lazy';
          img.style.maxWidth = '72px';
          td.append?.(img);
        } else {
          td.textContent = Array.isArray(value) ? value.join(', ') : String(value ?? '');
        }

        this.#applyWidthStyles(td, column, true);
        if (column.sticky) {
          td.style.position = 'sticky';
          td.style.left = `${stickyOffsets.get(id) ?? 0}px`;
        }
        tr.append?.(td);
      }
      tbody.append?.(tr);
    });
    table.append?.(tbody);
    this.#mount(container, table, standalone, documentRef, effectiveMode);
  }

  #renderStacked(documentRef, page, columns, rowClass) {
    const root = documentRef.createElement('div');
    root.className = 'nlab-tablewiz nlab-tablewiz--stacked';
    Object.assign(root.style, {
      display:'grid',
      gap:'12px',
      width:'100%',
      boxSizing:'border-box'
    });
    page.forEach((row, rowIndex) => {
      const article = documentRef.createElement('article');
      article.className = 'nlab-tablewiz__stacked-row';
      if (rowClass) {
        const custom = rowClass(row, rowIndex) || '';
        if (custom) article.className += ` ${custom}`;
      }
      Object.assign(article.style, {
        display:'grid',
        gap:'8px',
        width:'100%',
        boxSizing:'border-box'
      });
      for (const column of columns) {
        const field = documentRef.createElement('div');
        field.className = 'nlab-tablewiz__stacked-field';
        field.setAttribute?.('data-column-id', String(columnId(column) ?? ''));
        Object.assign(field.style, {
          display:'grid',
          gridTemplateColumns:'minmax(96px, 0.35fr) minmax(0, 1fr)',
          gap:'8px',
          alignItems:'start'
        });
        const label = documentRef.createElement('strong');
        label.className = 'nlab-tablewiz__stacked-label';
        label.textContent = column.label ?? column.id ?? column.field ?? '';
        const valueNode = documentRef.createElement('span');
        valueNode.className = 'nlab-tablewiz__stacked-value';
        const value = getPath(row, column.field ?? column.id);
        if (column.type === 'image' && value) {
          const img = documentRef.createElement('img');
          img.src = value;
          img.alt = column.altField ? getPath(row, column.altField) ?? '' : '';
          img.loading = 'lazy';
          img.style.maxWidth = '100%';
          valueNode.append?.(img);
        } else {
          valueNode.textContent = Array.isArray(value) ? value.join(', ') : String(value ?? '');
        }
        field.append?.(label, valueNode);
        article.append?.(field);
      }
      root.append?.(article);
    });
    return root;
  }

  #mount(container, node, standalone, documentRef, mode) {
    if (!standalone) {
      container.replaceChildren?.(node);
      return;
    }
    const shell = documentRef.createElement('section');
    shell.className = `nlab-tablewiz-standalone nlab-tablewiz-standalone--${mode}`;
    shell.setAttribute?.('role', 'region');
    shell.setAttribute?.('aria-label', 'Tableau de données');
    shell.tabIndex = 0;
    Object.assign(shell.style, {
      width:'100%',
      maxWidth:'100%',
      overflow:'auto',
      boxSizing:'border-box',
      minHeight:'0'
    });
    shell.append?.(node);
    container.replaceChildren?.(shell);
  }

  #effectiveViewMode(container, mode, mobileBreakpoint) {
    const normalized = normalizeViewMode(mode);
    if (normalized !== 'auto') return normalized;
    const width = finiteNumber(container?.clientWidth);
    const breakpoint = positiveNumber(mobileBreakpoint, this.mobileBreakpoint);
    return width != null && width > 0 && width <= breakpoint ? 'stacked' : 'table';
  }

  #createEditor(documentRef, column, value) {
    const type = editType(column);
    const editor = documentRef.createElement(
      column.multiline || column.editor?.multiline ? 'textarea' : 'input'
    );
    if (editor.tagName !== 'TEXTAREA') {
      if (type === 'boolean') editor.type = 'checkbox';
      else if (type === 'number' || type === 'integer') editor.type = 'number';
      else if (type === 'date') editor.type = 'date';
      else if (type === 'link' || type === 'image') editor.type = 'url';
      else editor.type = 'text';
    }
    if (type === 'boolean') editor.checked = Boolean(value);
    else if (type === 'tags' || type === 'list') {
      const separator = String(column.separator ?? column.editor?.separator ?? ',');
      editor.value = Array.isArray(value) ? value.join(`${separator} `) : String(value ?? '');
    } else if (type === 'json' && value && typeof value === 'object') {
      try { editor.value = JSON.stringify(value); }
      catch { editor.value = String(value); }
    } else editor.value = String(value ?? '');
    if (column.required ?? column.editor?.required) editor.required = true;
    if (column.placeholder ?? column.editor?.placeholder) {
      editor.placeholder = String(column.placeholder ?? column.editor?.placeholder);
    }
    editor.setAttribute?.('aria-label', column.label ?? column.id ?? column.field ?? 'Valeur');
    return editor;
  }

  #sourceIndex(items, row) {
    const source = asArray(items);
    const direct = source.indexOf(row);
    if (direct >= 0) return direct;
    const key = getPath(row, this.rowKey);
    if (key == null) return -1;
    return source.findIndex((candidate) => getPath(candidate, this.rowKey) === key);
  }

  #exportColumns(ids) {
    if (ids == null) return this.visibleColumns();
    const selected = [];
    const seen = new Set();
    for (const id of asArray(ids)) {
      if (seen.has(id)) continue;
      const column = this.#column(id);
      if (!column) continue;
      seen.add(id);
      selected.push(column);
    }
    return selected;
  }

  #exportRows(rows, indexes) {
    if (indexes == null) return [...rows];
    const selected = [];
    const seen = new Set();
    for (const raw of asArray(indexes)) {
      const index = Number(raw);
      if (!Number.isInteger(index) || index < 0 || index >= rows.length || seen.has(index)) continue;
      seen.add(index);
      selected.push(rows[index]);
    }
    return selected;
  }

  #exportText(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') {
      try { return JSON.stringify(value); }
      catch { return String(value); }
    }
    return String(value ?? '');
  }

  #escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  #column(id) {
    return this.columns.find((column) => columnId(column) === id);
  }

  #orderedColumns() {
    return [...this.columns].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  }

  #columnEditable(column, override = this.editable) {
    return column?.editable === true || (Boolean(override) && column?.editable !== false);
  }

  #columnStateDirty() {
    const initial = new Map(this.initialColumns.map((column, index) => [
      columnId(column),
      {
        visible:column.visible !== false,
        order:column.order ?? index,
        width:column.width ?? null,
        sticky:Boolean(column.sticky)
      }
    ]));
    return this.columns.some((column, index) => {
      const current = {
        visible:column.visible !== false,
        order:column.order ?? index,
        width:column.width ?? null,
        sticky:Boolean(column.sticky)
      };
      const baseline = initial.get(columnId(column));
      return !baseline
        || current.visible !== baseline.visible
        || current.order !== baseline.order
        || current.width !== baseline.width
        || current.sticky !== baseline.sticky;
    });
  }

  #markProfileDirty() {
    this.activeProfile = null;
  }

  #validateProfile(profile) {
    if (!isPlainObject(profile)) {
      return {
        ok:false,
        error:{ code:'INVALID_PROFILE', stage:'profile', message:'Profile must be an object.' }
      };
    }
    if ('version' in profile && Number(profile.version) !== PROFILE_VERSION) {
      return {
        ok:false,
        error:{
          code:'UNSUPPORTED_PROFILE_VERSION',
          stage:'profile',
          message:`Unsupported profile version: ${String(profile.version)}`
        }
      };
    }
    if ('filters' in profile && !Array.isArray(profile.filters)) {
      return {
        ok:false,
        error:{ code:'INVALID_PROFILE_FILTERS', stage:'profile', message:'Profile filters must be an array.' }
      };
    }
    if ('columns' in profile && !Array.isArray(profile.columns)) {
      return {
        ok:false,
        error:{ code:'INVALID_PROFILE_COLUMNS', stage:'profile', message:'Profile columns must be an array.' }
      };
    }
    if ('view' in profile && !isPlainObject(profile.view)) {
      return {
        ok:false,
        error:{ code:'INVALID_PROFILE_VIEW', stage:'profile', message:'Profile view must be an object.' }
      };
    }
    if ('pagination' in profile && !isPlainObject(profile.pagination)) {
      return {
        ok:false,
        error:{ code:'INVALID_PROFILE_PAGINATION', stage:'profile', message:'Profile pagination must be an object.' }
      };
    }
    return { ok:true, error:null };
  }

  #editFailure(code, message, details = {}) {
    const error = { code, stage:'edit', message, ...details };
    this.lastError = error;
    return { ok:false, value:undefined, error };
  }

  #bounds(column) {
    const min = Math.max(1, positiveNumber(column?.minWidth, this.minColumnWidth));
    return {
      min,
      max:Math.max(min, positiveNumber(column?.maxWidth, this.maxColumnWidth))
    };
  }

  #clampWidth(column, width) {
    const numeric = finiteNumber(width);
    if (numeric == null) return null;
    const { min, max } = this.#bounds(column);
    return Math.min(max, Math.max(min, numeric));
  }

  #applyWidthStyles(node, column, exact = false) {
    if (!node?.style) return;
    const numeric = pixelWidth(column.width);
    if (numeric != null) {
      const width = this.#clampWidth(column, numeric);
      node.style.width = cssWidth(width);
      if (exact) {
        node.style.minWidth = cssWidth(width);
        node.style.maxWidth = cssWidth(width);
      }
      return;
    }
    if (typeof column.width === 'string' && column.width.trim()) node.style.width = column.width.trim();
    if (exact) {
      const { min, max } = this.#bounds(column);
      node.style.minWidth = cssWidth(min);
      node.style.maxWidth = cssWidth(max);
    }
  }

  #measuredWidth(node, column) {
    const measured = finiteNumber(node?.getBoundingClientRect?.().width);
    return this.#clampWidth(column, measured != null && measured > 0 ? measured : DEFAULT_COLUMN_WIDTH);
  }

  #stickyOffsets(columns) {
    const offsets = new Map();
    let left = 0;
    for (const column of columns) {
      if (!column.sticky) continue;
      const id = columnId(column);
      offsets.set(id, left);
      left += this.columnWidth(id, DEFAULT_COLUMN_WIDTH) ?? DEFAULT_COLUMN_WIDTH;
    }
    return offsets;
  }

  #clearRenderCleanup() {
    for (const cleanup of this._renderCleanup.splice(0)) {
      try { cleanup(); } catch {}
    }
  }
}
