# NPC Agency — Phase 1 Build Index (work-split by AI strength)

> Source-of-truth spec: `../dynamic_world__npc_agency__arc_direction__DESIGN.md` §9 (esp. §9.1–9.4, §9.8).
> This folder is the **build** layer: each file below is a self-contained work-order so pieces
> can be farmed to the right-strength model. The design doc says *why*; these say *build this*.

## The one hard rule: the contract is frozen first

`01_STRONG_types_contract.md` defines the exact TypeScript shapes every other piece is built against.
**It must be ratified + committed before any farmed work starts**, or the cheap models build
against a moving target and nothing integrates. Sequence:

1. Claude locks types (`01`) → user ratifies the 2 flagged micro-decisions.
2. Claude commits the types to `src/types/index.ts`.
3. Farmed pieces (`02`–`06`) run **in parallel**, each referencing the frozen `01`.
4. Claude wires + reviews + runs `npm run build` (tsc -b) green.

Cheap models **cannot see the chat or this reasoning** — every work-order is standalone and
quotes what it needs. Each ends with a "DONE =" bar.

## Model legend (strength tiers)

| Tier | Model | Use for |
|---|---|---|
| 🟣 STRONG | Opus / Claude (me) — Fable 5 also available | Contract, live-pipeline surgery, integration |
| 🔵 MID | GLM 5.1 | Bounded React/native work, reviewed by Strong |
| 🟢 CHEAP | Gemini Flash 3.5 | Mechanical transcription, pattern-copy, tests |

## Phase 1 work-orders

| # | File | Piece | Tier | Depends on | Status |
|---|---|---|---|---|---|
| 01 | `01_STRONG_types_contract.md` | Frozen type shapes (the contract) | 🟣 STRONG | — | ✅ DONE — committed to src/types/index.ts, build green |
| 02 | `02_CHEAP_pool_constants.md` | Trait/want/action pools → constants file | 🟢 CHEAP | 01 ✓ | ✅ DONE — agencyPools.ts (47/57/55), build green |
| 03 | `03_CHEAP_word_bands.md` | 6 hexagon + 1 relation band formatters | 🟢 CHEAP | 01 ✓ | ✅ DONE — agencyBands.ts, build green |
| 04 | `04_MID_ledger_ui.md` | NPCEditForm fields + traits dropdown | 🔵 MID | 01 ✓, 02 ✓ | ✅ DONE — all 6 field groups, build green, lint clean (reviewed) |
| 05 | `05_STRONG_payload_hygiene.md` | Drop aff:50, kill pressure inject, word-bands only | 🟣 STRONG | 01 ✓, 03 ✓ | ✅ DONE — minify+directive+relations, build green (pressure already decoupled, no-op) |
| 06 | `06_CHEAP_tests.md` | Unit tests for formatters + migration | 🟢 CHEAP | 01 ✓, 03 ✓ | ✅ DONE — 17 tests, full suite 926 green (reviewed) |

> **✅ PHASE 1 COMPLETE (2026-06-16).** All 6 work-orders done; `npm run build` green, `npm run test`
> 926/926 green. Schema + UI + payload hygiene shipped. **Next = decision gate (§8):** open the
> ledger on a real campaign, look at a populated NPC, decide whether the living data already gives
> the "oh" or whether to commit to Phase 2 (generation) → Phase 3 (tick engine).

**Discipline reminder (from §9.1):** Phase 1 has ZERO dice / heat / karma / quota / tick logic.
Those are Phase 3. Phase 1 = fields + UI + payload hygiene only. Numbers stored internal,
LLM sees word-bands only. Old data re-homed/seeded, never deleted.

## Later phases (NOT split yet — premature until their contracts freeze)

| Phase | Theme | Lead tier | Split when |
|---|---|---|---|
| 2 | Generation + lifecycle (reuse auto-UPDATE path; med/long cost LLM, short = pool no-LLM) | 🟣 STRONG (prompt eng) | after Phase-1 gate |
| 3 | Tick engine — formulas A–E already specced (§9.5–9.8) | 🔵 MID impl, 🟣 STRONG review | after decision gate (§8) |
| 4 | Scale + integrate (bulk relocation, relations into live call) | 🟣 STRONG | after Phase 3 |

> **Decision gate after Phase 2 (§8):** does a *populated living ledger* already make you want to
> reopen the campaign? If yes, build the Phase-3 ticks. If the cheap version already gives the
> "oh," the heavy machine is over-built. Re-ask before committing to Phase 3.
