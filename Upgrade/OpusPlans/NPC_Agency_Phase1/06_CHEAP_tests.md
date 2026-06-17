# 06 — Phase-1 tests  🟢 CHEAP (Gemini Flash 3.5)

**Task:** Unit tests for the pure, deterministic Phase-1 pieces. Tests only — do not modify source.
Framework = **vitest** (`npm run test`). Match existing test style under `src/` (find a sibling
`*.test.ts` and mirror its imports/structure).

**Prerequisite:** `agencyBands.ts` (03) and `agencyPools.ts` (02) exist and build.

## What to cover

### A. Band formatters (`src/services/npc/agencyBands.ts`)
- `relationBand`: every value -3..+3 returns the locked word
  (-3 Arch-enemy … 0 Neutral … +3 Devoted).
- `relationBand` clamps: -5 → Arch-enemy, +9 → Devoted.
- `hexBand`: for each of the 6 axes, spot-check the extremes (-3, +3) and center (0) against the
  table in work-order 03.
- `hexBand` clamps out-of-range to the nearest end.
- `describeHex`: returns a non-empty string for a full hex object.

### B. Pool integrity (`src/services/npc/agencyPools.ts`)
- `TRAIT_VOCAB`, `WANT_POOL`, `ACTION_POOL` are non-empty and every entry has the required
  keys (`text`, `tier`, plus `hook` for traits / `kind` for wants / `context` for actions).
- `tier` is only `'default'` or `'mature'`; `kind` only `'short'|'medium'`; `context` only
  `'peaceful'|'dangerous'`.
- No duplicate `text` within each pool.
- `TRAIT_NAMES.length === TRAIT_VOCAB.length`; `SHORT_WANTS`/`MEDIUM_WANTS` partition `WANT_POOL`.

## Rules
- Pure assertions on pure functions/data. No mocks, no network, no store.
- Do not edit source files — if a test reveals a bug, note it in the test as a `// BUG:` comment
  and hand back to Claude; do not "fix" source.

## DONE =
- New `agencyBands.test.ts` + `agencyPools.test.ts`; `npm run test` green.
