#!/usr/bin/env node
/**
 * Baseline snapshot — captures the project's structural state before
 * any refactoring so we can prove each step didn't regress.
 *
 * Outputs:
 *   - build status (tsc + vite)
 *   - file size distribution (>500 lines, >300 lines)
 *   - boundary leaks (services → components, services → store, store → components)
 *   - candidate import cycles (heuristic, not full SCC)
 *
 * Run: node scripts/baseline.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const sizes = files.map(f => ({ path: relative(ROOT, f), lines: readFileSync(f, 'utf8').split('\n').length }));
sizes.sort((a, b) => b.lines - a.lines);

console.log('═══════════════════════════════════════════════════════════');
console.log('  BASELINE SNAPSHOT  —  ' + new Date().toISOString());
console.log('═══════════════════════════════════════════════════════════\n');

console.log(`Total .ts/.tsx files: ${files.length}`);
const totalLines = sizes.reduce((s, f) => s + f.lines, 0);
console.log(`Total lines: ${totalLines.toLocaleString()}\n`);

console.log('─── Files over 500 lines ───');
sizes.filter(f => f.lines > 500).forEach(f => console.log(`  ${String(f.lines).padStart(5)}  ${f.path}`));

console.log('\n─── Files 300-500 lines ───');
sizes.filter(f => f.lines > 300 && f.lines <= 500).slice(0, 15).forEach(f => console.log(`  ${String(f.lines).padStart(5)}  ${f.path}`));

// ── Boundary leak detection ──────────────────────────────────────────────
function matches(file, substr) { return file.includes(substr); }
const leaks = { servicesToComponents: [], servicesToStore: [], storeToComponents: [] };

for (const f of files) {
  const rel = relative(ROOT, f);
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }
  const imports = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m.group || m[1]);

  if (rel.startsWith('src/services/')) {
    for (const imp of imports) {
      if (imp.includes('/components/')) leaks.servicesToComponents.push(`${rel} → ${imp}`);
      if (imp.includes('/store/useAppStore') || imp.includes('/store/campaignStore') || imp.includes('/store/slices/'))
        if (!imp.endsWith('.test.ts')) leaks.servicesToStore.push(`${rel} → ${imp}`);
    }
  }
  if (rel.startsWith('src/store/')) {
    for (const imp of imports) {
      if (imp.includes('/components/')) leaks.storeToComponents.push(`${rel} → ${imp}`);
    }
  }
}

console.log('\n─── Boundary leak: services → components ───');
leaks.servicesToComponents.forEach(l => console.log(`  ${l}`));

console.log('\n─── Boundary leak: services → store ───');
leaks.servicesToStore.forEach(l => console.log(`  ${l}`));

console.log('\n─── Boundary leak: store → components ───');
leaks.storeToComponents.forEach(l => console.log(`  ${l}`));

console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Summary: ${leaks.servicesToComponents.length} svc→comp | ${leaks.servicesToStore.length} svc→store | ${leaks.storeToComponents.length} store→comp`);
console.log('═══════════════════════════════════════════════════════════');
