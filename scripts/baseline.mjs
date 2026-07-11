// scripts/baseline.mjs
// Architecture snapshot — full picture of current state.
// Writes JSON + Markdown summary to architecture/_baseline-<timestamp>.{json,md}
//
// Captures:
//   - violation count (mirrors gate.mjs)
//   - God File count (>500 lines)
//   - idb-keyval access point count
//   - port/adapter inventory
//   - file count by layer
//
// Usage: node scripts/baseline.mjs

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
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

function countLines(file) {
  try {
    return readFileSync(file, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

function classifyLayer(filePath) {
  const rel = relative(SRC, filePath);
  if (rel.startsWith('store/') || rel.startsWith('store\\')) return 'state';
  if (rel.startsWith('components/') || rel.startsWith('components\\')) return 'ui';
  if (rel.startsWith('services/') || rel.startsWith('services\\')) return 'domain';
  if (rel.startsWith('ports/') || rel.startsWith('ports\\')) return 'port';
  if (rel.startsWith('adapters/') || rel.startsWith('adapters\\')) return 'adapter';
  return 'other';
}

const files = walk(SRC);
const ts = files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts') && !f.endsWith('.test.ts'));
const tsx = files.filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx'));

// God Files: >500 lines
const godFiles = [];
for (const f of files) {
  if (f.includes('__tests__') || f.includes('.test.')) continue;
  const lines = countLines(f);
  if (lines > 500) {
    godFiles.push({ file: relative(ROOT, f).replace(/\\/g, '/'), lines });
  }
}
godFiles.sort((a, b) => b.lines - a.lines);

// idb-keyval access points
let idbCount = 0;
const idbFiles = [];
for (const f of files) {
  const content = readFileSync(f, 'utf8');
  if (content.includes('idb-keyval') && !f.includes('.test.')) {
    idbCount++;
    idbFiles.push(relative(ROOT, f).replace(/\\/g, '/'));
  }
}

// Port/adapter inventory
const ports = readdirSync(join(SRC, 'ports')).filter(f => f.endsWith('.ts') && f !== 'index.ts');
const adapters = readdirSync(join(SRC, 'adapters')).filter(f => f.endsWith('.ts') && f !== 'index.ts');

// Layer file counts
const byLayer = { domain: 0, state: 0, ui: 0, port: 0, adapter: 0, other: 0 };
for (const f of files) {
  byLayer[classifyLayer(f)]++;
}

const snapshot = {
  timestamp: new Date().toISOString(),
  totalFiles: files.length,
  byLayer,
  godFiles: { count: godFiles.length, files: godFiles },
  idbKeyval: { count: idbCount, files: idbFiles },
  ports: { count: ports.length, files: ports },
  adapters: { count: adapters.length, files: adapters },
};

const stamp = snapshot.timestamp.replace(/[:.]/g, '-').slice(0, 19);
const jsonPath = join(ROOT, `architecture/_baseline-${stamp}.json`);
const mdPath = join(ROOT, `architecture/_baseline-${stamp}.md`);

writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2));

let md = `# Architecture Baseline — ${snapshot.timestamp}\n\n`;
md += `## Summary\n\n`;
md += `| Metric | Count |\n|--------|-------|\n`;
md += `| Total files | ${snapshot.totalFiles} |\n`;
md += `| God Files (>500 lines) | ${godFiles.length} |\n`;
md += `| idb-keyval access points | ${idbCount} |\n`;
md += `| Ports | ${ports.length} |\n`;
md += `| Adapters | ${adapters.length} |\n\n`;
md += `## By Layer\n\n| Layer | Files |\n|-------|-------|\n`;
for (const [layer, count] of Object.entries(byLayer)) {
  md += `| ${layer} | ${count} |\n`;
}
md += `\n## God Files\n\n| File | Lines |\n|------|-------|\n`;
for (const g of godFiles) {
  md += `| \`${g.file}\` | ${g.lines} |\n`;
}
md += `\n## idb-keyval Access Points\n\n`;
for (const f of idbFiles) {
  md += `- \`${f}\`\n`;
}
md += `\n## Ports\n\n`;
for (const p of ports) md += `- \`${p}\`\n`;
md += `\n## Adapters\n\n`;
for (const a of adapters) md += `- \`${a}\`\n`;

writeFileSync(mdPath, md);

console.log('=== Architecture Baseline ===');
console.log(`Timestamp: ${snapshot.timestamp}`);
console.log(`Total files: ${snapshot.totalFiles}`);
console.log(`God Files (>500 lines): ${godFiles.length}`);
console.log(`idb-keyval access points: ${idbCount}`);
console.log(`Ports: ${ports.length}, Adapters: ${adapters.length}`);
console.log(`\nWrote:`);
console.log(`  ${relative(ROOT, jsonPath)}`);
console.log(`  ${relative(ROOT, mdPath)}`);
