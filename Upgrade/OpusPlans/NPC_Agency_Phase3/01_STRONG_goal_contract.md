# 01 — Goal-record contract + knobs  🟣 STRONG (Claude)

The data shapes + tunable constants every Phase-3 piece builds against. Freeze this first; all other
work-orders reference these names verbatim. **No formulas execute here** (that's 02–05) — this is the
contract + the migration that upgrades Phase-2 want strings into Goal records.

## ✅ MICRO-DECISIONS — RATIFIED (PM, 2026-06-16)
1. **Goal records live in a NEW `goalRecords?: Goal[]` field beside `wants`.** `Goal.text` mirrors a
   `wants.medium`/`wants.long` string; `wants` stays player-visible, `goalRecords` is the engine
   layer. (Replace-in-place rejected.) ✅ DONE.
2. **MVP scope = timeskip + heartbeat TOGETHER** before the playtest (PM chose the fuller first cut
   over timeskip-only). Build order in `00_BUILD_INDEX.md` step 3–5 adjusts: land both the timeskip
   slice (08) AND the real-time trickle (06/07/09) through wiring (10) before gate-checking.

## The Goal record (LOCKED shape — §9.6)
```ts
export type GoalHorizon = 'med' | 'long';
export type GoalState = 'active' | 'achieved' | 'blocked' | 'retired';
export type Goal = {
  text: string;                 // ONLY field that reaches the LLM (+ derived word-bands)
  horizon: GoalHorizon;
  tier: 'default' | 'mature';   // content gate
  base_heat: number;            // Piece A
  lastAdvancedTick: number;     // Piece A: neglect = now − this
  failStreak: number;           // Piece B (hidden, NEVER in payload)
  progress: number;             // Piece C
  quota: number;                // Piece C (scales with magnitude)
  state: GoalState;
  justifiedEventFlag?: boolean; // set by Crit Success, consumed by tier-cross (C)
};
```
- **Everything except `text` is engine-internal and never hits the payload.** (Enforce in review:
  no Goal field other than `text` may appear in any payload/minify path.)
- A global tick counter `now` is needed (NPC- or campaign-level monotonic int). Decide storage in
  this WO: proposal = campaign-level `agencyTick: number` advanced by the heartbeat/timeskip.

## The knobs module (single source of truth for tunables)
Create `src/services/npc/agencyConstants.ts` exporting every magic number from §9.5–9.8 so they can
be tuned against real data in ONE place (spec flags every number as tunable):
```ts
DRIVE_MULT = { Driven: 1.5, … Listless: 0.6 }      // §9.5
KARMA_PER_FAIL = 2, KARMA_CAP = 6                   // §9.6
BAND_PROGRESS = { critSuccess:+2, success:+1, successBut:+1, failBut:0, fail:0, critFail:-1 } // §9.6
QUOTA_HINTS = { small:6, medium:10, large:20 }      // §9.7 (seed; LLM/heuristic may refine)
TIMESKIP_K = 1.5, TIMESKIP_CAP = 10                 // §9.7 Piece D
HEARTBEAT_DC = { initial:20, reduction:5, floor:0 } // §5/§9.3 pity timer
COLOR_ROLL_BASE = 0.05                              // §9.5 novelty (higher for eccentric/impulsive)
```

## Migration: want strings → Goal records (extend, don't fork)
Extend `populateAgencyFields()` (Phase 2, `npcGeneration.ts`) — on first tick / first relevant use of
an un-upgraded NPC:
- For each `wants.medium[i]` and `wants.long`, create a `Goal` with `text` = the string,
  `horizon` med/long, `tier` from matureMode/trait gate, `base_heat` seeded (ambitious trait ↑),
  `lastAdvancedTick = now`, `failStreak 0`, `progress 0`, `quota` from `QUOTA_HINTS` by horizon,
  `state 'active'`. **Idempotent**: if `goalRecords` already present, no-op. Short wants are NOT
  goals (no record — they stay pool flavor, §9.5).
- Keep `wants` strings intact (display layer). Don't blank `drives`.

## DONE =
- `Goal`/`GoalHorizon`/`GoalState` (+ `goalRecords?` if ratified) in `types/index.ts`;
  `agencyConstants.ts` exports all knobs; `agencyTick` storage decided + added; migration extension
  upgrades strings→Goals idempotently; `npm run build` green; **no Goal field but `text` reachable by
  any payload path** (grep-checked). No formula logic yet.
