# 04 — Ledger UI fields  🔵 MID (GLM 5.1; Strong reviews)

**Task:** Surface the new Phase-1 NPC fields in the ledger edit form so a populated ledger is
*visible* (that visibility IS the Phase-1 gate, §9.1). Editing only — no engine logic, no dice,
no generation. Numbers are edited via word-band dropdowns or steppers, never raw if avoidable.

**Prerequisite:** `01_STRONG_types_contract` types must already be committed to `src/types/index.ts`
(`wants`, `personalityHex`, `traits`, `region`, `haunt`, `relations`, `pcRelation`, `populated`)
and the pools file `src/services/npc/agencyPools.ts` (work-order 02) must exist.

## Where
`src/components/npc-ledger/NPCEditForm.tsx` (the existing edit form). Match its existing field
patterns/styling exactly — read the file first and mirror how current fields are rendered/saved.

## What to add (edit controls)
1. **Traits** — a **searchable multi-select dropdown**, max 5, options = `TRAIT_NAMES` from
   `agencyPools.ts`. This is the player's veto (e.g. lock `faithful`). Show each option's `tier`
   (default/mature) as a small badge. Persist to `npc.traits`.
2. **Personality hexagon** — 6 controls (one per axis: drive, diligence, boldness, warmth,
   empathy, composure), each a `-3..+3` stepper or slider that DISPLAYS the word-band label
   (use `hexBand(axis, v)` from `agencyBands.ts`, work-order 03) next to the control. Persist to
   `npc.personalityHex`.
3. **Wants** — three editable groups: short (list), medium (list), long (single text). Simple
   add/remove text rows. Persist to `npc.wants`.
4. **Region / Haunt** — two text inputs. Persist to `npc.region` / `npc.haunt`.
5. **PC relation** — single `-3..+3` stepper showing `relationBand(v)` label. Persist to
   `npc.pcRelation`.
6. **Relations (NPC↔NPC)** — a simple editable list: pick another NPC (dropdown of ledger
   names) + a `-3..+3` value shown as `relationBand` label. Persist into `npc.relations`
   keyed by the target NPC's `id`. (Sparse — only rows the user adds get stored.)

## Rules
- Editing/persistence ONLY. No tick logic, no auto-generation, no formulas.
- Un-migrated NPCs (`populated` falsy) just show empty/default controls — no special migration UI.
- Reuse `hexBand` / `relationBand` / `TRAIT_NAMES` — do not hardcode band words or trait lists.
- Keep raw integers out of the user's face where a band label works; a small numeric stepper
  beside the label is fine.
- Mobile-friendly (this is a Capacitor app) — match existing responsive patterns in the form.

## DONE =
- All 6 field groups editable + persisted; existing form still works;
- `npm run build` (tsc -b) green; `npm run lint` clean on the changed file.
- Hand back to Claude for review before merge.
