# 04 — Lazy migration / backfill  🟣 STRONG (Claude)

**Why Strong:** data-model migration over existing campaigns + LLM inference + pipeline hook.
Getting it wrong silently corrupts saved NPCs. §9.4 hole 6 + supersession map.

## Goal
One function that fills agency fields for un-populated NPCs (`populated` falsy), lazily, on first
use — unifying **old-save migration** AND **big-bang relocation** (graduation). Mirror the
existing `backfillNPCDrives()` (`npcGeneration.ts:629`) and its bg-queue hook
(`turnPostProcess.ts:349`).

```ts
async function populateAgencyFields(provider, msgs, npcs: NPCEntry[], updateNPC): Promise<void>;
```

## Per NPC, fill in this order (cheapest first)
1. **Deterministic seed (no LLM):**
   - `pcRelation` ← map from `npc.affinity` (seed map in `01`). Keep `affinity` field intact.
   - `wants.long` ← `drives.coreWant` (if present); `wants.medium[0]` ← `drives.sessionWant`;
     `wants.short[0]` ← `drives.sceneWant`.
2. **Pool fill (no LLM):** top up `wants.short` to 4 and `wants.medium` to 3 via `drawShortWants`/
   `drawMediumWants` (work-order 03), passing `matureMode`.
3. **LLM inference (one batched call, like backfillNPCDrives):** for fields still empty —
   `personalityHex` (translate `npc.personality` text, work-order 02 helper), `traits` (≤5 from
   vocab inferred from faction + bio), `region` (infer from faction/last-known context;
   §9.4 "Location: Deferred" → infer logically from wants + faction background).
4. Set `populated: true` and persist via `updateNPC`.

## Hooks
- Add to the **existing background queue** beside `backfillNPCDrives` in `turnPostProcess.ts` —
  select NPCs where `!populated` AND agency-eligible AND relevant (cast/proximity; reuse the
  `npcsEligibleForUpdate` style filter from work-order 05). Fog/stale NPCs are NOT populated until
  they matter (§9.4 decouple-from-stale).
- This same function is the `bulkNpcUpdate` entry point for relocation events later.

## Rules
- Never overwrite a field the NPC already has (idempotent; safe to re-run).
- Skip `isPC`/`agencyLocked` NPCs entirely.
- Batched LLM call (all needing-NPCs in one), not per-NPC.

## DONE =
- Legacy NPCs get fully populated on first relevant use; re-running is a no-op; `affinity`/`drives`
  preserved; `npm run build` green; deterministic seed parts covered by tests (07).
