import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  discoverTests,
  formatHuman,
  parseArgs,
  runTest,
  runTests
} from '../tools/testing/run-tests.mjs';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'nlab-tests-'));
const nested = path.join(temp, 'nested');
await fs.mkdir(nested);
await fs.writeFile(path.join(temp, 'a.test.mjs'), "console.log('A OK')\n");
await fs.writeFile(path.join(temp, 'b.test.mjs'), "console.error('B FAIL'); process.exitCode=3\n");
await fs.writeFile(path.join(nested, 'c.test.mjs'), "console.log('C OK')\n");
await fs.writeFile(path.join(temp, 'ignore.mjs'), "throw new Error('must not run')\n");

try {
  const discovered = await discoverTests(temp);
  assert.deepEqual(discovered.map((file) => path.relative(temp, file).split(path.sep).join('/')), [
    'a.test.mjs',
    'b.test.mjs',
    'nested/c.test.mjs'
  ]);

  const matched = await discoverTests(temp, { match: '^nested/' });
  assert.deepEqual(matched.map((file) => path.relative(temp, file).split(path.sep).join('/')), ['nested/c.test.mjs']);

  const single = await runTest(path.join(temp, 'a.test.mjs'));
  assert.equal(single.passed, true);
  assert.equal(single.code, 0);
  assert.match(single.stdout, /A OK/);
  assert.equal(single.stderr, '');

  const summary = await runTests({ directory: temp });
  assert.equal(summary.ok, false);
  assert.equal(summary.total, 3);
  assert.equal(summary.executed, 3);
  assert.equal(summary.passed, 2);
  assert.equal(summary.failed, 1);
  assert.equal(summary.skipped, 0);
  assert.match(summary.results[1].stderr, /B FAIL/);

  const human = formatHuman(summary, { cwd: temp });
  assert.match(human, /✓ a\.test\.mjs/);
  assert.match(human, /✗ b\.test\.mjs/);
  assert.match(human, /2 passed, 1 failed/);
  assert.match(human, /stderr:/);

  const failFast = await runTests({ directory: temp, failFast: true });
  assert.equal(failFast.total, 3);
  assert.equal(failFast.executed, 2);
  assert.equal(failFast.passed, 1);
  assert.equal(failFast.failed, 1);
  assert.equal(failFast.skipped, 1);

  const onlyNested = await runTests({ directory: temp, match: 'nested' });
  assert.equal(onlyNested.ok, true);
  assert.equal(onlyNested.total, 1);
  assert.equal(onlyNested.passed, 1);

  const emptyDir = path.join(temp, 'empty');
  await fs.mkdir(emptyDir);
  const empty = await runTests({ directory: emptyDir });
  assert.equal(empty.ok, false);
  assert.equal(empty.total, 0);
  assert.match(formatHuman(empty), /aucun fichier/);

  assert.deepEqual(parseArgs([temp, '--match', 'nested', '--fail-fast', '--json', '--verbose']), {
    directory: temp,
    match: 'nested',
    failFast: true,
    json: true,
    verbose: true
  });
  assert.throws(() => parseArgs(['--match']), /requires a value/);
  assert.throws(() => parseArgs(['--unknown']), /Unknown option/);
  assert.throws(() => parseArgs([temp, 'extra']), /Unexpected argument/);

  const runner = fileURLToPath(new URL('../tools/testing/run-tests.mjs', import.meta.url));
  const cliPass = await spawnCapture(process.execPath, [runner, temp, '--match', 'nested', '--json']);
  assert.equal(cliPass.code, 0);
  const cliPassJson = JSON.parse(cliPass.stdout);
  assert.equal(cliPassJson.ok, true);
  assert.equal(cliPassJson.total, 1);

  const cliFail = await spawnCapture(process.execPath, [runner, temp, '--json']);
  assert.equal(cliFail.code, 1);
  const cliFailJson = JSON.parse(cliFail.stdout);
  assert.equal(cliFailJson.failed, 1);
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}

console.log('Test runner tests: OK');

function spawnCapture(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}
