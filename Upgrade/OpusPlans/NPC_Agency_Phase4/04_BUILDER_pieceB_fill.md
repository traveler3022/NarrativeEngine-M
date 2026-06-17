# WO-04 — Piece B: field coverage + roster guard + `bulkNpcUpdate` 🔵 BUILDER (GLM 5.2)

> Depends: WO-01 (contract). **No background sweep** (locked): fill stays on-stage-only. This WO makes
> the fill cover EVERY engine-read field, guards the tick engine against unpopulated NPCs, and unifies
> the fill behind one entry point. Highest blast radius (touches persistence) — build carefully, keep
> idempotent.

## Background (grounded 2026-06-17)
- `populateAgencyFields` ([npcGeneration.ts:806](../../src/services/npc/npcGeneration.ts)) already: skips
  isPC, seeds `pcRelation` from `affinity`, tops up wants from pools, batches ONE LLM call for
  hex/traits/region, seeds `goalRecords`, marks `populated:true`, and no-ops on an empty patch. It is
  already idempotent + null-guarded. **Extend it; do not rewrite it.**
- It is called from `turnPostProcess` ([:400](../../src/services/turn/turnPostProcess.ts)) over the
  on-stage `existingNpcsToUpdate` set, behind the `drivesBackfill` tier gate, on a background queue.
- `buildProximityRoster` ([agencyHeartbeat.ts:23](../../src/services/npc/agencyHeartbeat.ts)) filters by
  `isAgencyEligible` + proximity (region/faction/relations) but **NOT `populated`**.

## Build

### 1. Cover the remaining null fields in `populateAgencyFields`
In the per-NPC patch loop (around line 822), add (each null-guarded — never clobber an authored value):
- **`relations`**: if `npc.relations === undefined`, `patch.relations = {}` (explicit sparse seed so the
  roster's `npc.relations` reads never hit undefined).
- **`skillRung`** (WO-01 field): if `npc.skillRung === undefined`, `patch.skillRung = RUNG_DEFAULT` (0).
- **`rungCeiling`**: if `npc.rungCeiling === undefined`, `patch.rungCeiling = RUNG_CEILING_DEFAULT` (3).
  (A future LLM pass may raise the ceiling for high-talent NPCs; default is fine for retroactive fill.)
- Confirm `pcRelation` is covered (it already is, line ~826) — leave as is.

Keep the existing empty-patch no-op (`if (Object.keys(patch).length === 0) continue;`). Re-running over a
fully-populated NPC must still write nothing.

### 2. `populated` guard in `buildProximityRoster` (replaces the sweep)
In the `eligible` filter (line ~23), add: `if (!npc.populated) return false;`. An NPC only enters the
off-screen tick roster after it's been filled (which happens when it first appears on-stage). This is the
correctness fix that lets us drop the background sweep — no unpopulated NPC ever ticks and silently
no-ops. Add a one-line comment citing this WO.

### 3. `bulkNpcUpdate` — the one unifying entry point (WO-01 signature)
Add a thin wrapper (same file as `populateAgencyFields`), exported via `index.ts`:
```ts
export async function bulkNpcUpdate(provider, history, npcs, updateNPCStore, opts): Promise<void> {
  if (opts.needsGeneration) {
    await populateAgencyFields(provider, history, npcs, updateNPCStore, opts.matureMode ?? false);
  }
  // future: non-generation bulk ops (graduation/relocation) branch here.
}
```
This is the call §9.3 hole 6 wants shared with future bulk relocation. Do NOT change the call site in
`turnPostProcess` yet (optional follow-up) — the goal here is one canonical fill path existing.

## Guardrails
- isPC still skipped (already true via `targets` filter).
- Idempotent: re-run over a full ledger = zero `updateNPCStore` calls.
- No new LLM call beyond the existing batched one.

## Acceptance
- `npm run build` green.
- Roster excludes unpopulated NPCs.
- `bulkNpcUpdate({needsGeneration:true})` behaves identically to a direct `populateAgencyFields` call.
- Flash (WO-09): no-op idempotency test over a fully-populated ledger; relations/rung defaults asserted;
  unpopulated NPC excluded from `buildProximityRoster`.
