# 2.9 Human Approval — REPORT

Generated: 2026-07-11
Protocol: Evidence-First (EVIDENCE_FIRST_PROTOCOL.md)

---

## Purpose

Present the complete Discovery findings for human review. Phase 3
is blocked until this document is approved.

---

## Discovery Summary (2.2 — 2.8)

### Layers Discovered (10)

| Layer | Files | Status |
|-------|-------|--------|
| Entry | 2 | ⚠️ God Component (App.tsx) |
| UI | 68 | ⚠️ 3 persistence violations |
| State (Store) | 12 | 🔴 God Layer — 25 service imports |
| Domain (Services) | ~180 | ✅ Clean (0 store imports) |
| Candidate Ports | 10 | 🟡 Hypothesis — 8/10 align |
| Candidate Adapters | 10 | 🟡 Hypothesis — 2 violations |
| Persistence | 7 files scattered | 🔴 No gateway |
| Infrastructure | 8 | ✅ Clean |
| Types | 6 | ✅ Clean |
| Utils | 7 | ⚠️ 1 circular dep |
| i18n | 3 | ✅ Clean |

### Boundaries Validated (5)

| ID | Boundary | Verdict | Violations |
|----|----------|---------|------------|
| BV-1 | State vs Domain | ✅ Validated | 25 (critical) |
| BV-2 | Persistence vs State | ✅ Validated | 7 files, no gateway |
| BV-3 | UI vs Logic | ✅ Validated | 3 (minor) |
| BV-4 | NPC Sub-domain | ✅ Validated | 28 files should split into 5 |
| BV-5 | Turn Pipeline | ✅ Validated | 0 (already clean) |

### Capabilities Discovered (18)

| ID | Capability | Exports | Risk |
|----|-----------|---------|------|
| CAP-1 | NPC Generation | 10 | God File (1306 lines) |
| CAP-2 | NPC Agency | 193 | Too large — should split |
| CAP-3 | NPC Detection | 12 | ✅ OK |
| CAP-4 | Turn Orchestration | 14 | ✅ OK (13 stages, well-structured) |
| CAP-5 | Campaign State | 55 | ✅ OK |
| CAP-6 | Archive | 31 | ✅ OK |
| CAP-7 | Embedding | 31 | ✅ OK |
| CAP-8 | LLM | 31 | ✅ OK |
| CAP-9 | Payload | 27 | ✅ OK |
| CAP-10 | Lore | 23 | ✅ OK |
| CAP-11 | Engine | 39 | ✅ OK |
| CAP-12 | Image | 9 | ✅ OK |
| CAP-13 | Storage | 19 | ✅ OK |
| CAP-14 | API | 1 | ✅ OK |
| CAP-15 | Arc | 18 | ✅ OK |
| CAP-16 | State | 12 | 🔴 God Layer |
| CAP-17 | UI | 68 files | ⚠️ 3 violations |
| CAP-18 | Infrastructure | 35 | ✅ OK |

### Interaction Findings

| Metric | Value |
|--------|-------|
| Total cross-capability interactions | 114 |
| State → Service violations | 18 |
| Service → State violations | 0 |
| Circular dependencies | 1 (Utils ↔ LLM) |
| Hidden interaction channels | 1 (TurnCallbacks, 20+ callbacks) |

### Candidate Port Review

| Port | Aligns? | Action |
|------|---------|--------|
| NotificationPort | ✅ | Keep |
| MessagingPort | ✅ | Keep |
| NPCCapability | ⚠️ | Split into sub-ports (BV-4) |
| ArchivePort | ✅ | Keep |
| CampaignContextPort | ✅ | Keep |
| SettingsPort | ✅ | Keep |
| UIStatePort | ⚠️ | Convert to event bus |
| LoreRepositoryPort | ✅ | Keep |
| ChapterRepositoryPort | ✅ | Keep |
| CampaignRepositoryPort | ✅ | Keep |

---

## Architecture Knowledge Base

The following artifacts constitute the complete Architecture
Knowledge Base for NarrativeEngine-M:

```
architecture/
├── DISCOVERY_PROTOCOL.md          ← Phase 2 reset protocol
├── EVIDENCE_FIRST_PROTOCOL.md     ← Zero Assumption Rule
├── BOUNDARIES.md                  ← Candidate reference (to be updated)
├── discovery/
│   ├── 2.1-audit/
│   │   └── REPORT.md
│   ├── 2.2-dependency-discovery/
│   │   ├── REPORT.md              ← Dependency summary
│   │   ├── import-graph.md         ← Static import edges
│   │   ├── runtime-graph.md        ← Dynamic import edges
│   │   ├── layer-map.md            ← Layer relationships
│   │   ├── violations.md           ← 25 violations
│   │   ├── raw-data.json           ← 663 edges (machine-readable)
│   │   └── layer-id-cards.md       ← 10 layer identification cards
│   ├── 2.3-boundary-discovery/
│   │   ├── REPORT.md               ← 3 boundary candidates
│   │   ├── RAW_DATA.json           ← Cluster analysis
│   │   └── state-ownership.json    ← 67 state types
│   ├── 2.4-capability-discovery/
│   │   ├── REPORT.md               ← 18 capabilities
│   │   └── RAW_DATA.json           ← 594 exports
│   ├── 2.5-responsibility-discovery/
│   │   ├── REPORT.md               ← Responsibility matrix
│   │   └── RAW_DATA.json           ← NPC subgroups, turn stages, store audit
│   ├── 2.6-interaction-discovery/
│   │   ├── REPORT.md               ← 114 interactions, 3 flows
│   │   └── RAW_DATA.json           ← 29 interaction pairs
│   ├── 2.7-boundary-validation/
│   │   └── REPORT.md               ← 5 validated boundaries
│   ├── 2.8-architecture-review/
│   │   └── REPORT.md               ← Coupling, cohesion, risks, debt, port review
│   └── 2.9-human-approval/
│       └── REPORT.md               ← This document
```

Total: 22 artifacts, ~5000 lines of evidence-based documentation.

---

## Open Questions for Human

1. Should candidate ports be revised before Phase 3, or during?
2. Should persistence gateway be a port or a service?
3. Should NPC sub-domain split happen in Phase 3 or Phase 4?
4. Should App.tsx split happen now or later?
5. Is the 13-stage turn pipeline acceptable as-is?
6. Should chatSlice be split (143 fields, 4 data domains)?

---

## Approval Gate

Phase 3 is BLOCKED until the project owner reviews this document
and grants approval.

### Approval Status: ⏳ PENDING

### Approval Conditions:
- [ ] Project owner has read 2.2-2.8 reports
- [ ] Open questions answered
- [ ] Candidate port revision plan agreed
- [ ] Phase 3 priority order agreed
- [ ] Explicit "approved" given

---

## Next Steps After Approval

Phase 3 (Implementation) may begin with:
1. Port revision (split NPC, convert UIState)
2. Store → Service extraction (15 misplaced responsibilities)
3. Persistence gateway creation
4. God File splitting (npcGeneration, turnPostProcess)
5. App.tsx splitting

All Phase 3 work must reference Discovery artifacts as evidence.
