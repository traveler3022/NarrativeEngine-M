# 05 — Want lifecycle rules  🔵 MID (GLM 5.1; Strong reviews)

**Task:** Small, bounded pure logic for want lifecycle + update eligibility. No LLM, no formulas.
Create `src/services/npc/agencyLifecycle.ts` (pure helpers); wiring into the pipeline is Claude's
job in work-order 06 — you only write the helpers + keep them pure.

## Helpers

### 1. Agency eligibility (§9.2 #6 + §9.4 decouple-from-stale)
```ts
export function isAgencyEligible(npc: NPCEntry): boolean;
```
- Returns false if `npc.isPC` or `npc.agencyLocked` (the player authors those).
- Returns false for clearly-retired NPCs: `condition === 'dead'`, or status indicating gone.
- Otherwise true. (Proximity/recency relevance is applied by the caller with scene data — keep
  this function about the NPC's own flags only.)

### 2. Relevance filter (caller-facing)
```ts
export function filterUpdatableNPCs(
  npcs: NPCEntry[],
  opts: { onStageIds?: string[]; recentlyMentionedIds?: string[] }
): NPCEntry[];
```
- Keep NPCs that are agency-eligible AND (on-stage OR recently mentioned). This is the "don't pay
  to update NPCs the campaign moved past" gate (§9.4). Pure — take ids in, return filtered list.

### 3. Short-want auto-complete (§9.2 #3)
```ts
export function completeShortWant(wants: NPCWants, satisfiedText: string): NPCWants;
```
- A short want, once acted/injected, is **immediately complete — no LLM**. Remove it from
  `short[]` and draw is the caller's concern; this just returns wants minus that entry (and never
  touches medium/long). Returns a NEW object (no mutation).

## Rules
- Pure functions, no side effects, no store/network access, no LLM.
- No heat/karma/progress logic (Phase 3).
- Match code style under `src/services/npc/`.

## DONE =
- `agencyLifecycle.ts` exports the three helpers; `npm run build` green; `npm run lint` clean on
  the file. Hand back to Claude for wiring + review.
