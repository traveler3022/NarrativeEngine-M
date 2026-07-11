# 2.8 Architecture Review — REPORT

Generated: 2026-07-11
Protocol: Evidence-First (EVIDENCE_FIRST_PROTOCOL.md)
Inputs: 2.2 (Dependency), 2.3 (Boundary), 2.4 (Capability), 2.5 (Responsibility), 2.6 (Interaction), 2.7 (Boundary Validation)

---

## Purpose of This Step

Review the discovered architecture (from 2.2-2.7) and assess:
- Coupling
- Cohesion
- Dependency direction
- Layer isolation
- Risks
- Technical debt

No new discovery. No implementation. Only review of evidence.

---

## 1. Coupling Assessment

### Metric: 16.68% coupling ratio (from 2.3/RAW_DATA.json)

| Metric | Value | Source | Confidence |
|--------|-------|--------|------------|
| Total cross-layer edges | 166 | 2.3/RAW_DATA.json | ✅ Verified |
| Intra-cluster edges | 829 | 2.3/RAW_DATA.json | ✅ Verified |
| Coupling ratio | 16.68% | 2.3/RAW_DATA.json | ✅ Verified |
| State → Service violations | 18 | 2.6/RAW_DATA.json | ✅ Verified |
| Service → State violations | 0 | 2.2/import-graph.md | ✅ Verified |
| Store → Components violations | 0 | 2.2/violations.md | ✅ Verified |
| Service → Components violations | 0 | 2.2/violations.md | ✅ Verified |

### Assessment

Coupling ratio is GOOD (83% cohesion). However, the 18 state→service
violations are the dominant architectural debt. All other directions
are clean.

---

## 2. Cohesion Assessment

| Cluster | Files | Intra-imports | Cohesion | Source |
|---------|-------|---------------|----------|--------|
| services/npc | 32 | High (25 internal) | ✅ Good | 2.4/RAW_DATA.json |
| services/turn | 24 | High (pipeline stages) | ✅ Good | 2.5/RAW_DATA.json |
| store/slices | 9 | Medium (type-only) | ✅ Good | 2.2/import-graph.md |
| components/root | 22 | High (65 cross to other UI) | ⚠️ Moderate | 2.3/RAW_DATA.json |
| services/storage | 10 | Low (mostly leaf modules) | ⚠️ Moderate | 2.4/RAW_DATA.json |
| ports | 10 | None (interfaces only) | ✅ N/A | 2.2/layer-id-cards.md |

### Assessment

Cohesion is generally good. The weakest cluster is services/storage
(low intra-imports because each storage module is independent).
services/npc is the strongest (high internal coupling = strong domain
boundary).

---

## 3. Dependency Direction Assessment

### Expected direction (entry → ui → state → domain → types)

| Direction | Count | Status | Evidence |
|-----------|-------|--------|----------|
| entry → ui | 11 | ✅ | 2.3/RAW_DATA.json |
| entry → state | 2 | ✅ | 2.3/RAW_DATA.json |
| entry → adapters | 10 | ✅ | 2.3/RAW_DATA.json |
| ui → state | 6 | ✅ | 2.6/RAW_DATA.json |
| ui → domain | 4 | ✅ | 2.6/RAW_DATA.json |
| state → domain | 18 | 🔴 VIOLATION | 2.6/RAW_DATA.json |
| domain → state | 0 | ✅ | 2.2/import-graph.md |
| domain → types | many | ✅ | 2.2/import-graph.md |
| adapters → state | 9 | ✅ (candidate seam) | 2.6/RAW_DATA.json |
| adapters → ports | 10 | ✅ (candidate seam) | 2.6/RAW_DATA.json |

### Assessment

One direction is violated: **state → domain** (18 interactions).
This is the single most important finding of the entire Discovery.

---

## 4. Layer Isolation Assessment

| Layer | Isolated? | Evidence |
|-------|-----------|----------|
| Entry | ⚠️ No — directly calls services (reconcilePendingCommitOnLaunch) | 2.2/layer-id-cards.md |
| UI | ⚠️ Mostly — 3 direct campaignStore imports | 2.2/violations.md |
| State | 🔴 No — 18 service imports + 4 port imports | 2.6/RAW_DATA.json |
| Domain | ✅ Yes — 0 store imports (via candidate ports) | 2.2/import-graph.md |
| Types | ✅ Yes — pure type definitions | 2.2/layer-id-cards.md |
| Utils | ⚠️ Mostly — 1 circular dep (llmCall → llm) | 2.6/REPORT.md |
| i18n | ✅ Yes — leaf layer | 2.2/layer-id-cards.md |
| Infrastructure | ✅ Yes — leaf utility layer | 2.2/layer-id-cards.md |

### Assessment

State is the least isolated layer. Domain is fully isolated (via
candidate ports). The asymmetry is notable — we fixed one direction
(services → store) but not the other (store → services).

---

## 5. Risk Assessment

| # | Risk | Severity | Evidence | Impact |
|---|------|----------|----------|--------|
| R1 | State is a God Layer (25 service imports) | 🔴 Critical | 2.2/violations.md | Store can't be tested/mocked in isolation |
| R2 | campaignStore is a God Module (7 responsibilities) | 🔴 Critical | 2.2/layer-id-cards.md | Any change risks breaking unrelated features |
| R3 | No persistence gateway (7 files access idb-keyval) | 🔴 High | 2.2/runtime-graph.md | Storage format changes require 7 file edits |
| R4 | App.tsx is a God Component (7 useEffects) | 🟡 Medium | 2.2/layer-id-cards.md | Platform logic entangled with hydration |
| R5 | NPC Agency is too large (193 exports, 28 files) | 🟡 Medium | 2.4/RAW_DATA.json | Hard to test, hard to change |
| R6 | chatSlice holds 4 data domains (143 state fields) | 🟡 Medium | 2.5/RAW_DATA.json | Messages + condenser + divergence + excerpts in one slice |
| R7 | Candidate ports unvalidated | 🟡 Medium | 2.7/REPORT.md | May need restructuring |
| R8 | Utils ↔ LLM circular dependency | 🟢 Low | 2.6/REPORT.md | Bundler resolves, but code smell |
| R9 | TurnCallbacks hidden interaction channel | 🟢 Low | 2.6/REPORT.md | 20+ callbacks not visible from imports |
| R10 | 4 test-only layer leaks | 🟢 Low | 2.2/violations.md | Tests break if modules refactor |

---

## 6. Technical Debt Assessment

| Debt | Type | Size | Source |
|------|------|------|--------|
| State → Service coupling | Architectural | 25 imports | 2.2/violations.md |
| Scattered persistence | Structural | 7 files | 2.2/runtime-graph.md |
| God Files | Structural | 2 files (npcGeneration 1306, turnPostProcess 1237) | 2.4/REPORT.md |
| God Components | Structural | 1 file (App.tsx) | 2.2/layer-id-cards.md |
| God Slices | Structural | 2 slices (campaignSlice 96 fields, chatSlice 143 fields) | 2.5/REPORT.md |
| Unvalidated candidate ports | Process | 10 ports | 2.7/REPORT.md |
| Circular dependency | Code smell | 1 pair (Utils ↔ LLM) | 2.6/REPORT.md |
| Test-only leaks | Testing | 4 files | 2.2/violations.md |

---

## 7. Candidate Port Review

Per DISCOVERY_PROTOCOL.md, candidate ports are hypotheses. This
section reviews them against discovered evidence.

| # | Candidate Port | Aligns with discovered boundary? | Evidence |
|---|----------------|--------------------------------|----------|
| 1 | NotificationPort | ✅ Aligns with BV-1 (State/Domain) | 2.7: notification is side-effect, not domain |
| 2 | MessagingPort | ✅ Aligns with CAP-16 (State) + CAP-4 (Turn) | 2.4: turn uses messaging; 2.6: 6 UI→state interactions |
| 3 | NPCCapability | ⚠️ Partially — should match BV-4 (NPC sub-domain split) | 2.7: NPC should split into 5 sub-capabilities |
| 4 | ArchivePort | ✅ Aligns with CAP-6 (Archive) + CAP-5 (Campaign State) | 2.4: archive is a clear capability |
| 5 | CampaignContextPort | ✅ Aligns with CAP-16 (State) + CAP-5 | 2.5: campaignSlice has 96 state fields |
| 6 | SettingsPort | ✅ Aligns with CAP-16 (State) + CAP-18 (Infrastructure) | 2.5: settingsSlice has 4 service imports |
| 7 | UIStatePort | ⚠️ Questionable — should be event-based not state-based | 2.7: UI state is transient, not domain |
| 8 | LoreRepositoryPort | ✅ Aligns with BV-2 (Persistence gateway) | 2.3: persistence is scattered |
| 9 | ChapterRepositoryPort | ✅ Aligns with BV-2 | 2.3: same |
| 10 | CampaignRepositoryPort | ✅ Aligns with BV-2 | 2.3: same |

### Assessment

8 of 10 candidate ports align with discovered boundaries.
2 need revision:
- NPCCapability should be split to match BV-4 (NPC sub-domain)
- UIStatePort should be event-based, not a state port

---

## 8. Recommendations for Phase 3

Based on evidence from 2.2-2.7:

1. **Priority 1:** Extract domain logic from store slices (R1)
   - Move 15 misplaced responsibilities from store to services
   - This is the largest single architectural improvement

2. **Priority 2:** Create persistence gateway (R3)
   - Consolidate 7 idb-keyval access points into one layer
   - campaignStore should become a thin delegate

3. **Priority 3:** Split NPC Agency (R5, BV-4)
   - 28 files → 5 sub-capabilities
   - Each sub-capability gets its own boundary

4. **Priority 4:** Restructure candidate ports (R7)
   - Split NPCCapability into sub-ports
   - Convert UIStatePort to event bus
   - Validate remaining 8 ports

5. **Priority 5:** Split God Files (R5)
   - npcGeneration.ts (1306 lines) → 4 modules
   - turnPostProcess.ts (1237 lines) → 5 modules
   - Requires extracting shared helpers first

6. **Priority 6:** Fix circular dependency (R8)
   - Move llmCall from utils/ to services/llm/

---

## Open Questions for 2.9

1. Should candidate ports be revised before Phase 3, or during?
2. Should the persistence gateway be a port or a service?
3. Should NPC sub-domain split happen in Phase 3 or Phase 4?
4. Should App.tsx be split now or later?
5. Is the Turn pipeline structure (13 stages) acceptable as-is?

---

## Unknowns

1. ❌ Whether moving 15 responsibilities out of store will break
   runtime behavior — no test coverage to verify.
2. ❌ Whether the persistence gateway can consolidate 7 different
   data formats (campaigns, settings, images, embeddings, archives,
   backups, bundles) into one — unknown complexity.
3. ❌ Whether NPC sub-domain split will break agency behavior —
   193 exports with unknown interaction patterns.
