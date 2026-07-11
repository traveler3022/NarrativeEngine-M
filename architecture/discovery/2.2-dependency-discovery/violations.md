# 2.2 Dependency Discovery — Violations

## Definition

A "violation" is a dependency that crosses a layer boundary in the
wrong direction — i.e., a lower layer depends on a higher layer.

Expected direction: entry → ui → state → domain → types
                                    ↘              ↗
                                     adapters → ports

## Violations Found

### V1: store → services (CRITICAL)

**24 dependencies (10 static + 14 dynamic)**

Store imports from 14 distinct service modules. This means the state
layer contains business logic that belongs in the domain layer.

| # | Store file | Service | What it does | Should be in |
|---|-----------|---------|--------------|-------------|
| 1 | campaignStore.ts | storage/imageStorage | Image CRUD | domain/storage |
| 2 | campaignStore.ts | lore/loreIndexer | Lore chunk upgrade | domain/lore |
| 3 | campaignStore.ts | npc/agencyBands | NPC affinity mapping | domain/npc |
| 4 | campaignStore.ts | apiClient (4x dynamic) | API calls | domain/api |
| 5 | campaignStore.ts | campaign-state (dynamic) | Data migration | domain/campaign |
| 6 | campaignSlice.ts | engine/constants | Default data | domain/engine |
| 7 | campaignSlice.ts | embedding (static+dynamic) | Embedding warmup/reindex | domain/embedding |
| 8 | campaignSlice.ts | storage/embeddingStorage | Embedding CRUD | domain/storage |
| 9 | campaignSlice.ts | campaign-state | EMPTY_REGISTER | domain/campaign |
| 10 | campaignSlice.ts | turn (dynamic) | Turn commit | domain/turn |
| 11 | campaignSlice.ts | storage (dynamic) | Offline storage | domain/storage |
| 12 | campaignSlice.ts | infrastructure (dynamic) | Background queue | domain/infra |
| 13 | campaignSlice.ts | apiClient (dynamic) | API calls | domain/api |
| 14 | chatSlice.ts | campaign-state | Divergence operations | domain/campaign |
| 15 | chatSlice.ts | infrastructure | Token counting | domain/infra |
| 16 | chatSlice.ts | storage/imageStorage | Image CRUD | domain/storage |
| 17 | npcSlice.ts | embedding | Embed text | domain/embedding |
| 18 | npcSlice.ts | storage/embeddingStorage | Embedding CRUD | domain/storage |
| 19 | npcSlice.ts | storage/imageStorage | Image CRUD | domain/storage |
| 20 | npcSlice.ts | npc | NPC embedding text | domain/npc |
| 21 | settingsSlice.ts | infrastructure | Settings encryption | domain/infra |
| 22 | settingsSlice.ts | infrastructure/themeService | Theme resolution | domain/infra |
| 23 | settingsSlice.ts | engine/constants | Default data | domain/engine |
| 24 | useAppStore.ts | embedding/embeddingScheduler | Store registration | domain/embedding |
| 25 | useAppStore.ts | engine/constants | Default data | domain/engine |

**Severity: CRITICAL**

This is the root cause of the architectural debt. The store is not
a state manager — it's a God Layer that orchestrates 11 domain
concerns.

### V2: store → ports (4 dependencies)

| # | Store file | Port | What |
|---|-----------|------|------|
| 1 | campaignSlice.ts | ports/notification | notify.error |
| 2 | npcSlice.ts | ports/notification | notify.error |
| 3 | saveController.ts | ports/notification | notify.error |
| 4 | settingsSlice.ts | ports/notification | notify.error |

**Severity: LOW**

Store calling notify is acceptable — it's a side-effect notification,
not domain logic. But strictly speaking, store should not know about
any layer above it.

### V3: test-only violations (4 dependencies)

| # | Test file | Target | What |
|---|----------|--------|------|
| 1 | auditFixes.test.ts | store/slices/campaignSlice | defaultContext |
| 2 | engineRolls.test.ts | store/slices/settingsSlice | DEFAULT_* constants |
| 3 | npcRepro.test.ts | store/slices/npcSlice | dedupeNPCLedger |
| 4 | archiveSurgicalDelete.test.ts | components/hooks/useMessageEditor | findSceneIdForMessage |

**Severity: LOW**

Test files can import anything. But these tests would break if the
imported modules are refactored, which couples test stability to
implementation details.

## Non-Violations (expected dependencies)

| Direction | Count | Status |
|-----------|-------|--------|
| components → store | 18 | ✅ Expected (UI reads state) |
| components → services | 22 | ✅ Expected (UI triggers logic) |
| components → utils | 6 | ✅ Expected |
| services → types | many | ✅ Expected |
| services → utils | many | ✅ Expected |
| services → ports | 26 | ✅ Candidate architecture |
| adapters → store | many | ✅ Candidate architecture (the seam) |
| adapters → ports | many | ✅ Candidate architecture (the seam) |
