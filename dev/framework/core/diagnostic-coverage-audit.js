const clone = (value) => value === undefined ? undefined : structuredClone(value);
const clean = (value) => String(value ?? '').trim();
const nonEmptyList = (value) => Array.isArray(value) && value.some((entry) => clean(entry));

export class DiagnosticCoverageAuditError extends Error {
  constructor(message, code = 'DIAGNOSTIC_COVERAGE_AUDIT_ERROR', details = null) {
    super(message);
    this.name = 'DiagnosticCoverageAuditError';
    this.code = code;
    this.details = details;
  }
}

function assertRegistry(registry) {
  if (!registry || typeof registry.list !== 'function' || typeof registry.get !== 'function' || typeof registry.describe !== 'function') {
    throw new DiagnosticCoverageAuditError('DiagnosticIdRegistry-compatible source is required', 'INVALID_REGISTRY');
  }
  return registry;
}

function issue(level, code, message, details = null) {
  return { level, code, message, details: details == null ? null : clone(details) };
}

function normalizeZone(zone, index) {
  if (!zone || typeof zone !== 'object' || Array.isArray(zone)) {
    throw new DiagnosticCoverageAuditError('Zone manifest entry must be an object', 'INVALID_ZONE', { index });
  }
  const key = clean(zone.key ?? zone.id ?? `zone-${index + 1}`);
  return {
    key,
    diagnosticRef: clean(zone.diagnosticRef ?? zone.ref),
    testable: zone.testable !== false,
    infoTest: Boolean(zone.infoTest ?? zone.hasInfoTest),
    titleId: Boolean(zone.titleId ?? zone.humanIdInTitle),
    metadata: clone(zone.metadata ?? {})
  };
}

export class DiagnosticCoverageAudit {
  constructor({ registry } = {}) {
    this.registry = assertRegistry(registry);
  }

  auditRegistry({ kind = null, technicalPrefix = null } = {}) {
    const entries = this.registry.list({ kind, technicalPrefix });
    const items = entries.map((entry) => {
      const issues = [];
      if (!clean(entry.objective)) issues.push(issue('error', 'MISSING_OBJECTIVE', 'Diagnostic objective is required'));
      if (!nonEmptyList(entry.thingsToTest)) issues.push(issue('error', 'MISSING_THINGS_TO_TEST', 'At least one thing to test is required'));
      if (!clean(entry.expectedResult)) issues.push(issue('error', 'MISSING_EXPECTED_RESULT', 'Expected result is required'));
      if (!Array.isArray(entry.files) || entry.files.length === 0) issues.push(issue('warning', 'NO_FILES', 'No source file is declared for this diagnostic'));
      return {
        humanId: entry.humanId,
        technicalId: entry.technicalId,
        kind: entry.kind,
        title: entry.title,
        valid: !issues.some((entry) => entry.level === 'error'),
        issues
      };
    });
    return this.#report('registry', items);
  }

  auditZones(zones = [], { requireInfoTest = true, requireTitleId = true } = {}) {
    if (!Array.isArray(zones)) throw new DiagnosticCoverageAuditError('zones must be an array', 'INVALID_ZONES');
    const seenKeys = new Set();
    const seenRefs = new Map();
    const items = zones.map((raw, index) => {
      const zone = normalizeZone(raw, index);
      const issues = [];
      if (!zone.key) issues.push(issue('error', 'ZONE_KEY_REQUIRED', 'Zone key is required'));
      else if (seenKeys.has(zone.key)) issues.push(issue('error', 'DUPLICATE_ZONE_KEY', 'Zone key must be unique', { key: zone.key }));
      seenKeys.add(zone.key);

      if (!zone.diagnosticRef) {
        if (zone.testable) issues.push(issue('error', 'ZONE_REF_REQUIRED', 'Testable zone requires a diagnostic reference', { key: zone.key }));
      } else {
        const diagnostic = this.registry.get(zone.diagnosticRef);
        if (!diagnostic) {
          issues.push(issue('error', 'UNKNOWN_DIAGNOSTIC', 'Zone diagnostic reference is not registered', { ref: zone.diagnosticRef }));
        } else {
          const previous = seenRefs.get(diagnostic.technicalId);
          if (previous && previous !== zone.key) {
            issues.push(issue('warning', 'SHARED_DIAGNOSTIC_REF', 'Diagnostic reference is shared by multiple zones', { otherZone: previous, ref: diagnostic.technicalId }));
          }
          seenRefs.set(diagnostic.technicalId, zone.key);
          if (zone.testable) issues.push(...this.#testingIssues(diagnostic));
        }
      }

      if (zone.testable && requireInfoTest && !zone.infoTest) {
        issues.push(issue('error', 'INFO_TEST_MISSING', 'Testable zone must declare an Info/Test control'));
      }
      if (zone.testable && requireTitleId && !zone.titleId) {
        issues.push(issue('error', 'TITLE_ID_MISSING', 'Testable zone must declare its human ID in the title'));
      }

      return {
        key: zone.key,
        diagnosticRef: zone.diagnosticRef || null,
        testable: zone.testable,
        infoTest: zone.infoTest,
        titleId: zone.titleId,
        valid: !issues.some((entry) => entry.level === 'error'),
        issues,
        metadata: clone(zone.metadata)
      };
    });
    return this.#report('zones', items);
  }

  audit({ zones = [], registry = true, zoneOptions = {}, registryOptions = {} } = {}) {
    const registryReport = registry ? this.auditRegistry(registryOptions) : null;
    const zonesReport = this.auditZones(zones, zoneOptions);
    const errors = (registryReport?.errors ?? 0) + zonesReport.errors;
    const warnings = (registryReport?.warnings ?? 0) + zonesReport.warnings;
    return {
      valid: errors === 0,
      errors,
      warnings,
      registry: registryReport,
      zones: zonesReport
    };
  }

  assert(report) {
    if (!report || typeof report !== 'object') throw new DiagnosticCoverageAuditError('Audit report is required', 'INVALID_REPORT');
    if (report.valid) return report;
    throw new DiagnosticCoverageAuditError('Diagnostic coverage audit failed', 'COVERAGE_FAILED', {
      errors: report.errors ?? null,
      warnings: report.warnings ?? null
    });
  }

  #testingIssues(entry) {
    const issues = [];
    if (!clean(entry.objective)) issues.push(issue('error', 'MISSING_OBJECTIVE', 'Diagnostic objective is required'));
    if (!nonEmptyList(entry.thingsToTest)) issues.push(issue('error', 'MISSING_THINGS_TO_TEST', 'At least one thing to test is required'));
    if (!clean(entry.expectedResult)) issues.push(issue('error', 'MISSING_EXPECTED_RESULT', 'Expected result is required'));
    return issues;
  }

  #report(scope, items) {
    const errors = items.reduce((sum, item) => sum + item.issues.filter((entry) => entry.level === 'error').length, 0);
    const warnings = items.reduce((sum, item) => sum + item.issues.filter((entry) => entry.level === 'warning').length, 0);
    return {
      scope,
      valid: errors === 0,
      count: items.length,
      errors,
      warnings,
      invalid: items.filter((item) => !item.valid).length,
      items: clone(items)
    };
  }
}
