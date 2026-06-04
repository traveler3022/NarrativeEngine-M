# Phase B — Compendium & Gear Resolution

## Problem
Gear is dead data. `equippedWeapon`, `knownSkills`, and `inventory` on `NPCEntry` are **never dereferenced** during resolution. The Item/Skill compendiums (`itemSlice.ts`, `skillSlice.ts`) are loaded into the store on campaign switch (`campaignSlice.ts:178`) but no resolution path reads them. Symptoms:
- `combatSlice.ts:53` has the literal `// TODO P2: resolve armor bonus from equippedWeapon/inventory via item compendium` — every combatant is AC `10 + RES` with zero armor.
- `CombatAction.weaponDie` is a raw number; weapon properties/bonus/range from `ItemDef` are ignored.
- Skills don't deduct `focCost` and don't apply `SkillDef` dice/scaling/properties.
- An Excalibur and an iron sword resolve identically.

The HUD *already reads* `equippedWeapon`/`inventory`/`knownSkills` for its ATK menu (`CombatHUD.tsx:68–83`), so the data exists on entries — it's the **engine resolution** that ignores defs.

## Spec reference
`docs/COMBAT_MODE_PLAN.md` section **A3** (compendiums as definitions, ledger references by ID) and **A4** (FOC: deduct on use, no in-combat regen, DEF recovers a little).

## Model tiers
- **Opus:** lock the resolution contract — exactly how an `ItemDef`/`SkillDef` maps into damage dice / bonus / AC / FOC / range / advantage. Write the test contract.
- **GLM 5.1 / Sonnet:** implement the dereference + wiring.

## Build

### 1. Gear resolver — `src/services/engine/gearResolver.ts` (new, pure)
Pure helpers that take def lookups + a combatant/action and return resolved numbers. The engine must stay store-free, so **pass the compendiums in** (don't import the store):
```
resolveWeapon(weaponId | undefined, items: Record<string, ItemDef>): ResolvedWeapon  // {dice, bonus, scalingStat, properties, range}; default fists if none
resolveSkill(skillId, skills: Record<string, SkillDef>): ResolvedSkill | null
resolveArmorBonus(npc: NPCEntry, items: Record<string, ItemDef>): number  // sum/equip-slot armor from equippedWeapon+inventory
```
Define sensible **fallbacks**: no weapon → unarmed (`1d4`, PWR, Close); unknown skill id → null (reject use).

### 2. Use defs in resolution — `combatEngine.ts`
- Attack: damage dice + bonus + scaling stat come from `resolveWeapon`, not raw `weaponDie`. Honor weapon `range` in the existing `checkRangeLegality`.
- Skill use: look up `SkillDef`; **deduct `focCost`** from actor `currentFOC`; reject (return a rejected `ActionResolution` with reason `insufficient_FOC`) if `currentFOC < focCost`. Apply heal/damage dice + scaling + element/properties riders.
- AC: include `resolveArmorBonus` in `computeAC`.

### 3. Resolve armor at materialize — `combatSlice.ts:53`
Replace the TODO: compute `armorBonus` via `resolveArmorBonus(npc, items)` and pass into `computeAC`. Mooks (`materializeCombatant`) can take an `armorBonus` param (it already accepts one — `combatEngine.ts:325`); supply archetype-default armor (bulwark > caster).

### 4. Carry def IDs on actions — action builders
`CombatAction` should carry `weaponId?` / `skillId?` (not just a number). Update the HUD action builder (`CombatHUD.tsx` `buildCombatAction`) and the adjudicator path (`turnOrchestrator.ts:560+`) to pass IDs; the engine resolves them. Keep `weaponDie` as a resolved fallback for tests, but prefer IDs.

## Files
- **Create** `src/services/engine/gearResolver.ts` (+ export in `engine/index.ts`).
- **Modify** `src/services/engine/combatEngine.ts` (attack/skill/AC read resolved gear).
- **Modify** `src/store/slices/combatSlice.ts` (armor at materialize; pass `items` from store into the resolver).
- **Modify** `src/types/index.ts` (`CombatAction` gains `weaponId?`/`skillId?`; confirm `ItemDef`/`SkillDef` carry the fields the resolver reads).
- **Modify** `src/components/combat/CombatHUD.tsx` (action builder passes IDs).
- **Create** `src/services/__tests__/gearResolution.test.ts`.

## Test contract (write FIRST)
- Two weapons with different dice/bonus → different damage distributions.
- Skill use deducts exactly `focCost`; FOC floors at 0; over-cost skill rejected (`insufficient_FOC`).
- Armor raises AC by the equipped bonus; no armor → `10 + RES`.
- Unknown/empty weapon → unarmed fallback; unknown skill id → rejected.
- Range gate intact: a Close weapon at Apart still rejected (regression).
- DEF→FOC recovery (existing `resolveDefendBrace`) unaffected.

## Done when
Two combatants with distinct loadouts resolve measurably differently (damage + AC + FOC), defs flow from compendium → engine, `combatSlice.ts:53` TODO is gone. `npx vitest gearResolution` green; existing combat tests green.

## Watch out
- **Engine purity:** `gearResolver` and `combatEngine` must not import the store. The store (`combatSlice`) reads `s.items`/`s.skills` and passes them in.
- Per-campaign compendiums: defs are keyed `items_/skills_${campaignId}` (`campaignStore.ts:156`). Resolution always uses the active campaign's maps.
- Don't regress the HUD's existing read of `knownSkills`/`equippedWeapon` for menu population.
