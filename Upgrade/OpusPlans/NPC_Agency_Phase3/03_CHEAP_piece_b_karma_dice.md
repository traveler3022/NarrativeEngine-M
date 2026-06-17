# 03 — Piece B: karma dice + degrees of success  🟢 CHEAP (Gemini Flash 3.5)

**Task:** Pure functions for the §9.6 resolution roll. **No LLM, no store writes.** Create
`src/services/npc/agencyDice.ts`. Import knobs from `agencyConstants.ts` (01).

## Spec (§9.6 — LOCKED)
Two orthogonal mechanics, kept apart:
- **Degrees band** (how it reads) — d20 + mods vs DC, 6 bands by margin:
  ```
  roll = d20 + mods ;  margin = roll − DC
  Critical Success : nat 20  OR margin ≥ +10
  Success          : margin +3 … +9
  Success, but…    : margin  0 … +2
  Fail, but…       : margin −1 … −3
  Failure          : margin −4 … −9
  Critical Failure : nat 1   OR margin ≤ −10
  ```
- **Karma nudge** (how hard) — per-GOAL, hidden:
  ```
  on resolve: Fail/Crit-Fail → failStreak += 1 ; any Success-tier → failStreak = 0
  karma_bonus = min(failStreak × KARMA_PER_FAIL, KARMA_CAP)   // applied to NEXT roll's mods
  ```

## Functions
```ts
export type Band = 'critSuccess'|'success'|'successBut'|'failBut'|'fail'|'critFail';

export function rollGoal(goal: Goal, dc: number, extraMods?: number, rng?: () => number):
  { nat: number; roll: number; margin: number; band: Band };

export function bandFromMargin(nat: number, margin: number): Band;     // nat 20/1 override the table

// Returns the UPDATED failStreak after a resolve (Success-tier resets to 0, else +1). Pure.
export function nextFailStreak(prev: number, band: Band): number;

export function karmaBonus(failStreak: number): number;                // min(streak×PER_FAIL, CAP)
```

## Two exceptions (enforce — §9.6)
1. **Hard gate is pre-roll and does NOT build karma.** A `faithful`-locked target → caller returns a
   `blocked` outcome WITHOUT calling `rollGoal`; `failStreak` untouched. Karma moves difficulty, never
   permission. (Gate logic lives upstream in 10; this module must not mutate streak on blocks.)
2. **Envelope caps the crit.** `rollGoal` reports the band only; it must NOT cross a growth tier.
   Crit Success may set `justifiedEventFlag` (Piece C consumes it) — expose that as a returned hint,
   don't mutate.

## Rules
- Pure; injectable `rng` (default `Math.random`). `d20 = floor(rng()*20)+1`.
- Per-GOAL streak (not per-NPC). Functions take/return values; the store write happens in wiring (10).

## DONE =
- `agencyDice.ts` exports the above; nat-20/nat-1 overrides correct; karma caps at `KARMA_CAP`;
  deterministic under injected `rng`; `npm run build` green. (Tests in 11.)
