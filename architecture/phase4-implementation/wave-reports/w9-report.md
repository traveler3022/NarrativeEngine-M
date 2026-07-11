# Wave W9 Report — turnPostProcess.ts God File Split (RF-013, partial)

**Branch:** phase4/w9-turnpostprocess-split
**Date:** 2026-07-11

## هدف (Goal)

هدف این Wave: بستن RF-013 و تجزیه turnPostProcess.ts (1,248 lines) به فایل‌های کوچکتر بر اساس stage.

## Files Created (4 new)

| File | Lines | Responsibility |
|------|-------|---------------|
| `src/services/turn/postTurn/witnessStage.ts` | 81 | parsePresentHeader, resolveNPCIds, auxWitnessFallback, tryWithFallback |
| `src/services/turn/postTurn/sealStage.ts` | 198 | runCombinedSeal, handleSealChapter |
| `src/services/turn/postTurn/archiveStage.ts` | 230 | queueIndexPatch, queueNPCValidation, autoEnableCharacterProfile |
| `src/services/turn/postTurn/bookkeepingStage.ts` | 43 | runBookkeepingScans |

## Files Modified

| File | Before | After | Change |
|------|--------|-------|--------|
| `src/services/turn/turnPostProcess.ts` | 1,248 lines | 775 lines | -473 lines (-38%) |

## Approach

Extracted 4 stage clusters to `postTurn/` subdirectory:
1. **witnessStage.ts** — 👥 [Present] header parsing + NPC ID resolution + LLM fallback
2. **sealStage.ts** — chapter sealing orchestration (runCombinedSeal + handleSealChapter)
3. **archiveStage.ts** — background queue tasks (importance rating, witness capture, NPC validation)
4. **bookkeepingStage.ts** — periodic profile/inventory scans

All extracted functions are re-exported from turnPostProcess.ts for backward compat.
Consumers (turn/index.ts, pendingCommit.ts) need NO changes.

## What Remains in turnPostProcess.ts

The NPC stage functions (775 lines) remain:
- handlePostTurn (orchestrator entry, 100 lines)
- runNPCPressureScan (pressure tracking, 50 lines)
- runAgencyTick (agency heartbeat, 254 lines)
- bumpOnStageActivity (activity bump, 23 lines)
- runTimeskipPath (timeskip handling, 130 lines)
- runArcTick (arc engine tick, 134 lines)

These functions are tightly coupled through shared TurnState and TurnCallbacks,
and need a different extraction approach (state machine or service class) that's
out of scope for this wave.

## Verification

| Check | Result |
|-------|--------|
| tsc -b | ✅ PASS |
| Smoke tests (27) | ✅ PASS |
| Store + NPC tests (318) | ✅ PASS (1 skipped) |
| gate.mjs | 10 violations (no new — PASS) |
| audit-exports.mjs | ✅ All 6 original exports preserved |

## Diff Report

| Metric | Value |
|--------|-------|
| Pre-W9 turnPostProcess.ts lines | 1,248 |
| Post-W9 turnPostProcess.ts lines | 775 (-473, -38%) |
| New files created | 4 (552 lines total) |
| God Files count | 14 (unchanged — turnPostProcess still >500 lines) |
| Status | ⚠️ Partial PASS — extraction done but file still >500 lines |

## RF Case Status Update

| RF | Status before W9 | Status after W9 |
|----|-------------------|-----------------|
| RF-013 (turnPostProcess God File) | Planned | **Partially Done** — 4 stage clusters extracted, NPC stage remains |

## نتیجه (Result)

نتیجه: **4 فایل جدید ایجاد شد (552 lines)، turnPostProcess.ts از 1,248 → 775 lines کاهش یافت (-38%). تمام 6 export حفظ شد. 1 RF در وضعیت Partially Done باقی ماند (NPC stage هنوز >500 lines است).**

W10 ادامه خواهد داد با chatSlice God File split (RF-014).
