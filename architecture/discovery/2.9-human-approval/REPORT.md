# 2.9 Discovery Review Gate

Generated: 2026-07-11
Protocol: Evidence-First (EVIDENCE_FIRST_PROTOCOL.md)
Purpose: Review Discovery quality and completeness. No Design decisions.

---

## Review Criteria

### 1. Evidence

| Check | Status | Notes |
|-------|--------|-------|
| All claims have Evidence? | ⚠️ Partial | Most claims are Verified/Inferred with file+line refs. Some "Inferred" claims lack exact line numbers (e.g., "campaignStore.ts lines 1-280" is too broad). |
| Every result references File/Symbol/Import/Line? | ⚠️ Partial | 2.2 layer-id-cards has full refs. 2.3-2.6 use module-level refs. Some lack symbol-level precision. |
| Any claim without Evidence? | ❌ Yes | 2.3 REPORT mentions "campaignStore has 7 responsibilities" without listing each with line numbers. 2.6 "TurnCallbacks" hidden channel mentioned but not fully traced. |

**Verdict: ⚠️ Needs improvement** — 3 claims need tighter evidence.

### 2. Coverage

| Check | Status | Notes |
|-------|--------|-------|
| All repository layers covered? | ✅ Yes | 10 layers identified in 2.2/layer-id-cards.md |
| All modules examined? | ✅ Yes | 278 non-test files scanned (2.3/RAW_DATA.json) |
| All State ownership documented? | ✅ Yes | 67 state types in 2.3/state-ownership.json |
| All imports traced? | ✅ Yes | 663 cross-layer edges in 2.2/raw-data.json |
| All exports classified? | ✅ Yes | 594 exports in 2.4/RAW_DATA.json |
| All interactions mapped? | ⚠️ Partial | 114 import-based interactions mapped. Callback-based interactions (TurnCallbacks) not fully traced — noted as "hidden channel" in 2.6 but not exhaustively documented. |
| Dynamic imports covered? | ✅ Yes | 2.2/runtime-graph.md covers all dynamic imports |

**Verdict: ⚠️ Needs improvement** — TurnCallbacks hidden channel needs full tracing.

### 3. Consistency

| Check | Status | Notes |
|-------|--------|-------|
| Diagrams match Raw Data? | ✅ Yes | Layer map (2.2) matches raw-data.json counts. Capability map (2.4) matches RAW_DATA.json module counts. |
| Contradictions between 2.2-2.8? | ⚠️ Minor | 2.2 reports "services → store: 0" (non-test). 2.6 reports "18 state→service violations". These are not contradictory — they measure different directions. But the terminology could be clearer. |
| Capabilities extracted from code? | ✅ Yes | All 18 capabilities in 2.4 have file+export evidence. None are assumed from memory or pattern. |
| Boundaries from code? | ✅ Yes | All 5 boundaries in 2.7 have import graph evidence. |
| Incremental rule followed? | ❌ No | 2.3 contains ownership analysis (belongs to 2.5). 2.5 contains some interaction analysis (belongs to 2.6). 2.8 repeats findings from 2.2-2.7 instead of only reviewing. |

**Verdict: ❌ Needs correction** — Incremental rule violated. Steps overlap.

### 4. Completeness

| Check | Status | Notes |
|-------|--------|-------|
| Open Questions registered? | ✅ Yes | Each step has "Open Questions" section. 17 total across 2.2-2.8. |
| Unknowns registered? | ✅ Yes | Each step has "Unknowns" section. 12 total. |
| Boundary counter-evidence? | ⚠️ Partial | BV-5 (Turn Pipeline) has counter-evidence ("already clean"). BV-1 through BV-4 only have supporting evidence — no counter-evidence explored. |
| Interaction completeness? | ⚠️ Partial | Import-based interactions complete. Callback-based interactions (TurnCallbacks) not fully documented. Happy path flows documented; error/edge flows not. |
| All test files accounted for? | ✅ Yes | Test-only leaks documented in 2.2/violations.md (4 files). |

**Verdict: ⚠️ Needs improvement** — Counter-evidence for boundaries + callback interactions.

### 5. Readiness

| Question | Answer |
|----------|--------|
| Is Discovery complete? | ⚠️ Mostly — 3 gaps identified |
| If not, what must be re-discovered? | (1) TurnCallbacks full tracing, (2) campaignStore responsibility line-level evidence, (3) Incremental rule corrections |
| Is Knowledge Base sufficient for Phase 3? | ⚠️ Conditional — sufficient for BV-1 (State/Domain) and BV-2 (Persistence) work. Not sufficient for BV-4 (NPC split) until counter-evidence is explored. |

---

## Gaps Found

| # | Gap | Severity | Affected Steps | Fix |
|---|-----|----------|---------------|-----|
| G1 | TurnCallbacks not fully traced | 🟡 Medium | 2.6 | Trace all 20+ callbacks in turnTypes.ts |
| G2 | campaignStore "7 responsibilities" lacks line-level evidence | 🟡 Medium | 2.3, 2.5 | List each responsibility with exact line range |
| G3 | Incremental rule violated — steps overlap | 🟡 Medium | 2.3, 2.5, 2.8 | Refactor reports to be delta-only |
| G4 | No counter-evidence for BV-1 through BV-4 | 🟢 Low | 2.7 | Explore "why this boundary might be wrong" |
| G5 | Error/edge interaction flows not documented | 🟢 Low | 2.6 | Document at least 1 error flow |

---

## Gate Verdict

### CONDITIONAL PASS

Discovery is substantially complete. The Knowledge Base (20 artifacts,
~13,000 lines) provides sufficient evidence for the primary
architectural findings:

- BV-1 (State vs Domain): 25 violations, 15 misplaced responsibilities
- BV-2 (Persistence vs State): 7 scattered files, no gateway
- BV-3 (UI vs Logic): 3 minor violations
- BV-5 (Turn Pipeline): clean, no change needed

3 gaps must be addressed before Phase 3 work on BV-4 (NPC split):
- G1: TurnCallbacks tracing
- G2: campaignStore line-level evidence
- G4: BV-4 counter-evidence

G3 (incremental rule) should be corrected but does not block Phase 3.

---

## Conditions for PASS

- [ ] G1: TurnCallbacks fully traced (all callbacks mapped)
- [ ] G2: campaignStore responsibilities with line-level evidence
- [ ] G4: At least one counter-evidence explored for BV-4

G3 and G5 are recommended but not blocking.

---

## What This Gate Did NOT Do

- Did NOT approve any Design
- Did NOT decide port structure
- Did NOT decide split order
- Did NOT approve any Refactor
- Did NOT answer "should we merge/split X"

All Design decisions belong to Phase 3.
