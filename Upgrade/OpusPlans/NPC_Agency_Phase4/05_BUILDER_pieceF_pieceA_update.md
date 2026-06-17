# WO-05 — Piece F + A: migrate `updateExistingNPCs` + hexagon drift 🔵 BUILDER (GLM 5.2) — KEYSTONE

> Depends: WO-01 (supersession map + constants), WO-03 (`hexDelta`). **Do F and A in ONE pass** — they
> touch the same function (`updateExistingNPCs`); splitting them causes a merge conflict and a half-
> migrated parser. This is the single highest-leverage fix in Phase 4: it stops the data model forking.

## The fork (grounded 2026-06-17)
`updateExistingNPCs` ([npcGeneration.ts:420](../../src/services/npc/npcGeneration.ts)) is written against
the PRE-agency model:
- The `[CURRENT NPC STATES]` block sends `Affinity: x/100`, `CoreWant/SessionWant/SceneWant`, free-text
  `Personality` ([:433-463](../../src/services/npc/npcGeneration.ts)).
- The OUTPUT FORMAT + EXAMPLES tell the model to emit `drives` and `affinity` ([:476-500](../../src/services/npc/npcGeneration.ts)).
- The parse switch writes `changes.drives` and raw `affinity` ([:539-546](../../src/services/npc/npcGeneration.ts)).

Meanwhile the engine + play-prompt read `wants`, `personalityHex`, `pcRelation`. So the update keeps
editing dead fields while the live ones go stale. **Fix per the WO-01 supersession map: send + parse the
NEW schema; stop sending/parsing `drives` and raw `affinity`.**

## Build

### A. Rewrite the `[CURRENT NPC STATES]` block (the `npcDatas` builder, ~line 433)
Send the Phase-4 truth, not legacy:
- **Wants** (not drives): `LongWant`, `MediumWants` (join `|`). Do NOT send `short` (no-LLM rotation owns
  it) and do NOT send `CoreWant/SessionWant/SceneWant`.
- **pcRelation band** (not raw affinity): render as a word band (e.g. via `agencyBands`), e.g.
  `Feeling toward PC: Warm (+2)` for the DEBUG-side prompt — but never ask the model for a raw 0–100.
- **personalityHex**: include the current axes so the model can propose a drift. Add `HEX_AXIS_LEGEND`
  (already imported by `populateAgencyFields`) so the model knows the axes.
- **traits**, **region** (for travel), faction/status as today.
- Drop the `if (npc.drives)` block entirely; drop the `Affinity: x/100` line.

### B. Rewrite OUTPUT FORMAT + EXAMPLES + parse
Allowed `changes` keys become: `status, disposition, goals, storyRelevance, personality (flavor text),
voice, appearance, wants (medium/long only), pcRelation, personalityHex, traits, region, relations`.
**Remove `drives` and `affinity` from the allowed list and from every example.**

- **`wants`**: keep the existing medium/long revision logic ([:550-562](../../src/services/npc/npcGeneration.ts))
  — `short` always preserved. Good as-is; just ensure `drives` is gone.
- **`pcRelation` (Piece A delta)**: accept a **delta** `{pcRelation: +1 | -1}` OR an absolute target; clamp
  the applied result to `PC_RELATION_MIN..MAX`, max step `PC_RELATION_MAX_STEP`. Reject anything larger.
  Mirror the band-only rule — never accept a 0–100 number.
- **`personalityHex` (Piece A delta — THE headline)**: accept a **delta map** only, e.g.
  `{personalityHex: {boldness: +1, composure: -1}}`. For each axis, apply via `hexDelta(currentHex, axis,
  delta)` (WO-03) — which itself clamps step + band. **Reject a full hex overwrite** (if the value looks
  like absolute axes rather than small deltas, treat as delta anyway via hexDelta — hexDelta's step-clamp
  makes a "5" become +1, so over-asks are neutralized). Only apply when the NPC already has a
  `personalityHex` (un-populated NPCs get theirs from Piece B first).
- **`relations`**: accept sparse edge add/update; merge into existing `relations` (never wholesale
  replace). Keep it optional/minimal — this is the lowest-priority part; a simple shallow-merge is fine.

### C. Surface the drift as a SHIFT (legibility, §9.4)
Reuse the `previousSnapshot` + `buildDriftAlert` pattern ([npcBehaviorDirective.ts:72](../../src/services/npc/npcBehaviorDirective.ts)).
When a hex axis or pcRelation actually changes, capture the previous value into `previousSnapshot` and
emit a SHIFT word-band via `formatHexShift` / `formatRungBand` (WO-01) so the player/LLM sees
`SHIFT: boldness rising` — **never the integer** in player-facing text (numeric arrow = debug view only).

### D. Engine-resolve nudge (the off-screen drift source)
When a goal resolves in the tick engine (Piece B/C path), map the outcome → a single axis nudge via
`hexDelta`:
- crit-success on a bold/combat goal → `+boldness`
- repeated failure (failStreak) → `−composure`
Keep the mapping tiny and in `agencyConstants` (a small `OUTCOME_AXIS_MAP`). +0 LLM (pure). Wire where
goal outcomes are already applied (agencyProgress / the tick pipeline) — one nudge per resolved goal max.

## Guardrails (carry from Phase 3)
- Deltas only; no full overwrite ever reaches the hex.
- No raw engine number reaches the payload — bands/SHIFT words only.
- +0 call budget: this rides the EXISTING `updateExistingNPCs` call; add no new LLM call.
- New field wins; legacy `drives`/`affinity` are read-only fallback for un-migrated NPCs (Piece B fills).

## Acceptance
- `npm run build` green.
- The prompt never mentions `drives` or a 0–100 affinity; the parser never writes them.
- A hex delta of +1 moves one axis by 1 (clamped); a "+5" request still moves only +1; a full-overwrite
  attempt cannot blow past ±1.
- SHIFT line appears when an axis/pcRelation changes.
- Flash (WO-09): parse tests for legacy-only, migrated, and mixed NPCs; assert no `drives`/raw-`affinity`
  written; hex delta-clamp; SHIFT emitted.
