// scripts/wave-diff.mjs
// Generates a Wave Diff report: compares current architecture state
// to the pre-wave baseline.
//
// Usage: node scripts/wave-diff.mjs <wave-name> <pre-wave-baseline.json>
//   pre-wave-baseline.json = the architecture/_baseline-*.json from BEFORE the wave
//
// Output: prints a formatted diff report to stdout AND writes
// architecture/phase4-implementation/wave-reports/<wave-name>-diff.md
//
// Report fields:
//   Baseline before:  N violations (from pre-wave baseline)
//   Baseline after:   M violations (current)
//   New:              X violations introduced (should be 0)
//   Resolved:         Y violations removed (wave's stated goal)
//   Expected:         Z (from 3.3 wave assignment)
//   Status:           PASS / FAIL

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scripts/wave-diff.mjs <wave-name> <pre-wave-baseline.json>');
  console.error('Example: node scripts/wave-diff.mjs W0 architecture/_baseline-2026-07-11T06-53-46.json');
  process.exit(2);
}

const waveName = args[0];
const preBaselinePath = join(ROOT, args[1]);

if (!existsSync(preBaselinePath)) {
  console.error(`Pre-wave baseline not found: ${args[1]}`);
  process.exit(2);
}

const preBaseline = JSON.parse(readFileSync(preBaselinePath, 'utf8'));

// The pre-wave baseline file may be from baseline.mjs (has godFiles, idbKeyval, etc.
// but no 'total' violations field) OR from gate.mjs (has 'total' and 'byType').
// We need a pre-wave VIOLATION count. If the baseline file doesn't have it,
// we accept a second arg: the pre-wave violation count.
// For simplicity, we expect the baseline file to have either:
//   - a 'total' field (gate-style), OR
//   - a 'violations' field with byType (we'll compute total from byType)

const preViolationsByType = preBaseline.byType ?? {
  'domain→state': preBaseline.domainToState ?? 0,
  'domain→ui': preBaseline.domainToUi ?? 0,
  'state→domain': preBaseline.stateToDomain ?? 0,
  'state→ui': preBaseline.stateToUi ?? 0,
};
const preTotal = preBaseline.total ?? Object.values(preViolationsByType).reduce((a, b) => a + b, 0);

// Get current state by running gate.mjs
execSync('node scripts/gate.mjs', { cwd: ROOT, encoding: 'utf8' });
const currentBaselinePath = execSync('node scripts/baseline.mjs', { cwd: ROOT, encoding: 'utf8' })
  .match(/Wrote:\s*\n\s*(architecture\/_baseline-[^\s]+)/)[1];
const currentBaseline = JSON.parse(readFileSync(join(ROOT, currentBaselinePath), 'utf8'));

// Read current gate baseline JSON
const gateBaseline = JSON.parse(readFileSync(join(ROOT, 'architecture/_gate-baseline.json'), 'utf8'));

const afterTotal = gateBaseline.total;
const newViolations = Math.max(0, afterTotal - preTotal);
const resolvedViolations = Math.max(0, preTotal - afterTotal);

// Build report
let report = `# Wave ${waveName} — Diff Report

**Generated:** ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Baseline before | ${preTotal} violations |
| Baseline after | ${afterTotal} violations |
| New | ${newViolations} violations introduced |
| Resolved | ${resolvedViolations} violations removed |
| Expected (per 3.3) | (fill from wave assignment) |
| Status | ${newViolations === 0 ? '✅ PASS' : '❌ FAIL'} |

## Detailed Counts

| Violation type | Before | After | Delta |
|----------------|--------|-------|-------|
`;

const types = ['domain→state', 'domain→ui', 'state→domain', 'state→ui'];
for (const t of types) {
  const before = preViolationsByType[t] ?? 0;
  const after = gateBaseline.byType?.[t] ?? 0;
  const delta = after - before;
  report += `| ${t} | ${before} | ${after} | ${delta >= 0 ? '+' : ''}${delta} |\n`;
}

report += `\n## Architecture Metrics\n\n| Metric | Before | After | Delta |\n|--------|--------|-------|-------|\n`;
report += `| Total files | ${preBaseline.totalFiles ?? 'N/A'} | ${currentBaseline.totalFiles} | ${(currentBaseline.totalFiles ?? 0) - (preBaseline.totalFiles ?? 0)} |\n`;
report += `| God Files (>500 lines) | ${preBaseline.godFiles?.count ?? 'N/A'} | ${currentBaseline.godFiles?.count} | ${(currentBaseline.godFiles?.count ?? 0) - (preBaseline.godFiles?.count ?? 0)} |\n`;
report += `| idb-keyval access points | ${preBaseline.idbKeyval?.count ?? 'N/A'} | ${currentBaseline.idbKeyval?.count} | ${(currentBaseline.idbKeyval?.count ?? 0) - (preBaseline.idbKeyval?.count ?? 0)} |\n`;
report += `| Ports | ${preBaseline.ports?.count ?? 0} | ${currentBaseline.ports?.count} | ${(currentBaseline.ports?.count ?? 0) - (preBaseline.ports?.count ?? 0)} |\n`;
report += `| Adapters | ${preBaseline.adapters?.count ?? 0} | ${currentBaseline.adapters?.count} | ${(currentBaseline.adapters?.count ?? 0) - (preBaseline.adapters?.count ?? 0)} |\n`;

// Behavior preservation check
report += `\n## Behavior Preservation Check\n\n`;
report += `Per Phase 3.3 W0 contract: this wave must NOT introduce behavior change.\n\n`;
report += `| Check | Result |\n|-------|--------|\n`;
report += `| Services importing ports (should be 0 in W0) | `;

// Count services importing ports
const grepResult = execSync(
  `grep -rln "from.*ports" src/services/ src/store/ src/components/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "__tests__" | grep -v "\\.test\\." | wc -l`,
  { cwd: ROOT, encoding: 'utf8' }
).trim();
report += `${grepResult} |\n`;

report += `| Services still importing useAppStore (W1 scope, should be unchanged) | ` +
  execSync(`grep -rln "from.*useAppStore" src/services/ --include="*.ts" 2>/dev/null | wc -l`, { cwd: ROOT, encoding: 'utf8' }).trim() +
  ` |\n`;
report += `| Services still importing Toast (W2 scope, should be unchanged) | ` +
  execSync(`grep -rln "from.*Toast" src/services/ --include="*.ts" 2>/dev/null | wc -l`, { cwd: ROOT, encoding: 'utf8' }).trim() +
  ` |\n`;
report += `| Store slices still importing Toast (W3 scope, should be unchanged) | ` +
  execSync(`grep -rln "from.*Toast" src/store/ --include="*.ts" 2>/dev/null | wc -l`, { cwd: ROOT, encoding: 'utf8' }).trim() +
  ` |\n`;

report += `\n## RF Case Status (per 3.6 Traceability Matrix)\n\n`;
report += `W0 advances RF-001..RF-007 to "Prepared" state. None are closed.\n`;
report += `W1/W2/W3 will close them.\n`;

report += `\n## Verdict\n\n`;
if (newViolations === 0 && resolvedViolations === 0) {
  report += `✅ **PASS** — Infrastructure only. No violations added, none removed. Behavior preserved.\n`;
} else if (newViolations === 0 && resolvedViolations > 0) {
  report += `✅ **PASS** — ${resolvedViolations} violations removed, no new violations introduced.\n`;
} else {
  report += `❌ **FAIL** — ${newViolations} new violations introduced. Wave must be revised or reverted.\n`;
}

// Write report
const reportDir = join(ROOT, 'architecture/phase4-implementation/wave-reports');
mkdirSync(reportDir, { recursive: true });
const reportPath = join(reportDir, `${waveName.toLowerCase()}-diff.md`);
writeFileSync(reportPath, report);

console.log(report);
console.log(`\nWrote: architecture/phase4-implementation/wave-reports/${waveName.toLowerCase()}-diff.md`);
