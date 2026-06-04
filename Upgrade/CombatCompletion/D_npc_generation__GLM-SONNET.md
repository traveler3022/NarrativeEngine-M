# Phase D — Combat-Aware NPC Generation (AI gear path)

## Problem
NPC generation assigns only **two** combat fields. `npcGeneration.ts:208–213` sets `combatTier` + `archetype` and nothing else. Consequences:
- Named NPCs have **no base stats** → `combatSlice.ts:48` falls back to all-10s, so a generated "feared assassin" is mechanically a blank slate.
- No `equippedWeapon`, no `knownSkills`, no `inventory` → after Phase B's gear resolution exists, generated combatants still walk in **unarmed with no skills**.
- No `overrides` → no personality-driven combat behavior for the Phase A cascade to use.

The qualitative judgment (tier/archetype) the AI is good at is wired; the expansion to a concrete loadout is not.

## Spec reference
`docs/COMBAT_MODE_PLAN.md` **A2** (tier × archetype → budget), **A3** (compendium references), **A7** (overrides). The `COMBAT_TIER_ARCHETYPE_RUBRIC` already exists in `npcDetector.ts:273` and is injected into the generation prompt — extend that approach.

## Depends on
**Phase B** — gear resolution must exist so generated loadouts actually do something.

## Model tiers
- **Opus:** design the generation-prompt additions + the compendium-reference contract (how the AI names a weapon/skill that maps to an `ItemDef`/`SkillDef`, creating one on demand if absent). Write the validation contract.
- **GLM 5.1 / Sonnet:** wire generation + on-demand def creation.
- **Gemini Flash 3.5:** scaffold the JSON schema fields + validation boilerplate against pinned tests.

## Build

### 1. Base stats at gen-time — `npcGeneration.ts`
For combat-relevant NPCs, set `stats` from the `ARCHETYPE_BUDGETS[archetype]` baseline (`combatEngine.ts:274`) scaled by `combatTier`, with optional AI nudge (±a point or two for flavor). Don't ask the AI for raw numbers — derive from the budget table and let it pick *emphasis* (a bounded label) if anything. Purely-social NPCs keep omitting combat fields (store backfills defaults).

### 2. Starting loadout — AI picks, compendium backs it
Extend the generation prompt (alongside `COMBAT_TIER_ARCHETYPE_RUBRIC`) to emit a bounded loadout:
- `equippedWeapon`: a weapon name/archetype-appropriate label.
- `knownSkills`: 0–3 skill names suited to archetype/tier.
- `inventory`: optional extra items.
On parse, **resolve or create** `ItemDef`/`SkillDef` entries: if a matching def exists in the campaign compendium, reference its id; else create one from a bounded template (rarity/dice budget keyed to `combatTier` per A3, anti-inflation) and store via `itemSlice`/`skillSlice` CRUD. The NPC entry stores **ids**, not inline defs.

### 3. Overrides (optional, bounded) — `npcGeneration.ts`
Optionally seed 0–1 `overrides` from the bounded trigger/action vocab Phase A defines (e.g. a bodyguard → `onAllyBelow(30)→guard`). Keep it conservative; omit if uncertain.

### 4. Detector enrichment — `npcDetector.ts`
Ensure combat-relevant detection still routes to generation; no behavior regression for social NPCs.

## Files
- **Modify** `src/services/npc/npcGeneration.ts` (stats derivation, loadout assignment, def creation calls).
- **Modify** `src/services/npc/npcDetector.ts` (rubric/enrichment if needed).
- **Modify** `src/store/slices/itemSlice.ts` / `skillSlice.ts` (on-demand `addItemDef`/`addSkillDef` from templates — CRUD already exists).
- **Create** `src/services/__tests__/npcCombatGeneration.test.ts`.

## Test contract (write FIRST)
- A generated combat NPC has non-default `stats` (not all-10s), a resolvable `equippedWeapon`, and ≥1 resolvable `knownSkill`.
- Created defs land in the campaign compendium and the NPC references them by id.
- Re-using an existing def name links the id instead of duplicating.
- A purely-social NPC still omits combat fields (defaults backfilled later).
- Dice/rarity budget respects `combatTier` (a minion's weapon ≤ an elite's).

## Done when
A freshly generated fighter drops into combat **fully equipped with no manual editing** — stats, a weapon, and skills all resolve through Phase B. `npx vitest npcCombatGeneration` green.

## Watch out
- Don't inflate: weapon/skill dice budgets must key off `combatTier` (A3 anti-inflation), not free AI choice of "legendary sword" for a thug.
- Keep generation a single aux/utility call where possible; don't add round-trips.
- Defs are per-campaign (`items_/skills_${campaignId}`); create in the active campaign only.
