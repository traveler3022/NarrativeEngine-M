# NPC Agency — Phase 3 Build Index (Tick engine) — 🟢 GATE OPEN

> Spec: `../dynamic_world__npc_agency__arc_direction__DESIGN.md` §5, §9.0, §9.3, §9.5–9.8
> (formulas A–E, LOCKED). Supersedes `00_BUILD_INDEX_GATED.md`.
> Phase 1+2 are DONE (`../NPC_Agency_Phase1/`, `../NPC_Agency_Phase2/`). They were always
> **infrastructure** — NPCs now carry wants/hexagon/traits/region but **do not act on their own**.
> Phase 3 is the payoff: NPCs *move off-screen*.

## §8 gate — RESOLVED (open)
The gate asked: "if a populated ledger already gives the 'oh', Phase 3 is over-built — stop."
Verdict (2026-06-16, PM): Phase 2 is **characterization only**; the trait *hooks* (vengeful→revenge
goal, ambitious→heat-bias, etc.) are all inert wiring waiting for the tick engine. The "world moves
while I was away" payoff lives entirely in Phase 3. **Build it.**

## Hard discipline (carried from spec — do not violate)
- **Engine emits STATE, never prose.** Numbers stay engine-internal; the LLM sees word-bands + the
  digest + the ONE timeskip narration call. (§9.5 agnostic boundary)
- **Call budget (§9.0):** normal turn **+0** (digest folds into the existing GM call), seam **+0**,
  timeskip **+1** batched. No per-tick LLM call.
- **Hard gates are pre-roll and do NOT build karma** (§9.6). **Envelope caps crits** — no tier cross
  without `justifiedEventFlag` (§9.6/9.7). **Mature mode = world ceiling; player traits = per-NPC
  floors** (§9.5). Skip `isPC` everywhere (we ratified isPC-only in Phase 2 — no `agencyLocked`).
- **All numbers are tunable knobs** (§9.7/9.8) — centralize them so they can be tuned against real
  data, never scatter magic numbers across pieces.

## Why Phase 3 farms WELL
Unlike Phase 2 (LLM-prompt heavy), the tick engine is mostly **exact pure functions** — the formulas
are fully specced with numbers. So pieces A–D are Cheap, the heartbeat/roster is Mid, and Strong is
reserved for the Goal-record contract, the two LLM touchpoints (scene-stakes tag, timeskip
narration), the digest/surfacing, and pipeline wiring.

## Model legend
| Tier | Model | Use for |
|---|---|---|
| 🟣 STRONG | Opus / Claude | Contract, LLM prompts, surfacing, pipeline wiring (high blast radius) |
| 🔵 MID | GLM 5.1 | Bounded stateful logic (heartbeat timer, roster scan), reviewed by Strong |
| 🟢 CHEAP | Gemini Flash 3.5 | Exact pure formula functions (A–D) + tests |

## Work-orders
| # | File | Piece | Spec | Tier | Depends |
|---|---|---|---|---|---|
| 01 | `01_STRONG_goal_contract.md` | Goal record shape; want-string→Goal upgrade; migration; knobs module; ratify decisions | §9.6 | 🟣 STRONG | Phase 2 ✓ |
| 02 | `02_CHEAP_piece_a_selection.md` | neglect heat, score(), drive_mult, context_allow, color roll | §9.5 | 🟢 CHEAP | 01 |
| 03 | `03_CHEAP_piece_b_karma_dice.md` | d20 vs DC, 6-band margin, failStreak, karma_bonus, envelope cap | §9.6 | 🟢 CHEAP | 01 |
| 04 | `04_CHEAP_piece_c_progress_quota.md` | progress increments, quota, tier-cross needs justifiedEventFlag | §9.7 | 🟢 CHEAP | 01,03 |
| 05 | `05_CHEAP_piece_d_timeskip_curve.md` | log2 tick budget; allocate to hottest goals; per-tick tempo CEILING | §9.7 | 🟢 CHEAP | 01 |
| 06 | `06_MID_heartbeat_roster.md` | escalating-DC pity timer (mirror `rollEngines`); region/affiliation/edge proximity roster | §5, §9.3#1 | 🔵 MID | 01 |
| 07 | `07_STRONG_scene_stakes_tag.md` | GM emits `calm/tense/dangerous`; cheap fallback classifier; fallback-rate telemetry | §9.3#2 | 🟣 STRONG +🟢 | — |
| 08 | `08_STRONG_timeskip_detect_narrate.md` | regex+confirm timeskip detect; ONE batched "what you return to" narration | §5, §9.0 | 🟣 STRONG +🟢 | 01,04,05 |
| 09 | `09_MID_digest_surfacing.md` | pre-GM digest; debug view (all) vs player view (Direct/Report; Hidden silent) | §9.3#7 | 🔵 MID /🟣 | 02,03,04 |
| 10 | `10_STRONG_pipeline_wiring.md` | heartbeat→turn pipeline; trickle +0, timeskip +1; wire A–D + gates; state-delta writes | §9.0, §5 | 🟣 STRONG | all |
| 11 | `11_CHEAP_tests.md` | pure-formula coverage A–D, curve, karma streak, quota tier-cross | — | 🟢 CHEAP | 02–05 |

## Sequence — MVP-first (the timeskip vertical slice ships first, §8)
The MVP trigger is **time-skip** (§5: highest value, most bounded). Build the smallest end-to-end
slice that makes "3 weeks forging → the world changed" real, then add the real-time trickle path.

1. **Claude ratifies + commits 01** (Goal contract + knobs module).
2. **Formulas in parallel:** 02 (A), 03 (B), 05 (D) by Flash; 04 (C) by Flash after 03. Claude reviews.
3. **MVP slice:** 08 (timeskip detect+narrate, Claude) wires 04+05 → first playable "world moved" beat.
   Wire it into the pipeline minimally (10, timeskip-only) so it can be playtested.
4. **GATE-CHECK the MVP** (playtest one timeskip). If the batched "what you return to" beat lands,
   proceed; if not, tune knobs (01 module) before building more.
5. **Real-time path:** 06 (heartbeat+roster, GLM), 07 (scene-stakes, Claude), 09 (digest, GLM/Claude),
   then 10 finishes full wiring (trickle +0).
6. **Flash 11 tests throughout** (A–D are exact → high-value). Claude runs full `npm run build` + test.

## Existing code to EXTEND / REUSE (do not reinvent — grounded 2026-06-16)
- `services/engine/engineRolls.ts::rollEngines()` — the **escalating-DC pity-timer pattern** to mirror
  for the heartbeat (DC reduces each turn until it fires, then resets). Same `surpriseConfig`-style
  `{initialDC, dcReduction}` config shape lives on `GameContext`.
- `services/npc/agencyWantDraw.ts` — short/medium pool draws (Phase 2). Reuse for need flavor + want
  successors; **shorts never cost an LLM call** (§9.4 Q2).
- `services/npc/npcGeneration.ts::populateAgencyFields()` — the lazy-migration backbone; **extend it**
  to also upgrade `wants.medium/long` strings → Goal records on first tick (§9.6 seam).
- `services/turn/turnPostProcess.ts` — where Phase-2 agency hooks already live (the `NPC-Validate`
  background task); the heartbeat + digest wire in **beside** them.
- `services/npc/agencyBands.ts` — band formatters; add any new word-bands here (e.g. goal-state).
- `services/npc/agencyLifecycle.ts` — `isAgencyEligible` / proximity filtering seed; extend for roster.

## After Phase 3
Playtest the "world moved while I was away" beat. Then revisit **System (2): Arc Direction / the
Oracle** (§4) — the separate relief-valve system, intentionally out of scope here.
