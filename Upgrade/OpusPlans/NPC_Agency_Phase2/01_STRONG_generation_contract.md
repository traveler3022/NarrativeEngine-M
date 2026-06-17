# 01 — Phase-2 Generation Contract  🟣 STRONG (Claude / Fable 5)

The shapes + decisions every Phase-2 piece builds against. No formulas (Phase 3).

## ⚠️ ONE MICRO-DECISION NEEDING RATIFICATION
§9.2 #6: "NPCs flagged protagonist/main character never get want updates." Phase 1 has `isPC`
(the player's own character) but **no "authored/locked NPC" flag**. Proposal: add one optional
field `agencyLocked?: boolean` to `NPCEntry` — when true, the engine never generates/updates this
NPC's wants/personality (the player authors them by hand). Excluded from agency = `isPC === true
|| agencyLocked === true`.
> **PM: confirm adding `agencyLocked?: boolean`, or say "use isPC only" for now.**

## Want storage in Phase 2 (LOCKED)
- Fill the Phase-1 `NPCWants` type: **4 short, 3 medium (strings), 1 long (string)**.
- short/medium come from the pools (work-order 03); long is LLM-generated (work-order 02).
- **Stored as plain strings. No Goal records** (that's the Phase-3 seam — see index).

## Deterministic seed maps (no LLM)
Used by migration (04) when upgrading legacy NPCs:
- **affinity (0..100) → pcRelation (-3..+3):** `<=15→-3, <=30→-2, <=45→-1, 46..55→0, <=70→+1,
  <=85→+2, >85→+3`. (Already documented in Phase-1 `01` doc.)
- **NPCDrives → wants seed:** `coreWant → wants.long`, `sessionWant → wants.medium[0]`,
  `sceneWant → wants.short[0]`. Don't blank existing drives; keep `drives` field intact.

## matureMode source
A boolean app setting (default **OFF**). Phase 2 reads it to gate pool `tier`. If the setting
doesn't exist yet, add `matureMode?: boolean` to `AppSettings` (default false) — Claude decides at
wiring (06). Pool draw (03) takes `matureMode` as a parameter; it does not read settings directly.

## Integration target (Q2 DECISION = EXTEND, not parallel)
- New NPCs → extend `generateNPCProfile()` (`npcGeneration.ts:97`).
- Existing NPCs → extend `updateExistingNPCs()` (`npcGeneration.ts:283`).
- Legacy fill → mirror `backfillNPCDrives()` (`npcGeneration.ts:629`) into a generalized
  `populateAgencyFields()` (work-order 04), reusing the existing bg-queue hook
  (`turnPostProcess.ts:349`).

## New helper signatures (the contract the other files implement)
```ts
// 03 (pure, no LLM)
function drawShortWants(opts: { matureMode: boolean; traits: string[]; count?: number }): string[];
function drawMediumWants(opts: { matureMode: boolean; traits: string[]; count?: number }): string[];

// 02 (LLM)
async function generateLongWant(npc: NPCEntry, ctx: {...}): Promise<string>;
async function translatePersonalityToHex(personalityText: string): Promise<PersonalityHex>;

// 04 (LLM + deterministic seed)
async function populateAgencyFields(provider, msgs, npcs: NPCEntry[], updateNPC): Promise<void>;

// 05 (pure)
function isAgencyEligible(npc: NPCEntry): boolean;     // !isPC && !agencyLocked && relevant
function closeShortWantOnInject(...): ...;             // short want completes immediately, no LLM
```

## DONE =
- `agencyLocked?` (if ratified) + `matureMode?` added to types; `npm run build` green; no behavior
  change yet (contract only). Other files reference these signatures verbatim.
