# 2.4 Capability Discovery — REPORT

Generated: 2026-07-11
Extraction Method: AST scan of all `export` statements in src/services/ + src/store/ + src/components/
Protocol: Evidence-First (EVIDENCE_FIRST_PROTOCOL.md)

---

## Summary

594 exported symbols discovered across 18 service modules. Each was
classified by operation type (create/read/update/delete/persist/search/
orchestrate/utility) based on function name patterns.

18 capabilities were discovered — grouped by domain behavior, NOT by
directory structure.

---

## Capability Inventory

### CAP-1: NPC Generation & Profile
- **Purpose:** Generate NPC profiles from LLM, validate personality, manage PC creation
- **Owner Layer:** services/npc
- **Exports:** generateNPCProfile, generatePCProfile, mergePCWithLLMProfile, validatePersonalityHex, validateTraits, translatePersonalityToHex, generateLongWant, updateExistingNPCs, buildNPCEmbeddingText, embedAndStoreNPC
- **Files:** services/npc/npcGeneration.ts (1306 lines), services/npc/npcGenerationHelpers.ts
- **Consumers:** services/npc/index.ts, components/pc/PCCreationWizard.tsx, services/npc/manualAdd.ts
- **Op Types:** create (5), read (2), update (1), utility (2)
- **Confidence:** ✅ Verified (export scan)

### CAP-2: NPC Agency (off-screen simulation)
- **Purpose:** Simulate NPC activity off-screen: wants, goals, pressure, drift, heartbeat, collision, audition, progress, dice, bands, digest
- **Owner Layer:** services/npc
- **Exports:** 193 total — includes drawShortWants, drawMediumWants, buildGoalsFromWants, upgradeWantsToGoals, rollHeartbeat, buildProximityRoster, rollGoal, applyBandToGoal, canCrossTier, consumeTierCross, buildDigest, rollHex, pickGroups, drawConsistentTraits
- **Files:** 28 files in services/npc/ (agencyBands, agencyGoals, agencyHeartbeat, agencyLifecycle, agencySelection, agencyDice, agencyProgress, agencyDigest, agencyConstants, agencyPools, agencyDrift, agencyGeneration, agencyCollision, agencyTimeskipRun, agencyUpdate, agencyWantDraw, agencyRung, agencyAudition, dispositionGroups, hexRoll, hexVoiceGuide, nameBank, nameSwap, npcBehaviorDirective, npcDetector, npcPressureTracker, reactionRepression, relationMeter)
- **Consumers:** services/turn/turnPostProcess, services/npc/npcGeneration, store/slices/npcSlice
- **Op Types:** create (5), read (15), update (10), delete (2), orchestrate (8), utility (40+)
- **Confidence:** ✅ Verified

### CAP-3: NPC Detection & Naming
- **Purpose:** Detect NPC names from text, manage name bank, dedupe ledger
- **Owner Layer:** services/npc
- **Exports:** extractNPCNames, classifyNPCNames, validateNPCCandidates, COMBAT_TIER_ARCHETYPE_RUBRIC, drawUnusedName, lookupCultures, genderOf, isKnownName, NAME_CULTURES, dedupeNPCLedger, findLedgerMatches, addNpcFromSelection
- **Files:** services/npc/npcDetector.ts, services/npc/nameBank.ts, services/npc/nameSwap.ts, store/slices/npcSlice.ts (dedupeNPCLedger)
- **Consumers:** services/turn/turnPostProcess, store/slices/npcSlice, components/Header
- **Op Types:** read (5), utility (3), update (2)
- **Confidence:** ✅ Verified

### CAP-4: Turn Orchestration
- **Purpose:** Run a full AI turn: plan → recall → expand → rerank → generate → post-process → commit
- **Owner Layer:** services/turn
- **Exports:** runTurn, commitPendingTurn, handlePostTurn, reconcilePendingCommitOnLaunch, findPendingCommitMessage, findRetryableMessage, capturePendingTurnSnapshot, clearPendingTurnSnapshot, patchCachedUserPrompt, isLatestGmMessage, hasSwipeSet, getCachedSwipePayload, getActiveSnapshotId, getPendingTurnSnapshot
- **Files:** services/turn/turnOrchestrator.ts, services/turn/turnPostProcess.ts, services/turn/pendingCommit.ts, services/turn/turnTypes.ts, services/turn/stages/* (13 files)
- **Consumers:** components/ChatArea, store/slices/campaignSlice, App.tsx
- **Op Types:** orchestrate (8), read (3), update (2), utility (2)
- **Confidence:** ✅ Verified

### CAP-5: Campaign State Management
- **Purpose:** Manage divergence register, facts, timeline, entities, character profile, inventory, semantic memory, migration
- **Owner Layer:** services/campaign-state
- **Exports:** 55 — includes EMPTY_REGISTER, toggleChapter, toggleCategory, pinFact, editFact, deleteFact, deleteChapter, toggleFact, dismissReviewFlag, editKnownBy, applySubjectTokens, migrateV1ToV2, countRegisterTokens, groupDivergencesBySubject, runFactDedup, assignSubjectTokens, resolveTimeline, normalizeFaction, parseKnownByToken
- **Files:** 9 files in services/campaign-state/
- **Consumers:** store/slices/chatSlice, store/slices/campaignSlice, services/turn, services/archive, components/context-drawer/MemoryTab
- **Op Types:** read (15), update (10), delete (5), utility (10), create (5)
- **Confidence:** ✅ Verified

### CAP-6: Archive Management
- **Purpose:** Chapter sealing, deep archive search, divergence extraction, importance rating, save file engine, chapter summary
- **Owner Layer:** services/archive
- **Exports:** 31 — includes sealChapter, shouldAutoSeal, runCombinedSeal, buildArchiveIndexEntry, generateChapterSummary, mergeSealEntries, rebuildAllEmbeddings, deepArchiveSearch, divergenceExtractor, importanceRater, saveFileEngine, archiveMemory, archiveChapterEngine
- **Files:** 9 files in services/archive/
- **Consumers:** services/turn/turnPostProcess, services/turn/stages/archiveRecallStage
- **Op Types:** orchestrate (5), create (5), read (8), update (3), delete (2), search (3), utility (5)
- **Confidence:** ✅ Verified

### CAP-7: Embedding & Vector Search
- **Purpose:** On-device transformer model (all-MiniLM-L6-v2), embedding generation, backfill, reindex, vector search
- **Owner Layer:** services/embedding
- **Exports:** 31 — includes embedText, embedBatch, warmupEmbedder, getCurrentModelId, switchEmbeddingModel, runFullReindex, abortForCampaignSwitch, abortForModelSwitch, rebuildAllEmbeddings, backfillScenes, backfillNPCs, backfillLore
- **Files:** 7 files in services/embedding/ (embedder.ts, backfillRunner.ts, embeddingScheduler.ts, vectorSearch.ts, index.ts)
- **Consumers:** store/slices/campaignSlice, store/slices/npcSlice, services/lore, services/storage
- **Op Types:** search (8), create (3), orchestrate (3), utility (5), read (2)
- **Confidence:** ✅ Verified

### CAP-8: LLM Communication
- **Purpose:** Call LLM APIs, manage request queue, sanitize payloads, track utility calls, cache telemetry
- **Owner Layer:** services/llm
- **Exports:** 31 — includes llmCall (via utils), LLMChatMessage, OpenAIMessage, llmService, llmRequestQueue, utilityCallTracker, payloadSanitizer, cacheTelemetry, sceneStakesTelemetry
- **Files:** 7 files in services/llm/
- **Consumers:** services/turn, services/npc, services/lore, services/archive, services/image, utils/llmCall
- **Op Types:** utility (10), read (5), orchestrate (3), persist (2)
- **Confidence:** ✅ Verified

### CAP-9: Payload Building
- **Purpose:** Build the LLM prompt payload: system prompt, pinned lore, history, context, reranking, condensation
- **Owner Layer:** services/payload
- **Exports:** 27 — includes payloadBuilder, contextRecommender, payloadHistoryFitting, payloadStableContent, payloadWorldContext, semanticReranker, condenser, shouldCondense, computeTrimIndex, getCondenseBudgetRatio
- **Files:** 10 files in services/payload/
- **Consumers:** services/turn/turnOrchestrator, services/turn/pendingCommit
- **Op Types:** read (8), orchestrate (5), utility (5), create (3), update (2)
- **Confidence:** ✅ Verified

### CAP-10: Lore Processing
- **Purpose:** Chunk lore files, enrich keywords, check lore consistency, parse NPCs from lore, load loot tree, index rules
- **Owner Layer:** services/lore
- **Exports:** 23 — includes chunkLoreFile, enrichLoreKeywords, loreCheck, loreChunker, loreIndexer, loreKeywordEnricher, loreNPCParser, rulesIndexer, loreTreeLoader, extractEngineSeeds, parseNPCsFromLore, loadLootTree, upgradeVectorOnlyDefault
- **Files:** 11 files in services/lore/
- **Consumers:** components/CampaignHub, services/turn/stages/rulesStage, services/embedding/backfillRunner, store/campaignStore
- **Op Types:** read (8), create (3), update (2), search (2), utility (5)
- **Confidence:** ✅ Verified

### CAP-11: Engine (Dice, Loot, Events)
- **Purpose:** Dice rolling, loot drops, surprise/encounter/world events, troublemaker, tag generation, PC creation script
- **Owner Layer:** services/engine
- **Exports:** 39 — includes engineRolls, lootEngine, diceTier, troublemaker, tagGeneration, pcCreationScript, lootDropTelemetry, cacheTelemetry, sceneStakesTelemetry
- **Files:** 10 files in services/engine/
- **Consumers:** services/turn/turnOrchestrator, services/turn/turnPostProcess, store/slices/campaignSlice (constants only)
- **Op Types:** orchestrate (8), create (5), read (5), utility (10)
- **Confidence:** ✅ Verified

### CAP-12: Image Generation
- **Purpose:** Generate illustrations for messages, NPC portraits
- **Owner Layer:** services/image
- **Exports:** 9 — includes illustrateMessage, generateNPCPortrait, generateImage, composeImagePrompt
- **Files:** 4 files in services/image/
- **Consumers:** components/chat/MessageBubble, components/NPCLedgerModal
- **Op Types:** create (2), utility (2), read (2)
- **Confidence:** ✅ Verified

### CAP-13: Storage & Persistence
- **Purpose:** IndexedDB CRUD for images, embeddings, archives, backups, campaign bundles
- **Owner Layer:** services/storage
- **Exports:** 19 — includes imageStorage, embeddingStorage, archiveStorage, backupStorage, offlineStorage, saveFilePicker
- **Files:** 10 files in services/storage/
- **Consumers:** store/campaignStore, store/slices/npcSlice, store/slices/chatSlice, services/turn/turnPostProcess, services/campaignBundle
- **Op Types:** persist (6), read (4), delete (3), utility (2)
- **Confidence:** ✅ Verified

### CAP-14: API Communication
- **Purpose:** Gateway HTTP client for backups, campaign state, NPC save, file/images
- **Owner Layer:** services/apiClient
- **Exports:** 1 (api object with nested methods)
- **Files:** services/apiClient.ts
- **Consumers:** store/campaignStore, store/slices/campaignSlice, components/CampaignHub, components/Header, components/NPCLedgerModal, components/BackupModal
- **Op Types:** orchestrate (1 — multi-method object)
- **Confidence:** ✅ Verified

### CAP-15: Arc Engine (Oracle Function)
- **Purpose:** Staged track system: 5-12 rung ladder, advanced by dice, bent by stance
- **Owner Layer:** services/arc
- **Exports:** 18 — includes arcConstants, arcSpawn, advanceRung, scanArcStance
- **Files:** 6 files in services/arc/
- **Consumers:** services/turn/turnPostProcess (runArcTick)
- **Op Types:** create (3), read (5), utility (5), orchestrate (2)
- **Confidence:** ✅ Verified

### CAP-16: State Management (Store)
- **Purpose:** Reactive in-memory state via Zustand
- **Owner Layer:** store
- **Exports:** useAppStore, campaignStore, defaultContext, defaultSettings, debouncedSaveCampaignState, debouncedSaveSettings, dedupeNPCLedger, saveController
- **Files:** store/useAppStore.ts, store/campaignStore.ts, store/slices/* (9 files), store/slices/saveController.ts, store/settingsMigration.ts
- **Consumers:** components (18), adapters (10), App.tsx
- **Op Types:** persist (3), utility (3), read (2)
- **Confidence:** ✅ Verified
- **⚠️ VIOLATION:** Store also performs domain logic (see 2.3 BC-1)

### CAP-17: UI Rendering
- **Purpose:** Render chat, settings, NPC ledger, context drawer, PC creation, campaign hub
- **Owner Layer:** components
- **Exports:** 68 component files
- **Files:** components/ (68 files across 7 subdirectories)
- **Consumers:** App.tsx
- **Op Types:** N/A (React components)
- **Confidence:** ✅ Verified

### CAP-18: Infrastructure
- **Purpose:** Cross-cutting: JSON extraction, settings crypto, theme, token counting, background queue, utility prompts, file picker
- **Owner Layer:** services/infrastructure
- **Exports:** 35 — includes extractJson, encryptSettingsProviders, decryptSettingsProviders, resolveTheme, countTokens, backgroundQueue, joinPromptSections, saveFilePicker
- **Files:** 8 files in services/infrastructure/
- **Consumers:** store, services (many), components (3)
- **Op Types:** utility (15), read (5), persist (3)
- **Confidence:** ✅ Verified

---

## Operation Type Distribution

| Op Type | Count | % | Examples |
|---------|-------|---|---------|
| utility | 344 | 58% | api, ARC_TICK_DC, LADDER_MIN |
| read | 99 | 17% | extractNPCNames, countTokens, resolveTimeline |
| create | 37 | 6% | generateNPCProfile, sealChapter, buildArchiveIndexEntry |
| orchestrate | 36 | 6% | runTurn, handlePostTurn, warmupEmbedder |
| update | 28 | 5% | toggleChapter, editFact, updateNPC |
| search | 24 | 4% | embedText, runFullReindex, deepArchiveSearch |
| delete | 20 | 3% | deleteFact, deleteChapter, clearPinnedChapters |
| persist | 6 | 1% | registerStore, saveFile |

---

## Capability Map

```
                    ┌─────────────────┐
                    │   CAP-17: UI    │
                    │  (68 files)     │
                    └───────┬─────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
    ┌─────────▼───┐  ┌─────▼─────┐  ┌───▼──────────┐
    │ CAP-16:     │  │ CAP-4:    │  │ CAP-14: API  │
    │ State       │  │ Turn      │  │              │
    │ (12 files)  │  │ (24 files)│  │ (1 file)     │
    └──────┬──────┘  └─────┬─────┘  └──────────────┘
           │               │
    ┌──────┴──────┐  ┌─────┼──────────────────────────────┐
    │             │  │     │     │         │              │
┌───▼───┐  ┌─────▼──┐ │ ┌───▼──┐ │ ┌──────▼──────┐ ┌─────▼─────┐
│CAP-1: │  │CAP-6:  │ │ │CAP-7:│ │ │CAP-9:       │ │CAP-11:    │
│NPC Gen│  │Archive │ │ │Embed │ │ │Payload      │ │Engine     │
│(1306) │  │(9)     │ │ │(7)   │ │ │(10)         │ │(10)       │
└───┬───┘  └────────┘ │ └──┬───┘ │ └─────────────┘ └───────────┘
    │                 │     │     │
┌───▼───────────┐    │ ┌───▼─────┐│ ┌──────────┐ ┌──────────┐
│CAP-2: NPC     │    │ │CAP-13:  ││ │CAP-10:   │ │CAP-15:   │
│Agency (28)    │    │ │Storage  ││ │Lore (11) │ │Arc (6)   │
└───────────────┘    │ │(10)     ││ └──────────┘ └──────────┘
                     │ └─────────┘│
┌────────────────────┘            │
│CAP-3: NPC Detect (3)            │
│CAP-5: Campaign State (9)        │
│CAP-8: LLM (7)                   │
│CAP-12: Image (4)                │
│CAP-18: Infrastructure (8)       │
└──────────────────────────────────┘
```

---

## Open Questions

1. ⚠️ Is CAP-2 (NPC Agency, 28 files, 193 exports) one capability
   or multiple? It covers wants, goals, pressure, drift, heartbeat,
   collision, audition, progress, dice, bands, digest — possibly
   5-6 sub-capabilities.

2. ⚠️ Is CAP-4 (Turn Orchestration, 24 files) one capability or
   multiple? It has stages (13 files), post-process, pending commit,
   swipe generation, tool handlers — possibly 3-4 sub-capabilities.

3. ❌ Should CAP-16 (State) own debouncedSaveCampaignState and
   debouncedSaveSettings? Or should these be in CAP-13 (Storage)?

4. ❌ Should dedupeNPCLedger (in store/slices/npcSlice) be in
   CAP-3 (NPC Detection) instead of CAP-16 (State)?

---

## Unknowns

1. ❌ Whether CAP-2's 28 files should be split into separate
   capabilities (wants/goals vs pressure vs drift vs heartbeat)
   — needs 2.5 Responsibility Discovery.

2. ❌ Whether CAP-4's 24 files should be split (orchestration vs
   stages vs post-process vs commit) — needs 2.5.

3. ❌ Whether the candidate ports (10) align with these 18
   capabilities — needs 2.7 Boundary Validation.

---

## Architecture Risks

1. CAP-2 (NPC Agency) is extremely large (193 exports, 28 files).
   Any change risks breaking unrelated agency features.

2. CAP-4 (Turn Orchestration) has 24 files including 13 stage files.
   The stage pipeline is fragile — adding/removing a stage requires
   editing turnOrchestrator.

3. CAP-1 (NPC Generation) is a God File (1306 lines). It handles
   generation, validation, PC creation, agency backfill, drives —
   5 distinct responsibilities.

4. CAP-16 (State) has 25 domain logic imports (from 2.2). It's
   doing more than state management.

5. 58% of all exports are "utility" type — these may need
   reclassification in 2.5.

---

## Recommendations

1. Proceed to 2.5 Responsibility Discovery — the 18 capabilities
   need responsibility analysis, especially CAP-2 and CAP-4 which
   may need splitting.

2. Focus 2.5 on the 4 largest capabilities: CAP-2 (193), CAP-4
   (62), CAP-5 (55), CAP-18 (35).

3. Do NOT design ports yet — wait until 2.7 Boundary Validation.
