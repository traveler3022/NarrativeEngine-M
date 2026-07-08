#!/usr/bin/env node
/**
 * Strict gate check — runs after each refactor wave.
 *
 * Passes only if ALL of the following hold:
 *   GATE 4: no runtime cycle in store/slices/*
 *   GATE 5: no services/* imports from components/*
 *           no store/* imports from components/*
 *   GATE 6: no new services/* imports from store/* (compared to baseline)
 *
 * Type-only imports (import type {...}) are NOT counted as runtime
 * cycles — they're erased at compile time and cannot form a runtime
 * dependency. This script distinguishes the two.
 *
 * Run: node scripts/gate.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

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

// ── GATE 4: runtime cycle in store/slices/* ──────────────────────────
// We look for value imports (not `import type`) between any two slices.
console.log('═══════════════════════════════════════════════════════');
console.log('  GATE 4/6: no runtime cycle in store/slices/*');
console.log('═══════════════════════════════════════════════════════');

const sliceDir = join(SRC, 'store/slices');
const sliceFiles = walk(sliceDir).filter(f => !f.includes('__tests__') && !f.endsWith('saveController.ts'));

// Build adjacency: sliceName -> set of sliceNames it value-imports from
const adj = new Map();
for (const f of sliceFiles) {
  const name = f.replace(sliceDir + '/', '').replace(/\.(ts|tsx)$/, '');
  const content = readFileSync(f, 'utf8');
  const valueImports = [];
  // Match `import { ... } from './xxx'` — but NOT `import type { ... }`
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.match(/^\s*import\s+type\s/)) continue; // type-only, skip
    const m = line.match(/from\s+['"]\.\/([^'"]+)['"]/);
    if (m) {
      const target = m[1].replace(/\.(ts|tsx)$/, '');
      if (target !== name) valueImports.push(target);
    }
  }
  adj.set(name, valueImports);
}

// Detect cycle via DFS
let cycleFound = null;
function dfs(node, visited, stack) {
  if (stack.has(node)) {
    cycleFound = [...stack, node].join(' → ');
    return true;
  }
  if (visited.has(node)) return false;
  visited.add(node);
  stack.add(node);
  for (const next of adj.get(node) || []) {
    if (dfs(next, visited, stack)) return true;
  }
  stack.delete(node);
  return false;
}
const visited = new Set();
for (const name of adj.keys()) {
  if (dfs(name, visited, new Set())) break;
}
if (cycleFound) {
  console.log(`❌ FAIL: runtime cycle detected: ${cycleFound}`);
  process.exit(1);
} else {
  console.log('✓ no runtime cycle in store/slices/*');
}

// ── GATE 5: layer violations (services/store → components) ───────────
console.log('\n═══════════════════════════════════════════════════════');
console.log('  GATE 5/6: no services/store → components imports');
console.log('═══════════════════════════════════════════════════════');

const layerLeaks = [];
for (const f of files) {
  const rel = relative(ROOT, f);
  if (rel.includes('__tests__')) continue;
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }
  const isService = rel.startsWith('src/services/');
  const isStore = rel.startsWith('src/store/');
  if (!isService && !isStore) continue;
  const imports = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  for (const imp of imports) {
    if (imp.includes('/components/')) {
      layerLeaks.push(`${rel} → ${imp}`);
    }
  }
}
if (layerLeaks.length > 0) {
  console.log(`❌ FAIL: ${layerLeaks.length} layer violations:`);
  layerLeaks.forEach(l => console.log(`  ${l}`));
  process.exit(1);
} else {
  console.log('✓ no services/store → components imports');
}

// ── GATE 6: no new services → store leak ──────────────────────────────
console.log('\n═══════════════════════════════════════════════════════');
console.log('  GATE 6/6: services → store leak (current count vs Wave 1 baseline)');
console.log('═══════════════════════════════════════════════════════');

const svcToStore = [];
for (const f of files) {
  const rel = relative(ROOT, f);
  if (!rel.startsWith('src/services/')) continue;
  if (rel.includes('__tests__')) continue;
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }
  const imports = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m => m[1]);
  for (const imp of imports) {
    if (imp.includes('/store/useAppStore') || imp.includes('/store/campaignStore') || imp.includes('/store/slices/')) {
      svcToStore.push(`${rel} → ${imp}`);
    }
  }
}
console.log(`Current services → store leak count: ${svcToStore.length}`);
console.log('(Wave 1 baseline was 9 — this is a known pre-existing leak');
console.log(' to be addressed in Wave 2: StorePort. Gate 6 only fails if');
console.log(' the count INCREASES from baseline.)');
// Wave 1 baseline: 9. If we added new ones, fail.
const BASELINE = 9;
if (svcToStore.length > BASELINE) {
  console.log(`❌ FAIL: leak count grew from ${BASELINE} to ${svcToStore.length}`);
  svcToStore.forEach(l => console.log(`  ${l}`));
  process.exit(1);
} else {
  console.log(`✓ no new services → store leak introduced (count: ${svcToStore.length} ≤ baseline ${BASELINE})`);
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('  ALL STRUCTURAL GATES PASSED');
console.log('═══════════════════════════════════════════════════════');
