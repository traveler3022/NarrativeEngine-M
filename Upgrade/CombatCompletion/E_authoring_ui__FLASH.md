# Phase E — Authoring UI (manual gear path)

## Problem
No way to hand-author combatants or content. Current state:
- `NPCEditForm.tsx` exposes `isPC`, `combatTier`, `archetype`, `equippedWeapon`, `knownSkills` — but **not** the 6 base stats, the full `inventory[]`, `condition`/`lastCondition`, or `overrides[]`. The stats exist on the type but there's no editor, so a user can't tune a combatant.
- There is **no Item/Skill Compendium UI at all**. Users can't create or edit weapons/skills except in code. Only 3 hardcoded `CANON_SKILL_DEFS` exist (`skillSlice.ts`).

This is the manual counterpart to Phase D's AI path — together they satisfy "both AI and manual."

## Spec reference
`docs/COMBAT_MODE_PLAN.md` **A9** (HUD pulls from ledger gear), **A3** (compendium as editable definitions). The HUD already reads `equippedWeapon`/`knownSkills`/`inventory` (`CombatHUD.tsx:68–83`), so populating them via UI immediately shows up in the ATK menu.

## Depends on
**Phase B** — compendium schema (`ItemDef`/`SkillDef` fields) must be stable so the editors target the right shape.

## Model tiers
- **Gemini Flash 3.5:** the forms and CRUD panels (pattern-replication UI work).
- **GLM 5.1 / Sonnet:** store wiring + any cross-component plumbing.
Pin both with the test contract first.

## Build

### 1. NPCEditForm combat section — `NPCEditForm.tsx`
Add to the existing combat block:
- **6 base-stat inputs** (VIT/PWR/SPD/RES/WIL/FOC) — number inputs or steppers (8–20 D&D range), with derived previews (AC, maxHP, maxFOC) computed via the engine helpers for instant feedback.
- **Inventory editor** — add/remove items referencing the Item Compendium (id picker), beyond the single `equippedWeapon`.
- **Condition display** — show `condition`/`lastCondition`/`lastSeenTimestamp` (read-mostly; editable `recoveryNote`).
- **Overrides editor** — add/remove `{trigger, action}` rows, both chosen from the **bounded vocab** Phase A defines (dropdowns, not free text).

### 2. Item Compendium UI — `src/components/combat/ItemCompendium.tsx` (new)
CRUD panel over `itemSlice` (`setItemCompendium`/`addItemDef`/`updateItemDef`/`removeItemDef`). Fields per `ItemDef`: `damageDice`, `scalingStat`, `bonus`, `properties[]`, `range`, `rarity`. Rarity → dice-budget hint (A3). Per-campaign.

### 3. Skill Compendium UI — `src/components/combat/SkillCompendium.tsx` (new)
CRUD over `skillSlice`. Fields per `SkillDef`: `focCost`, `type`, `damageDice|healDice`, `scaling`, `properties[]`, `range`. Seed view shows existing `CANON_SKILL_DEFS`.

### 4. Host the panels
Add a **Compendium** tab/section in the context drawer (extend `EnginesTab.tsx` or add a sibling tab). Reachable while editing campaigns, not mid-combat.

## Files
- **Modify** `src/components/npc-ledger/NPCEditForm.tsx` (stats, inventory, condition, overrides).
- **Create** `src/components/combat/ItemCompendium.tsx`, `src/components/combat/SkillCompendium.tsx`.
- **Modify** a drawer host (`src/components/context-drawer/EnginesTab.tsx` or new tab component) to mount the compendium UIs.
- Reuse existing CRUD in `src/store/slices/itemSlice.ts` / `skillSlice.ts` (no new store methods expected).

## Test contract (write FIRST)
- Edit + persist round-trip: change a stat / add an inventory item / add an override → reload campaign → values retained.
- Compendium CRUD: create/edit/delete an item and a skill → persists under `items_/skills_${campaignId}`.
- HUD reflection: a weapon authored in the compendium and equipped on the PC appears in the HUD ATK menu with correct range.
- Override dropdowns only offer the bounded vocab (no free-text triggers).
- Derived previews (AC/HP/FOC) match engine output for the entered stats.

## Done when
A user can hand-build a combatant (stats + gear + overrides) **and** author a custom weapon/skill entirely in the UI, and it shows up correctly in a fight. Lint + tests green; manual preview confirms HUD reflection.

## Watch out
- Match existing styling tokens (premium dark/light vanilla CSS) and the slice-creator persistence pattern; don't introduce a new state lib.
- Keep editors per-campaign-scoped — defs and NPC gear belong to the active campaign.
- Validate numeric stat ranges; clamp to the 8–20 ability-score band the engine expects.
