const DEFAULTS = Object.freeze({ minScore: 35, maxCandidates: 20, uniqueThreshold: 0.95 });
const SCALAR_TYPES = new Set(['string', 'number', 'boolean']);

function fail(message, code = 'DATA_JOIN_KEY_MATCHER_ERROR', details = null, ErrorType = Error) {
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

function boundedNumber(value, fallback, name, { min = 0, max = 100 } = {}) {
  if (value === undefined || value === null) return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    fail(`${name} must be a finite number between ${min} and ${max}`, 'INVALID_MATCHER_OPTION', { name, value }, RangeError);
  }
  return number;
}

function boundedInteger(value, fallback, name, { min = 1, max = 10000 } = {}) {
  const number = boundedNumber(value, fallback, name, { min, max });
  return Math.floor(number);
}

function normalizedWords(value) {
  const prepared = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
  return prepared ? prepared.split(/\s+/).filter(Boolean) : [];
}

function compactName(value) {
  return normalizedWords(value).join('');
}

function singular(word) {
  const value = compactName(word);
  if (value.length <= 3) return value;
  if (value.endsWith('ies') && value.length > 4) return `${value.slice(0, -3)}y`;
  if (value.endsWith('sses')) return value.slice(0, -2);
  if (value.endsWith('s') && !value.endsWith('ss')) return value.slice(0, -1);
  return value;
}

function sourceEntity(source) {
  if (!isPlainObject(source)) return '';
  const label = singular(source.label);
  const id = singular(source.id);
  return label || id;
}

function fieldLeaf(field) {
  if (!isPlainObject(field)) return '';
  if (typeof field.name === 'string' && field.name.trim()) return field.name;
  if (Array.isArray(field.segments) && field.segments.length) return String(field.segments.at(-1));
  if (typeof field.specPath === 'string') return field.specPath.split('.').at(-1) ?? '';
  return '';
}

function fieldPath(field) {
  return compactName(field?.specPath ?? '');
}

function normalizedTypes(field) {
  const raw = Array.isArray(field?.types) && field.types.length
    ? field.types
    : [field?.type].filter(Boolean);
  return [...new Set(raw.filter((type) => type !== 'null').map((type) => String(type)))].sort();
}

function validateCatalog(value, label) {
  if (!isPlainObject(value) || !Array.isArray(value.fields)) {
    fail(`${label} catalog must expose fields[]`, 'INVALID_FIELD_CATALOG', { side: label }, TypeError);
  }
  return value;
}

function validateField(field, side, index) {
  if (!isPlainObject(field)) return null;
  if (field.joinable !== true) return null;
  if (typeof field.specPath !== 'string' || !field.specPath.trim()) return null;
  const present = Number(field.present ?? 0);
  const missing = Number(field.missing ?? 0);
  const nulls = Number(field.nulls ?? 0);
  const distinct = Number(field.distinct ?? 0);
  if (![present, missing, nulls, distinct].every((value) => Number.isFinite(value) && value >= 0)) {
    fail(`Invalid field statistics on ${side}[${index}]`, 'INVALID_FIELD_STATISTICS', { side, index }, TypeError);
  }
  const types = normalizedTypes(field);
  if (!types.length || !types.every((type) => SCALAR_TYPES.has(type))) return null;
  return {
    raw: field,
    side,
    pointer: typeof field.pointer === 'string' ? field.pointer : null,
    specPath: field.specPath.trim(),
    name: fieldLeaf(field),
    nameCompact: compactName(fieldLeaf(field)),
    pathCompact: fieldPath(field),
    types,
    type: typeof field.type === 'string' ? field.type : (types.length === 1 ? types[0] : 'mixed'),
    present,
    missing,
    nulls,
    distinct,
    examples: Array.isArray(field.examples) ? field.examples.slice(0, 10) : []
  };
}

function completeness(field) {
  const total = field.present + field.missing;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, (field.present - field.nulls) / total));
}

function uniqueness(field) {
  const nonNull = Math.max(0, field.present - field.nulls);
  if (nonNull <= 0) return null;
  return Math.max(0, Math.min(1, field.distinct / nonNull));
}

function likelyUnique(field, threshold) {
  const ratio = uniqueness(field);
  return ratio === null ? null : ratio >= threshold;
}

function expectedCardinality(left, right, threshold) {
  const l = likelyUnique(left, threshold);
  const r = likelyUnique(right, threshold);
  if (l === null || r === null) return 'unknown';
  if (l && r) return '1:1';
  if (l && !r) return '1:N';
  if (!l && r) return 'N:1';
  return 'N:N';
}

function allFiniteNumericStrings(examples) {
  const strings = examples.filter((value) => typeof value === 'string');
  return strings.length > 0 && strings.every((value) => {
    const text = value.trim();
    if (!text) return false;
    return Number.isFinite(Number(text));
  });
}

function typeCompatibility(left, right) {
  const overlap = left.types.filter((type) => right.types.includes(type));
  if (left.types.length === 1 && right.types.length === 1 && left.types[0] === right.types[0]) {
    return { score: 20, hint: { coerce: 'none' }, reason: 'Exact scalar type match', warning: null };
  }
  if (overlap.length) {
    return { score: 15, hint: { coerce: 'none' }, reason: `Compatible observed types: ${overlap.join(', ')}`, warning: null };
  }
  const leftNumber = left.types.length === 1 && left.types[0] === 'number';
  const rightNumber = right.types.length === 1 && right.types[0] === 'number';
  const leftString = left.types.length === 1 && left.types[0] === 'string';
  const rightString = right.types.length === 1 && right.types[0] === 'string';
  if ((leftNumber && rightString) || (leftString && rightNumber)) {
    const stringField = leftString ? left : right;
    const numericExamples = allFiniteNumericStrings(stringField.examples);
    return {
      score: 5,
      hint: { coerce: numericExamples ? 'number' : 'string' },
      reason: numericExamples ? 'String examples are numeric-compatible' : 'Number/string join requires explicit coercion',
      warning: { code: 'COERCION_REQUIRED', message: 'Number/string candidate requires an explicit comparison coercion' }
    };
  }
  return {
    score: -30,
    hint: { coerce: 'none' },
    reason: `Observed scalar types differ (${left.types.join('|')} vs ${right.types.join('|')})`,
    warning: { code: 'TYPE_MISMATCH', message: 'Candidate fields have incompatible observed scalar types' }
  };
}

function isGenericId(name) {
  const value = compactName(name);
  return value === 'id' || value === 'uuid' || value === 'guid' || value === 'key';
}

function foreignKeyRelation(left, right, leftSource, rightSource) {
  const l = left.nameCompact;
  const r = right.nameCompact;
  const leftEntity = sourceEntity(leftSource);
  const rightEntity = sourceEntity(rightSource);
  if (isGenericId(r) && rightEntity && l === `${rightEntity}id`) {
    return { score: 55, reason: `${left.specPath} resembles a foreign key to ${rightSource?.label ?? rightSource?.id ?? 'right source'}.${right.specPath}` };
  }
  if (isGenericId(l) && leftEntity && r === `${leftEntity}id`) {
    return { score: 55, reason: `${right.specPath} resembles a foreign key to ${leftSource?.label ?? leftSource?.id ?? 'left source'}.${left.specPath}` };
  }
  return null;
}

function scorePair(left, right, settings, context) {
  let score = 0;
  const reasons = [];
  const warnings = [];
  const add = (code, weight, message) => {
    score += weight;
    reasons.push({ code, weight, message });
  };

  const fk = foreignKeyRelation(left, right, context.leftSource, context.rightSource);
  if (fk) add('FOREIGN_KEY_NAME', fk.score, fk.reason);

  if (left.nameCompact && left.nameCompact === right.nameCompact) {
    add('EXACT_LEAF_NAME', 42, `Same normalized field name: ${left.name}`);
    if (isGenericId(left.nameCompact)) {
      const leftEntity = sourceEntity(context.leftSource);
      const rightEntity = sourceEntity(context.rightSource);
      if (leftEntity && rightEntity && leftEntity !== rightEntity) {
        add('GENERIC_ID_CROSS_ENTITY', -12, 'Generic id fields belong to differently named sources');
      }
    }
  }
  if (left.pathCompact && left.pathCompact === right.pathCompact) {
    add('EXACT_PATH', 18, `Same normalized path: ${left.specPath}`);
  }

  const type = typeCompatibility(left, right);
  add('TYPE_COMPATIBILITY', type.score, type.reason);
  if (type.warning) warnings.push(type.warning);

  const leftCompleteness = completeness(left);
  const rightCompleteness = completeness(right);
  if (leftCompleteness >= 0.95 && rightCompleteness >= 0.95) {
    add('HIGH_COMPLETENESS', 6, 'Both fields are present and non-null on at least 95% of sampled rows');
  } else if (leftCompleteness < 0.5 || rightCompleteness < 0.5) {
    add('SPARSE_KEY', -12, 'At least one field is usable on less than half of sampled rows');
    warnings.push({ code: 'SPARSE_KEY', message: 'At least one candidate key is sparse in the sampled data' });
  }

  const cardinality = expectedCardinality(left, right, settings.uniqueThreshold);
  if (cardinality === '1:1') add('UNIQUE_BOTH', 6, 'Both fields appear unique in the sampled data');
  else if (cardinality === '1:N' || cardinality === 'N:1') add('UNIQUE_ONE_SIDE', 5, `Observed uniqueness suggests ${cardinality}`);
  else if (cardinality === 'N:N') {
    add('MANY_TO_MANY_LIKELY', -8, 'Neither side appears unique in the sampled data');
    warnings.push({ code: 'MANY_TO_MANY_LIKELY', message: 'Both candidate fields contain duplicate sampled values' });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    left: summarizeField(left),
    right: summarizeField(right),
    expectedCardinality: cardinality,
    comparisonHint: type.hint,
    reasons,
    warnings: dedupeWarnings(warnings)
  };
}

function summarizeField(field) {
  return {
    pointer: field.pointer,
    specPath: field.specPath,
    name: field.name,
    type: field.type,
    types: [...field.types],
    present: field.present,
    missing: field.missing,
    nulls: field.nulls,
    distinct: field.distinct,
    completeness: Number(completeness(field).toFixed(4)),
    uniqueness: uniqueness(field) === null ? null : Number(uniqueness(field).toFixed(4))
  };
}

function dedupeWarnings(warnings) {
  const seen = new Set();
  return warnings.filter((warning) => {
    const key = `${warning.code}\u0000${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function globalWarnings(leftCatalog, rightCatalog) {
  const warnings = [];
  for (const [side, catalog] of [['left', leftCatalog], ['right', rightCatalog]]) {
    const total = Number(catalog.rows?.total ?? 0);
    const sampled = Number(catalog.rows?.sampled ?? total);
    if (Number.isFinite(total) && Number.isFinite(sampled) && total > sampled) {
      warnings.push({ code: 'SAMPLED_PROFILE', side, message: `${side} catalog is based on ${sampled} of ${total} rows` });
    }
  }
  return warnings;
}

export class DataJoinKeyMatcher {
  constructor(options = {}) {
    if (!isPlainObject(options)) fail('Matcher options must be an object', 'INVALID_MATCHER_OPTIONS', null, TypeError);
    this.settings = {
      minScore: boundedNumber(options.minScore, DEFAULTS.minScore, 'minScore', { min: 0, max: 100 }),
      maxCandidates: boundedInteger(options.maxCandidates, DEFAULTS.maxCandidates, 'maxCandidates', { min: 1, max: 1000 }),
      uniqueThreshold: boundedNumber(options.uniqueThreshold, DEFAULTS.uniqueThreshold, 'uniqueThreshold', { min: 0.5, max: 1 })
    };
  }

  match(leftCatalog, rightCatalog, context = {}) {
    const left = validateCatalog(leftCatalog, 'left');
    const right = validateCatalog(rightCatalog, 'right');
    if (!isPlainObject(context)) fail('Matcher context must be an object', 'INVALID_MATCHER_CONTEXT', null, TypeError);

    const leftFields = left.fields.map((field, index) => validateField(field, 'left', index)).filter(Boolean);
    const rightFields = right.fields.map((field, index) => validateField(field, 'right', index)).filter(Boolean);
    const pairs = leftFields.length * rightFields.length;
    const candidates = [];

    for (const leftField of leftFields) {
      for (const rightField of rightFields) {
        const candidate = scorePair(leftField, rightField, this.settings, context);
        if (candidate.score >= this.settings.minScore) candidates.push(candidate);
      }
    }

    candidates.sort((a, b) =>
      b.score - a.score ||
      a.left.specPath.localeCompare(b.left.specPath) ||
      a.right.specPath.localeCompare(b.right.specPath)
    );

    return {
      candidates: candidates.slice(0, this.settings.maxCandidates),
      considered: { left: leftFields.length, right: rightFields.length, pairs },
      settings: { ...this.settings },
      warnings: globalWarnings(left, right)
    };
  }
}

export function matchDataJoinKeys(leftCatalog, rightCatalog, context = {}, options = {}) {
  return new DataJoinKeyMatcher(options).match(leftCatalog, rightCatalog, context);
}
