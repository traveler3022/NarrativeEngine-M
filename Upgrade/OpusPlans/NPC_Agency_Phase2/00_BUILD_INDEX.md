# NPC Agency — Phase 2 Build Index (Generation + lifecycle)

> Spec: `../dynamic_world__npc_agency__arc_direction__DESIGN.md` §9.1–9.4 (Phase-2 rows of §9.2),
> §9.8 (pools, already built in Phase 1). Phase 1 is DONE (`../NPC_Agency_Phase1/`). This phase
> *populates* the schema and maintains want lifecycle. LLM = **generation only**.

## Hard discipline (from §9.1)
**ZERO dice / heat / karma / quota / tick logic.** Those are Phase 3. Phase 2 only: fills
wants/personality/traits/region data, translates personality text → hexagon numbers, closes
finished wants, and gates which NPCs get update calls. If you reach for a heat or progress
formula, STOP — wrong phase.

## The Phase-2 → Phase-3 seam (read before building)
In Phase 2, **medium/long wants are stored as STRINGS** (matching the Phase-1 `NPCWants` type:
`{ short[], medium[], long }`). The §9.6 *Goal record* (base_heat, lastAdvancedTick, failStreak,
progress, quota, justifiedEventFlag) is **Phase 3** — Phase 3 upgrades the medium/long strings
into Goal objects then. **Do NOT create Goal records in Phase 2.** Keep wants as plain text.

## Reality note: Phase 2 farms LESS than Phase 1
Phase 1 was mostly mechanical (transcription, formatters, UI) → lots for Cheap/Mid. Phase 2 is
mostly **LLM-prompt engineering + live-pipeline surgery** → more Strong. That's expected.

## Model legend
| Tier | Model | Use for |
|---|---|---|
| 🟣 STRONG | Opus / Claude | Contract, LLM prompts, migration, pipeline wiring |
| 🔵 MID | GLM 5.1 | Bounded lifecycle logic, reviewed by Strong |
| 🟢 CHEAP | Gemini Flash 3.5 | Deterministic pure functions, tests |

## Work-orders
| # | File | Piece | Tier | Depends on | Status |
|---|---|---|---|---|---|
| 01 | `01_STRONG_generation_contract.md` | Contract: want-storage shapes, seed maps, integration targets, 1 micro-decision | 🟣 STRONG | Phase 1 ✓ | DRAFT — needs ratify |
| 02 | `02_STRONG_llm_generation.md` | Extend generation: long want + hexagon translate + traits + region | 🟣 STRONG | 01 | blocked on 01 |
| 03 | `03_CHEAP_want_pool_draw.md` | Deterministic short/medium pool draw (mature + trait gated) | 🟢 CHEAP | 01 | blocked on 01 |
| 04 | `04_STRONG_lazy_migration.md` | `populated` backfill (mirror backfillNPCDrives), seed from drives, re-home affinity | 🟣 STRONG | 01, 02, 03 | blocked |
| 05 | `05_MID_lifecycle_rules.md` | short-want auto-complete, protagonist exclusion, relevance gating | 🔵 MID | 01 | blocked on 01 |
| 06 | `06_STRONG_pipeline_wiring.md` | Wire 02–05 into existing update path (extend, not parallel) | 🟣 STRONG | 02,03,04,05 | blocked |
| 07 | `07_CHEAP_tests.md` | Tests for pool draw, seed maps, lifecycle, gating | 🟢 CHEAP | 03,04,05 | blocked |

**Sequence:** Claude ratifies+commits 01 → 02 (Claude) & 03 (Flash) & 05 (GLM) run in parallel →
04 (Claude) → 06 (Claude wires) → 07 (Flash tests) → Claude runs full build+test.

## Existing code to EXTEND (do not reinvent — §9.4 + grounded 2026-06-16)
- `generateNPCProfile()` — new-NPC creation (`services/npc/npcGeneration.ts:97`)
- `updateExistingNPCs()` — the auto-UPDATE path (`npcGeneration.ts:283`)
- `backfillNPCDrives()` — legacy backfill already in the bg queue (`npcGeneration.ts:629`) — the
  template for lazy migration
- `turnPostProcess.ts:321–349` — where update + backfill are gated (`tierAllows(...,'npcUpdate')`,
  `npcsEligibleForUpdate`, `npcsNeedingDrives`) and queued

## After Phase 2 — THE DECISION GATE (§8)
> Populate a real campaign's ledger, open an NPC, look at it. Does the living data already give
> the "oh"? If yes, **Phase 3 may be over-built — stop.** If it feels like static character
> sheets, proceed to Phase 3 (tick engine). Phase 3 is planned but **GATED** — see
> `../NPC_Agency_Phase3/00_BUILD_INDEX_GATED.md`.
