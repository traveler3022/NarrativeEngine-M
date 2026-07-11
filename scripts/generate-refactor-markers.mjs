// scripts/generate-refactor-markers.mjs
// Reads 0.15 violations + 3.1 RF catalog + 3.3 wave assignment
// Emits:
//   1. REFACTOR-MAP.md (root index — "you are here")
//   2. Per-file marker suggestions (header + inline) to stdout
//
// Usage: node scripts/generate-refactor-markers.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- Load evidence ---
const violationsPath = join(ROOT, 'architecture/reverse-engineering/0.15-architecture-violations/RAW_DATA.json');
const violations = JSON.parse(readFileSync(violationsPath, 'utf8'));

console.error(`Loaded ${violations.length} violations from 0.15`);

// --- RF case → wave mapping (from 3.3) ---
const rfToWave = {
  'RF-001': { wave: 'W0(advance)/W1(close)', port: 'MessagingPort', class: 'A' },
  'RF-002': { wave: 'W0(advance)/W1(close)', port: 'NPCCapability', class: 'A' },
  'RF-003': { wave: 'W0(advance)/W1(close)', port: 'ArchivePort', class: 'A' },
  'RF-004': { wave: 'W0(advance)/W1(close)', port: 'CampaignContextPort', class: 'A' },
  'RF-005': { wave: 'W0(advance)/W1(close)', port: 'SettingsPort', class: 'A' },
  'RF-006': { wave: 'W0(advance)/W2(close)', port: 'NotificationPort', class: 'B' },
  'RF-007': { wave: 'W0(advance)/W3(close)', port: 'NotificationPort', class: 'B' },
  'RF-008': { wave: 'W4', port: '(logic extraction)', class: 'C' },
  'RF-009': { wave: 'W5', port: '(persistence service)', class: 'C' },
  'RF-010': { wave: 'W6', port: '(logic extraction)', class: 'C' },
  'RF-011': { wave: 'W7', port: '(persistence consolidation)', class: 'D' },
  'RF-012': { wave: 'W8', port: '(God File split)', class: 'E' },
  'RF-013': { wave: 'W9', port: '(God File split)', class: 'E' },
  'RF-014': { wave: 'W10', port: '(slice split)', class: 'F' },
  'RF-015': { wave: 'W11a', port: '(component split)', class: 'G' },
  'RF-016': { wave: 'W11b', port: '(component split)', class: 'G' },
  'RF-017': { wave: 'W11e', port: '(component split + TurnCallbacks)', class: 'G' },
  'RF-018': { wave: 'W11c', port: '(component split)', class: 'G' },
  'RF-019': { wave: 'W11d', port: '(component split)', class: 'G' },
};

// --- Classify each violation by file → RF case ---
// Heuristic from 3.1:
// - services/* importing store → RF-001..RF-005 (by what they call) or RF-006 if Toast
// - store/* importing services → RF-008 (campaignSlice), RF-009 (campaignStore), RF-010 (others)
// - store/* importing Toast → RF-007
// - services/* importing Toast → RF-006
// - services/* importing components → RF-006

function classifyViolation(v) {
  const f = v.file;
  const t = v.target;
  const isServiceSrc = f.includes('services/');
  const isStoreSrc = f.includes('store/') || f.includes('slices/');
  const isComponentSrc = f.includes('components/');

  const targetIsStore = t.includes('store') || t.includes('useAppStore') || t.includes('slices/');
  const targetIsService = t.includes('services/');
  const targetIsComponent = t.includes('components/') || t.includes('Toast');

  // service → store : RF-001..RF-005 (need deeper inspection, but for markers, group as A)
  if (isServiceSrc && targetIsStore) {
    // Try to refine by target slice
    if (t.includes('chat') || t.includes('Chat')) return 'RF-001';
    if (t.includes('npc') || t.includes('Npc') || t.includes('NPC')) return 'RF-002';
    if (t.includes('archive') || t.includes('Archive') || t.includes('divergence')) return 'RF-003';
    if (t.includes('campaign') || t.includes('Campaign') || t.includes('context')) return 'RF-004';
    if (t.includes('settings') || t.includes('Settings') || t.includes('preset') || t.includes('imageEndpoint')) return 'RF-005';
    return 'RF-001'; // default messaging
  }
  // service → component (Toast) : RF-006
  if (isServiceSrc && targetIsComponent) return 'RF-006';
  // store → component (Toast) : RF-007
  if (isStoreSrc && targetIsComponent) return 'RF-007';
  // store → service : RF-008/009/010 by file
  if (isStoreSrc && targetIsService) {
    if (f.includes('campaignStore.ts')) return 'RF-009';
    if (f.includes('campaignSlice.ts')) return 'RF-008';
    if (f.includes('npcSlice.ts') || f.includes('chatSlice.ts') || f.includes('settingsSlice.ts')) return 'RF-010';
    if (f.includes('useAppStore.ts')) return 'RF-010';
    return 'RF-010';
  }
  return null;
}

// --- Group violations by source file ---
const byFile = new Map();
for (const v of violations) {
  const rf = classifyViolation(v);
  if (!rf) continue;
  if (!byFile.has(v.file)) byFile.set(v.file, []);
  byFile.get(v.file).push({ ...v, rf });
}

// --- God Files from 3.2 (RF-012..RF-019) ---
const godFiles = [
  { file: 'services/npc/npcGeneration.ts', rf: 'RF-012', wave: 'W8', lines: 1307 },
  { file: 'services/turn/turnPostProcess.ts', rf: 'RF-013', wave: 'W9', lines: 1238 },
  { file: 'store/slices/chatSlice.ts', rf: 'RF-014', wave: 'W10', lines: 614, alsoRF: ['RF-007', 'RF-010'] },
  { file: 'components/context-drawer/MemoryTab.tsx', rf: 'RF-015', wave: 'W11a', lines: 916 },
  { file: 'components/chat/MessageBubble.tsx', rf: 'RF-016', wave: 'W11b', lines: 781 },
  { file: 'components/ChatArea.tsx', rf: 'RF-017', wave: 'W11e', lines: 565 },
  { file: 'components/pc/PCCreationWizard.tsx', rf: 'RF-018', wave: 'W11c', lines: 542 },
  { file: 'components/CampaignHub.tsx', rf: 'RF-019', wave: 'W11d', lines: 517 },
  { file: 'store/campaignStore.ts', rf: 'RF-009', wave: 'W5', lines: 0, alsoRF: [] },
];

// --- Persistence access points (RF-011) ---
const persistenceAccessPoints = [
  'services/storage/imageStorage.ts',
  'services/storage/embeddingStorage.ts',
  'services/storage/archiveStorage.ts',
  'services/storage/backupStorage.ts',
  'services/campaignBundle.ts',
  'store/campaignStore.ts',
  'store/slices/settingsSlice.ts',
  // (full list from 0.12)
];

// --- Build the file → RF map ---
const fileToRFs = new Map();
for (const [file, vs] of byFile.entries()) {
  const rfs = [...new Set(vs.map(v => v.rf))];
  fileToRFs.set(file, { rfs, violations: vs });
}
for (const gf of godFiles) {
  const rfs = gf.alsoRF ? [gf.rf, ...gf.alsoRF] : [gf.rf];
  if (fileToRFs.has(gf.file)) {
    const existing = fileToRFs.get(gf.file);
    existing.rfs = [...new Set([...existing.rfs, ...rfs])];
    existing.godFile = gf;
  } else {
    fileToRFs.set(gf.file, { rfs, violations: [], godFile: gf });
  }
}

// --- Generate REFACTOR-MAP.md ---
let map = `# REFACTOR-MAP — You Are Here

**Purpose:** This file is the entry point for any developer opening this
codebase for the first time during the refactor. It tells you, for every
file with planned changes, which RF cases affect it and which wave will
execute them.

**How to use:**
1. Before touching a file, look it up below.
2. Read the linked RF case(s) in \`architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md\`.
3. Read the wave definition in \`architecture/phase3-refactor-planning/3.3-wave-assignment.md\`.
4. Check the traceability matrix in \`architecture/phase3-refactor-planning/3.6-traceability-matrix.md\` to see if the RF case is already DONE.

**Legend:**
- **V** = boundary violation (from 0.15)
- **GF** = God File (from 0.16)
- **P** = persistence access point (from 0.12)

**Status:** ${new Date().toISOString().slice(0,10)} — Phase 3 complete, Phase 4 not started.

---

## Files With Planned Refactor (sorted by wave)

`;

const waveOrder = ['W0', 'W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11a', 'W11b', 'W11c', 'W11d', 'W11e', 'W12'];

// Group files by primary wave
const byWave = new Map();
for (const [file, info] of fileToRFs.entries()) {
  // Primary wave = earliest wave among RFs
  const waves = info.rfs.map(rf => rfToWave[rf].wave.split('/')[0].replace('(advance)','').trim().split('/')[0]);
  // simpler: pick by RF priority
  const primaryRF = info.rfs[0];
  const primaryWave = rfToWave[primaryRF].wave.split('(')[0];
  if (!byWave.has(primaryWave)) byWave.set(primaryWave, []);
  byWave.get(primaryWave).push({ file, ...info });
}

for (const w of waveOrder) {
  if (!byWave.has(w)) continue;
  const files = byWave.get(w);
  map += `### ${w}\n\n`;
  map += `| File | RF cases | Type | Lines | Description |\n`;
  map += `|------|----------|------|-------|-------------|\n`;
  for (const f of files.sort((a,b) => a.file.localeCompare(b.file))) {
    const rfList = f.rfs.join(', ');
    const types = [];
    if (f.violations.length > 0) types.push(`V(${f.violations.length})`);
    if (f.godFile) types.push(`GF`);
    const lines = f.godFile?.lines || '';
    const desc = f.godFile ? `God File — ${f.godFile.rf}` : (f.violations[0]?.rf + ' violations');
    map += `| \`src/${f.file}\` | ${rfList} | ${types.join('+')} | ${lines} | ${desc} |\n`;
  }
  map += `\n`;
}

map += `## Audit Chain

For any file above, the audit chain is:

\`\`\`
file → RF case → Evidence (Phase 0) → Design (Phase 2) → Wave (Phase 3.3) → Commit (Phase 4, when done)
\`\`\`

Read:
- \`architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md\` — full RF case definitions
- \`architecture/phase3-refactor-planning/3.3-wave-assignment.md\` — wave goals, evidence, validation
- \`architecture/phase3-refactor-planning/3.6-traceability-matrix.md\` — execution status
- \`architecture/phase2-architecture-design/\` — design decisions
- \`architecture/reverse-engineering/\` — evidence base

## File Header Convention

Every file listed above should have (or will get, in W0) a header like:

\`\`\`typescript
/**
 * @refactor RF-001, RF-006
 * @violations 3 (0.15/RAW_DATA.json)
 * @waves W0(advance), W1(close RF-001), W2(close RF-006)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md
 * @see REFACTOR-MAP.md
 */
\`\`\`

At each violation line, an inline marker:

\`\`\`typescript
import { useAppStore } from '@/store'; // @rf RF-001 W1 — domain→state, switch to MessagingPort
\`\`\`

These markers are added in W0 (Infrastructure Wave) as the first commit.
`;

writeFileSync(join(ROOT, 'REFACTOR-MAP.md'), map);
console.error(`Wrote REFACTOR-MAP.md (${fileToRFs.size} files indexed)`);

// --- Emit per-file marker suggestions as JSON for the next step ---
const markerData = [];
for (const [file, info] of fileToRFs.entries()) {
  markerData.push({
    file: `src/${file}`,
    rfs: info.rfs,
    violations: info.violations.map(v => ({
      target: v.target,
      type: v.type,
      rf: v.rf,
      wave: rfToWave[v.rf].wave,
    })),
    godFile: info.godFile || null,
  });
}

writeFileSync(join(ROOT, 'architecture/phase3-refactor-planning/_marker-data.json'), JSON.stringify(markerData, null, 2));
console.error(`Wrote _marker-data.json (${markerData.length} files)`);
console.error(`\nNext step: node scripts/apply-refactor-markers.mjs`);
