# 09 — Digest + surfacing (two views)  🔵 MID (GLM) / 🟣 STRONG (review)

**Task:** Turn engine state-deltas into the pre-GM **digest** and route them to the right view.
No new LLM call — the digest folds into the **existing** GM call (+0, §9.3#7).

## Spec (§9.3#7 — DECIDED: one digest, two views)
On each heartbeat fire (trickle path), the engine produces deltas. Build a compact digest
("X advanced toward Y; Z suffered a setback") and feed it into the single existing GM call as context
so the GM can weave it in (report / on-visit / "seen from here") — the engine never asserts presence.

**Two views (visibility tiers):**
| View | Contains | Goes to |
|---|---|---|
| **Debug** | EVERYTHING — every roll, tick, score, band, failStreak | DebugPanel (Phase-3 tuning) |
| **Player** | only **Direct / Report** ticks | the GM-call digest (player-facing) |
| **Hidden** | Hidden-tier ticks | state silently (debug-only) — preserves the delayed "holy shit" reveal |

## Build
```ts
export type TickDelta = { npcId: string; goalText: string; band: Band; visibility: 'direct'|'report'|'hidden'; note: string };
export function buildDigest(deltas: TickDelta[], view: 'debug'|'player'): string;
```
- Assign `visibility` per delta from band + goal magnitude (crits/big "but" → direct/report; quiet
  successes on minor goals → hidden). Tunable rubric → keep thresholds in `agencyConstants.ts`.
- **Player digest** = only direct/report, capped (~2–3 lines) so it never floods the GM prompt.
- **Debug digest** = full dump → DebugPanel section (reuse existing debug surfacing).
- Wire the player digest as a context block into the existing GM payload (beside `[ACTIVE NPC
  CONTEXT]`); **+0 calls**.

## Rules
- Hidden ticks reach state but NOT the player digest (no spoiler). Numbers never leave debug — player
  digest is word-band/prose only.
- Trickle path = +0 (digest rides the existing GM call). No standalone generation here.

## DONE =
- `buildDigest` + visibility routing; player digest folds into the GM call (+0); debug view shows
  everything in DebugPanel; hidden ticks silent; `npm run build` + test green.
