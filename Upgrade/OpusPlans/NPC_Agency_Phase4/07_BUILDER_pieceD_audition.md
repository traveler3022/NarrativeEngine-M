# WO-07 — Piece D: promotion / audition (keep the active cast small) 🔵 BUILDER (GLM 5.2) — LIGHT SPEC

> Gate decision (2026-06-17): user wants D — the flat "any proximate NPC, random pick" model bloats and
> breaks immersion as the ledger grows. Rough direction below; you own the detailed design. Opus reviews.
> Knobs already locked in `agencyConstants.ts` (`DEEP_TIER_CAP`, `AUDITION_PROB`, `ACTIVITY_*`).

## The problem (grounded 2026-06-17)
Real-time selection today: heartbeat fires → `buildProximityRoster` returns ALL proximate populated
eligible NPCs → **one is picked uniformly at random** ([turnPostProcess.ts:533](../../src/services/turn/turnPostProcess.ts)).
So with a big ledger the player sees a random rotating parade of minor NPCs instead of a small recurring
cast that actually grows. We want most NPCs to stay dormant **props** and only a few to be live **agents**.

## Rough direction (you design the details)
1. **Activity score per NPC.** A lightweight recency signal: bumped when an NPC ticks or is on-stage,
   decays by `ACTIVITY_DECAY` per beat toward 0. **Prefer deriving it from existing signals** (e.g.
   `lastUpdateScene`, `lastSeenTimestamp`, goal `lastAdvancedTick`) if you can; only add an optional
   `agencyActivity?: number` field to `NPCEntry` if deriving is too lossy — and if you do, flag it so
   Opus ratifies the schema add (keep it optional, default-safe, persistence-friendly).
2. **Deep tier = top-K by activity, cap `DEEP_TIER_CAP` (3).** The heartbeat ticks a **deep-tier**
   member preferentially instead of uniformly across the whole roster.
3. **Audition roll.** With prob `AUDITION_PROB`, the beat instead ticks a *background* proximate NPC
   (gives newcomers/dormant props a chance to act). Sustained activity (≥ `ACTIVITY_PROMOTE`) **promotes**
   a background NPC into the deep tier; a deep-tier NPC that goes dormant (≤ `ACTIVITY_RELEGATE`)
   **relegates** out. Membership rotates slowly, not every beat.
4. **Pure + dice-driven, no LLM.** Reuse `buildProximityRoster`. Seedable rng (pass `rng = Math.random`
   default, like `chooseTick`/`rollHeartbeat`) so it's testable.

## Where it likely lives
- A new pure module `agencySelection.ts` companion (e.g. `selectTickTarget(roster, ctx, rng)`), called
  from the heartbeat block in `turnPostProcess.ts` (replacing the `roster[Math.floor(rng()*len)]` pick at
  line ~533). Keep the "one NPC per real-time beat" budget — D changes *who*, not *how many*.

## Guardrails
- Deep tier never exceeds `DEEP_TIER_CAP`. Skip `isPC`. Still exactly one tick per real-time beat (+0 LLM).
- Deterministic given a seeded rng. Don't let promotion thrash (respect the promote/relegate thresholds).
- All numbers from `agencyConstants.ts` — no hardcoding.

## Acceptance
- `npm run build` green; existing tests stay green.
- With a large roster, repeated beats concentrate ticks on a small stable set (≤ cap) — not uniform random.
- An audition occasionally surfaces a background NPC; sustained activity promotes it; dormancy relegates.
- Flash (later WO): deep-tier cap respected, audition fires at ~prob, promote/relegate transitions.

> Build D BEFORE E — E's collision detection operates over the (now-curated) proximate set.
