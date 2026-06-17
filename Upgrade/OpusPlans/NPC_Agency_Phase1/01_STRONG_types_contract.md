# 01 — Phase-1 Types Contract  🟣 STRONG (Claude / Fable 5)

> The frozen interface every other work-order builds against. Lands in `src/types/index.ts`,
> extending `NPCEntry` (~line 402). **Additive only — nothing removed in Phase 1** (old fields
> stay; we re-home/seed, delete code later — §9.4).

## ✅ TWO MICRO-DECISIONS — RATIFIED 2026-06-16 (locked, committed to src/types/index.ts)

Both confirmed by the PM and now live in code. Recorded here for the farmed-out work-orders:
the 6 axes below and the `-3..+3` scale are FINAL — build against them as-is.

### Decision A — the 6 hexagon axes
Rule from §9.8 E1: a universal **spectrum** is an axis; a specific **switch/gate** is a trait
("lazy = low Diligence, NOT a trait"). Proposed 6, each with a future Phase-3 mechanical hook:

| Axis | Low ↔ High | Future hook |
|---|---|---|
| **Drive** | Listless ↔ Driven | `drive_mult` in heat formula (§9.5) |
| **Diligence** | Lazy ↔ Diligent | neglect/follow-through bias |
| **Boldness** | Timid ↔ Bold | risk appetite in danger context; ego swing size |
| **Warmth** | Cold ↔ Warm | solitary-vs-social action weighting |
| **Empathy** | Callous ↔ Compassionate | soft-bias on harm/help (separate from mature traits) |
| **Composure** | Volatile ↔ Composed | inverse feeds novelty/impulse frequency |

### Decision B — the scale
Proposed: **`-3 .. +3` (7 levels, centered on 0)** for BOTH hexagon and relations, so one
band-formatter shape is reused and progression is clean `+/- deltas` (§9.2 #5). (Rejected the
doc's offhand `2/10` example — asymmetric, no neutral center, doesn't match relations.)

> **PM: confirm A + B, or amend.** Everything below assumes them. If they change, only this file
> + the band words in `03` change.

---

## The frozen shapes

```ts
// ---- Personality hexagon (numbers stored, NEVER sent raw; word-bands only) ----
export type HexAxis = 'drive' | 'diligence' | 'boldness' | 'warmth' | 'empathy' | 'composure';
export type PersonalityHex = Record<HexAxis, number>; // each -3..+3, default 0

// ---- Tiered wants (beside the old NPCDrives; do not delete drives in Phase 1) ----
export type NPCWants = {
  short: string[];   // needs/flavor pool draws; repeats allowed; no LLM
  medium: string[];  // goal templates (pool); LLM-updated in Phase 2
  long: string;      // single long goal; LLM-generated at creation (Phase 2)
};

// ---- Relation graph (sparse, directed, cause-born) ----
// Key = target NPC id. Absent key = Neutral (0). Only non-neutral edges stored.
export type RelationGraph = Record<string, number>; // each value -3..+3

// ---- NPCEntry additions (all optional → lazy migration) ----
export type NPCEntryAgencyFields = {
  wants?: NPCWants;
  personalityHex?: PersonalityHex;
  traits?: string[];            // <=5, controlled vocab (see 02_CHEAP_pool_constants)
  region?: string;              // coarse: 'academy' | 'Ryuten' | ... (free string Phase 1)
  haunt?: string;               // flavor only, for reports ('the garden')
  relations?: RelationGraph;    // NPC->NPC edges
  pcRelation?: number;          // -3..+3 — DEDICATED slot for NPC->PC (re-homed from affinity)
  populated?: boolean;          // false/undefined = not yet generated (Phase-2 lazy fill)
};
```

These fields get merged into the existing `NPCEntry` type (add the `NPCEntryAgencyFields` keys
directly to the `NPCEntry` object; the standalone type above is just for clarity here).

## Re-home / seed rules (data layer — §9.4)

- **`pcRelation`** = mapped from old `npc.affinity` (0..100) → `-3..+3` on first touch.
  Mapping (lazy, in the `populated` backfill — Phase 2, NOT a script):
  `<=15→-3, <=30→-2, <=45→-1, 46..55→0, <=70→+1, <=85→+2, >85→+3`.
  Old `npc.affinity` field **stays** in the type for now (deleted in a later cleanup).
- **`wants`** = seeded from old `drives`: `coreWant→long`, `sessionWant→medium[0]`,
  `sceneWant→short[0]`. (Phase 2 does the actual seeding; Phase 1 just adds the field.)
- **`traits`** ≠ `hardBoundaries`/`softBoundaries` (those are free-text, stay as flavor).
- **`populated`** absent → treat NPC as un-migrated; UI shows fields empty/defaulted.

## Payload contract (what the LLM may see — enforced in `05`)

- Hex + relations + pcRelation: **word-bands ONLY**, never the integers.
- Relations: only edges between NPCs **both on-stage this scene** are emitted, as words.
- `aff:NN` and raw personality text are **removed** from the payload (see `05`).

## DONE =
- Shapes above merged into `src/types/index.ts`; `npm run build` (tsc -b) green;
- no behavior change yet (purely additive optional fields).
