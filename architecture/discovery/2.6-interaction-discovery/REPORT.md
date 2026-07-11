# 2.6 Interaction Discovery — REPORT

Generated: 2026-07-11
Extraction Method: Import graph scan, classified by capability pair
Protocol: Evidence-First

---

## Summary

114 cross-capability interactions discovered across 29 pairs. The
interaction graph reveals the true communication patterns between
capabilities.

---

## Interaction Graph (top 20 pairs, by total import count)

| # | Source → Target | Static | Dynamic | Total | Direction |
|---|----------------|--------|---------|-------|-----------|
| 1 | Other → CAP-2 (NPC Agency) | 25 | 0 | 25 | Internal NPC imports |
| 2 | Adapters → Ports | 10 | 0 | 10 | ✅ Expected (candidate arch) |
| 3 | CAP-1 (NPC Gen) → CAP-2 (NPC Agency) | 10 | 0 | 10 | ✅ Expected (Gen uses Agency) |
| 4 | Adapters → CAP-16 (State) | 9 | 0 | 9 | ✅ Expected (candidate arch) |
| 5 | CAP-17 (UI) → CAP-16 (State) | 3 | 3 | 6 | ✅ Expected (UI reads state) |
| 6 | CAP-16 (State) → CAP-13 (Storage) | 5 | 0 | 5 | 🔴 Violation (state → storage) |
| 7 | CAP-16 (State) → CAP-14 (API) | 0 | 5 | 5 | 🔴 Violation (state → API) |
| 8 | Other → CAP-3 (NPC Detect) | 5 | 0 | 5 | Internal NPC imports |
| 9 | CAP-17 (UI) → CAP-4 (Turn) | 4 | 0 | 4 | ✅ Expected (UI triggers turn) |
| 10 | CAP-16 (State) → CAP-11 (Engine) | 3 | 0 | 3 | 🔴 Violation (state → engine) |
| 11 | Utils → CAP-8 (LLM) | 3 | 0 | 3 | ⚠️ Circular (utils → LLM → utils) |
| 12 | Other → CAP-8 (LLM) | 3 | 0 | 3 | Internal service imports |
| 13 | Other → CAP-16 (State) | 3 | 0 | 3 | Internal imports |
| 14 | Other → CAP-10 (Lore) | 2 | 0 | 2 | Internal imports |
| 15 | CAP-14 (API) → Ports | 0 | 2 | 2 | ✅ Expected (candidate arch) |
| 16 | CAP-1 (NPC Gen) → Utils | 2 | 0 | 2 | ✅ Expected |
| 17 | CAP-1 (NPC Gen) → CAP-3 (NPC Detect) | 2 | 0 | 2 | ✅ Expected (Gen uses Detect) |
| 18 | CAP-16 (State) → CAP-7 (Embedding) | 1 | 0 | 1 | 🔴 Violation (state → embedding) |
| 19 | CAP-16 (State) → CAP-4 (Turn) | 0 | 1 | 1 | 🔴 Violation (state → turn) |
| 20 | CAP-16 (State) → CAP-18 (Infrastructure) | 2 | 1 | 3 | 🔴 Violation (state → infra) |

---

## Dependency Direction Analysis

### Expected directions (✅):
```
UI → State         (6 interactions — UI reads state)
UI → Turn          (4 interactions — UI triggers turns)
Adapters → Ports   (10 interactions — candidate arch seam)
Adapters → State   (9 interactions — candidate arch seam)
NPC Gen → NPC Agency (10 interactions — Gen uses Agency utilities)
NPC Gen → NPC Detect (2 interactions — Gen uses Detect)
```

### Violation directions (🔴):
```
State → Storage     (5 interactions — state should not persist)
State → API         (5 interactions — state should not call API)
State → Engine      (3 interactions — state should not run engine)
State → Embedding   (1 interaction — state should not trigger embedding)
State → Turn        (1 interaction — state should not commit turns)
State → Infrastructure (3 interactions — state should not do crypto/theme)
```

Total state violations: 18 interactions across 5 target capabilities.

### Circular dependencies (⚠️):
```
Utils → LLM → Utils  (llmCall in utils/ imports from services/llm/)
```

---

## Runtime Flow (from dynamic imports)

### Flow 1: User sends message
```
UI (ChatArea)
  → CAP-4 (Turn): runTurn()
    → CAP-8 (LLM): llmCall()
    → CAP-9 (Payload): build payload
    → CAP-7 (Embedding): embed query
    → CAP-6 (Archive): recall chapters
    → CAP-10 (Lore): inject lore
    → CAP-5 (Campaign State): resolve timeline
    → Ports → Adapters → CAP-16 (State): update messages
    → CAP-4 (Turn): handlePostTurn()
      → CAP-6 (Archive): seal chapter
      → CAP-2 (NPC Agency): tick heartbeat
      → CAP-5 (Campaign State): extract divergence
      → Ports → Adapters → CAP-16 (State): update archive, NPCs
```

### Flow 2: Campaign switch
```
UI (CampaignHub)
  → CAP-16 (State): setActiveCampaign()
    → CAP-7 (Embedding): abortForCampaignSwitch() 🔴 VIOLATION
    → CAP-7 (Embedding): warmupEmbedder() 🔴 VIOLATION
    → CAP-7 (Embedding): runFullReindex() 🔴 VIOLATION
    → CAP-13 (Storage): loadCampaignState() 🔴 VIOLATION
    → CAP-14 (API): api.backup.create() 🔴 VIOLATION
```

### Flow 3: NPC add
```
UI (NPCLedgerModal)
  → CAP-1 (NPC Gen): generateNPCProfile()
    → CAP-8 (LLM): llmCall()
    → CAP-2 (NPC Agency): buildGoalsFromWants()
    → CAP-3 (NPC Detect): checkNameCollision()
    → Ports → Adapters → CAP-16 (State): addNPC()
    → CAP-7 (Embedding): embedAndStoreNPC()
    → CAP-13 (Storage): embeddingStorage.store()
```

---

## Interaction Rules (discovered from code)

1. **UI → State:** Expected. UI reads state via Zustand hooks.
2. **UI → Turn:** Expected. UI triggers domain operations.
3. **State → Services:** VIOLATION. State should not call services.
4. **Adapters → State + Ports:** Expected. This is the candidate seam.
5. **NPC Gen → NPC Agency:** Expected. Generation uses agency utilities.
6. **Turn → Everything:** Expected. Turn orchestrator calls all capabilities.
7. **Utils → LLM:** CIRCULAR. llmCall depends on llmService which depends on utils.

---

## Open Questions

1. ⚠️ Should the 25 "Other → CAP-2" interactions be reclassified?
   They're from files in services/npc/ that don't match any specific
   CAP directory pattern — likely NPC index re-exports.

2. ❌ Should State → Storage be a violation? Debounced save is
   state-adjacent. Inferred — needs 2.7.

3. ❌ Is the Utils → LLM circular dependency a real problem or just
   a code smell? Unknown — needs investigation.

---

## Unknowns

1. ❌ Whether the candidate port interactions (26 services → ports)
   correctly model the real interaction patterns — needs 2.7.

2. ❌ Whether there are hidden runtime interactions not visible from
   import graph (e.g., event listeners, callbacks) — the code uses
   callback patterns extensively (TurnCallbacks) which aren't
   captured by import analysis.

---

## Architecture Risks

1. **State → 5 different capabilities:** State reaches into Storage,
   API, Engine, Embedding, Turn, Infrastructure. This makes state
   impossible to test in isolation.

2. **Turn is a hub:** CAP-4 (Turn) interacts with 8 other capabilities.
   Any change to any capability risks breaking the turn pipeline.

3. **Circular dependency (Utils ↔ LLM):** llmCall in utils/ imports
   from services/llm/ — this creates a circular dependency that
   bundlers resolve but makes the code harder to reason about.

4. **Callback-based interactions:** TurnCallbacks (defined in
   turnTypes.ts) pass 20+ callback functions from the store to the
   turn orchestrator. This is a hidden interaction channel not
   visible from imports.

---

## Recommendations

1. Proceed to 2.7 Boundary Validation — the interaction data
   provides the evidence needed to validate or reject boundary
   candidates.

2. The 18 state violations (across 5 targets) are the primary
   input for boundary validation.

3. Do NOT design ports yet.
