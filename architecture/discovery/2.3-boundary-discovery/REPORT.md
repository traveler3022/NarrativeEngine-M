# 2.3 Boundary Discovery — REPORT

Generated: 2026-07-11
Extraction Method: Python AST scan + import graph analysis
Protocol: Evidence-First (EVIDENCE_FIRST_PROTOCOL.md)

---

## Summary

From 278 non-test source files, 35 natural clusters were discovered
based on directory structure + import density. The coupling ratio
is 16.68% — meaning 83.32% of imports are intra-cluster (high
coesion within clusters).

3 natural boundary candidates were discovered from the import graph.
1 critical boundary violation was found (store contains domain logic).

---

## Boundary Candidates

### BC-1: State vs Domain Boundary

**Evidence:**
- Files: store/slices/*.ts (9 files), services/ (180 files)
- Symbols: createCampaignSlice, createChatSlice, createNPCSlice, createArchiveSlice, createSettingsSlice, createPressureSlice, createUISlice, campaignStore
- Imports: store imports from 14 service modules (see 2.2/RAW_DATA.json)
- Callers: components (18 imports to store), adapters (10 imports to store)
- Callees: store calls services/embedding, services/storage, services/apiClient, services/turn, services/npc, services/campaign-state, services/infrastructure, services/lore
- Lines: see 2.2/violations.md (25 violations listed)
- Extraction Method: import graph scan
- Confidence: ✅ Verified

**Boundary description:**
Store layer should own reactive state (get/set/subscribe). Domain
logic (embedding, API calls, migration, NPC operations, lore
processing, encryption, token counting, theme resolution) should
live in services.

**Current state:** Store violates this boundary — 25 service imports.
**Boundary status:** CRITICAL VIOLATION

### BC-2: Persistence vs State Boundary

**Evidence:**
- Files: store/campaignStore.ts, store/slices/settingsSlice.ts, services/storage/*.ts, services/campaignBundle.ts
- Symbols: saveCampaignState, loadCampaignState, saveLoreChunks, getLoreChunks, saveNPCLedger, getNPCLedger, savePressure, debouncedSaveSettings, imageStorage, embeddingStorage, archiveStorage, backupStorage
- Imports: idb-keyval imported from 7 files across 3 layers
- Callers: store/slices (6 dynamic imports to campaignStore), components (3 dynamic imports to campaignStore), adapters (3 imports to campaignStore)
- Callees: idb-keyval get/set/del, services/apiClient, services/campaign-state (migration)
- Lines: campaignStore.ts lines 1-280 (entire file is persistence + domain logic)
- Extraction Method: import graph scan + grep for idb-keyval
- Confidence: ✅ Verified

**Boundary description:**
Persistence (IndexedDB via idb-keyval) should be a separate layer
with a single gateway. Currently scattered across 7 files in 3
layers (store, services/storage, services/campaignBundle).

**Current state:** No single persistence gateway. campaignStore is
a God Module with 7 responsibilities.
**Boundary status:** VIOLATION

### BC-3: UI vs Logic Boundary

**Evidence:**
- Files: src/components/ (68 files), src/services/ (180 files), src/store/ (12 files)
- Imports: components → store (18 static + 3 dynamic), components → services (22 static + 6 dynamic)
- Callers: App.tsx imports 11 component modules
- Callees: components call runTurn, generateImage, api, chunkLoreFile, enrichLoreKeywords
- Lines: see 2.2/import-graph.md
- Extraction Method: import graph scan
- Confidence: ✅ Verified

**Boundary description:**
UI components should only: render state, capture user intent, call
domain operations via defined interfaces. They should NOT directly
access persistence (campaignStore).

**Current state:** 3 components dynamically import campaignStore
directly — ChatArea, LoreTab, Header. These bypass any abstraction.
**Boundary status:** MINOR VIOLATION (3 files only)

---

## Boundary Map

```
┌─────────────────────────────────────────────────────────────┐
│                     Entry Layer                              │
│  main.tsx (wire ports) + App.tsx (hydrate + platform)       │
└──────────────┬──────────────────────────────────────────────┘
               │ renders
┌──────────────▼──────────────────────────────────────────────┐
│                     UI Layer                                 │
│  components/ (68 files)                                      │
│  ├── chat/ (13)    ├── context-drawer/ (16)                 │
│  ├── settings/ (5)  ├── npc-ledger/ (5)                     │
│  ├── pc/ (2)        ├── hooks/ (4)                          │
│  └── root/ (22)                                              │
└──────┬──────────────────┬────────────────────────────────────┘
       │ reads state       │ triggers logic
       │ (18 imports)      │ (22 imports)
┌──────▼──────────────────▼────────────────────────────────────┐
│                   State Layer (Store)                         │
│  store/slices/ (9) + useAppStore + campaignStore             │
│  ┌─────────────────────────────────────────────────┐         │
│  │ ⚠️ VIOLATION: 25 imports TO services            │         │
│  │ (embedding, storage, NPC, API, turn, infra)     │         │
│  └─────────────────────────────────────────────────┘         │
└──────┬──────────────────┬────────────────────────────────────┘
       │ via ports          │ direct (violation)
       │ (adapters bridge)  │
┌──────▼──────────────────▼────────────────────────────────────┐
│                  Domain Layer (Services)                      │
│  services/ (~180 files, 16 modules)                          │
│  ├── npc/ (32)       ├── turn/ (24)    ├── payload/ (10)     │
│  ├── lore/ (11)      ├── engine/ (10)  ├── storage/ (10)     │
│  ├── archive/ (9)    ├── campaign-state/ (9)                 │
│  ├── infrastructure/ (8)  ├── embedding/ (7)                 │
│  ├── llm/ (7)       ├── arc/ (6)     ├── image/ (4)         │
│  └── tts/ (2)                                                │
└──────┬───────────────────────────────────────────────────────┘
       │ persists
┌──────▼───────────────────────────────────────────────────────┐
│               Persistence Layer (scattered)                   │
│  ⚠️ NO GATEWAY — idb-keyval accessed from 7 files:           │
│  campaignStore, settingsSlice, imageStorage,                  │
│  embeddingStorage, archiveStorage, backupStorage,             │
│  campaignBundle                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Ownership Map

### Data Ownership (who owns what state)

| Data | Owner (should be) | Owner (actual) | Evidence |
|------|-------------------|----------------|----------|
| messages | State layer | store/slices/chatSlice | ✅ Verified — chatSlice.ts defines messages: ChatMessage[] |
| context | State layer | store/slices/campaignSlice | ✅ Verified — campaignSlice.ts defines context: GameContext |
| settings | State layer | store/slices/settingsSlice | ✅ Verified — settingsSlice.ts defines settings: AppSettings |
| npcLedger | State layer | store/slices/npcSlice | ✅ Verified — npcSlice.ts defines npcLedger: NPCEntry[] |
| loreChunks | State layer | store/slices/loreSlice | ✅ Verified — loreSlice.ts defines loreChunks: LoreChunk[] |
| archiveIndex | State layer | store/slices/archiveSlice | ✅ Verified — archiveSlice.ts defines archiveIndex |
| divergenceRegister | State layer | store/slices/chatSlice | ✅ Verified — chatSlice.ts defines divergenceRegister |
| npcPressure | State layer | store/slices/pressureSlice | ✅ Verified — pressureSlice.ts defines npcPressure |
| UI flags | State layer | store/slices/uiSlice | ✅ Verified — uiSlice.ts defines settingsOpen, drawerOpen |
| campaigns (persistent) | Persistence | store/campaignStore | ✅ Verified — campaignStore.ts calls idb-keyval |
| images (persistent) | Persistence | services/storage/imageStorage | ✅ Verified — imageStorage.ts calls idb-keyval |
| embeddings (persistent) | Persistence | services/storage/embeddingStorage | ✅ Verified — embeddingStorage.ts calls idb-keyval |

### Logic Ownership (who owns what logic)

| Logic | Owner (should be) | Owner (actual) | Evidence |
|------|-------------------|----------------|----------|
| Turn orchestration | Domain | services/turn | ✅ Verified |
| NPC generation | Domain | services/npc | ✅ Verified |
| Embedding | Domain | services/embedding | ✅ Verified |
| LLM communication | Domain | services/llm | ✅ Verified |
| Lore processing | Domain | services/lore | ✅ Verified |
| API communication | Domain | services/apiClient | ✅ Verified |
| Image generation | Domain | services/image | ✅ Verified |
| Dice/engine | Domain | services/engine | ✅ Verified |
| Archive management | Domain | services/archive | ✅ Verified |
| Token counting | Infrastructure | services/infrastructure | ✅ Verified |
| Settings encryption | Infrastructure | services/infrastructure | ✅ Verified |
| Theme resolution | Infrastructure | services/infrastructure | ✅ Verified |
| Campaign migration | Domain | store/campaignStore ⚠️ | ⚠️ Inferred — campaignStore.ts line 278 calls migrateV1ToV2 |
| Embedding triggers | Domain | store/slices/campaignSlice ⚠️ | ⚠️ Inferred — campaignSlice.ts calls runFullReindex |
| NPC embedding | Domain | store/slices/npcSlice ⚠️ | ⚠️ Inferred — npcSlice.ts calls embedText, buildNPCEmbeddingText |
| Turn commit | Domain | store/slices/campaignSlice ⚠️ | ⚠️ Inferred — campaignSlice.ts line 138 calls commitPendingTurn |
| Lore chunk upgrade | Domain | store/campaignStore ⚠️ | ⚠️ Inferred — campaignStore.ts calls upgradeVectorOnlyDefault |
| NPC affinity | Domain | store/campaignStore ⚠️ | ⚠️ Inferred — campaignStore.ts calls affinityToPcRelation |
| API backup | Domain | store/campaignStore ⚠️ | ⚠️ Inferred — campaignStore.ts calls api.backup |
| Background queue | Infrastructure | store/slices/campaignSlice ⚠️ | ⚠️ Inferred — campaignSlice.ts calls backgroundQueue |

---

## Coupling Report

### Cohesion (intra-cluster imports): 829

High cohesion within:
- services/npc: 32 files, mostly import from each other
- services/turn: 24 files, tight coupling (stages → orchestrator)
- components/root: 22 files, moderate coupling

### Coupling (inter-cluster imports): 166

Top coupling pairs:
1. components/root → components/* (65) — expected (UI composition)
2. store/root → store/* (12) — expected (slice composition)
3. App.tsx → components (11) — expected (rendering)
4. main.tsx → adapters (10) — expected (port wiring)
5. components/root → context-drawer (9) — expected (UI composition)

### Coupling ratio: 16.68%

This is GOOD — 83% of imports are within clusters. The 17% that
cross boundaries are the ones that need attention.

---

## Open Questions

1. **Should campaignStore be split?** It has 7 responsibilities
   (persistence + migration + API + lore + NPC + image + campaign).
   ❌ Unknown — needs 2.5 Responsibility Discovery to answer.

2. **Should store slices call services at all?** 25 service imports
   from store. Some (like debouncedSaveSettings) are arguably
   persistence. Others (like runFullReindex) are clearly domain.
   ⚠️ Inferred — needs 2.5 Responsibility Discovery to classify each.

3. **Should persistence be a single gateway?** 7 files access
   idb-keyval directly. A single gateway would centralize this.
   ⚠️ Inferred — needs 2.6 Interaction Discovery to understand
   persistence flows.

4. **Are the candidate port boundaries correct?** 10 ports exist.
   Some (like ArchivePort with 14 methods) might be too large.
   ❌ Unknown — needs 2.7 Boundary Validation.

---

## Unknowns

1. ❌ Whether the 3 boundary candidates (State/Domain, Persistence/
   State, UI/Logic) are the RIGHT boundaries — or if there are
   others not visible from the import graph.

2. ❌ Whether services/npc (32 files) should be split into multiple
   boundaries (detection vs generation vs agency) — needs 2.4
   Capability Discovery.

3. ❌ Whether services/turn (24 files) is one boundary or multiple
   (orchestration vs stages vs post-process) — needs 2.4.

4. ❌ Whether the candidate port boundaries align with the natural
   boundaries discovered here — needs 2.7.

---

## Architecture Risks

1. **Store is a God Layer.** 25 service imports. If store is
   refactored, 25 call sites change. If services change, store
   breaks. Bidirectional coupling risk.

2. **No persistence gateway.** 7 files access idb-keyval. Any
   change to storage format requires editing 7 files. Data
   inconsistency risk.

3. **campaignStore is a God Module.** 7 responsibilities, 280 lines.
   Any change risks breaking unrelated features. Testing is
   impossible without mocking the entire store.

4. **App.tsx is a God Component.** 7 useEffect blocks covering
   hydration, keyboard, back button, UI scale, pending commit,
   navigation. Any change risks breaking unrelated platform logic.

5. **Candidate ports are unvalidated.** 10 ports + 10 adapters were
   built before Discovery. If Discovery finds different boundaries,
   they need to be restructured.

---

## Recommendations

1. **Proceed to 2.4 Capability Discovery** — the boundary candidates
   need capability analysis before validation.

2. **Do NOT modify any code** — Discovery is observation only.

3. **Do NOT validate candidate ports yet** — wait until 2.7
   Boundary Validation after all discovery is complete.

4. **Focus 2.4 on the 4 largest service modules** — npc (32 files),
   turn (24 files), payload (10 files), engine (10 files) — these
   are where new boundaries might emerge.
