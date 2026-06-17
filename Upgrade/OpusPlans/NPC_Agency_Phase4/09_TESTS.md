# WO-09 — Test bundles (Pieces A/B/F/C) 🟢 TESTS (Gemini Flash 3.5)

> Depends: the piece each bundle covers. Vitest. Mirror the existing test style in
> `src/services/npc/agencyGeneration.test.ts` and `agencyEngine.test.ts` (vi.mock the LLM call, assert
> on `updateNPCStore` calls). Run with `npx vitest`. The FULL build (`npm run build`) is Opus's job at
> integration — your job is the unit/behavior coverage below.

## Bundle 1 — `hexDelta` (WO-03) → `agencyDrift.test.ts`
- clamps at +3 ceiling: `hexDelta(hex{boldness:3}, 'boldness', +1)` → stays 3.
- clamps at −3 floor: `hexDelta(hex{composure:-3}, 'composure', -1)` → stays −3.
- step cap: `hexDelta(hex{drive:0}, 'drive', +5)` → drive 1 (NOT 5).
- `by:0` → equal-valued new object.
- immutability: input object is unchanged after the call (assert `input.boldness` unchanged).
- other axes untouched: only the named axis differs.

## Bundle 2 — Piece B fill + roster guard (WO-04) → extend `agencyGeneration.test.ts` / `agencyEngine.test.ts`
- **no-op idempotency:** `populateAgencyFields` over a fully-populated ledger (all agency fields set,
  `populated:true`) → `updateNPCStore` NOT called.
- **defaults seeded:** an NPC missing `relations`/`skillRung`/`rungCeiling` → patch contains
  `relations:{}`, `skillRung:0`, `rungCeiling:3` (and does not clobber any field already set).
- **never clobbers authored values:** an NPC with `skillRung:2` keeps 2 after a fill.
- **roster guard:** `buildProximityRoster` excludes an NPC with `populated:false` even when it's in the
  PC's region; includes the same NPC once `populated:true`.
- **bulkNpcUpdate parity:** `bulkNpcUpdate({needsGeneration:true})` produces the same store calls as a
  direct `populateAgencyFields`.

## Bundle 3 — Piece F+A `updateExistingNPCs` migration (WO-05) → `agencyUpdate.test.ts`
Mock the LLM to return crafted `{updates:[...]}`:
- **no legacy writes:** given a model response that (wrongly) includes `drives` and `affinity`, the parser
  writes NEITHER to the store (they're dropped). Assert the patch has no `drives`/`affinity` keys.
- **wants revision:** medium/long revised, `short` preserved unchanged.
- **pcRelation delta:** `{pcRelation:+1}` on an NPC at +1 → +2; clamp at +3; reject/clamp a `+5` to +1 step.
- **hex delta:** `{personalityHex:{boldness:+1}}` moves boldness by 1 (clamped); a full-overwrite-looking
  response cannot move an axis more than ±1.
- **SHIFT emitted:** when an axis or pcRelation changes, `previousSnapshot` is set / a SHIFT band is
  produced (assert on whatever surfacing hook WO-05 used).
- **legacy NPC fallback:** an un-migrated NPC (no `personalityHex`) doesn't crash the hex parse (skips).

## Bundle 4 — Piece C rung (WO-06) → `agencyRung.test.ts`
- **cross bumps:** goal with `progress>=quota && justifiedEventFlag` → `skillRung` +1, flag cleared,
  progress reset.
- **grind can't cross:** progress>=quota but `justifiedEventFlag:false` → no bump.
- **ceiling cap:** NPC at `skillRung === rungCeiling` with a valid cross → cross consumed (flag cleared)
  but `skillRung` unchanged.
- **word-band:** the surfaced shift uses `RUNG_LABELS` text, not the integer.

## Acceptance
- All four bundles pass under `npx vitest`.
- No test reaches a real LLM (all mocked).
- Report any case where the implementation contradicts its WO — that's a real finding, flag it, don't
  paper over it with a loosened assertion.
