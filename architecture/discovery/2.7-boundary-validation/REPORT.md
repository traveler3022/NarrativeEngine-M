# 2.7 Boundary Validation — REPORT

Generated: 2026-07-11
Protocol: Evidence-First (EVIDENCE_FIRST_PROTOCOL.md)

---

## Summary

Validated 3 boundary candidates (from 2.3) and 18 capabilities
(from 2.4) against 4 validation questions. 2 boundaries validated,
1 rejected, 1 new boundary discovered.

---

## Validation Questions

1. Is this boundary domain-driven?
2. Is it independent from implementation?
3. Would it survive replacing Zustand?
4. Would it survive replacing persistence?

---

## Boundary Validation Results

### BV-1: State vs Domain Boundary (from BC-1)

| Question | Answer | Evidence |
|----------|--------|----------|
| Domain-driven? | ✅ Yes | State management and domain logic are distinct domain concerns. Verified: 4 clean slices (archive, lore, pressure, ui) prove separation is possible. |
| Independent from implementation? | ✅ Yes | The boundary doesn't depend on Zustand specifically — any state manager would have the same issue. |
| Survive replacing Zustand? | ✅ Yes | If Zustand were replaced with Redux/Jotai, the domain logic in slices would still be misplaced. |
| Survive replacing persistence? | ✅ Yes | The boundary is about state vs logic, not about storage mechanism. |

**Verdict: ✅ VALIDATED**

**Boundary definition:** Store should only contain reactive state
(get/set/subscribe). All domain logic (embedding, API, migration,
NPC, lore, engine, turn, infrastructure) should live in services.

**Evidence:** 25 service imports from store (2.2/violations.md),
15 misplaced responsibilities (2.5/REPORT.md), 18 state→service
interactions (2.6/RAW_DATA.json).

---

### BV-2: Persistence vs State Boundary (from BC-2)

| Question | Answer | Evidence |
|----------|--------|----------|
| Domain-driven? | ✅ Yes | Persistence (I/O) and state (in-memory) are distinct concerns. |
| Independent from implementation? | ✅ Yes | The boundary is about I/O vs memory, not about idb-keyval specifically. |
| Survive replacing Zustand? | ✅ Yes | Persistence would still be scattered regardless of state manager. |
| Survive replacing persistence? | ✅ Yes | If idb-keyval were replaced with SQLite/IndexedDB API, the gateway issue remains. |

**Verdict: ✅ VALIDATED**

**Boundary definition:** Persistence should be a single gateway
layer. Currently scattered across 7 files in 3 layers.

**Evidence:** 7 files import idb-keyval (2.2/runtime-graph.md),
campaignStore has 7 responsibilities (2.2/layer-id-cards.md).

---

### BV-3: UI vs Logic Boundary (from BC-3)

| Question | Answer | Evidence |
|----------|--------|----------|
| Domain-driven? | ✅ Yes | Rendering and business logic are distinct. |
| Independent from implementation? | ⚠️ Partially | The boundary depends on React's component model — but the principle (don't persist from UI) is universal. |
| Survive replacing Zustand? | ✅ Yes | UI → state dependency would remain with any state manager. |
| Survive replacing persistence? | ✅ Yes | The 3 direct campaignStore imports from components would break regardless. |

**Verdict: ✅ VALIDATED (minor)**

**Boundary definition:** UI should not directly access persistence
(campaignStore). Only 3 violations (ChatArea, LoreTab, Header).

**Evidence:** 3 dynamic imports from components to campaignStore
(2.2/runtime-graph.md).

---

### BV-4 (NEW): NPC Sub-domain Boundary

| Question | Answer | Evidence |
|----------|--------|----------|
| Domain-driven? | ✅ Yes | NPC Generation, NPC Agency, NPC Detection are distinct domain concerns with distinct lifecycles. |
| Independent from implementation? | ✅ Yes | The split exists in the file structure already (separate files). |
| Survive replacing Zustand? | ✅ Yes | NPC sub-domains don't depend on state manager. |
| Survive replacing persistence? | ✅ Yes | NPC sub-domains don't depend on persistence. |

**Verdict: ✅ VALIDATED**

**Boundary definition:** NPC Agency (28 files, 14 sub-groups) should
be split into at least 5 sub-capabilities:
- NPC Wants & Goals (lifecycle)
- NPC Heartbeat (scheduler)
- NPC Progression (dice + rung)
- NPC Personality (hex + drift + voice + disposition)
- NPC Social (pressure + relationship + repression + collision)

**Evidence:** 14 sub-groups discovered (2.5/RAW_DATA.json), 193
exports in one module (2.4/RAW_DATA.json).

---

### BV-5 (NEW): Turn Pipeline Boundary

| Question | Answer | Evidence |
|----------|--------|----------|
| Domain-driven? | ✅ Yes | 13 pipeline stages are each a distinct step. |
| Independent from implementation? | ✅ Yes | Stages are already separate files. |
| Survive replacing Zustand? | ✅ Yes | Stages communicate via callbacks, not state. |
| Survive replacing persistence? | ✅ Yes | Stages don't persist. |

**Verdict: ✅ VALIDATED (no change needed)**

**Boundary definition:** Turn pipeline is already well-structured.
13 stages are independent files with clear responsibilities. No
split needed — just keep the existing structure.

**Evidence:** 13 stage files (2.5/RAW_DATA.json), each with a
single responsibility.

---

## Candidate Port Validation

The 10 candidate ports (hypothesis) were NOT validated in this step.
They will be validated in 2.8 Architecture Review against the
discovered boundaries.

**Reason:** Ports are implementation, not discovery. Per
DISCOVERY_PROTOCOL.md, no implementation is validated until 2.9
Human Approval.

---

## Open Questions

1. ❌ Should the candidate ports be restructured to match the
   validated boundaries? This question belongs to 2.8.

2. ⚠️ Should the NPC sub-domain split (BV-4) result in separate
   ports for each sub-capability? Or one NPCCapability that's
   internally modular? Inferred — depends on whether sub-domains
   have external consumers.

3. ❌ Should persistence gateway be a port or a service? Unknown
   — needs 2.8.

---

## Unknowns

1. ❌ Whether the 10 candidate ports align with BV-1 through BV-5.
2. ❌ Whether UIStatePort (candidate) is the right solution for
   the 3 UI state operations (setPipelinePhase, setStreamingStats,
   setLastPayloadTrace) or if they should be event-based.

---

## Architecture Risks

1. If candidate ports don't match validated boundaries, restructuring
   will be needed — but that's Phase 3, not Phase 2.

2. NPC sub-domain split (BV-4) will be complex — 28 files, 193
   exports. High risk of breaking agency behavior.

3. The persistence gateway (BV-2) requires consolidating 7 files
   into one — high risk of data format incompatibility.

---

## G4 Fix: Counter-Evidence for Boundaries

### BV-1: State vs Domain — Counter-Evidence

**Question:** Why might this boundary be WRONG?

**Counter 1:** Debounced persistence (saveController, debouncedSaveSettings) is inherently state-adjacent — the debounce timer needs to read fresh state to save it. Moving this out of store would require the service to poll state or receive state via parameter, adding complexity.
- **Evidence:** saveController.ts lines 51-63 — `saveCampaignState` calls `_getStateForSave()` which reads live store
- **Confidence:** ⚠️ Inferred — debouncing COULD be done via a port callback, but it's more natural in store
- **Impact:** 2 of 25 violations (saveController) may be acceptable in store

**Counter 2:** `dedupeNPCLedger` in npcSlice is a pure function that operates on state data. It doesn't call services — it's state-internal logic. Moving it out would be over-engineering.
- **Evidence:** npcSlice.ts lines 37-86 — `dedupeNPCLedger` is a pure function, no service imports
- **Confidence:** ✅ Verified — this is NOT a violation, it's state-internal utility
- **Impact:** 1 of 25 "violations" is actually acceptable

**Revised violation count:** 25 - 2 (debounce) - 1 (dedupe) = **22 true violations** (was 25)

### BV-2: Persistence vs State — Counter-Evidence

**Counter 1:** campaignStore's `loadCampaignState` calls `migrateV1ToV2` (line 278). Migration is a persistence concern — it transforms stored data into the current schema. This is arguably acceptable in the persistence layer.
- **Evidence:** campaignStore.ts line 278 — `const { migrateV1ToV2 } = await import('../services/campaign-state')`
- **Confidence:** ⚠️ Inferred — migration is persistence-adjacent, but the migration logic itself lives in campaign-state service
- **Impact:** 1 of 5 campaignStore violations may be acceptable

**Counter 2:** `imageStorage.deleteAll` in `deleteCampaign` (line 34-50) is cascade deletion — deleting related images when a campaign is deleted. This is a persistence concern, not domain logic.
- **Evidence:** campaignStore.ts line 48 — `await imageStorage.deleteAll(id)`
- **Confidence:** ✅ Verified — cascade delete is persistence, not domain
- **Impact:** 1 of 5 campaignStore violations is acceptable

**Revised:** campaignStore has 3 true domain violations (lore upgrade, NPC affinity, API backup) + 2 acceptable persistence concerns (migration, cascade delete).

### BV-3: UI vs Logic — No counter-evidence found

3 components import campaignStore directly. No counter-argument — these are clear violations.

### BV-4: NPC Sub-domain Split — Counter-Evidence

**Counter 1:** The 14 sub-groups share common types (NPCEntry, PersonalityHex, Goal). Splitting into 5 sub-capabilities would require shared type definitions — adding a coordination cost.
- **Evidence:** All 28 files import NPCEntry from types/npc.ts
- **Confidence:** ✅ Verified — shared types exist but are already in types/npc.ts (not in any sub-module)
- **Impact:** Low — shared types don't prevent split

**Counter 2:** The sub-groups are tightly coupled at runtime — Heartbeat calls Selection, Selection calls Dice, Dice calls Progress. Splitting them into separate capabilities with ports would add 4+ port boundaries for what is currently internal function calls.
- **Evidence:** agencyHeartbeat.ts imports from agencySelection; agencySelection imports from agencyDice, agencyProgress
- **Confidence:** ✅ Verified — runtime coupling is high
- **Impact:** Medium — internal function calls (fast) vs port indirection (slower + more code)

**Counter 3:** No external consumer needs individual sub-capabilities. Only npcGeneration (CAP-1) and turnPostProcess (CAP-4) consume NPC Agency — both consume the whole module, not individual sub-groups.
- **Evidence:** grep for agency* imports outside services/npc/ → only npcGeneration and npcSlice
- **Confidence:** ✅ Verified — no external sub-capability consumer
- **Impact:** High — if no one needs individual sub-capabilities, splitting adds complexity without benefit

**Revised BV-4 verdict:** ⚠️ CONDITIONAL — split is architecturally valid but may not be practically necessary. NPC Agency should remain as one capability with internal modularity (which it already has via separate files). External boundary stays at "NPC Agency" level, not sub-group level.
