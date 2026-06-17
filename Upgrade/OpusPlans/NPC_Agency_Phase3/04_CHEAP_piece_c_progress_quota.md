# 04 — Piece C: progress-quota (anti-teleport)  🟢 CHEAP (Gemini Flash 3.5)

**Task:** Pure functions for the §9.7 progress/quota + tier-cross rule. **No LLM, no store writes.**
Create `src/services/npc/agencyProgress.ts`. Depends on the `Band` type from 03 + knobs from 01.

## Spec (§9.7 — LOCKED)
A goal completes only at `progress ≥ quota`. The §9.6 band table supplies the increments:
```
Crit Success : progress +2  (may set justifiedEventFlag)
Success      : progress +1
Success, but : progress +1   (+ COST/complication — surfacing concern, not math)
Fail, but    : progress +0   (+ HOOK)
Failure      : progress +0
Crit Failure : progress −1   (setback)
```
`quota` scales with magnitude (QUOTA_HINTS seed: small≈6, medium≈10, large≈20 — tunable).

**Tier-cross rule:** crossing a growth-envelope tier needs **both** `progress ≥ quota` **AND**
`justifiedEventFlag` (set by a Crit Success). Pure accumulation never crosses a tier.

## Functions
```ts
export function progressDelta(band: Band): number;                 // from BAND_PROGRESS

// Apply a resolved band to a goal → NEW goal (immutable). Updates progress (clamped ≥0 unless
// critFail setback), lastAdvancedTick, sets justifiedEventFlag on critSuccess, flips state→'achieved'
// when progress ≥ quota (a normal completion — NOT a tier cross).
export function applyBandToGoal(goal: Goal, band: Band, now: number): Goal;

// Tier cross is a SEPARATE gate (growth envelope). Returns whether this goal may cross now.
export function canCrossTier(goal: Goal): boolean;                 // progress≥quota && justifiedEventFlag

// Consume the flag on an actual cross (returns new goal with flag cleared + progress reset for the
// next rung, per envelope rules). The envelope-rung bookkeeping is owned by wiring (10); this just
// clears the flag safely.
export function consumeTierCross(goal: Goal): Goal;
```

## Rules
- Pure + immutable (return new Goal objects; never mutate input). No store, no LLM.
- `applyBandToGoal` does NOT cross tiers — completion via quota = the goal's own `state:'achieved'`,
  which spawns a successor elsewhere; the growth-envelope tier cross is gated by `canCrossTier`.
- Crit-fail may push `progress` below its pre-roll value but the goal stays `active` (a setback,
  not a deletion).

## DONE =
- `agencyProgress.ts` exports the above; tier-cross requires BOTH conditions; completion fires only
  at `progress ≥ quota`; immutable; `npm run build` green. (Tests in 11 — high value: this is the
  anti-teleport guarantee.)
