import { DataJoinSpec, DATA_JOIN_SPEC_TYPE, DATA_JOIN_SPEC_VERSION } from './data-join-spec.js';
import { DataJoinExecutor } from './data-join-executor.js';

const TYPE = 'nlab.data-join-workspace';
const VERSION = 1;
const SIDES = new Set(['left', 'right']);
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_ID = 256;
const MAX_TEXT = 2048;

function fail(message, code = 'DATA_JOIN_WORKSPACE_ERROR', details = null, ErrorType = Error) {
  const error = new ErrorType(message);
  error.code = code;
  error.details = details;
  throw error;
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function cloneSafe(value, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('Workspace values must use finite numbers', 'NON_FINITE_WORKSPACE_VALUE', null, TypeError);
    return value;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) fail('Cyclic workspace values are not supported', 'CYCLIC_WORKSPACE_VALUE', null, TypeError);
    seen.add(value);
    try { return value.map((entry) => cloneSafe(entry, seen)); }
    finally { seen.delete(value); }
  }
  if (!isPlainObject(value)) fail('Workspace values must be JSON-like', 'UNSUPPORTED_WORKSPACE_VALUE', null, TypeError);
  if (seen.has(value)) fail('Cyclic workspace values are not supported', 'CYCLIC_WORKSPACE_VALUE', null, TypeError);
  seen.add(value);
  try {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (BAD_KEYS.has(key)) fail(`Unsafe workspace key: ${key}`, 'UNSAFE_WORKSPACE_KEY', { key }, TypeError);
      Object.defineProperty(output, key, {
        value: cloneSafe(entry, seen), enumerable: true, configurable: true, writable: true
      });
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

function text(value, fallback = '', max = MAX_TEXT) {
  const result = String(value ?? fallback).trim();
  if (result.length > max) fail(`Workspace text exceeds ${max} characters`, 'WORKSPACE_TEXT_TOO_LONG', { max }, RangeError);
  return result;
}

function normalizeSide(side) {
  const value = text(side).toLowerCase();
  if (!SIDES.has(value)) fail(`Invalid workspace side: ${String(side)}`, 'INVALID_WORKSPACE_SIDE', { side }, TypeError);
  return value;
}

function normalizePointer(value = '') {
  const pointer = text(value, '');
  if (!pointer) return '';
  if (!pointer.startsWith('/')) fail('Source rootPath must be a JSON Pointer or empty string', 'INVALID_SOURCE_ROOT_PATH', { rootPath: pointer }, TypeError);
  if (/~(?:[^01]|$)/.test(pointer)) fail('Source rootPath contains an invalid JSON Pointer escape', 'INVALID_SOURCE_ROOT_PATH', { rootPath: pointer }, TypeError);
  return pointer;
}

function normalizeSource(value) {
  if (!isPlainObject(value)) fail('Source descriptor must be an object', 'SOURCE_DESCRIPTOR_REQUIRED', null, TypeError);
  const id = text(value.id, '', MAX_ID);
  if (!id) fail('Source descriptor requires a stable id', 'SOURCE_ID_REQUIRED', null, TypeError);
  const label = text(value.label, id) || id;
  const kind = text(value.kind, 'json', MAX_ID) || 'json';
  const rootPath = normalizePointer(value.rootPath ?? '');
  const metadata = value.metadata == null ? {} : cloneSafe(value.metadata);
  if (!isPlainObject(metadata)) fail('Source metadata must be an object', 'INVALID_SOURCE_METADATA', null, TypeError);
  return { id, label, kind, rootPath, metadata };
}

function normalizeJoin(value) {
  if (value == null) return null;
  if (value instanceof DataJoinSpec) return new DataJoinSpec(value.snapshot());
  if (typeof value === 'string') return DataJoinSpec.parse(value);
  if (!isPlainObject(value)) fail('Join configuration must be a DataJoinSpec, payload, snapshot or JSON string', 'INVALID_WORKSPACE_JOIN', null, TypeError);
  const looksLikePayload = value.type === DATA_JOIN_SPEC_TYPE || Object.hasOwn(value, 'version') || Object.hasOwn(value, 'join');
  if (looksLikePayload) {
    if (value.type !== DATA_JOIN_SPEC_TYPE || value.version !== DATA_JOIN_SPEC_VERSION) {
      fail('Unsupported DataJoinSpec payload in workspace', 'INVALID_WORKSPACE_JOIN_VERSION', {
        type: value.type, version: value.version
      }, TypeError);
    }
    return DataJoinSpec.parse(value);
  }
  return new DataJoinSpec(value);
}

function normalizeInitial(value) {
  if (value == null) return { sources: { left: null, right: null }, join: null };
  if (!isPlainObject(value)) fail('Workspace state must be an object', 'INVALID_WORKSPACE_STATE', null, TypeError);
  if (value.sources != null && !isPlainObject(value.sources)) fail('Workspace sources must be an object', 'INVALID_WORKSPACE_SOURCES', null, TypeError);
  const sources = value.sources ?? {};
  return {
    sources: {
      left: sources.left == null ? null : normalizeSource(sources.left),
      right: sources.right == null ? null : normalizeSource(sources.right)
    },
    join: normalizeJoin(value.join)
  };
}

function normalizeExecutor(executor) {
  const value = executor ?? new DataJoinExecutor();
  if (!value || typeof value.execute !== 'function') fail('Workspace executor must expose execute()', 'INVALID_WORKSPACE_EXECUTOR', null, TypeError);
  return value;
}

export const DATA_JOIN_WORKSPACE_TYPE = TYPE;
export const DATA_JOIN_WORKSPACE_VERSION = VERSION;

export class DataJoinWorkspace {
  constructor(value = {}, { executor = null } = {}) {
    const state = normalizeInitial(value);
    this._sources = state.sources;
    this._join = state.join;
    this._rows = { left: null, right: null };
    this._executor = normalizeExecutor(executor);
  }

  static parse(input, options = {}) {
    let payload;
    if (typeof input === 'string') {
      try { payload = JSON.parse(input); }
      catch (error) { fail('Invalid DataJoinWorkspace JSON', 'INVALID_WORKSPACE_JSON', { cause: error?.message }, SyntaxError); }
    } else {
      payload = cloneSafe(input);
    }
    if (!isPlainObject(payload)) fail('Workspace payload must be an object', 'INVALID_WORKSPACE_PAYLOAD', null, TypeError);
    if (payload.type !== TYPE) fail(`Unsupported workspace type: ${String(payload.type)}`, 'INVALID_WORKSPACE_TYPE', { type: payload.type }, TypeError);
    if (payload.version !== VERSION) fail(`Unsupported workspace version: ${String(payload.version)}`, 'INVALID_WORKSPACE_VERSION', { version: payload.version }, TypeError);
    return new DataJoinWorkspace({ sources: payload.sources, join: payload.join }, options);
  }

  setSource(side, descriptor) {
    const key = normalizeSide(side);
    const previous = this._sources[key];
    const next = normalizeSource(descriptor);
    this._sources[key] = next;
    if (!previous || previous.id !== next.id || previous.rootPath !== next.rootPath || previous.kind !== next.kind) this._rows[key] = null;
    return this.source(key);
  }

  clearSource(side) {
    const key = normalizeSide(side);
    this._sources[key] = null;
    this._rows[key] = null;
    return this.status();
  }

  source(side) {
    const key = normalizeSide(side);
    return this._sources[key] == null ? null : cloneSafe(this._sources[key]);
  }

  bind(side, rows, { sourceId = null } = {}) {
    const key = normalizeSide(side);
    const descriptor = this._sources[key];
    if (!descriptor) fail(`Configure ${key} source before binding rows`, 'SOURCE_NOT_CONFIGURED', { side: key });
    if (!Array.isArray(rows)) fail(`${key} source rows must be an array`, 'INVALID_SOURCE_ROWS', { side: key }, TypeError);
    if (sourceId != null && text(sourceId, '', MAX_ID) !== descriptor.id) {
      fail(`Binding source id does not match ${key} descriptor`, 'SOURCE_BINDING_ID_MISMATCH', {
        side: key, expected: descriptor.id, received: String(sourceId)
      });
    }
    this._rows[key] = rows;
    return this.status();
  }

  unbind(side) {
    const key = normalizeSide(side);
    this._rows[key] = null;
    return this.status();
  }

  setJoin(value) {
    const next = normalizeJoin(value);
    if (!next) fail('Join configuration is required', 'JOIN_SPEC_REQUIRED');
    this._join = next;
    return this.joinSnapshot();
  }

  updateJoin(patch = {}) {
    if (!this._join) fail('Configure a JoinSpec before updating it', 'JOIN_SPEC_REQUIRED');
    return this._join.update(patch);
  }

  clearJoin() {
    this._join = null;
    return this.status();
  }

  joinSnapshot() {
    return this._join ? this._join.snapshot() : null;
  }

  status() {
    const sideStatus = (side) => {
      const source = this._sources[side];
      const rows = this._rows[side];
      return {
        configured: Boolean(source),
        bound: Array.isArray(rows),
        id: source?.id ?? null,
        label: source?.label ?? null,
        kind: source?.kind ?? null,
        rootPath: source?.rootPath ?? null,
        rows: Array.isArray(rows) ? rows.length : null
      };
    };
    const left = sideStatus('left');
    const right = sideStatus('right');
    const joinConfigured = Boolean(this._join);
    return {
      ready: left.configured && left.bound && right.configured && right.bound && joinConfigured,
      left,
      right,
      joinConfigured,
      joinType: this._join?.snapshot()?.type ?? null
    };
  }

  assertReady() {
    const status = this.status();
    if (!status.ready) fail('DataJoinWorkspace is not ready', 'WORKSPACE_NOT_READY', status);
    return status;
  }

  diagnose() {
    this.assertReady();
    return this._join.diagnose(this._rows.left, this._rows.right);
  }

  execute(options = {}) {
    const status = this.assertReady();
    const result = this._executor.execute(this._rows.left, this._rows.right, this._join, options);
    return {
      ...result,
      workspace: {
        leftSourceId: status.left.id,
        rightSourceId: status.right.id,
        joinType: status.joinType
      }
    };
  }

  explain() {
    return {
      left: this.source('left'),
      right: this.source('right'),
      join: this._join ? this._join.explain() : null,
      status: this.status()
    };
  }

  snapshot() {
    return {
      sources: {
        left: this._sources.left == null ? null : cloneSafe(this._sources.left),
        right: this._sources.right == null ? null : cloneSafe(this._sources.right)
      },
      join: this._join ? this._join.toJSON() : null
    };
  }

  toJSON() {
    return { type: TYPE, version: VERSION, ...this.snapshot() };
  }

  serialize({ indent = 2 } = {}) {
    const safeIndent = Math.max(0, Math.min(8, Math.floor(Number(indent) || 0)));
    return JSON.stringify(this.toJSON(), null, safeIndent);
  }
}
