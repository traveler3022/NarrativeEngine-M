# 11 — Tests (pure-formula coverage)  🟢 CHEAP (Gemini Flash 3.5)

**Task:** Deterministic unit tests for the exact formula pieces. A–D are fully specced with numbers,
so these are **high-value, low-ambiguity** tests. Use injected `rng` everywhere — no `Math.random`.

## Coverage
- **Piece A (02) `agencySelection`:** `driveMult` band mapping (Driven 1.5 … Listless 0.6);
  `contextAllow` blocks long-goals under `dangerous`, allows medium; `goalScore` = formula exactly
  (neglect grows score for festering goals); `chooseTick` picks highest-score active goal, respects
  color-roll prob with a stubbed rng, returns `need`/`idle` when all blocked.
- **Piece B (03) `agencyDice`:** `bandFromMargin` boundaries (+10 critSuccess, +3/+2 seam, 0…+2
  successBut, −1…−3 failBut, −4…−9 fail, ≤−10 critFail); nat-20/nat-1 overrides; `nextFailStreak`
  resets on any success-tier, +1 on fail/critFail; `karmaBonus` caps at `KARMA_CAP` (3 fails → +6,
  4 fails still +6).
- **Piece C (04) `agencyProgress`:** `progressDelta` per band; `applyBandToGoal` immutability + clamp;
  completion fires only at `progress ≥ quota`; **tier-cross requires BOTH** `progress≥quota` AND
  `justifiedEventFlag` (assert pure accumulation never crosses); crit-fail setback keeps state active.
- **Piece D (05) `agencyTimeskip`:** `ticksForDuration` matches every table row (1wk→2 … 2yr→10 cap);
  `weeks=0 → 0`; `allocateTicks` orders hottest-first and length ≤ budget.
- **Heartbeat (06):** `rollHeartbeat` DC reduces by `reduction` until fire, resets on fire;
  `buildProximityRoster` includes same-region/affiliation/edge, drops ineligible + fog.
- **Migration (01 extension):** want strings → `goalRecords` is idempotent (re-run = no new records),
  preserves `wants` display strings.

## Rules
- One assertion-focused `*.test.ts` per module, mirroring existing `src/services/npc/*.test.ts` style.
- Deterministic: inject `rng`/`now`; never hit network or store.

## DONE =
- All of the above covered; `npm run test` green; no flakiness (no real RNG). Report the count.
