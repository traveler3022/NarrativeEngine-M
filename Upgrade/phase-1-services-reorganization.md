# Phase 1 — Services Folder Reorganization

**AI Tier: Cheap AI** (Haiku 4.5 / GLM-4-small / GPT-4o-mini)

Pure file moves and import path updates. `tsc --noEmit` catches every missed import. Zero logic changes. The riskiest mistake possible is a broken import, which the compiler reports immediately.

## Why this phase first

The current `src/services/` is a flat dump of 60+ files. Grouping into domain folders:
- Lets later phases (4, 7, 8) work in a clean structure
- Makes ownership obvious — "is `condenser.ts` part of LLM, archive, or turn?" becomes answerable from the path
- Establishes barrel-file imports so future cross-domain coupling is visible

## Target structure

```
src/services/
  llm/
    llmService.ts, llmRequestQueue.ts, payloadSanitizer.ts, utilityCallTracker.ts
    index.ts (barrel)
  lore/
    loreChunker.ts, loreRetriever.ts, loreCheck.ts, loreEngineSeeder.ts,
    loreKeywordEnricher.ts, loreNPCParser.ts, rulesIndexer.ts, rulesRetriever.ts
    index.ts
  npc/
    npcGeneration.ts, npcDetector.ts, npcBehaviorDirective.ts, npcPressureTracker.ts
    index.ts
  embedding/
    embedder.ts, embedder.worker.ts, vectorSearch.ts, backfillRunner.ts
    index.ts
  archive/
    archiveMemory.ts, archiveIndexer.ts, archiveChapterEngine.ts,
    deepArchiveSearch.ts, saveFileEngine.ts, importanceRater.ts
    index.ts
  turn/
    turnOrchestrator.ts, turnContext.ts, turnPostProcess.ts, turnTypes.ts,
    toolHandlers.ts
    index.ts
  payload/
    payloadBuilder.ts, condenser.ts, contextMinifier.ts,
    contextRecommender.ts, semanticReranker.ts
    index.ts
  campaign-state/
    divergenceRegister.ts, factClusterer.ts, factDeduper.ts,
    semanticMemory.ts, timelineResolver.ts,
    characterProfileParser.ts, inventoryParser.ts
    index.ts
  engine/
    engineRolls.ts, charIntroEngine.ts, diceTier.ts,
    tagGeneration.ts, troublemaker.ts
    index.ts
  infrastructure/
    tokenizer.ts, jsonExtract.ts, utilityPrompts.ts,
    settingsCrypto.ts, backgroundQueue.ts, saveFilePicker.ts
    index.ts
  storage/                  ← already exists, unchanged
  
  # Kept at services/ root (already-existing facades):
  apiClient.ts, chatEngine.ts, callLLM.ts
```

## Sub-phase ordering (one PR each)

Walk the dependency tree from leaves to root. Each PR is self-contained.

| Sub-PR | Folder | Risk | Importer count |
|--------|--------|------|----------------|
| 1.1 | `infrastructure/` | Lowest | tokenizer, jsonExtract used widely but imports nothing |
| 1.2 | `engine/` | Low | Self-contained |
| 1.3 | `embedding/` | Low | embedder imported by ~8 files |
| 1.4 | `lore/` | Medium | loreRetriever imported by ~5 |
| 1.5 | `npc/` | Medium | npcGeneration imported by ~5 |
| 1.6 | `archive/` | Medium | Depends on lore + npc |
| 1.7 | `campaign-state/` | High | divergenceRegister imported by 9+ |
| 1.8 | `payload/` | Medium | Depends on most prior folders |
| 1.9 | `turn/` | Last | Top of dependency tree |

## Per-PR procedure

1. Create the new folder.
2. Move files in (`git mv` to preserve history).
3. Fix the moved files' own relative imports.
4. Create `index.ts` barrel re-exporting public symbols.
5. Grep for old import paths across `src/`: `from "../services/<oldName>"`, `from "../../services/<oldName>"`, `from "services/<oldName>"`.
6. Update every consumer to import from the new path (or via the barrel).
7. `npx tsc --noEmit` — must be zero new errors.
8. `npm test` — must be green.
9. App smoke boot: `npx expo start`, load a campaign, send one turn.

## Verification checklist per sub-PR

- [ ] `tsc --noEmit` exits 0
- [ ] `npm test` green
- [ ] No remaining grep hits for old paths
- [ ] App boots and a turn streams end-to-end
- [ ] `git log --follow` on a moved file still shows full history

## Notes for the executing model

- Use `git mv`, not delete-and-create — history matters.
- Don't change file contents beyond import statements.
- The barrel `index.ts` should re-export only what's actually imported externally; do not blanket re-export internals.
- If a circular import appears (it shouldn't, the audit found none), STOP and ask for human input rather than reorganizing files to break it.
