const DEFAULTS = Object.freeze({
  minComponents: 2,
  maxComponents: 3,
  seedLimit: 10,
  maxCombinations: 1000,
  maxEvaluations: 250,
  maxCandidates: 20,
  minScore: 45
});

const COERCIONS = new Set(['none', 'string', 'number']);
const CARDINALITIES = new Set(['unknown', '1:1', '1:N', 'N:1', 'N:N']);

function fail(message, code = 'DATA_JOIN_COMPOSITE_KEY_MATCHER_ERROR', details = null, ErrorType = Error) {
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
    fail(`${name} must be a finite number between ${min} and ${max}`, 'INVALID_COMPOSITE_MATCHER_OPTION', { name, value }, RangeError);
  }
  return number;
}

function boundedInteger(value, fallback, name, { min = 1, max = 10000 } = {}) {
  return Math.floor(boundedNumber(value, fallback, name, { min, max }));
}

function cleanPath(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(`${label} must be a non-empty path`, 'INVALID_SIMPLE_CANDIDATE', { label, value }, TypeError);
  }
  return value.trim();
}

function finiteScore(value, label) {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    fail(`${label} score must be between 0 and 100`, 'INVALID_SIMPLE_CANDIDATE', { label, value }, TypeError);
  }
  return score;
}

function cloneJsonSafe(value) {
  if (value === null || value === undefined || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('Composite matcher output cannot contain non-finite numbers', 'NON_FINITE_COMPOSITE_VALUE');
    return value;
  }
  if (Array.isArray(value)) return value.map(cloneJsonSafe);
  if (!isPlainObject(value)) return String(value);
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
    output[key] = cloneJsonSafe(entry);
  }
  return output;
}

function normalizeTypes(field) {
  const raw = Array.isArray(field?.types) && field.types.length ? field.types : [field?.type].filter(Boolean);
  return [...new Set(raw.map(String))].sort();
}

function normalizeSeed(candidate, index) {
  if (!isPlainObject(candidate) || !isPlainObject(candidate.left) || !isPlainObject(candidate.right)) {
    fail(`simple candidate ${index} is malformed`, 'INVALID_SIMPLE_CANDIDATE', { index }, TypeError);
  }
  const coerce = String(candidate.comparisonHint?.coerce ?? 'none');
  if (!COERCIONS.has(coerce)) {
    fail(`simple candidate ${index} uses unsupported coercion ${coerce}`, 'INVALID_SIMPLE_CANDIDATE', { index, coerce }, TypeError);
  }
  return {
    index,
    score: finiteScore(candidate.score, `simple candidate ${index}`),
    left: {
      specPath: cleanPath(candidate.left.specPath, `simple candidate ${index}.left.specPath`),
      pointer: typeof candidate.left.pointer === 'string' ? candidate.left.pointer : null,
      name: typeof candidate.left.name === 'string' ? candidate.left.name : '',
      type: typeof candidate.left.type === 'string' ? candidate.left.type : '',
      types: normalizeTypes(candidate.left)
    },
    right: {
      specPath: cleanPath(candidate.right.specPath, `simple candidate ${index}.right.specPath`),
      pointer: typeof candidate.right.pointer === 'string' ? candidate.right.pointer : null,
      name: typeof candidate.right.name === 'string' ? candidate.right.name : '',
      type: typeof candidate.right.type === 'string' ? candidate.right.type : '',
      types: normalizeTypes(candidate.right)
    },
    comparisonHint: { coerce },
    expectedCardinality: CARDINALITIES.has(candidate.expectedCardinality) ? candidate.expectedCardinality : 'unknown',
    warnings: Array.isArray(candidate.warnings) ? cloneJsonSafe(candidate.warnings) : []
  };
}

function normalizeSimpleResult(result) {
  if (!isPlainObject(result) || !Array.isArray(result.candidates)) {
    fail('keyMatcher.match() must return an object with candidates[]', 'INVALID_SIMPLE_MATCH_RESULT', null, TypeError);
  }
  const candidates = result.candidates.map(normalizeSeed);
  candidates.sort((a, b) =>
    b.score - a.score ||
    a.left.specPath.localeCompare(b.left.specPath) ||
    a.right.specPath.localeCompare(b.right.specPath)
  );
  return {
    candidates,
    warnings: Array.isArray(result.warnings) ? cloneJsonSafe(result.warnings) : []
  };
}

function canUseNumberCoercion(seed) {
  if (seed.comparisonHint.coerce === 'number') return true;
  const allNumber = (side) => side.types.length > 0 && side.types.every((type) => type === 'number');
  return allNumber(seed.left) && allNumber(seed.right);
}

function resolveCoercion(seeds) {
  const requested = [...new Set(seeds.map((seed) => seed.comparisonHint.coerce).filter((value) => value !== 'none'))];
  if (requested.length > 1) {
    return { ok: false, reason: 'INCOMPATIBLE_COERCION_HINTS', requested };
  }
  if (requested.length === 0) return { ok: true, coerce: 'none' };
  const coerce = requested[0];
  if (coerce === 'number' && seeds.some((seed) => !canUseNumberCoercion(seed))) {
    return { ok: false, reason: 'NUMBER_COERCION_NOT_SAFE_FOR_ALL_COMPONENTS', requested };
  }
  return { ok: true, coerce };
}

function identityFor(seeds) {
  return [...seeds]
    .sort((a, b) => a.left.specPath.localeCompare(b.left.specPath) || a.right.specPath.localeCompare(b.right.specPath))
    .map((seed) => `${seed.left.specPath}\u0000${seed.right.specPath}`)
    .join('\u0001');
}

function keysFor(seeds) {
  return [...seeds]
    .sort((a, b) => a.left.specPath.localeCompare(b.left.specPath) || a.right.specPath.localeCompare(b.right.specPath))
    .map((seed) => ({ left: seed.left.specPath, right: seed.right.specPath, label: '' }));
}

function sumRejected(value) {
  if (!isPlainObject(value)) return 0;
  return Object.values(value).reduce((sum, count) => {
    const number = Number(count);
    return sum + (Number.isFinite(number) && number > 0 ? number : 0);
  }, 0);
}

function validateDiagnosis(value) {
  if (!isPlainObject(value) || !isPlainObject(value.rows) || !isPlainObject(value.keys)) {
    fail('candidate evaluator must return a DataJoinSpec.diagnose()-like object', 'INVALID_COMPOSITE_DIAGNOSIS', null, TypeError);
  }
  const leftRows = Number(value.rows.left ?? 0);
  const rightRows = Number(value.rows.right ?? 0);
  const matchedLeft = Number(value.keys.matchedRows?.left ?? 0);
  const matchedRight = Number(value.keys.matchedRows?.right ?? 0);
  if (![leftRows, rightRows, matchedLeft, matchedRight].every((entry) => Number.isFinite(entry) && entry >= 0)) {
    fail('candidate evaluator returned invalid row statistics', 'INVALID_COMPOSITE_DIAGNOSIS', null, TypeError);
  }
  const observedCardinality = CARDINALITIES.has(value.observedCardinality) ? value.observedCardinality : 'unknown';
  return {
    observedCardinality,
    rows: { left: leftRows, right: rightRows, estimatedOutput: Number(value.rows.estimatedOutput ?? 0) || 0 },
    matchedRows: { left: matchedLeft, right: matchedRight },
    unmatchedRows: {
      left: Number(value.keys.unmatchedRows?.left ?? Math.max(0, leftRows - matchedLeft)) || 0,
      right: Number(value.keys.unmatchedRows?.right ?? Math.max(0, rightRows - matchedRight)) || 0
    },
    rejectedRows: {
      left: sumRejected(value.rejected?.left),
      right: sumRejected(value.rejected?.right)
    },
    duplicateGroups: {
      left: Array.isArray(value.duplicates?.left) ? value.duplicates.left.length : 0,
      right: Array.isArray(value.duplicates?.right) ? value.duplicates.right.length : 0
    },
    warnings: Array.isArray(value.warnings) ? cloneJsonSafe(value.warnings) : []
  };
}

function ratio(numerator, denominator) {
  if (denominator <= 0) return 0;
  return Math.max(0, Math.min(1, numerator / denominator));
}

function cardinalityAdjustment(cardinality) {
  if (cardinality === '1:1') return 12;
  if (cardinality === '1:N' || cardinality === 'N:1') return 10;
  if (cardinality === 'N:N') return -15;
  return -8;
}

function scoreComposite(seeds, diagnosis) {
  const seedAverage = seeds.reduce((sum, seed) => sum + seed.score, 0) / seeds.length;
  const coverageLeft = ratio(diagnosis.matchedRows.left, diagnosis.rows.left);
  const coverageRight = ratio(diagnosis.matchedRows.right, diagnosis.rows.right);
  const coverageAverage = (coverageLeft + coverageRight) / 2;
  const coverageMinimum = Math.min(coverageLeft, coverageRight);
  const rejectedTotal = diagnosis.rejectedRows.left + diagnosis.rejectedRows.right;
  const rowTotal = diagnosis.rows.left + diagnosis.rows.right;
  const rejectedRatio = ratio(rejectedTotal, rowTotal);
  const sizePenalty = Math.max(0, seeds.length - 2) * 2;
  const cardinality = cardinalityAdjustment(diagnosis.observedCardinality);

  const contributions = [
    { code: 'SIMPLE_EVIDENCE', weight: seedAverage * 0.5, message: `Average simple-key evidence: ${seedAverage.toFixed(1)}` },
    { code: 'ROW_COVERAGE', weight: coverageAverage * 35, message: `Average matched-row coverage: ${(coverageAverage * 100).toFixed(1)}%` },
    { code: 'BALANCED_COVERAGE', weight: coverageMinimum * 15, message: `Minimum side coverage: ${(coverageMinimum * 100).toFixed(1)}%` },
    { code: 'OBSERVED_CARDINALITY', weight: cardinality, message: `Observed composite cardinality: ${diagnosis.observedCardinality}` }
  ];
  if (rejectedRatio > 0) contributions.push({
    code: 'REJECTED_ROWS', weight: -rejectedRatio * 20, message: `${rejectedTotal} rows have unusable composite keys`
  });
  if (sizePenalty > 0) contributions.push({
    code: 'COMPOSITE_SIZE', weight: -sizePenalty, message: `Small complexity penalty for ${seeds.length} key components`
  });

  const raw = contributions.reduce((sum, entry) => sum + entry.weight, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return {
    score,
    coverage: {
      left: Number(coverageLeft.toFixed(4)),
      right: Number(coverageRight.toFixed(4)),
      average: Number(coverageAverage.toFixed(4)),
      minimum: Number(coverageMinimum.toFixed(4))
    },
    reasons: contributions.map((entry) => ({ ...entry, weight: Number(entry.weight.toFixed(2)) }))
  };
}

function componentSummary(seed) {
  return {
    score: seed.score,
    left: { ...seed.left, types: [...seed.left.types] },
    right: { ...seed.right, types: [...seed.right.types] },
    comparisonHint: { ...seed.comparisonHint },
    expectedCardinality: seed.expectedCardinality
  };
}

function dedupeWarnings(warnings) {
  const seen = new Set();
  return warnings.filter((warning) => {
    const code = String(warning?.code ?? 'WARNING');
    const message = String(warning?.message ?? '');
    const key = `${code}\u0000${message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function candidateWarnings(seeds, diagnosis, coverage) {
  const warnings = [...diagnosis.warnings];
  for (const seed of seeds) warnings.push(...seed.warnings);
  if (diagnosis.observedCardinality === 'N:N') warnings.push({
    code: 'MANY_TO_MANY_REMAINS', level: 'warning', message: 'Composite key still produces a many-to-many relation'
  });
  if (coverage.minimum < 0.5) warnings.push({
    code: 'LOW_COMPOSITE_COVERAGE', level: 'warning', message: 'Composite key matches less than half of at least one source'
  });
  return dedupeWarnings(warnings);
}

export function createDataJoinSpecCandidateEvaluator(DataJoinSpecCtor) {
  if (typeof DataJoinSpecCtor !== 'function') {
    fail('DataJoinSpec constructor is required', 'INVALID_DATA_JOIN_SPEC_ADAPTER', null, TypeError);
  }
  return ({ keys, comparison = {} }, leftRows, rightRows) => {
    const spec = new DataJoinSpecCtor({
      type: 'inner',
      keys: keys.map((key) => ({ left: key.left, right: key.right, label: key.label ?? '' })),
      expectedCardinality: 'auto',
      direction: 'none',
      precedence: 'none',
      comparison: {
        trim: comparison.trim === undefined ? true : Boolean(comparison.trim),
        caseSensitive: comparison.caseSensitive === undefined ? true : Boolean(comparison.caseSensitive),
        coerce: COERCIONS.has(comparison.coerce) ? comparison.coerce : 'none',
        blankAsNull: comparison.blankAsNull === undefined ? true : Boolean(comparison.blankAsNull),
        nullMatchesNull: comparison.nullMatchesNull === undefined ? false : Boolean(comparison.nullMatchesNull)
      },
      collision: { policy: 'nested' }
    });
    if (!spec || typeof spec.diagnose !== 'function') {
      fail('DataJoinSpec adapter must create an object with diagnose()', 'INVALID_DATA_JOIN_SPEC_ADAPTER', null, TypeError);
    }
    return spec.diagnose(leftRows, rightRows);
  };
}

export class DataJoinCompositeKeyMatcher {
  constructor(options = {}) {
    if (!isPlainObject(options)) fail('Composite matcher options must be an object', 'INVALID_COMPOSITE_MATCHER_OPTIONS', null, TypeError);
    if (!options.keyMatcher || typeof options.keyMatcher.match !== 'function') {
      fail('Composite matcher requires keyMatcher.match()', 'MISSING_SIMPLE_KEY_MATCHER', null, TypeError);
    }
    if (typeof options.evaluator !== 'function') {
      fail('Composite matcher requires an evaluator callback', 'MISSING_COMPOSITE_EVALUATOR', null, TypeError);
    }
    const minComponents = boundedInteger(options.minComponents, DEFAULTS.minComponents, 'minComponents', { min: 2, max: 4 });
    const maxComponents = boundedInteger(options.maxComponents, DEFAULTS.maxComponents, 'maxComponents', { min: 2, max: 4 });
    if (maxComponents < minComponents) {
      fail('maxComponents must be >= minComponents', 'INVALID_COMPOSITE_MATCHER_OPTION', { minComponents, maxComponents }, RangeError);
    }
    this.keyMatcher = options.keyMatcher;
    this.evaluator = options.evaluator;
    this.settings = {
      minComponents,
      maxComponents,
      seedLimit: boundedInteger(options.seedLimit, DEFAULTS.seedLimit, 'seedLimit', { min: 2, max: 50 }),
      maxCombinations: boundedInteger(options.maxCombinations, DEFAULTS.maxCombinations, 'maxCombinations', { min: 1, max: 100000 }),
      maxEvaluations: boundedInteger(options.maxEvaluations, DEFAULTS.maxEvaluations, 'maxEvaluations', { min: 1, max: 10000 }),
      maxCandidates: boundedInteger(options.maxCandidates, DEFAULTS.maxCandidates, 'maxCandidates', { min: 1, max: 1000 }),
      minScore: boundedNumber(options.minScore, DEFAULTS.minScore, 'minScore', { min: 0, max: 100 })
    };
  }

  match(leftRows, rightRows, leftCatalog, rightCatalog, context = {}) {
    if (!Array.isArray(leftRows) || !Array.isArray(rightRows)) {
      fail('Composite matcher rows must be arrays', 'INVALID_COMPOSITE_ROWS', null, TypeError);
    }
    if (!isPlainObject(context)) fail('Composite matcher context must be an object', 'INVALID_COMPOSITE_CONTEXT', null, TypeError);

    const simple = normalizeSimpleResult(this.keyMatcher.match(leftCatalog, rightCatalog, context));
    const seeds = simple.candidates.slice(0, this.settings.seedLimit);
    const candidates = [];
    const identities = new Set();
    const counters = {
      simpleCandidates: simple.candidates.length,
      seedCandidates: seeds.length,
      generated: 0,
      evaluated: 0,
      incompatibleCoercion: 0,
      duplicateCombinations: 0,
      evaluationLimitReached: false,
      combinationLimitReached: false
    };

    let stopped = false;
    const selected = [];
    const usedLeft = new Set();
    const usedRight = new Set();

    const consider = () => {
      counters.generated += 1;
      if (counters.generated > this.settings.maxCombinations) {
        counters.combinationLimitReached = true;
        stopped = true;
        return;
      }
      const identity = identityFor(selected);
      if (identities.has(identity)) {
        counters.duplicateCombinations += 1;
        return;
      }
      identities.add(identity);

      const coercion = resolveCoercion(selected);
      if (!coercion.ok) {
        counters.incompatibleCoercion += 1;
        return;
      }
      if (counters.evaluated >= this.settings.maxEvaluations) {
        counters.evaluationLimitReached = true;
        stopped = true;
        return;
      }

      const keys = keysFor(selected);
      const comparison = { ...(isPlainObject(context.comparison) ? cloneJsonSafe(context.comparison) : {}), coerce: coercion.coerce };
      const diagnosis = validateDiagnosis(this.evaluator({ keys, comparison }, leftRows, rightRows));
      counters.evaluated += 1;
      const scored = scoreComposite(selected, diagnosis);
      if (scored.score < this.settings.minScore) return;

      candidates.push({
        score: scored.score,
        keys,
        components: selected.map(componentSummary),
        comparisonHint: { coerce: coercion.coerce },
        observedCardinality: diagnosis.observedCardinality,
        coverage: scored.coverage,
        diagnostics: diagnosis,
        reasons: scored.reasons,
        warnings: candidateWarnings(selected, diagnosis, scored.coverage)
      });
    };

    const walk = (start) => {
      if (stopped) return;
      if (selected.length >= this.settings.minComponents) consider();
      if (stopped || selected.length >= this.settings.maxComponents) return;
      for (let index = start; index < seeds.length; index += 1) {
        if (stopped) break;
        const seed = seeds[index];
        if (usedLeft.has(seed.left.specPath) || usedRight.has(seed.right.specPath)) continue;
        selected.push(seed);
        usedLeft.add(seed.left.specPath);
        usedRight.add(seed.right.specPath);
        walk(index + 1);
        usedLeft.delete(seed.left.specPath);
        usedRight.delete(seed.right.specPath);
        selected.pop();
      }
    };

    walk(0);
    candidates.sort((a, b) =>
      b.score - a.score ||
      b.coverage.minimum - a.coverage.minimum ||
      a.keys.length - b.keys.length ||
      a.keys.map((key) => `${key.left}=${key.right}`).join('|').localeCompare(b.keys.map((key) => `${key.left}=${key.right}`).join('|'))
    );

    const warnings = [...simple.warnings];
    if (counters.combinationLimitReached) warnings.push({
      code: 'COMBINATION_LIMIT_REACHED', level: 'warning', message: `Composite exploration stopped at ${this.settings.maxCombinations} generated combinations`
    });
    if (counters.evaluationLimitReached) warnings.push({
      code: 'EVALUATION_LIMIT_REACHED', level: 'warning', message: `Composite exploration stopped at ${this.settings.maxEvaluations} evaluated combinations`
    });
    if (counters.incompatibleCoercion) warnings.push({
      code: 'INCOMPATIBLE_COMPOSITE_COERCION', level: 'info', message: `${counters.incompatibleCoercion} combinations were skipped because DataJoinSpec V1 exposes one global coercion`
    });

    return {
      candidates: candidates.slice(0, this.settings.maxCandidates),
      considered: counters,
      settings: { ...this.settings },
      warnings: dedupeWarnings(warnings)
    };
  }
}

export function matchDataJoinCompositeKeys(leftRows, rightRows, leftCatalog, rightCatalog, context, options) {
  return new DataJoinCompositeKeyMatcher(options).match(leftRows, rightRows, leftCatalog, rightCatalog, context);
}
