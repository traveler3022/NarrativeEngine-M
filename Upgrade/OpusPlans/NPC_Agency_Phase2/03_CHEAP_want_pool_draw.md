# 03 — Want pool draw  🟢 CHEAP (Gemini Flash 3.5)

**Task:** Deterministic pure functions that draw short/medium wants from the existing pools. **No
LLM, no network, no dice.** Create `src/services/npc/agencyWantDraw.ts`.

## Source data (already built in Phase 1)
`src/services/npc/agencyPools.ts` exports `SHORT_WANTS` and `MEDIUM_WANTS` (arrays of
`{ text, tier: 'default'|'mature', kind }`). Also `TRAIT_VOCAB` (each trait has a `tier`).

## Functions
```ts
export function drawShortWants(opts: { matureMode: boolean; traits: string[]; count?: number }): string[];
export function drawMediumWants(opts: { matureMode: boolean; traits: string[]; count?: number }): string[];
```
Behaviour:
- Default `count`: short = 4, medium = 3 (caller may override).
- **Tier gate:** if `matureMode` is false, exclude pool entries with `tier === 'mature'`.
- Return the `text` strings (not the objects).
- **No duplicates** within a single draw.
- If the eligible pool is smaller than `count`, return all eligible (don't pad/repeat).
- Pick pseudo-randomly but **purely** — accept an optional `rng?: () => number` (default
  `Math.random`) so tests can inject a deterministic RNG. Do NOT read global state.

> NOTE: per-trait want gating (e.g. a trait that unlocks specific wants) is **Phase 3** — for now
> `traits` only matters in that `matureMode` is the gate. Accept the `traits` param but the only
> rule this phase is the mature-tier gate. (Keeps the signature stable for Phase 3.)

## Rules
- Pure functions; no imports beyond the pools file + types.
- Match code style under `src/services/npc/`.

## DONE =
- `agencyWantDraw.ts` exports both functions; deterministic when given a fixed `rng`;
  `npm run build` green. (Tests live in work-order 07.)
