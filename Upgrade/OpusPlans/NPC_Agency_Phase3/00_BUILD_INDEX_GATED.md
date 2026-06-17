# NPC Agency — Phase 3 Build Plan (Tick engine) — ⛔ GATED

> Spec: `../dynamic_world__npc_agency__arc_direction__DESIGN.md` §9.5–9.8 (formulas A–E, LOCKED).
> This is the **tick engine** — what makes NPCs act off-screen. It is the big one, but the design
> is DONE; this is implementation against an exact spec.

## ⛔ WHY THIS IS GATED — do not start yet
Two gates stand between here and building:
1. **The §8 decision gate** (after Phase 2). If a populated ledger already gives the "oh," Phase 3
   may be over-built. Don't build it on spec — build it because Phase 2 felt inert.
2. **Contract not frozen.** Phase 3's central data shape — the §9.6 **Goal record** (heat,
   failStreak, progress, quota, justifiedEventFlag) — is an *upgrade* of the Phase-2 want strings.
   That upgrade can only be designed correctly once Phase 2 ships and we see real want data. The
   formulas are also "tunable against real data" (§9.7/9.8 flag every number).

**So this file is a PLAN (pieces + tiers), not a set of self-contained work-orders.** The detailed
handoffs get written when the gate opens — same way Phase 2 wasn't detailed until Phase 1 shipped.

## Encouraging note: Phase 3 farms WELL
Unlike Phase 2 (LLM-prompt heavy), the tick engine is mostly **exact pure functions** (the formulas
are fully specced with numbers). So a lot is Cheap/Mid with Claude review. The Strong parts are the
Goal-record contract, the two LLM touchpoints (scene-stakes tag, time-skip narration), surfacing,
and pipeline wiring.

## Planned pieces → tiers (preview)
| Piece | What | Spec | Tier |
|---|---|---|---|
| Goal record + upgrade | string wants → Goal objects (hidden cols); migration | §9.6 | 🟣 STRONG |
| Heartbeat trigger | escalating-DC pity timer (reuse surprise/encounter DC-reduction) | §9.3 hole1, §5 | 🔵 MID |
| Proximity roster | region/affiliation/edge indexed scan (beside mention-based select) | §9.3 hole1, §9.4 | 🔵 MID |
| Piece A — selection | neglect heat score, drive_mult, context_allow, color roll | §9.5 | 🟢 CHEAP |
| Piece B — karma dice | d20, 6-band margin table, per-goal failStreak nudge | §9.6 | 🟢 CHEAP |
| Piece C — progress quota | progress increments, tier-cross needs justifiedEventFlag | §9.7 | 🟢 CHEAP |
| Piece D — timeskip curve | log2 ticks budget, allocate to hottest goals | §9.7 | 🟢 CHEAP |
| Scene-stakes tag | GM emits calm/tense/dangerous (+ cheap fallback classifier) | §9.3 hole2 | 🟣 STRONG + 🟢 CHEAP |
| Timeskip detect + narrate | regex+confirm detect; ONE batched "what you return to" call | §5, §9.0 | 🟢 CHEAP + 🟣 STRONG |
| Digest + surfacing | debug view (all) vs player view (Direct/Report; Hidden silent) | §9.3 hole7 | 🔵 MID / 🟣 STRONG |
| Pipeline wiring | heartbeat into turn pipeline; +0 normal turn, +1 timeskip | §9.0 | 🟣 STRONG |
| Tests | pure-formula coverage (A–D are exact → high-value tests) | — | 🟢 CHEAP |

## Hard rules carried from spec (don't violate when building)
- **Engine emits STATE, never prose.** Numbers stay engine-internal; LLM sees word-bands + the one
  narration call.
- **Call budget:** normal turn +0, seam +0 (folded into existing GM call), timeskip +1 batched.
- **Hard gates are pre-roll and don't build karma** (§9.6). **Envelope caps crits** — no tier
  cross without `justifiedEventFlag` (§9.6/9.7). **Mature mode = world ceiling; player traits =
  per-NPC floors** (§9.5).

## Entry point when the gate opens
Re-read §9.5–9.8, freeze the Goal-record contract against real Phase-2 data, then split into
`01_STRONG_goal_contract`, the Cheap formula pieces (A–D), etc. — mirror the Phase-1/2 folder shape.
