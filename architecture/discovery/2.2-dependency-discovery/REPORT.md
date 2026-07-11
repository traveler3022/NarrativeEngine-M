# 2.2 Dependency Discovery Report

Date: 2026-07-09
Method: Pure static analysis of import graph + dynamic import scan
Banned sources: existing ports, adapters, BOUNDARIES.md (per DISCOVERY_PROTOCOL.md)

---

## A. Layer Summary (by directory)

| Layer | Directory | Files | Role |
|-------|-----------|-------|------|
| UI | `src/components/` | 68 | React components, user interaction |
| UI hooks | `src/components/hooks/` + `src/hooks/` | 7 | React hooks (UI-adjacent) |
| State | `src/store/` | 12 (non-test) | Zustand store + slices + persistence |
| Domain | `src/services/` | ~180 (non-test) | Business logic, LLM, engine, NPC, archive |
| Types | `src/types/` | 6 | Type definitions |
| Utils | `src/utils/` | 7 | Pure utilities (uid, llmCall, haptics) |
| i18n | `src/i18n/` | 3 | Translation |
| Candidate | `src/ports/` | 10 | Candidate architecture (hypothesis) |
| Candidate | `src/adapters/` | 10 | Candidate architecture (hypothesis) |
| Entry | `src/main.tsx` + `src/App.tsx` | 2 | Bootstrap + shell |

---

## B. Compile-Time Dependencies (static imports)

### B.1: services → store

**Non-test: 0** (all migrated to candidate ports)

**Test-only: 3**
- `auditFixes.test.ts → store/slices/campaignSlice` (defaultContext)
- `engineRolls.test.ts → store/slices/settingsSlice` (DEFAULT_* constants)
- `npcRepro.test.ts → store/slices/npcSlice` (dedupeNPCLedger)

### B.2: services → components

**Non-test: 0**

**Test-only: 1**
- `archiveSurgicalDelete.test.ts → components/hooks/useMessageEditor` (findSceneIdForMessage)

### B.3: store → components

**0** (none)

### B.4: store → services (CRITICAL — this is the real reverse dependency)

**14 unique service modules imported by store:**

| Store file | Service module | Import type | What it uses |
|------------|---------------|-------------|--------------|
| `campaignStore.ts` | `services/storage/imageStorage` | static | imageStorage |
| `campaignStore.ts` | `services/lore/loreIndexer` | static | upgradeVectorOnlyDefault |
| `campaignStore.ts` | `services/npc/agencyBands` | static | affinityToPcRelation |
| `campaignStore.ts` | `services/apiClient` | dynamic (4x) | api.backup, api.campaigns |
| `campaignStore.ts` | `services/campaign-state` | dynamic | migrateV1ToV2 |
| `campaignSlice.ts` | `services/engine/constants` | static | DEFAULT_* arrays |
| `campaignSlice.ts` | `services/embedding` | static + dynamic | runFullReindex, abortForCampaignSwitch, warmupEmbedder |
| `campaignSlice.ts` | `services/storage/embeddingStorage` | static | embeddingStorage |
| `campaignSlice.ts` | `services/campaign-state` | static | EMPTY_REGISTER |
| `campaignSlice.ts` | `services/turn` | dynamic | commitPendingTurn |
| `campaignSlice.ts` | `services/storage` | dynamic | offlineStorage |
| `campaignSlice.ts` | `services/infrastructure` | dynamic | backgroundQueue |
| `campaignSlice.ts` | `services/apiClient` | dynamic | api |
| `chatSlice.ts` | `services/campaign-state` | static | EMPTY_REGISTER, toggleChapter, etc. |
| `chatSlice.ts` | `services/infrastructure` | static | countTokens |
| `chatSlice.ts` | `services/storage/imageStorage` | static | imageStorage |
| `npcSlice.ts` | `services/embedding` | static | embedText, getCurrentModelId |
| `npcSlice.ts` | `services/storage/embeddingStorage` | static | embeddingStorage |
| `npcSlice.ts` | `services/storage/imageStorage` | static | imageStorage |
| `npcSlice.ts` | `services/npc` | static | buildNPCEmbeddingText, findLedgerMatches |
| `settingsSlice.ts` | `services/infrastructure` | static | encryptSettingsProviders, etc. |
| `settingsSlice.ts` | `services/infrastructure/themeService` | static | resolveTheme |
| `settingsSlice.ts` | `services/engine/constants` | static | DEFAULT_* arrays |
| `useAppStore.ts` | `services/embedding/embeddingScheduler` | static | registerStore |
| `useAppStore.ts` | `services/engine/constants` | static | DEFAULT_* arrays |

---

## C. Runtime Dependencies (dynamic imports)

### C.1: services dynamic imports (non-test)

| File | Dynamic target | Purpose |
|------|---------------|---------|
| `apiClient.ts` | `ports/campaignRepository` | saveCampaignState, saveNPCLedger |
| `apiClient.ts` | `./infrastructure` | encryptSettingsPresets |
| `backfillRunner.ts` | `../lore` | chunkLoreFile |
| `backfillRunner.ts` | `ports/campaignContext` | getContext (loreRaw, rulesRaw) |
| `embedder.ts` | `ports/settings` | getSettings (embeddingModel) |
| `embedder.ts` | `./embeddingScheduler` | abortForModelSwitch |
| `turnPostProcess.ts` | `../storage` | offlineStorage (3x) |
| `turn/stages/factsTimelineStage.ts` | `../../campaign-state` | resolveTimeline |
| `turn/stages/rulesStage.ts` | `../../lore` | chunkLoreFile |
| `campaignBundle.ts` | `./embedding` + `./storage` | embedText, offlineStorage |
| `storage/index.ts` | `../embedding` | embedText, getCurrentModelId |
| `storage/imageStorage.ts` | `idb-keyval` | keys() |

### C.2: store dynamic imports (non-test)

| File | Dynamic target | Purpose |
|------|---------------|---------|
| `campaignStore.ts` | `services/apiClient` (4x) | api.backup, api.campaigns |
| `campaignStore.ts` | `services/campaign-state` | migrateV1ToV2 |
| `campaignSlice.ts` | `services/turn` | commitPendingTurn |
| `campaignSlice.ts` | `services/storage` | offlineStorage |
| `campaignSlice.ts` | `services/infrastructure` | backgroundQueue |
| `campaignSlice.ts` | `services/embedding` | warmupEmbedder |
| `campaignSlice.ts` | `services/apiClient` | api |
| `campaignSlice.ts` | `store/campaignStore` | saveCampaignState (self-import via saveController) |
| `chatSlice.ts` | `store/campaignStore` | saveCampaignState |
| `loreSlice.ts` | `store/campaignStore` | saveLoreChunks |
| `npcSlice.ts` | `store/campaignStore` | saveNPCLedger |
| `pressureSlice.ts` | `store/campaignStore` | savePressure |
| `saveController.ts` | `store/campaignStore` | saveCampaignState |

### C.3: components dynamic imports (non-test)

| File | Dynamic target | Purpose |
|------|---------------|---------|
| `CampaignHub.tsx` | `services/lore` | enrichLoreKeywords |
| `ChatArea.tsx` | `store/campaignStore` | saveDivergenceRegister |
| `DivergenceEntryModal.tsx` | `utils/llmCall` + `services/infrastructure` | llmCall, extractJson |
| `LoreTab.tsx` | `store/campaignStore` (2x) | saveLoreChunks |
| `PCCreationWizard.tsx` | `utils/llmCall` + `utils/uid` | llmCall, uid |
| `WorldPrimerPanel.tsx` | `utils/llmCall` | llmCall |

---

## D. Bidirectional Dependencies (Cycles)

### D.1: store ↔ services

**This is the most critical finding.**

Store imports from 14 service modules. Services (via candidate ports) import from store. Even though services no longer import store directly (0 non-test static leaks), the **store still imports services heavily** — 24 import statements across 7 store files.

This means:
- `store → services` = 24 imports (real)
- `services → store` = 0 direct (migrated to ports)
- `services → ports → adapters → store` = 10 port chains (indirect)

The reverse dependency (store → services) was NEVER addressed. The candidate architecture only fixed one direction.

### D.2: store internal

| Slice | Imports from | Type |
|-------|-------------|------|
| `campaignSlice` | `archiveSlice`, `loreSlice`, `npcSlice`, `chatSlice` | type-only (composition) |
| `campaignSlice` | `settingsSlice` | value (debouncedSaveSettings) |
| `chatSlice` | `saveController` | value (debouncedSaveCampaignState) |

No runtime cycles in slices (type-only imports are safe).

---

## E. Dependency Direction Summary

```
                    ┌──────────────────────────────────┐
                    │          components (UI)          │
                    │  68 files                         │
                    └────────┬──────────┬───────────────┘
                             │          │
                    static ↓          ↓ dynamic
                             │          │
                    ┌────────▼──────────▼───────────────┐
                    │          store (Zustand)           │
                    │  12 files                          │
                    │  24 imports FROM services ◄────── │ ──┐
                    └────────┬──────────┬───────────────┘   │
                             │          │                    │
                    static ↓          ↓ dynamic              │
                             │          │                    │
                    ┌────────▼──────────▼───────────────┐   │
                    │        services (domain)           │   │
                    │  ~180 files                        │   │
                    │  0 direct imports from store ✅    │ ──┘
                    │  26 imports from ports (candidate) │
                    └───────────────────────────────────┘
```

**Key finding:** The store → services dependency (24 imports) is the dominant coupling direction. The candidate ports only addressed services → store, not the reverse.

---

## F. Layer Violations (real, ignoring candidate ports)

| # | Violation | Count | Severity |
|---|-----------|-------|----------|
| 1 | store → services (static) | 14 | 🔴 High — store knows about domain logic |
| 2 | store → services (dynamic) | 10 | 🔴 High — runtime coupling |
| 3 | services → store (non-test) | 0 | ✅ Fixed |
| 4 | services → components (non-test) | 0 | ✅ Fixed |
| 5 | store → components | 0 | ✅ Clean |
| 6 | components → store (static) | ~20 | 🟡 Expected — UI reads state |
| 7 | components → store (dynamic) | 3 | 🟡 Expected — UI persists |
| 8 | components → services (static) | ~15 | 🟡 Expected — UI triggers logic |
| 9 | components → services (dynamic) | 6 | 🟡 Expected — UI lazy-loads |

---

## G. Key Findings

1. **store → services is the real problem.** 24 imports. Store calls embedding, storage, NPC, API client, turn orchestrator, infrastructure — directly. This was never addressed by the candidate ports.

2. **Services are clean (0 store leaks).** The candidate port migration worked for this direction.

3. **Components → store is expected.** UI reading state is normal. Not a violation.

4. **Components → services is expected.** UI calling domain logic is normal. Not a violation.

5. **store → services coupling is structural.** Store slices contain business logic (embedding triggers, API calls, migration, reindex) that should live in services, not in state management.

6. **saveController is a cycle breaker but not a solution.** It broke the campaignSlice ↔ chatSlice cycle, but both slices still import from services and campaignStore.

7. **campaignStore is a God Module.** It's imported by: all slices (dynamic), ChatArea, Header, LoreTab, CampaignHub. It does persistence + migration + API calls + lore processing + NPC affinity — 7 responsibilities.

---

## H. Next Step

This report is the input to 2.3 Boundary Discovery. The key question for 2.3:

> Given that store → services is the real coupling (not services → store), where should the boundary actually be drawn?

No code changes. No ports. No interfaces. Just this report.
