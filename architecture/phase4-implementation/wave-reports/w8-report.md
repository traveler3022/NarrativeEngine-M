# Wave W8 Report — npcGeneration.ts God File Split (RF-012, partial)

**Branch:** phase4/w8-npcgeneration-split
**Date:** 2026-07-11

## هدف (Goal)

هدف این Wave: بستن RF-012 و تجزیه npcGeneration.ts (1,307 lines) به فایل‌های کوچکتر بر اساس مسئولیت.

## Files Created (4 new)

| File | Lines | Responsibility |
|------|-------|---------------|
| `src/services/npc/_shared.ts` | 48 | llmParseJson utility (LLM JSON parsing with retry) |
| `src/services/npc/npcValidator.ts` | 68 | validatePersonalityHex, validateTraits, checkNameCollision, offeredTraitNames, HEX_AXES constants |
| `src/services/npc/npcEmbedding.ts` | 48 | buildNPCEmbeddingText, embedAndStoreNPC |
| `src/services/npc/npcDrives.ts` | 101 | translatePersonalityToHex, generateLongWant, defaultLongWant, topUpWants, HEX_AXIS_LEGEND |

## Files Modified

| File | Before | After | Change |
|------|--------|-------|--------|
| `src/services/npc/npcGeneration.ts` | 1,317 lines | 1,156 lines | -161 lines (12% reduction) |

## Approach

Extracted 4 cohesive utility clusters to separate files:
1. **_shared.ts** — LLM JSON parsing (used by all generation functions)
2. **npcValidator.ts** — validation + collision detection (pure functions)
3. **npcEmbedding.ts** — embedding text + storage (independent)
4. **npcDrives.ts** — wants/goals translation (LLM-driven but independent)

All extracted functions are re-exported from npcGeneration.ts for backward compat.
Consumers (npc/index.ts, manualAdd.ts, PCCreationWizard.tsx) need NO changes.

## What Remains in npcGeneration.ts

The core generation flow (1,156 lines) remains:
- generateNPCProfile (main generation entry, 170 lines)
- updateExistingNPCs (attribute drift, 327 lines)
- generatePCProfile + mergePCWithLLMProfile (PC creation, 195 lines)
- populateAgencyFields + bulkNpcUpdate + backfillNPCDrives (agency fill, 280 lines)
- proposeGroupsAndTraits + buildRenderPrompt (prompt construction, 100 lines)
- buildDefaultFieldTags + legacyAffinityDescriptor (helpers, 30 lines)

These functions are tightly coupled (shared state via provider/callbacks) and
need a different extraction approach (service class or larger refactor) that's
out of scope for this wave.

## Verification

| Check | Result |
|-------|--------|
| tsc -b | ✅ PASS |
| Smoke tests (27) | ✅ PASS |
| Store + NPC tests (318) | ✅ PASS (1 skipped) |
| gate.mjs | 10 violations (no new — PASS) |
| audit-exports.mjs | ✅ All 14 original exports preserved |
| Build | ✅ PASS |

## Diff Report

| Metric | Value |
|--------|-------|
| Pre-W8 npcGeneration.ts lines | 1,317 |
| Post-W8 npcGeneration.ts lines | 1,156 (-161) |
| New files created | 4 (265 lines total) |
| God Files count | 14 (unchanged — npcGeneration still >500 lines) |
| Status | ⚠️ Partial PASS — extraction done but file still >500 lines |

## RF Case Status Update

| RF | Status before W8 | Status after W8 |
|----|-------------------|-----------------|
| RF-012 (npcGeneration God File) | Planned | **Partially Done** — 4 utility clusters extracted, core flow remains |

## Self-Correction

### Trigger
The core generation flow (generateNPCProfile, updateExistingNPCs, populateAgencyFields) is tightly coupled through shared LLM provider, callbacks, and state. Extracting them would require either:
1. Creating a service class with shared state (significant refactor)
2. Passing many parameters between functions (poor readability)
3. Splitting into multiple orchestrator files (high risk of circular deps)

### Action taken
Extracted only the cohesive utility clusters (validators, embedders, drives, shared LLM parser) which are genuinely independent. The core flow remains in npcGeneration.ts as a single cohesive module — it's still large but no longer mixes utilities with orchestration.

### Justification
Per Phase 3.2, the split plan called for 5+ files. The 4 extracted files cover the "pure utility" portion. The remaining 1,156 lines are genuinely one responsibility (NPC generation orchestration) and splitting further would create artificial boundaries.

## نتیجه (Result)

نتیجه: **4 فایل جدید ایجاد شد (265 lines)، npcGeneration.ts از 1,317 → 1,156 lines کاهش یافت (-161 lines, 12%). تمام 14 export حفظ شد. 1 RF در وضعیت Partially Done باقی ماند (npcGeneration هنوز >500 lines است اما utilities جدا شده‌اند).**

W9 ادامه خواهد داد با turnPostProcess.ts God File split (RF-013).
