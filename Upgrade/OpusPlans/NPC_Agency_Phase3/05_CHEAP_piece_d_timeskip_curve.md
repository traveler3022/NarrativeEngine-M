# 05 — Piece D: timeskip duration → tick budget  🟢 CHEAP (Gemini Flash 3.5)

**Task:** Pure functions for the §9.7 log-curve tick budget + allocation. **No LLM, no store writes.**
Create `src/services/npc/agencyTimeskip.ts`. Knobs from `agencyConstants.ts` (01).

## Spec (§9.7 Piece D — LOCKED)
Three properties at once: total ↑ with duration, effective rate ↓, bounded — only a log does all three.
```
ticks_per_agent = min(TIMESKIP_CAP, round( TIMESKIP_K × log2(1 + weeks) ))   // k≈1.5 cap≈10
```
| Skip | → ticks |
|---|---|
| 1 wk | 2 | 3 wk | 3 | 1 mo | 3 | 3 mo | 6 | 6 mo | 7 | 1 yr | 9 | 2 yr+ | 10 (cap) |

Bindings:
- This is a **CEILING** — each allocated tick still rolls a tempo check (can fail → actual ≤ table).
- **Goals only** — needs are skipped over months.
- **Allocated to hottest goals first** — festering (high-neglect) goals pay off.

## Functions
```ts
export function ticksForDuration(weeks: number): number;     // the log curve, clamped to CAP

// Given an NPC's active goals + now, return an ordered allocation of `budget` ticks to the hottest
// goals first (by goalScore from Piece A). Returns goal ids/indices in spend order (a tick may land
// on the same hot goal more than once). Pure — no rolling here (the tempo CEILING roll is wiring).
export function allocateTicks(goals: Goal[], budget: number, now: number, hexDrive: number,
                              sceneStakes: SceneStakes): number[];   // indices into goals, length ≤ budget
```

## Rules
- Pure; deterministic given inputs. `weeks` may be fractional (≥0); `weeks=0 → 0 ticks`.
- Reuse `goalScore` from Piece A (02) for "hottest" ordering — do not re-derive heat.
- Allocation returns intent only; the per-tick tempo roll + band resolution happen in wiring (10),
  which calls Piece B/C per allocated tick.

## DONE =
- `agencyTimeskip.ts` exports both; curve matches the table rows; allocation orders by descending
  score; `npm run build` green. (Tests in 11 — assert the exact table rows.)
