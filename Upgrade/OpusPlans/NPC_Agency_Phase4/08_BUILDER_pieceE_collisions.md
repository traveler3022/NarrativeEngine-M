# WO-08 — Piece E: event collisions IN PLAYER PROXIMITY 🔵 BUILDER (GLM 5.2) — LIGHT SPEC

> Gate decision (2026-06-17): user wants E, **reframed**. Depends on WO-07 (D). Rough direction; you own
> the design. Opus reviews. Knobs locked: `COLLISION_TANGLE_PROB`, `COLLISION_OPPORTUNITY_BONUS`.

## The reframe (important — not what the original 00_PLAN said)
E is **NOT** autonomous off-screen NPC-vs-NPC life. It is: when two NPCs **in the player's proximity**
are pursuing **coinciding goals**, their *events can tangle* into ONE shared beat the player witnesses.
Scope is strictly proximity-gated — collisions only happen near the player, on the beats they'd already
see. Today the hook exists but is inert: `opportunityBonus` in `goalScore` is always 0
([agencySelection.ts:45](../../src/services/npc/agencySelection.ts)).

## Rough direction (you design the details)
1. **Detect coincidence among PROXIMATE NPCs** (the roster from WO-07 — never the whole ledger). Two
   NPCs "coincide" when their chosen/top goal shares a target: same `region`, or overlapping want/goal
   text (a cheap keyword/normalized match is fine — no LLM, no embeddings). Keep it to **two at a time**.
2. **Roll solo vs. tangled** at `COLLISION_TANGLE_PROB`. If solo, behave exactly as today (no change).
3. **If tangled, tone from the NPC↔NPC `relations` edge:**
   - allies → **cooperate** (both advance / a shared win),
   - rivals → **contest** (contested roll; the loser's failure feeds the winner via `COLLISION_OPPORTUNITY_BONUS` → `opportunityBonus`, §3d),
   - neutral / no edge → mild contest or ego-overreach (pick a sensible default).
4. **Emit ONE shared delta**, not two independent ones — a single beat naming both NPCs (by name, not id),
   routed through the existing digest / timeskip narration (+0 LLM; no new call).

## Where it likely lives
- A pure detector + resolver (e.g. `detectCollision(roster, ...)` / `resolveCollision(a, b, relations, rng)`)
  in the agency layer. Wire into:
  - **real-time** heartbeat beat (`turnPostProcess.ts`): when the picked NPC's goal coincides with another
    proximate NPC's top goal → tangle, adjust the resolution, push a shared delta.
  - **timeskip** (`agencyTimeskipRun.ts`): among the ticked proximate set, detect coinciding pairs → tangle.
- Feed the contested outcome through the existing `opportunityBonus` arg of `goalScore` / a contested roll;
  reuse the Phase-3 dice + band machinery (`rollGoal`, `bandFromMargin`).

## Guardrails
- **Proximity-only.** Never fire for NPCs outside the roster. Two NPCs per collision, max.
- One shared delta out; no double-counting. No raw engine number reaches the payload — word-bands/digest only.
- Pure + seedable rng. All numbers from `agencyConstants.ts`. Skip `isPC`. Budget stays +0 / timeskip +1.

## Acceptance
- `npm run build` green; existing tests stay green.
- Two proximate NPCs with a coinciding goal sometimes tangle (at ~`COLLISION_TANGLE_PROB`); allies
  cooperate, rivals contest with the loser feeding the winner; the player sees ONE combined beat.
- NPCs outside proximity never collide.
- Flash (later WO): coincidence detection, tangle/solo roll, ally-vs-rival tone, single-shared-delta,
  proximity exclusion.
