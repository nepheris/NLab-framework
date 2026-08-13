import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateSiteWorkspace, runCli } from '../tools/site/validate-site-workspace.mjs';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'nlab-site-workspace-'));

function manifest(overrides = {}) {
  return {
    schema: 'nlab.site-workspace',
    version: 1,
    root: 'site/',
    directories: {
      atelier: { path: 'atelier/', purpose: 'Authoring', mutable: true, generated: false, publishable: false },
      data: { path: 'data/', purpose: 'Structured data', mutable: true, generated: false, publishable: false },
      assets: { path: 'assets/', purpose: 'Source assets', mutable: true, generated: false, publishable: false },
      config: { path: 'config/', purpose: 'Site configuration', mutable: true, generated: false, publishable: false },
      web: { path: 'web/', purpose: 'Generated public output', mutable: false, generated: true, publishable: true }
    },
    framework: { strategy: 'external', path: null, business_logic_allowed: false },
    ...overrides
  };
}

async function writeManifest(value, name = 'workspace.json') {
  const file = path.join(temp, name);
  await fs.writeFile(file, JSON.stringify(value, null, 2));
  return file;
}

try {
  const root = path.join(temp, 'site');
  for (const role of ['atelier', 'data', 'assets', 'config', 'web']) {
    await fs.mkdir(path.join(root, role), { recursive: true });
  }

  const goodFile = await writeManifest(manifest());
  let report = await validateSiteWorkspace({ workspaceFile: goodFile, baseDirectory: temp });
  assert.equal(report.ok, true);
  assert.equal(report.errors.length, 0);
  assert.equal(report.directories.length, 5);
  assert.equal(report.directories.every((entry) => entry.state === 'directory'), true);

  await fs.rm(path.join(root, 'web'), { recursive: true, force: true });
  report = await validateSiteWorkspace({ workspaceFile: goodFile, baseDirectory: temp });
  assert.equal(report.ok, false);
  assert.equal(report.errors.some((entry) => entry.code === 'DIRECTORY_MISSING' && entry.details.role === 'web'), true);
  await fs.mkdir(path.join(root, 'web'));

  const wrongFlags = manifest();
  wrongFlags.directories.web.mutable = true;
  report = await validateSiteWorkspace({ workspaceFile: await writeManifest(wrongFlags, 'wrong-flags.json'), baseDirectory: temp });
  assert.equal(report.ok, false);
  assert.equal(report.errors.some((entry) => entry.code === 'DIRECTORY_FLAG_MISMATCH'), true);

  report = await validateSiteWorkspace({ workspaceFile: await writeManifest(manifest({ root: '../escape/' }), 'escape.json'), baseDirectory: temp });
  assert.equal(report.ok, false);
  assert.equal(report.errors.some((entry) => entry.code === 'INVALID_ROOT'), true);

  const wrongBoundary = manifest();
  wrongBoundary.framework.business_logic_allowed = true;
  report = await validateSiteWorkspace({ workspaceFile: await writeManifest(wrongBoundary, 'boundary.json'), baseDirectory: temp });
  assert.equal(report.ok, false);
  assert.equal(report.errors.some((entry) => entry.code === 'BUSINESS_LOGIC_BOUNDARY'), true);

  const embedded = manifest();
  embedded.framework = { strategy: 'embedded-readonly', path: null, business_logic_allowed: false };
  report = await validateSiteWorkspace({ workspaceFile: await writeManifest(embedded, 'embedded.json'), baseDirectory: temp });
  assert.equal(report.ok, true);
  assert.equal(report.warnings.some((entry) => entry.code === 'FRAMEWORK_PATH_RECOMMENDED'), true);

  await fs.writeFile(path.join(temp, 'invalid.json'), '{ nope');
  report = await validateSiteWorkspace({ workspaceFile: path.join(temp, 'invalid.json'), baseDirectory: temp });
  assert.equal(report.ok, false);
  assert.equal(report.errors[0].code, 'INVALID_JSON');

  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    assert.equal(await runCli([goodFile, temp]), 0);
    assert.equal(await runCli([]), 1);
    assert.equal(await runCli([path.join(temp, 'missing.json'), temp]), 1);
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }

  console.log('site workspace validator tests: ok');
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
