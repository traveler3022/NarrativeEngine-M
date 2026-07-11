// scripts/audit-persistence.mjs
// Counts files that import idb-keyval directly.
// Tracks progress toward W7 goal: 11 access points → 1.
//
// Usage: node scripts/audit-persistence.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

const files = walk(SRC);
const idbFiles = [];

for (const f of files) {
  if (f.includes('.test.')) continue;
  const content = readFileSync(f, 'utf8');
  if (content.includes('idb-keyval') || content.includes('from \'idb-keyval') || content.includes('from "idb-keyval')) {
    idbFiles.push(relative(ROOT, f).replace(/\\/g, '/'));
  }
}

console.log('=== Persistence Access Point Audit ===');
console.log(`Files importing idb-keyval directly: ${idbFiles.length}`);
console.log(`\nGoal: 1 (only services/persistence/index.ts)`);
console.log(`\nCurrent access points:`);
for (const f of idbFiles) {
  const isTarget = f === 'src/services/persistence/index.ts';
  console.log(`  ${isTarget ? '✅' : '❌'} ${f}`);
}

if (idbFiles.length === 1 && idbFiles[0] === 'src/services/persistence/index.ts') {
  console.log('\n✅ W7 GOAL ACHIEVED — single persistence gateway.');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${idbFiles.length - 1} file(s) still need migration (W7 scope).`);
  process.exit(0); // Not a failure — just status
}
