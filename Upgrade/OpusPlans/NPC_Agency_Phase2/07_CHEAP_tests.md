# 07 — Phase-2 tests  🟢 CHEAP (Gemini Flash 3.5)

**Task:** Unit tests for the deterministic Phase-2 pieces. Tests only — do not modify source.
vitest (`npm run test`); mirror an existing `*.test.ts` for style (e.g.
`src/services/npc/agencyBands.test.ts`). **Do not test LLM helpers** (02/04 inference) — only the
pure logic.

## Cover

### A. Pool draw — `src/services/npc/agencyWantDraw.ts` (work-order 03)
- `drawShortWants`/`drawMediumWants` return the requested `count` when the pool is large enough.
- With `matureMode: false`, **no** returned want corresponds to a `tier:'mature'` pool entry;
  with `matureMode: true`, mature entries are eligible.
- No duplicates within a single draw.
- Deterministic with an injected `rng` (same rng → same result).
- Returns ≤ eligible-pool-size when count exceeds it (no padding/repeats).

### B. Lifecycle — `src/services/npc/agencyLifecycle.ts` (work-order 05)
- `isAgencyEligible`: false for `isPC`, false for `agencyLocked`, false for `condition:'dead'`,
  true for a normal NPC.
- `filterUpdatableNPCs`: keeps on-stage/recently-mentioned eligible NPCs; drops stale + locked.
- `completeShortWant`: removes the satisfied short want, returns a NEW object, leaves medium/long
  untouched, no mutation of the input.

### C. Seed maps (if exported as pure helpers from work-order 04)
- affinity→pcRelation boundary values (15→-3, 30→-2, 45→-1, 50→0, 70→+1, 85→+2, 100→+3).
  (If the map isn't exported standalone, skip C and note it.)

## Rules
- Pure assertions on pure functions. No mocks of providers, no network, no store.
- If a test reveals a real bug, add a `// BUG:` comment and hand back — do not edit source.

## DONE =
- New test files for the pure pieces; `npm run test` green.
