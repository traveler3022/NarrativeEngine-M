# WO-06 — Piece C: power-rung ladder 🔵 BUILDER (GLM 5.2)

> Depends: WO-01 (`skillRung`/`rungCeiling` fields + RUNG_* knobs + word-bands), WO-03 (`hexDelta` for
> the optional tier-cross nudge), WO-04 (Piece B fills rung defaults). Mostly WIRING — the gate logic
> already exists, nothing calls it.

## Background (grounded 2026-06-17)
- `canCrossTier(goal)` ([agencyProgress.ts:48](../../src/services/npc/agencyProgress.ts)) = `progress >=
  quota && justifiedEventFlag`. `consumeTierCross(goal)` ([:56](../../src/services/npc/agencyProgress.ts))
  clears the flag + resets progress, returns a new Goal. **Both exist; nothing calls them.**
- `justifiedEventFlag` is set by crit-success (already wired in Phase 3). Grinding alone can never cross a
  tier — `canCrossTier` enforces the both-conditions §9.7 rule. Do not weaken this.
- `skillRung` (0..4) / `rungCeiling` (default 3) now exist on `NPCEntry` (WO-01); Piece B defaults them.

## Build

### 1. Wire the tier-cross on goal resolution
Where a goal's outcome is applied after the engine resolves it (the tick pipeline / `agencyProgress`
consumer — same place WO-05's engine nudge hooks), for each resolved goal on an NPC:
```ts
if (canCrossTier(goal)) {
  const next = consumeTierCross(goal);           // returns updated goal (flag cleared, progress 0)
  // persist the updated goal back into npc.goalRecords
  const current = npc.skillRung ?? RUNG_DEFAULT;
  const ceiling = npc.rungCeiling ?? RUNG_CEILING_DEFAULT;
  if (current < ceiling) {
    const newRung = Math.min(current + 1, ceiling);   // +1, never past ceiling
    updateNPCStore(npc.id, { skillRung: newRung, goalRecords: <updated> });
    // SHIFT surfacing (step 2)
  }
}
```
Bump by **+1 only**, clamped to `rungCeiling`. If already at ceiling, still consume the cross (reset
progress) but do not bump — the NPC has hit their talent cap.

### 2. Surface as a word-band SHIFT (no raw number)
On a successful bump, emit `formatRungShift(from, to)` (WO-01) → `SHIFT: Skilled → Expert`, routed the
same way as the hex SHIFT (reuse the `previousSnapshot`/digest surfacing). The GM/payload sees the
**label**, never the integer.

### 3. (Optional, ties to Piece A) one-time hex nudge on tier-cross
A tier-cross may also grant a single `hexDelta(hex, axis, +1)` toward the goal's relevant axis (e.g. a
combat-goal cross → `+boldness`). Reuse the `OUTCOME_AXIS_MAP` from WO-05 so there's one mapping. Keep it
to one axis, +1, clamped. Skip if it complicates the bump — it's a nice-to-have.

## Guardrails
- +1 per justified cross; never past `rungCeiling`; grind-only never crosses (don't bypass `canCrossTier`).
- No raw rung integer in any payload — `RUNG_LABELS` word-band only.
- isPC skipped (no rung on the PC).
- All numbers from `agencyConstants` (RUNG_*).

## Acceptance
- `npm run build` green.
- A goal with `progress>=quota && justifiedEventFlag` bumps the NPC's rung by 1 and clears the flag.
- A goal with progress but no flag (grind) does NOT bump.
- An NPC at `rungCeiling` does not exceed it.
- Flash (WO-09): ceiling-cap test, grind-can't-cross test, flag-consumed-on-cross test, word-band output.
