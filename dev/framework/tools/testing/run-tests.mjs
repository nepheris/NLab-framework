import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function compileMatch(match) {
  if (match == null || match === '') return null;
  if (match instanceof RegExp) return match;
  return new RegExp(String(match));
}

export async function discoverTests(directory, { match = null } = {}) {
  const root = path.resolve(directory);
  const matcher = compileMatch(match);
  const files = [];

  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.test.mjs')) continue;
      const relative = normalizePath(path.relative(root, absolute));
      if (!matcher || matcher.test(relative)) files.push(absolute);
      if (matcher?.global || matcher?.sticky) matcher.lastIndex = 0;
    }
  }

  await walk(root);
  return files;
}

export function runTest(file, {
  cwd = process.cwd(),
  env = process.env,
  nodeArgs = []
} = {}) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, [...nodeArgs, file], {
      cwd,
      env: { ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      resolve({
        file: path.resolve(file),
        passed: code === 0,
        code,
        signal,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr
      });
    });
  });
}

export async function runTests({
  directory,
  match = null,
  failFast = false,
  cwd = process.cwd(),
  env = process.env,
  nodeArgs = [],
  onResult = null
} = {}) {
  if (!directory) throw new Error('test directory is required');
  const root = path.resolve(directory);
  const files = await discoverTests(root, { match });
  const startedAt = Date.now();
  const results = [];

  for (const file of files) {
    const result = await runTest(file, { cwd, env, nodeArgs });
    results.push(result);
    if (typeof onResult === 'function') await onResult(result);
    if (failFast && !result.passed) break;
  }

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const skipped = files.length - results.length;
  return {
    ok: files.length > 0 && failed === 0,
    directory: root,
    match: match == null ? null : String(match),
    failFast: Boolean(failFast),
    total: files.length,
    executed: results.length,
    passed,
    failed,
    skipped,
    durationMs: Date.now() - startedAt,
    results
  };
}

export function formatHuman(summary, { cwd = process.cwd() } = {}) {
  const lines = [];
  for (const result of summary.results) {
    const relative = normalizePath(path.relative(cwd, result.file));
    lines.push(`${result.passed ? '✓' : '✗'} ${relative} (${result.durationMs} ms)`);
    if (!result.passed) {
      if (result.stdout.trim()) lines.push(`  stdout:\n${indent(result.stdout.trim())}`);
      if (result.stderr.trim()) lines.push(`  stderr:\n${indent(result.stderr.trim())}`);
    }
  }
  if (summary.total === 0) lines.push('! aucun fichier *.test.mjs trouvé');
  lines.push(
    `Tests: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped, ${summary.total} total (${summary.durationMs} ms)`
  );
  return lines.join('\n');
}

function indent(value) {
  return String(value).split('\n').map((line) => `    ${line}`).join('\n');
}

export function parseArgs(argv = []) {
  const options = {
    directory: null,
    match: null,
    failFast: false,
    json: false,
    verbose: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--fail-fast') options.failFast = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--verbose') options.verbose = true;
    else if (arg === '--match') {
      if (index + 1 >= argv.length) throw new Error('--match requires a value');
      options.match = argv[++index];
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!options.directory) {
      options.directory = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  options.directory ??= path.resolve('dev/framework/tests');
  return options;
}

export async function runCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const summary = await runTests({
    directory: options.directory,
    match: options.match,
    failFast: options.failFast,
    onResult: options.verbose && !options.json
      ? (result) => {
          if (result.stdout) process.stdout.write(result.stdout);
          if (result.stderr) process.stderr.write(result.stderr);
        }
      : null
  });

  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else console.log(formatHuman(summary));
  return summary.ok ? 0 : 1;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runCli().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    console.error(error?.stack ?? error);
    process.exitCode = 1;
  });
}
