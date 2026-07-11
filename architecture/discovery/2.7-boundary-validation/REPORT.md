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
