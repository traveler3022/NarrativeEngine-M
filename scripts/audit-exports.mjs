// scripts/audit-exports.mjs
// Verifies that a barrel file re-exports everything the original file exported.
// Used in W8/W9/W10 (God File splits) to catch missing re-exports (R-09).
//
// Usage: node scripts/audit-exports.mjs <original-file> <barrel-file>
//   (or with a single arg, compares the file to its pre-split state in git)
//
// Exit codes:
//   0 — all exports preserved
//   1 — some exports missing

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function extractExports(content) {
  const exports = new Set();
  // export function/name, export const, export type, export interface, export class
  const re = /export\s+(?:async\s+)?(?:function|const|let|var|type|interface|class|enum|default)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    exports.add(m[1]);
  }
  // export { name1, name2 }
  const reBrace = /export\s*\{([^}]+)\}/g;
  while ((m = reBrace.exec(content)) !== null) {
    for (const name of m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
      exports.add(name);
    }
  }
  return exports;
}

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/audit-exports.mjs <file> [--vs-git <commit>]');
  console.error('       node scripts/audit-exports.mjs <original-file> <barrel-file>');
  process.exit(2);
}

let originalExports, currentExports;
let originalPath, currentPath;

if (args.length === 2 && !args[0].startsWith('--')) {
  // Two-file comparison
  originalPath = resolve(ROOT, args[0]);
  currentPath = resolve(ROOT, args[1]);
  originalExports = extractExports(readFileSync(originalPath, 'utf8'));
  currentExports = extractExports(readFileSync(currentPath, 'utf8'));
} else {
  // Single file, compare vs git HEAD (or specified commit)
  currentPath = resolve(ROOT, args[0]);
  const commit = args.includes('--vs-git') ? args[args.indexOf('--vs-git') + 1] : 'HEAD';
  currentExports = extractExports(readFileSync(currentPath, 'utf8'));
  try {
    const gitContent = execSync(`git show ${commit}:${args[0]}`, { cwd: ROOT, encoding: 'utf8' });
    originalExports = extractExports(gitContent);
  } catch (e) {
    console.error(`Could not read ${args[0]} from git ${commit}: ${e.message}`);
    process.exit(2);
  }
}

const missing = [...originalExports].filter(e => !currentExports.has(e));
const added = [...currentExports].filter(e => !originalExports.has(e));

console.log(`Original exports: ${originalExports.size}`);
console.log(`Current exports:   ${currentExports.size}`);

if (missing.length === 0) {
  console.log('✅ All original exports preserved.');
} else {
  console.log(`\n❌ MISSING EXPORTS (${missing.length}):`);
  for (const m of missing) {
    console.log(`  - ${m}`);
  }
}

if (added.length > 0) {
  console.log(`\nNew exports (added since original): ${added.length}`);
  for (const a of added) {
    console.log(`  + ${a}`);
  }
}

process.exit(missing.length === 0 ? 0 : 1);
