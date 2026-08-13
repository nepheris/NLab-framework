import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE_WORKSPACE_SCHEMA = 'nlab.site-workspace';
export const SITE_WORKSPACE_VERSION = 1;
export const REQUIRED_ROLES = Object.freeze(['atelier', 'data', 'assets', 'config', 'web']);

const EXPECTED = Object.freeze({
  atelier: { path: 'atelier/', mutable: true, generated: false, publishable: false },
  data: { path: 'data/', mutable: true, generated: false, publishable: false },
  assets: { path: 'assets/', mutable: true, generated: false, publishable: false },
  config: { path: 'config/', mutable: true, generated: false, publishable: false },
  web: { path: 'web/', mutable: false, generated: true, publishable: true }
});

function issue(code, message, details = {}) {
  return { code, message, details };
}

function isSafeRelativeDirectory(value) {
  return typeof value === 'string' &&
    value.length >= 2 &&
    value.endsWith('/') &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.split('/').includes('..');
}

function validateManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return [issue('INVALID_MANIFEST', 'Workspace manifest must be a JSON object.')];
  }
  if (manifest.schema !== SITE_WORKSPACE_SCHEMA) {
    errors.push(issue('INVALID_SCHEMA', `Expected schema ${SITE_WORKSPACE_SCHEMA}.`, { actual: manifest.schema }));
  }
  if (manifest.version !== SITE_WORKSPACE_VERSION) {
    errors.push(issue('INVALID_VERSION', `Expected version ${SITE_WORKSPACE_VERSION}.`, { actual: manifest.version }));
  }
  if (!isSafeRelativeDirectory(manifest.root)) {
    errors.push(issue('INVALID_ROOT', 'root must be a safe relative POSIX directory ending with /.', { root: manifest.root }));
  }
  if (!manifest.directories || typeof manifest.directories !== 'object' || Array.isArray(manifest.directories)) {
    errors.push(issue('INVALID_DIRECTORIES', 'directories must be an object.'));
  } else {
    const extraRoles = Object.keys(manifest.directories).filter((role) => !REQUIRED_ROLES.includes(role));
    if (extraRoles.length) errors.push(issue('UNKNOWN_DIRECTORY_ROLE', 'Unknown directory roles are not allowed.', { roles: extraRoles }));
    for (const role of REQUIRED_ROLES) {
      const entry = manifest.directories[role];
      const expected = EXPECTED[role];
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        errors.push(issue('MISSING_DIRECTORY_ROLE', `Missing directory role ${role}.`, { role }));
        continue;
      }
      if (entry.path !== expected.path) errors.push(issue('DIRECTORY_PATH_MISMATCH', `${role}.path must be ${expected.path}.`, { role, actual: entry.path }));
      if (typeof entry.purpose !== 'string' || !entry.purpose.trim()) errors.push(issue('DIRECTORY_PURPOSE_REQUIRED', `${role}.purpose must be non-empty.`, { role }));
      for (const flag of ['mutable', 'generated', 'publishable']) {
        if (entry[flag] !== expected[flag]) errors.push(issue('DIRECTORY_FLAG_MISMATCH', `${role}.${flag} must be ${expected[flag]}.`, { role, flag, actual: entry[flag] }));
      }
    }
  }
  const framework = manifest.framework;
  if (!framework || typeof framework !== 'object' || Array.isArray(framework)) {
    errors.push(issue('INVALID_FRAMEWORK', 'framework must be an object.'));
  } else {
    if (!['external', 'synchronized', 'embedded-readonly'].includes(framework.strategy)) {
      errors.push(issue('INVALID_FRAMEWORK_STRATEGY', 'Unsupported framework strategy.', { actual: framework.strategy }));
    }
    if (framework.business_logic_allowed !== false) {
      errors.push(issue('BUSINESS_LOGIC_BOUNDARY', 'framework.business_logic_allowed must be false.'));
    }
    if (framework.path != null && (typeof framework.path !== 'string' || !framework.path.trim())) {
      errors.push(issue('INVALID_FRAMEWORK_PATH', 'framework.path must be null or a non-empty string.'));
    }
  }
  return errors;
}

async function directoryState(fullPath) {
  try {
    const stat = await fs.stat(fullPath);
    return stat.isDirectory() ? 'directory' : 'not-directory';
  } catch (error) {
    if (error?.code === 'ENOENT') return 'missing';
    throw error;
  }
}

export async function validateSiteWorkspace({ workspaceFile, baseDirectory } = {}) {
  if (!workspaceFile) throw new TypeError('workspaceFile is required');
  const absoluteFile = path.resolve(workspaceFile);
  const raw = await fs.readFile(absoluteFile, 'utf8');
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    return {
      schema: 'nlab.site-workspace-validation-report', version: 1, ok: false,
      workspace_file: absoluteFile, workspace_root: null,
      errors: [issue('INVALID_JSON', 'Workspace manifest is not valid JSON.', { message: error.message })], warnings: [], directories: []
    };
  }

  const errors = validateManifest(manifest);
  const warnings = [];
  const anchor = path.resolve(baseDirectory ?? path.dirname(absoluteFile));
  const root = isSafeRelativeDirectory(manifest.root) ? path.resolve(anchor, manifest.root) : null;
  const directories = [];

  if (root && !root.startsWith(anchor + path.sep) && root !== anchor) {
    errors.push(issue('ROOT_ESCAPE', 'Resolved workspace root escapes the base directory.', { root }));
  } else if (root && manifest.directories && typeof manifest.directories === 'object') {
    for (const role of REQUIRED_ROLES) {
      const relative = manifest.directories?.[role]?.path;
      if (relative !== EXPECTED[role].path) continue;
      const fullPath = path.resolve(root, relative);
      if (!fullPath.startsWith(root + path.sep)) {
        errors.push(issue('DIRECTORY_ESCAPE', `${role} resolves outside workspace root.`, { role, path: fullPath }));
        continue;
      }
      const state = await directoryState(fullPath);
      directories.push({ role, relative_path: relative, path: fullPath, state });
      if (state === 'missing') errors.push(issue('DIRECTORY_MISSING', `Required directory ${role} is missing.`, { role, path: fullPath }));
      else if (state === 'not-directory') errors.push(issue('NOT_A_DIRECTORY', `Required path ${role} is not a directory.`, { role, path: fullPath }));
    }
  }

  if (manifest.framework?.strategy === 'embedded-readonly' && !manifest.framework.path) {
    warnings.push(issue('FRAMEWORK_PATH_RECOMMENDED', 'embedded-readonly strategy should declare framework.path.'));
  }

  return {
    schema: 'nlab.site-workspace-validation-report',
    version: 1,
    ok: errors.length === 0,
    workspace_file: absoluteFile,
    workspace_root: root,
    errors,
    warnings,
    directories
  };
}

export async function runCli(argv = process.argv.slice(2)) {
  const [workspaceFile, baseDirectory] = argv;
  if (!workspaceFile) {
    console.error(JSON.stringify({ ok: false, error: { code: 'USAGE', message: 'Usage: node validate-site-workspace.mjs <workspace.json> [base-directory]' } }, null, 2));
    return 1;
  }
  try {
    const report = await validateSiteWorkspace({ workspaceFile, baseDirectory });
    const output = JSON.stringify(report, null, 2);
    (report.ok ? console.log : console.error)(output);
    return report.ok ? 0 : 2;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: { code: 'VALIDATION_ERROR', message: error.message } }, null, 2));
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await runCli();
}
