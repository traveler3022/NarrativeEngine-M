// scripts/apply-refactor-markers.mjs
// Reads _marker-data.json and applies:
//   1. File header comment block (top of file, before any code)
//   2. Inline @rf markers at violation lines
//
// Idempotent: if a file already has a @refactor header, it skips.
// Comments only — no code change. Build unaffected.
//
// Usage: node scripts/apply-refactor-markers.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const markerData = JSON.parse(
  readFileSync(join(ROOT, 'architecture/phase3-refactor-planning/_marker-data.json'), 'utf8')
);

const rfToWave = {
  'RF-001': 'W0(advance)/W1(close)',
  'RF-002': 'W0(advance)/W1(close)',
  'RF-003': 'W0(advance)/W1(close)',
  'RF-004': 'W0(advance)/W1(close)',
  'RF-005': 'W0(advance)/W1(close)',
  'RF-006': 'W0(advance)/W2(close)',
  'RF-007': 'W0(advance)/W3(close)',
  'RF-008': 'W4',
  'RF-009': 'W5',
  'RF-010': 'W6',
  'RF-011': 'W7',
  'RF-012': 'W8',
  'RF-013': 'W9',
  'RF-014': 'W10',
  'RF-015': 'W11a',
  'RF-016': 'W11b',
  'RF-017': 'W11e',
  'RF-018': 'W11c',
  'RF-019': 'W11d',
};

const rfToPort = {
  'RF-001': 'MessagingPort',
  'RF-002': 'NPCCapability',
  'RF-003': 'ArchivePort',
  'RF-004': 'CampaignContextPort',
  'RF-005': 'SettingsPort',
  'RF-006': 'NotificationPort',
  'RF-007': 'NotificationPort',
  'RF-008': '(logic extraction)',
  'RF-009': '(persistence service)',
  'RF-010': '(logic extraction)',
  'RF-011': '(persistence consolidation)',
  'RF-012': '(God File split)',
  'RF-013': '(God File split)',
  'RF-014': '(slice split)',
  'RF-015': '(component split)',
  'RF-016': '(component split)',
  'RF-017': '(component split + TurnCallbacks)',
  'RF-018': '(component split)',
  'RF-019': '(component split)',
};

let applied = 0;
let skipped = 0;
let failed = 0;

for (const item of markerData) {
  const filePath = join(ROOT, item.file);
  if (!existsSync(filePath)) {
    console.error(`SKIP (not found): ${item.file}`);
    skipped++;
    continue;
  }

  let content = readFileSync(filePath, 'utf8');

  // Idempotency: skip if already marked
  if (content.includes('@refactor RF-')) {
    console.error(`SKIP (already marked): ${item.file}`);
    skipped++;
    continue;
  }

  // Build header
  const rfList = item.rfs.join(', ');
  const waves = [...new Set(item.rfs.map(rf => rfToWave[rf]))].join('; ');
  const ports = [...new Set(item.rfs.map(rf => rfToPort[rf]))].join(', ');
  const violationCount = item.violations.length;
  const godFileNote = item.godFile ? `\n * @godFile ${item.godFile.rf} (${item.godFile.lines} lines)` : '';

  const header = `/**
 * @refactor ${rfList}
 * @violations ${violationCount} (see architecture/reverse-engineering/0.15-architecture-violations/RAW_DATA.json)
 * @waves ${waves}
 * @ports ${ports}${godFileNote}
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md
 * @see architecture/phase3-refactor-planning/3.6-traceability-matrix.md
 * @see REFACTOR-MAP.md
 */
`;

  // Apply header at the very top of the file
  // (before any imports, after any shebang/license)
  let lines = content.split('\n');
  let insertAt = 0;

  // Skip shebang
  if (lines[0]?.startsWith('#!')) insertAt = 1;
  // Skip existing license comment block
  while (insertAt < lines.length && lines[insertAt]?.startsWith('//')) {
    insertAt++;
  }

  lines.splice(insertAt, 0, header);
  content = lines.join('\n');

  // Apply inline markers at violation lines
  // Strategy: find lines that import the violation target, append `// @rf RF-XXX W{n}`
  for (const v of item.violations) {
    const target = v.target;
    const rf = v.rf;
    const wave = rfToWave[rf].split('(')[0];
    const port = rfToPort[rf];

    // Try to find an import line that references the target
    // target is like "../services/storage/imageStorage" or "../../components/Toast"
    const targetBase = target.split('/').pop().replace(/^\.\.\//, '');
    const targetPatterns = [
      `from '${target}'`,
      `from "${target}"`,
      `from '${targetBase}'`,
      `from "${targetBase}"`,
      targetBase,
    ];

    let found = false;
    lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('@rf ')) continue; // already marked
      for (const p of targetPatterns) {
        if (lines[i].includes(p) && (lines[i].includes('import') || lines[i].includes('require'))) {
          // Append inline marker
          const trimmed = lines[i].replace(/\s*$/, '');
          const direction =
            v.rf === 'RF-001' || v.rf === 'RF-002' || v.rf === 'RF-003' || v.rf === 'RF-004' || v.rf === 'RF-005' ? 'domain→state' :
            v.rf === 'RF-006' ? 'domain→ui' :
            v.rf === 'RF-007' ? 'state→ui' :
            v.rf === 'RF-008' || v.rf === 'RF-009' || v.rf === 'RF-010' ? 'state→domain' :
            'internal';
          lines[i] = `${trimmed}  // @rf ${rf} ${wave} — ${direction}, switch to ${port}`;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    content = lines.join('\n');
  }

  writeFileSync(filePath, content);
  console.error(`MARKED: ${item.file} (RFs: ${rfList})`);
  applied++;
}

console.error(`\nDone. Applied: ${applied}, Skipped: ${skipped}, Failed: ${failed}`);
