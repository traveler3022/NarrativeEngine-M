# 06 — Heartbeat trigger + proximity roster  🔵 MID (GLM 5.1, Claude-reviewed)

**Task:** The real-time "world breathes" trigger + the region-based cast scan. Bounded stateful logic
— **no formulas (02–05 own those), no LLM.** Create `src/services/npc/agencyHeartbeat.ts`.

## A. Heartbeat — escalating-DC pity timer (§5, §9.3#1)
Mirror the existing `services/engine/engineRolls.ts::rollEngines()` pattern exactly: a DC that
**reduces each player input until it fires, then resets**. All engine, no LLM.
```
DC starts at HEARTBEAT_DC.initial (20), −HEARTBEAT_DC.reduction (5) per input, floor 0.
fire when roll ≥ DC  → reset DC to initial.
```
```ts
export function rollHeartbeat(state: { dc: number }, rng?: () => number):
  { fired: boolean; nextDc: number };
```
- Store the DC on campaign state (mirror `surpriseDC`); decide field name with Claude at wiring.
- On fire: caller picks **one** NPC at random from the proximity roster (total random is fine per
  §9.3#1 — the player forces focus by interacting). A per-NPC `chooseTick` (02) then picks the want.

## B. Proximity roster — region-granularity scan (§9.3#1, §9.4)
A computation that sits **BESIDE** the mention-based `selectActiveNPCs` (`payloadWorldContext.ts`),
not replacing it. Two notions of "active": *mentioned* (payload) vs *present* (agency).
```ts
export function buildProximityRoster(npcs: NPCEntry[], pc: NPCEntry | undefined): NPCEntry[];
```
Include an NPC when (any): **same `region`** as the PC OR **shared affiliation/faction** OR **has a
relation edge** to a present cast member. Exclude `!isAgencyEligible(npc)` (reuse 05/Phase-2 helper),
walk-ons, and fog NPCs. Coarse + stable → moving *within* a region never churns the cast; only
**travel between regions** does (a discrete `bulkNpcUpdate` event — not this WO).

## Rules
- Pure where possible; `rng` injectable. The roster read is indexed/linear over the ledger (the live
  ledger is small/curated — no fancy index needed yet; §9.4 Q1 guards 3–4 are later).
- **Off-screen ticks NEVER assert physical presence in the player's scene** — this WO only *selects*;
  it writes no narration and no presence (§9.3#1).

## DONE =
- `agencyHeartbeat.ts` exports `rollHeartbeat` + `buildProximityRoster`; DC timer mirrors `rollEngines`
  semantics; roster matches the region/affiliation/edge rule and drops ineligible/fog; `npm run build`
  green. (Tests in 11.)
