# Wave W2 Report — Service→NotificationPort Migration (RF-006)

**Branch:** phase4/w2-notification-service
**Date:** 2026-07-11

## هدف (Goal)

هدف این Wave: بستن RF-006 و حذف 5 Violation (dom→ui) از طریق مهاجرت Toast → NotificationPort در service files.

## Files Migrated

| File | toast.X calls | Status |
|------|---------------|--------|
| `src/services/turn/pendingCommit.ts` | 1 (toast.error) | ✅ Migrated to notificationPort.error |
| `src/services/turn/turnOrchestrator.ts` | 3 (warning, warning, error) | ✅ Migrated |
| `src/services/turn/turnPostProcess.ts` | 3 (warning, success, error) | ✅ Migrated |
| `src/services/campaign-state/divergenceRegister.ts` | 1 (toast.info) | ✅ Migrated |
| `src/services/image/index.ts` | 4 (3 warning, 1 error) | ✅ Migrated |
| `src/services/image/portrait.ts` | 4 (4 warning) | ✅ Migrated |

All 6 service files now use `notificationPort.X()` instead of `toast.X()`.
All `import { toast } from '../../components/Toast'` lines removed.

## Verification

| Check | Result |
|-------|--------|
| tsc -b | ✅ PASS |
| Smoke tests (27) | ✅ PASS |
| Store slice tests (100) | ✅ PASS |
| gate.mjs delta | 65 → 59 (-6 violations; domain→ui: 7 → 1) |
| Services importing Toast | **0** ✅ (was 6) |
| Services importing notificationPort | 6 ✅ |

## Diff Report

| Metric | Value |
|--------|-------|
| Baseline before (post-W1) | 65 violations |
| Baseline after (post-W2) | 59 violations |
| New | 0 ✅ |
| Resolved | 6 ✅ (1 more than expected because pendingCommit.ts was already partially migrated in W1) |
| Expected (per 3.3) | 5 |
| Actual | 6 (RF-006 fully closed for all 6 service files) |
| Status | ✅ **PASS** — exceeded expectation |

## RF Case Status Update

| RF | Status before W2 | Status after W2 |
|----|-------------------|-----------------|
| RF-006 (NotificationPort — services) | Prepared | **Done** ✅ |
| RF-007 (NotificationPort — slices) | Prepared | Prepared (W3 scope) |

## Self-Correction

None. W2 proceeded exactly as designed.

## نتیجه (Result)

نتیجه: **6 Violation حذف شد (بیش از 5 مورد انتظاری)، 1 RF بسته شد (RF-006 Done)، 0 مورد برای Wave بعد باقی ماند (RF-007 در W3).**

dom→ui violations: 7 → 1 (1 باقی‌مانده مربوط به useMessageEditor در components که نیاز به logic extraction دارد — جدا از NotificationPort).

W3 ادامه خواهد داد با store slice → NotificationPort migration (RF-007).
