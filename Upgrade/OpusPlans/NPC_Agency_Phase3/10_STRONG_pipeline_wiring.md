# 10 — Pipeline wiring  🟣 STRONG (Claude — do not farm)

**Why Strong:** integrates the whole tick engine into the live turn pipeline. Highest blast radius —
runs on input/post-process every turn. **EXTEND the existing path** (Phase-2 agency hooks already live
in `turnPostProcess.ts`); no parallel engine.

## Wire-ups
1. **Heartbeat (trickle, +0):** on player input (beside `rollEngines`), call `rollHeartbeat` (06). On
   fire → `buildProximityRoster` (06) → pick one random agent → `chooseTick` (02). Resolve the chosen
   goal via the **gate → dice → progress** chain:
   - hard-gate check (trait, pre-roll, no karma) → if blocked, write `blocked`, no roll;
   - else `rollGoal` (03) → `applyBandToGoal` (04) → write deltas via `updateNPC`;
   - emit a `TickDelta` → `buildDigest(view:'player')` (09) → fold into the existing GM call. **+0.**
2. **Timeskip (+1):** detect (08) → `runTimeskip` → batched narration appended at the seam. Advance
   `agencyTick` by the consumed ticks (timeskip), by 1 on a normal heartbeat fire.
3. **Goal upgrade on first tick:** before resolving, ensure the NPC's `wants` strings are upgraded to
   `goalRecords` (extend `populateAgencyFields`, per 01). Idempotent.
4. **Scene-stakes:** read `lastSceneStakes` (07) into `contextAllow` so danger gates long-goals.
5. **Tier gates everywhere:** respect `tierAllows(state.settings.aiTier, …)` for any LLM touchpoints
   (timeskip narration, scene-stakes fallback). Pure-formula ticks cost 0 LLM and run regardless.
6. **Eligibility:** skip `isPC`; only roster (present) NPCs tick; fog NPCs neither tick nor get
   update calls (mirrors the Phase-2 update-relevance gate).

## Guardrails (§9.0)
- **Call budget:** normal turn **+0**, seam **+0**, timeskip **+1** batched. If a wiring path adds a
  per-tick LLM call, it's wrong — re-read §9.3#7 (digest rides the existing call).
- **No Goal field but `text` reaches any payload** — grep the minify/payload paths after wiring.
- Engine writes state deltas; the GM call / timeskip narration are the only prose producers.
- Persisted state grows (goalRecords, agencyTick, heartbeat DC) → confirm save/load + migration round-trip.

## DONE =
- Trickle + timeskip both flow through the ONE pipeline; +0 / +1 budget honored; goals upgrade lazily;
  scene-stakes gates ticks; `isPC`/fog skipped; `npm run build` green; `npm run test` green (update
  affected post-process tests). Playtestable end-to-end.
