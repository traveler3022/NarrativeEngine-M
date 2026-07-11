# 2.5 Responsibility Discovery — REPORT

Generated: 2026-07-11
Extraction Method: AST scan + subgroup analysis
Protocol: Evidence-First

---

## Summary

Analyzed the 4 largest capabilities from 2.4 for responsibility
clarity. Found that CAP-2 (NPC Agency) has 14 sub-responsibilities,
CAP-4 (Turn) has 13 pipeline stages, and 4 of 8 store slices contain
domain logic that doesn't belong in state management.

---

## Responsibility Matrix

### CAP-2: NPC Agency — 14 Sub-Responsibilities

| # | Sub-responsibility | Files | Should be separate? | Evidence |
|---|-------------------|-------|---------------------|----------|
| 1 | Wants & Goals | 2 (agencyWantDraw, agencyGoals) | ⚠️ Inferred — tightly coupled but distinct lifecycle | Verified: agencyWantDraw.ts draws, agencyGoals.ts manages |
| 2 | Heartbeat & Lifecycle | 3 (agencyHeartbeat, agencyLifecycle, agencySelection) | ✅ Yes — heartbeat is a scheduler concern | Verified: distinct files with distinct exports |
| 3 | Progression & Dice | 2 (agencyDice, agencyProgress) | ⚠️ Inferred — dice is pure utility, progress is stateful | Verified: agencyDice.ts has rollGoal, agencyProgress.ts has applyBandToGoal |
| 4 | Collision | 1 (agencyCollision) | ✅ Yes — standalone | Verified: goalsCoincide, resolveCollision |
| 5 | Personality Drift | 1 (agencyDrift) | ✅ Yes — pure calculation | Verified: hexDelta |
| 6 | Pressure Tracking | 1 (npcPressureTracker) | ✅ Yes — standalone tracker | Verified: ignoredDelta, engagedDelta |
| 7 | Relationship Meter | 1 (relationMeter) | ✅ Yes — standalone meter | Verified: applyRelationTone, isRelationTone |
| 8 | Repression & Reactions | 2 (reactionRepression, npcBehaviorDirective) | ⚠️ Inferred — related but distinct | Verified: repressionPressure, buildBehaviorDirective |
| 9 | Hex Roll & Disposition | 1 (hexRoll) | ✅ Yes — pure dice | Verified: rollHex, pickGroups, drawConsistentTraits |
| 10 | Voice Directive | 1 (hexVoiceGuide) | ✅ Yes — standalone | Verified: buildVoiceDirective |
| 11 | Disposition Groups | 1 (dispositionGroups) | ✅ Yes — data tables | Verified: GROUP_KEYS, ENVELOPES |
| 12 | Audition & Power Rung | 1 (agencyRung) | ✅ Yes — standalone | Verified: advanceRung, rungBand |
| 13 | Timeskip Simulation | 2 (agencyTimeskipRun, agencyUpdate) | ⚠️ Inferred — timeskip runs updates | Verified: agencyTimeskipRun.ts, agencyUpdate.ts |
| 14 | Utilities & Constants | 4 (agencyBands, agencyConstants, agencyDigest, agencyPools) | ✅ Yes — pure data/functions | Verified: constants, vocab, formatters |

**Finding:** CAP-2 should be split into at least 5 sub-capabilities:
- NPC Wants & Goals (lifecycle)
- NPC Heartbeat (scheduler)
- NPC Progression (dice + rung)
- NPC Personality (hex + drift + voice + disposition)
- NPC Social (pressure + relationship + repression + collision)

### CAP-4: Turn Orchestration — 13 Pipeline Stages

| # | Stage | Responsibility | Evidence |
|---|-------|---------------|----------|
| 1 | planner | Plan which utility calls to run | Verified: plannerStage.ts |
| 2 | archiveRecall | Recall relevant archive chapters | Verified: archiveRecallStage.ts |
| 3 | deepScan | Deep archive scan | Verified: deepScanStage.ts (in stages/) |
| 4 | expandQuery | Expand search query | Verified: expandQueryStage.ts |
| 5 | factsTimeline | Resolve timeline facts | Verified: factsTimelineStage.ts |
| 6 | lore | Inject lore chunks | Verified: loreStage.ts |
| 7 | npcSemanticRecall | Recall relevant NPCs | Verified: npcSemanticRecallStage.ts |
| 8 | recommender | Recommend context | Verified: recommenderStage.ts (retrievalTypes) |
| 9 | rerank | Rerank candidates | Verified: rerankStage.ts |
| 10 | retrievalTypes | Classify retrieval types | Verified: retrievalTypesStage.ts |
| 11 | rules | Inject rules | Verified: rulesStage.ts |
| 12 | sceneNumber | Assign scene number | Verified: sceneNumberStage.ts |
| 13 | semanticCandidates | Find semantic candidates | Verified: semanticCandidatesStage.ts |

**Finding:** CAP-4 is a pipeline with 13 stages. Each stage is
independent and has a clear single responsibility. The pipeline
orchestrator (turnOrchestrator.ts) coordinates them. This is
well-structured — no split needed beyond the existing stage files.

### CAP-16: State — Store Slice Responsibility Audit

| Slice | State Fields | Service Imports | Has Domain Logic? | Responsibility Violation |
|-------|-------------|-----------------|-------------------|------------------------|
| archiveSlice | 30 | 0 | ✅ No | Clean — pure state |
| campaignSlice | 96 | 10 | 🔴 Yes | Embedding, API, storage, turn, infra |
| chatSlice | 143 | 3 | 🔴 Yes | Campaign-state, infrastructure, storage |
| loreSlice | 7 | 0 | ✅ No | Clean — pure state |
| npcSlice | 29 | 4 | 🔴 Yes | Embedding, storage, NPC |
| pressureSlice | 9 | 0 | ✅ No | Clean — pure state |
| settingsSlice | 47 | 4 | 🔴 Yes | Infrastructure, theme |
| uiSlice | 54 | 0 | ✅ No | Clean — pure state |

**Finding:** 4 of 8 slices are clean (pure state). 4 slices have
domain logic. The clean slices (archive, lore, pressure, ui) prove
that pure state slices ARE possible — the dirty ones (campaign,
chat, npc, settings) are the problem.

### Responsibility Classification: What belongs where

| Responsibility | Current Owner | Should Be | Evidence |
|---------------|--------------|-----------|----------|
| State get/set/subscribe | store | store ✅ | Verified: Zustand pattern |
| Debounced persistence | store (saveController) | ⚠️ store or service | Inferred: debouncing is state-adjacent but save is I/O |
| Settings encryption | store (settingsSlice) | services/infrastructure | Verified: settingsSlice.ts imports encryptSettingsProviders |
| Theme resolution | store (settingsSlice) | services/infrastructure | Verified: settingsSlice.ts imports resolveTheme |
| Token counting | store (chatSlice) | services/infrastructure | Verified: chatSlice.ts imports countTokens |
| Embedding triggers | store (campaignSlice) | services/embedding | Verified: campaignSlice imports runFullReindex, warmupEmbedder |
| NPC embedding text | store (npcSlice) | services/npc | Verified: npcSlice imports buildNPCEmbeddingText |
| NPC dedup | store (npcSlice) | services/npc | Verified: npcSlice has dedupeNPCLedger |
| Lore chunk upgrade | store (campaignStore) | services/lore | Verified: campaignStore imports upgradeVectorOnlyDefault |
| NPC affinity mapping | store (campaignStore) | services/npc | Verified: campaignStore imports affinityToPcRelation |
| API backup calls | store (campaignStore) | services/apiClient | Verified: campaignStore imports api (4x dynamic) |
| Data migration | store (campaignStore) | services/campaign-state | Verified: campaignStore imports migrateV1ToV2 |
| Turn commit | store (campaignSlice) | services/turn | Verified: campaignSlice imports commitPendingTurn |
| Background queue | store (campaignSlice) | services/infrastructure | Verified: campaignSlice imports backgroundQueue |
| Image storage | store (npcSlice, chatSlice) | services/storage | Verified: npcSlice, chatSlice import imageStorage |

---

## Open Questions

1. ⚠️ Should debouncedSaveCampaignState stay in store (saveController)
   or move to services? It's both state-adjacent (debounce timer) and
   I/O (idb-keyval). Inferred — could go either way.

2. ❌ Should the 13 turn stages be separate capabilities in the
   Capability Inventory, or stay as sub-capabilities of CAP-4?
   Unknown — depends on whether they're consumed independently.

3. ⚠️ Should campaignStore.ts be classified as CAP-13 (Storage) or
   CAP-16 (State)? It does both. Inferred — it should be split.

---

## Unknowns

1. ❌ Whether NPC Agency sub-capabilities (14 groups) should become
   independent capabilities or stay as one — needs 2.7 Boundary
   Validation.

2. ❌ Whether the 13 turn stages have external consumers (outside
   the pipeline) — if not, they're internal implementation, not
   separate capabilities.

3. ❌ Whether dedupeNPCLedger (in npcSlice) is a state concern
   (deduplicating state) or a domain concern (NPC management) —
   needs 2.6 Interaction Discovery.

---

## Architecture Risks

1. campaignSlice has 96 state fields + 10 service imports — it's
   the most complex slice and the biggest violation source.

2. chatSlice has 143 state fields (the most) — it holds messages,
   condenser, divergence, pinned excerpts — 4 distinct data domains
   in one slice.

3. NPC Agency (14 sub-groups, 28 files) is too large to test as
   a unit. Any change risks breaking unrelated agency features.

4. settingsSlice does encryption + theme + persistence — 3
   infrastructure concerns inside a state slice.

---

## Recommendations

1. Proceed to 2.6 Interaction Discovery — need to understand how
   capabilities communicate before validating boundaries.

2. The responsibility analysis shows clear evidence that 15 domain
   responsibilities are misplaced in the store layer. This will
   inform 2.7 Boundary Validation.

3. Do NOT design ports yet.

---

## G2 Fix: campaignStore Line-Level Responsibility Evidence

**File:** src/store/campaignStore.ts (280 lines)
**Symbol:** campaignStore (module-level exports)
**Confidence:** ✅ Verified

### 7 Responsibilities with Exact Line Ranges

| # | Responsibility | Lines | Symbols | Evidence |
|---|---------------|-------|---------|----------|
| R1 | Campaign CRUD | 13-80 | listCampaigns, getCampaign, saveCampaign, deleteCampaign | ✅ idb-keyval get/set on campaigns array |
| R2 | Campaign State persistence | 82-173 | saveCampaignState, loadCampaignState, stripEphemeralFields | ✅ idb-keyval get/set on `state_${id}` |
| R3 | Lore chunk persistence | 175-201 | saveLoreChunks, getLoreChunks | ✅ idb-keyval get/set on `lore_${id}` + calls upgradeVectorOnlyDefault (lore domain logic, line 179-200) |
| R4 | NPC ledger persistence | 203-229 | saveNPCLedger, getNPCLedger | ✅ idb-keyval get/set on `npcs_${id}` + calls affinityToPcRelation (NPC domain logic, line 209-228) |
| R5 | Pressure persistence | 231-239 | savePressure, getPressure | ✅ idb-keyval get/set on `pressure_${id}` |
| R6 | Archive/Timeline/Entity load | 241-268 | loadArchiveIndex, loadSemanticFacts, loadChapters, loadTimeline, loadEntities | ✅ idb-keyval get on `archive_index_${id}`, etc. |
| R7 | Divergence persistence | 270-280 | saveDivergenceRegister, loadDivergenceRegister | ✅ idb-keyval get/set on `divergence_${id}` |

### Domain Logic Violations (within campaignStore)

| # | Violation | Line | Symbol | Should be in |
|---|-----------|------|--------|-------------|
| V1 | Lore chunk upgrade | 179-200 | upgradeVectorOnlyDefault call in getLoreChunks | services/lore |
| V2 | NPC affinity mapping | 209-228 | affinityToPcRelation call in getNPCLedger | services/npc |
| V3 | Image storage deletion | 34-50 | imageStorage.deleteAll call in deleteCampaign | services/storage |
| V4 | Data migration | 278-280 | migrateV1ToV2 call in loadCampaignState | services/campaign-state |
| V5 | API backup (dynamic) | 249-267 | api.backup.create (4x dynamic import) | services/apiClient |

### Imports (3 static service imports — all violations)

| Line | Import | Target | Responsibility |
|------|--------|--------|---------------|
| 7 | imageStorage | services/storage/imageStorage | Image storage (V3) |
| 8 | upgradeVectorOnlyDefault | services/lore/loreIndexer | Lore upgrade (V1) |
| 9 | affinityToPcRelation | services/npc/agencyBands | NPC affinity (V2) |
