import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const OCCUPIED_STATUSES = Object.freeze(new Set([
  'reserved',
  'in_progress',
  'blocked',
  'review'
]));

export function isOccupiedLock(lock) {
  return Boolean(lock?.task_id) && OCCUPIED_STATUSES.has(String(lock.status ?? '').trim());
}

function normalizeScope(value) {
  return String(value ?? '').trim().replaceAll('\\', '/');
}

function hasGlob(pattern) {
  return /[*?]/.test(pattern);
}

function fixedPrefix(pattern) {
  const index = pattern.search(/[*?]/);
  return index < 0 ? pattern : pattern.slice(0, index);
}

function regexEscape(char) {
  return /[.()+^$|{}\[\]\\]/.test(char) ? `\\${char}` : char;
}

export function globToRegExp(pattern) {
  const source = normalizeScope(pattern);
  let regex = '^';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '*') {
      if (source[index + 1] === '*') {
        regex += '.*';
        index += 1;
      } else {
        regex += '[^/]*';
      }
    } else if (char === '?') {
      regex += '[^/]';
    } else {
      regex += regexEscape(char);
    }
  }
  regex += '$';
  return new RegExp(regex);
}

export function scopePatternsOverlap(left, right) {
  const a = normalizeScope(left);
  const b = normalizeScope(right);
  if (!a || !b) return false;
  if (a === b) return true;

  const aGlob = hasGlob(a);
  const bGlob = hasGlob(b);
  if (!aGlob && !bGlob) return false;
  if (aGlob && !bGlob) return globToRegExp(a).test(b);
  if (!aGlob && bGlob) return globToRegExp(b).test(a);

  // Deux globs : on préfère un faux positif à une collision silencieuse.
  // Des préfixes littéraux incompatibles prouvent l'absence d'intersection ;
  // sinon l'intersection est considérée possible.
  const aPrefix = fixedPrefix(a);
  const bPrefix = fixedPrefix(b);
  const compatiblePrefixes = aPrefix.startsWith(bPrefix) || bPrefix.startsWith(aPrefix);
  return compatiblePrefixes;
}

function scopes(lock) {
  return Array.isArray(lock?.file_scope)
    ? lock.file_scope.map(normalizeScope).filter(Boolean)
    : [];
}

export function lockPairConflicts(left, right) {
  if (!left?.task_id || !right?.task_id || left.task_id === right.task_id) return [];
  const conflicts = [];
  for (const leftScope of scopes(left)) {
    for (const rightScope of scopes(right)) {
      if (!scopePatternsOverlap(leftScope, rightScope)) continue;
      conflicts.push({ leftScope, rightScope });
    }
  }
  return conflicts;
}

export function findLockConflicts(locks, { candidate = null } = {}) {
  const occupied = (locks ?? []).filter(isOccupiedLock);
  const conflicts = [];

  if (candidate) {
    for (const existing of occupied) {
      if (existing.task_id === candidate.task_id) continue;
      const overlaps = lockPairConflicts(candidate, existing);
      if (!overlaps.length) continue;
      conflicts.push({
        left: summary(candidate),
        right: summary(existing),
        overlaps
      });
    }
    return conflicts;
  }

  for (let leftIndex = 0; leftIndex < occupied.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < occupied.length; rightIndex += 1) {
      const left = occupied[leftIndex];
      const right = occupied[rightIndex];
      const overlaps = lockPairConflicts(left, right);
      if (!overlaps.length) continue;
      conflicts.push({ left: summary(left), right: summary(right), overlaps });
    }
  }
  return conflicts;
}

function summary(lock) {
  return {
    task_id: lock.task_id,
    agent: lock.agent ?? null,
    status: lock.status ?? null,
    branch: lock.branch ?? null
  };
}

export async function loadLocks(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const locks = [];
  const errors = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const file = path.join(directory, entry.name);
    try {
      const content = await fs.readFile(file, 'utf8');
      const lock = JSON.parse(content);
      locks.push({ ...lock, __file: file });
    } catch (error) {
      errors.push({ file, error: error.message });
    }
  }
  return { locks, errors };
}

async function readCandidate(file) {
  const content = await fs.readFile(file, 'utf8');
  return { ...JSON.parse(content), __file: file };
}

export async function runCli(argv = process.argv.slice(2)) {
  const [locksDirectory, candidateFile] = argv;
  if (!locksDirectory) {
    console.error('Usage: node check-lock-overlaps.mjs <locks-directory> [candidate-lock.json]');
    return 1;
  }

  const { locks, errors } = await loadLocks(locksDirectory);
  if (errors.length) {
    console.error(JSON.stringify({ ok: false, parseErrors: errors }, null, 2));
    return 1;
  }

  const candidate = candidateFile ? await readCandidate(candidateFile) : null;
  const conflicts = findLockConflicts(locks, { candidate });
  const result = {
    ok: conflicts.length === 0,
    mode: candidate ? 'candidate' : 'audit',
    occupiedLocks: locks.filter(isOccupiedLock).length,
    candidate: candidate ? summary(candidate) : null,
    conflicts
  };
  console.log(JSON.stringify(result, null, 2));
  return conflicts.length ? 2 : 0;
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
