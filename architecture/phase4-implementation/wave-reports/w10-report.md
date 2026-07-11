# Wave W10 Report — chatSlice God File Split (RF-014, partial)

**Branch:** phase4/w10-chatslice-split
**Date:** 2026-07-11

## هدف (Goal)

هدف این Wave: بستن RF-014 و تجزیه chatSlice.ts (624 lines) به فایل‌های کوچکتر.

## Files Created (1 new)

| File | Lines | Responsibility |
|------|-------|---------------|
| `src/store/slices/chatSliceHelpers.ts` | 90 | locateRawSpan, normalizeWithMap, normalizeLoose, MD_MARKER, saveDivergence |

## Files Modified

| File | Before | After | Change |
|------|--------|-------|--------|
| `src/store/slices/chatSlice.ts` | 624 lines | 562 lines | -62 lines (-10%) |

## Approach

Extracted pure utility functions to `chatSliceHelpers.ts`:
1. **Markdown normalization** — locateRawSpan, normalizeWithMap, normalizeLoose, MD_MARKER
2. **Divergence persistence** — saveDivergence helper

All extracted functions are re-exported from chatSlice.ts for backward compat.
The slice type + creator (messages, condenser, divergence, excerpts, lore-check)
remains as one cohesive Zustand slice — splitting it would require multiple slice
compositions which is a larger refactor.

## Verification

| Check | Result |
|-------|--------|
| tsc -b | ✅ PASS |
| Smoke tests (27) | ✅ PASS |
| Store + NPC tests (318) | ✅ PASS (1 skipped) |
| gate.mjs | 10 violations (no new — PASS) |

## Diff Report

| Metric | Value |
|--------|-------|
| Pre-W10 chatSlice.ts lines | 624 |
| Post-W10 chatSlice.ts lines | 562 (-62, -10%) |
| New files created | 1 (90 lines) |
| God Files count | 14 (unchanged — chatSlice still >500 lines) |
| Status | ⚠️ Partial PASS — utility extraction done, slice remains cohesive |

## RF Case Status Update

| RF | Status before W10 | Status after W10 |
|----|-------------------|-----------------|
| RF-014 (chatSlice God File) | Planned | **Partially Done** — utilities extracted, slice type/creator remains |

## Self-Correction

### Trigger
chatSlice is a Zustand slice with 4 data domains (messages, condenser, divergence, excerpts).
Per Phase 3.2, the plan was to split into 4 sub-slices. However:
1. The slice uses a single `set()` callback shared across all domains
2. Cross-domain reads (e.g., divergence reading messages) happen via `get()`
3. Splitting would require multiple StateCreator compositions which changes the store API

### Action taken
Extracted only the pure utility functions (markdown normalization + divergence persistence).
The slice type + creator remains as one cohesive unit — it's still large but no longer
mixes pure utilities with state management.

### Justification
Per Phase 3.2, the split plan called for 4 sub-slices. The utility extraction covers
the "pure function" portion. The remaining 562 lines are genuinely one Zustand slice
and splitting further would require a store composition refactor (high risk, low benefit).

## نتیجه (Result)

نتیجه: **1 فایل جدید ایجاد شد (90 lines)، chatSlice.ts از 624 → 562 lines کاهش یافت (-10%). 1 RF در وضعیت Partially Done باقی ماند (slice هنوز >500 lines است اما utilities جدا شده‌اند).**
