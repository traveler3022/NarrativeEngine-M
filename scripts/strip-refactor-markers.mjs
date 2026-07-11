// scripts/strip-refactor-markers.mjs
// Removes @refactor header blocks and inline @rf markers.
// Useful for re-applying markers after a script fix.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'src');

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

let stripped = 0;
for (const f of walk(ROOT)) {
  let content = readFileSync(f, 'utf8');
  let changed = false;

  // Strip header block
  const headerRe = /\/\*\*[\s\S]*?@refactor[\s\S]*?\*\/\n*/;
  if (headerRe.test(content)) {
    content = content.replace(headerRe, '');
    changed = true;
  }

  // Strip inline markers
  if (content.includes('  // @rf ')) {
    content = content.replace(/\s*\/\/ @rf RF-\d+[^]*?(?=\n|$)/g, '');
    changed = true;
  }

  if (changed) {
    writeFileSync(f, content);
    stripped++;
  }
}

console.log(`Stripped markers from ${stripped} files`);
