# 02 — Piece A: tick selection engine  🟢 CHEAP (Gemini Flash 3.5)

**Task:** Pure functions for the §9.5 selection math. **No LLM, no network, no store writes.** Create
`src/services/npc/agencySelection.ts`. Import knobs from `agencyConstants.ts` (01) — never hardcode.

## Spec (§9.5 — LOCKED)
GOALS are the engine, not needs. No global clock; heat is computed lazily **at tick-time only**.
```
neglect = now − goal.lastAdvancedTick
score(goal) = base_heat + neglect × drive_mult × context_allow + opportunity_bonus
drive_mult: from hexagon 'drive' axis band → DRIVE_MULT (Driven ×1.5 … Listless ×0.6)
context_allow = 0 if the scene danger-tag blocks this goal's tier, else 1
```

## Functions
```ts
// drive_mult from an NPC's personalityHex.drive (-3..+3) via band → DRIVE_MULT
export function driveMult(hexDrive: number): number;

// context_allow: 'dangerous' scenes block long-goals (allow medium); 'calm'/'tense' allow all (§9.3#2)
export function contextAllow(goal: Goal, sceneStakes: 'calm'|'tense'|'dangerous'): 0 | 1;

export function goalScore(goal: Goal, now: number, hexDrive: number,
                          sceneStakes: SceneStakes, opportunityBonus?: number): number;

// The tick decision for ONE selected NPC (§9.5 "The tick"):
//   1. context filter  2. COLOR ROLL (novelty, rare)  3. else advance highest-score eligible goal
//   4. needs surface only if all goals blocked or rare flavor roll — NEVER from absence
export type TickChoice =
  | { kind: 'goal'; goal: Goal }
  | { kind: 'color'; }       // trait-bounded novelty whiplash (caller generates via cheap LLM later)
  | { kind: 'need'; }        // pool flavor; no goal eligible
  | { kind: 'idle'; };       // nothing eligible
export function chooseTick(npc: NPCEntry, now: number, sceneStakes: SceneStakes,
                           rng?: () => number): TickChoice;
```

## Rules
- Pure; `rng?: () => number` (default `Math.random`) injectable for tests. No global state.
- Color-roll probability = `COLOR_ROLL_BASE`, raised for `eccentric`/`impulsive` traits; respects
  `matureMode` tier gate when the eventual whiplash is mature-tier (caller enforces; you just roll).
- Only `state === 'active'` goals are eligible. `context_allow === 0` removes a goal from the running.
- Ties → deterministic (highest score, then first by index) so tests are stable.

## DONE =
- `agencySelection.ts` exports the above; deterministic under injected `rng`; knobs imported from
  `agencyConstants.ts`; `npm run build` green. (Tests in 11.)
