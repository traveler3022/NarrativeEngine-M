# WO-01 — Contract (schema + knobs + supersession + bulkNpcUpdate) 🟣 ARCHITECT (Opus)

> **Build this FIRST. Nothing else starts until it lands.** This is the locked contract every GLM
> work-order (02–05) builds against. Author: Opus. Reviewed by: nobody downstream may change these
> shapes without coming back here.
> Grounded against the live code 2026-06-17.

---

## 1. `NPCEntry` additions (`src/types/index.ts`, after `goalRecords` ~line 503)

```ts
    // ---- NPC Agency Phase 4: power-rung ladder (Piece C) ----
    skillRung?: number;    // 0..4 ladder position; undefined = not yet set (default Novice=0 on fill)
    rungCeiling?: number;  // 0..4 talent cap; LLM-set once, default 3. skillRung may never exceed this.
```

Both optional → no migration break; Piece B fills them lazily (default rung 0, ceiling 3).

Existing fields used by Phase 4 (already present — do NOT redefine):
- `personalityHex?: PersonalityHex` = `Record<HexAxis, number>`, axes `drive|diligence|boldness|warmth|empathy|composure`, each **−3..+3** ([types/index.ts:393](../../src/types/index.ts)).
- `pcRelation?: number` **−3..+3** (re-homed from `affinity`).
- `relations?: RelationGraph` (NPC→NPC sparse).
- `traits?: string[]` (≤5, controlled vocab).
- `goalRecords?: Goal[]` with `justifiedEventFlag?` ([:422](../../src/types/index.ts)).

## 2. `agencyConstants.ts` additions (single source of truth — no hardcoding downstream)

```ts
// ── Phase 4 ──────────────────────────────────────────────────────────────────

// §9.2 #5 / §9.4 — personality-hex drift. Axes are clamped −3..+3 (matches generation bounds).
// Drift is small + rare: at most ±1 per transformative event. A full overwrite is FORBIDDEN.
export const HEX_AXIS_MIN = -3;
export const HEX_AXIS_MAX = 3;
export const HEX_DRIFT_MAX_STEP = 1;   // reject any |delta| > this from the AI update

// §9.4 — pcRelation drift uses the same −3..+3 band and ±1 step.
export const PC_RELATION_MIN = -3;
export const PC_RELATION_MAX = 3;
export const PC_RELATION_MAX_STEP = 1;

// §3c — power-rung ladder. 0=Novice … 4=Master. Word-bands are the ONLY thing the GM/payload sees.
export const RUNG_MIN = 0;
export const RUNG_MAX = 4;
export const RUNG_DEFAULT = 0;          // Novice on lazy fill
export const RUNG_CEILING_DEFAULT = 3;  // talent cap when the LLM doesn't set one
export const RUNG_LABELS = ['Novice', 'Skilled', 'Expert', 'Veteran', 'Master'] as const;
```

> Why these values: the hex band already locks at −3..+3 in `validatePersonalityHex` and `DRIVE_MULT`
> (constants line 11). Reusing the same band for `pcRelation` keeps `affinityToPcRelation` output and
> drift on one scale. Rung 0..4 with ceiling-default 3 means most NPCs top out at Veteran; Master is
> reserved for high-talent NPCs whose LLM-set ceiling is 4.

## 3. Supersession map (LOCKED — "new field wins")

| Concept | Legacy (read-only fallback) | Phase-4 source of truth | Drift unit |
|---|---|---|---|
| Mid/long ambition | `drives.coreWant/sessionWant` | `wants.medium / wants.long` | text revision |
| Scene want | `drives.sceneWant` | `wants.short` (no-LLM rotation) | pool draw |
| Feeling toward PC | `affinity` (0–100) | `pcRelation` (−3..+3) | ±1 band delta |
| Personality | free-text `personality` (kept as flavor) | `personalityHex` | ±1 axis delta |
| Skill level | — (none existed) | `skillRung` / `rungCeiling` | +1 on justified cross |

**Rules every consumer obeys:**
1. On a **migrated** NPC (`populated === true`), read the Phase-4 field; ignore the legacy one.
2. On an **un-migrated** NPC, the legacy field is a read-only seed for the lazy fill (Piece B), then
   the Phase-4 field takes over.
3. **`updateExistingNPCs` (Piece F) must stop SENDING and stop PARSING `drives` and raw `affinity`.**
   No path may write a superseded field as truth again — that is the data-model fork this phase closes.

## 4. `bulkNpcUpdate` signature (the one unifying call — §9.3 hole 6)

The single entry point shared by retroactive fill and future graduation/relocation. Build it as a thin
wrapper around the existing `populateAgencyFields` so there is exactly one fill path.

```ts
// src/services/npc/npcGeneration.ts (or agency module) — Piece B (WO-03) implements; signature locked here.
export async function bulkNpcUpdate(
  provider: LLMProvider,
  history: ChatMessage[],
  npcs: NPCEntry[],
  updateNPCStore: (id: string, updates: Partial<NPCEntry>) => void,
  opts: { needsGeneration?: boolean; matureMode?: boolean },
): Promise<void>;
```
- `needsGeneration: true` → run the full agency fill (current `populateAgencyFields` body).
- Idempotent + null-guarded + isPC-skipping (carry today's guarantees). Empty patch = true no-op.
- **No background sweep** (locked this session): callers pass only the NPCs they want filled — today
  that is the on-stage `existingNpcsToUpdate` set in `turnPostProcess`.

## 5. Word-bands (`agencyBands.ts`) — the ONLY hex/rung surfacing

Engine numbers never reach a payload. Add formatters here; Pieces A/C call them.

```ts
// Hex drift → SHIFT line, reusing the buildDriftAlert pattern. Show axis name + arrow, never the raw number.
export function formatHexShift(axis: HexAxis, from: number, to: number): string; // e.g. "SHIFT: boldness rising"
// Rung → word-band. Never emit the integer.
export function formatRungBand(rung: number): string;                            // RUNG_LABELS[clamp(rung)]
export function formatRungShift(from: number, to: number): string;              // e.g. "SHIFT: Skilled → Expert"
```

> Direction words ("rising/steadying/cooling") are preferable to "1→2" in player-facing text — keep the
> numeric arrow for the DEBUG view only. Decide the exact wording when wiring (WO-04/05); the contract
> only mandates: **band/word out, never the integer.**

---

## Acceptance for WO-01 — ✅ DONE (Opus, 2026-06-17, build green)
- [x] Types compile (`npm run build`, tsc -b) with the two new optional fields. → `NPCEntry.skillRung?`/`rungCeiling?` added.
- [x] All constants exported from `agencyConstants.ts`; nothing else hardcodes these numbers. → Phase-4 block added (HEX_*, PC_RELATION_*, RUNG_*, OUTCOME_AXIS_MAP).
- [x] This supersession table is referenced by WO-04 (Piece F = WO-05) as the parse spec.
- [x] `bulkNpcUpdate` signature agreed; WO-04 (Piece B) implements it.
- [x] No behavior change yet — inert schema + knobs + word-band formatters only. Build green.

> Word-band formatters live in `agencyBands.ts` (`formatRungBand`, `formatHexShift`, `formatRungShift`)
> and are exported via `services/npc/index.ts`. `OUTCOME_AXIS_MAP` added to constants (shared by WO-05 §D
> engine nudge + WO-06 §3 tier-cross nudge).
