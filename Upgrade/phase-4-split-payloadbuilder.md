# Phase 4 — Split payloadBuilder + saveFileEngine

**AI Tier: Mid AI** (Sonnet 4.6 / GPT-4o / GLM-4.6)

Clean phase boundaries already exist inside both files. The work is mechanical extraction with careful argument threading. Mid-tier judgment needed because the options-object shape needs reorganization.

## 4a. Split `payloadBuilder.ts` (625 lines)

Current responsibility: assembles the full LLM payload (system prompt → divergences → world context → history → user message).

### Target file structure

All in `src/services/payload/`:

```
payloadBudgeter.ts        ← computeBudgets(limit, hasDeepContext, rulesBudgetPct): BudgetMap
payloadStableContent.ts   ← buildStablePreamble(), buildDivergenceBlock()
payloadWorldContext.ts    ← assembleWorldBlocks(), filterRecallByPerception(),
                            selectActiveNPCs(), filterNPCsByRecommendation(),
                            filterNPCsByMention()
payloadHistoryFitting.ts  ← fitHistory(history, condensedIdx, userMsg, reserved, limit)
payloadBuilder.ts         ← orchestrator: ~120 lines, calls the above and arranges
                            the final messages array
```

### Types to centralize at top of `payloadBuilder.ts`

```ts
export interface BudgetMap {
  stable: number;
  summary: number;
  world: number;
  rules: number;
  volatile: number;
}

export interface WorldBlock {
  source: string;
  content: string;
  tokens: number;
  reason: string;
}

export interface BuildPayloadOptions {
  settings: AppSettings;
  context: GameContext;
  history: OpenAIMessage[];   // typed from Phase 2
  userMessage: string;
  retrievals?: { /* lore, rules, archive, semanticFacts, deep, pinned */ };
  campaign?: { /* npcLedger, archiveIndex, chapters, timeline, divergence, onStageNpcIds */ };
  npcStrategy?: { mode: 'recommended' | 'fallback'; recommendedNames?: string[]; semanticallyRecalledIds?: string[] };
  sceneNumber?: string;
  condensedUpToIndex?: number;
}
```

The current 19-arg flat options object should be grouped into the nested shape above. Existing callers need updating.

### Phase boundaries inside `buildPayload()`

The current function already has comment-delimited phases. Extract along these lines:

| Lines | Phase | Goes to |
|-------|-------|---------|
| 75–85 | Budget calculation | `payloadBudgeter.ts` |
| 286–326 | Stable preamble + divergence | `payloadStableContent.ts` |
| 328–557 | World context assembly (the 230-line monolith) | `payloadWorldContext.ts` |
| 559–570 | Budget trimming | Keep inline in orchestrator (cross-cuts) |
| 572–602 | Volatile + history fitting | `payloadHistoryFitting.ts` |
| 604–623 | Final message arrangement | Keep in `payloadBuilder.ts` orchestrator |

### Callers to update

Grep `from .*payloadBuilder` after Phase 1 — the API surface change (options-object reshape) is the disruptive part. Main caller: `src/services/turn/turnOrchestrator.ts`.

## 4b. Split `saveFileEngine.ts` (610 lines)

Currently in `src/services/archive/` (after Phase 1).

### Target

```
archive/
  chapterSummaryWriter.ts   ← LLM-driven chapter summarization
  divergenceExtractor.ts    ← post-turn divergence extraction via LLM
  saveFileEngine.ts         ← orchestrator: ~200 lines, calls the above + archiveChapterEngine
```

### Boundaries

- Summary generation: any function that calls the LLM to produce a chapter summary string
- Divergence extraction: any function that calls the LLM to extract divergence facts from a scene
- Orchestrator: sequencing, storage writes, archive sealing

If a helper is used by both writer and extractor, leave it in `saveFileEngine.ts` and import.

## Execution order

1. Phase 4a first — payloadBuilder is more painful for downstream phases
2. Phase 4b second

Each can ship as a single PR (the split is one logical change).

## Verification

- [ ] `tsc --noEmit` exits 0
- [ ] `npm test` green (especially any payload-related tests)
- [ ] Manual: send 3 turns of varying complexity. Compare the constructed payload trace (turn on debug mode → check PayloadTraceView) before/after — they should be byte-identical for the same inputs.
- [ ] Manual: trigger a chapter seal. Confirm chapter summary appears in archive.

## Notes for the executing model

- The world context assembly has TWO NPC selection paths (recommender mode vs. fallback substring scan). Unify them into one function with a strategy parameter — don't preserve the duplication.
- Trace logging (`addTrace()` calls) should move with the code that triggers them; don't centralize traces.
- The 230-line world context block is the hardest part. If you start running over the file's complexity budget, ship `payloadWorldContext.ts` as a single function first and split it internally in a follow-up.
