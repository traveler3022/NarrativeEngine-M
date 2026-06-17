# 08 — Timeskip detect + batched narration  🟣 STRONG + 🟢 CHEAP — THE MVP SLICE

**Why Strong:** this is the MVP payoff (§5/§8) — "3 weeks forging → the world changed." It runs the
batched off-screen simulation and the single "what you return to" narration. One LLM call, batched.

## Flow
1. **Detect (🟢 cheap/deterministic):** regex + confirm on player input for a time jump
   ("3 weeks later", "after a month", "we rest for a season"). Parse → `weeks` (fractional ok).
   Ambiguous → confirm with the player (reuse an existing confirm affordance); never silently skip.
2. **Budget (Piece D, 05):** `ticks = ticksForDuration(weeks)`; for each rostered agent (06),
   `allocateTicks(...)` to hottest goals.
3. **Simulate (engine only — Pieces B+C, 03/04):** per allocated tick: tempo CEILING roll (a tick may
   fail → no advance), else `rollGoal` → band → `applyBandToGoal`. Hard gates pre-roll (no karma).
   Update `failStreak`, `progress`, `lastAdvancedTick`, `justifiedEventFlag`, `state`. **All state,
   no prose.** Advance `agencyTick`.
4. **Surface (Piece-B band table is the filter, §9.6):** collect crits + both "but" bands as the
   worth-telling deltas; cap output at **≈2 reveals**, rest bank/report (digest, 09).
5. **Narrate (🟣 ONE batched call, +1):** a single "what you return to" generation grounded in the
   capped deltas (word-bands only — no raw numbers). This is the only LLM cost of the whole timeskip.

## Build
- `detectTimeskip(input): { weeks: number } | null` (🟢) + confirm path.
- `runTimeskip(provider, roster, weeks, now, sceneStakes, writeGoal, advanceTick): Promise<TimeskipResult>`
  — orchestrates 05→03→04, returns the capped deltas + the narration string.
- The narration prompt: STRONG — feed the banked deltas as structured word-band facts; ask for a
  cohesive in-fiction "time passes / here's what changed" beat. Validate/parse; fallback to a terse
  deterministic summary if the call fails (never crash the skip).

## Rules
- **Engine emits STATE; the one narration call turns banked deltas into prose** (§9.5 boundary).
- Goals only (needs skipped over months). Allocation hottest-first. Output cap ≈2 (§9.7).
- Idempotent-ish: a detected skip runs once; re-entry must not double-advance ticks.

## DONE =
- A timeskip detected → agents advance off-screen via Pieces B/C/D → ≤2 reveals + ONE batched
  narration; `agencyTick` advances once; build + test green. This WO + minimal wiring (10) = the
  first playtestable "the world moved" beat (the §8 MVP gate-check).
