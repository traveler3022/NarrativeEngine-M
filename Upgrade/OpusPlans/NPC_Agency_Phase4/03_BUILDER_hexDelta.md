# WO-03 — `hexDelta` pure helper (Piece A) 🔵 BUILDER (GLM 5.2)

> Depends: WO-01 (constants). Tiny, exact, pure. Unblocks WO-05 (drift wiring) and WO-06 (rung nudge).
> Discipline: deltas only, clamp, immutable. NO LLM, NO store access, NO side effects.

## Goal
One shared pure function both drift sources (the AI update in WO-05, the engine-resolve nudge) call, so
hexagon clamping lives in exactly one place. A drift that lets a caller jump more than ±1 or escape the
−3..+3 band re-opens the "numbers are meaningless" problem — this helper is the guardrail.

## Where
New file `src/services/npc/agencyDrift.ts` (or extend `agencyBands.ts` if you prefer one agency-math
module — pick one and be consistent). Export from `src/services/npc/index.ts`.

## Signature + behavior
```ts
import type { PersonalityHex, HexAxis } from '../../types';
import { HEX_AXIS_MIN, HEX_AXIS_MAX, HEX_DRIFT_MAX_STEP } from './agencyConstants';

/**
 * Returns a NEW hex with one axis nudged by `by`, clamped to [HEX_AXIS_MIN, HEX_AXIS_MAX].
 * `by` is itself clamped to ±HEX_DRIFT_MAX_STEP first (a +3 request becomes +1) so no caller can
 * over-drift. Immutable: never mutates the input. `by === 0` returns an equal-valued new object.
 */
export function hexDelta(hex: PersonalityHex, axis: HexAxis, by: number): PersonalityHex;
```

Rules:
1. Clamp the **step** first: `step = clamp(by, -HEX_DRIFT_MAX_STEP, +HEX_DRIFT_MAX_STEP)`.
2. Clamp the **result**: `next = clamp(hex[axis] + step, HEX_AXIS_MIN, HEX_AXIS_MAX)`.
3. Return `{ ...hex, [axis]: next }`. Do not touch other axes.
4. Pure — no rounding surprises (inputs are integers; keep integer math).

## Acceptance
- Exported and importable.
- `npm run build` green.
- Flash writes the unit tests (WO-09): clamp at +3 ceiling, −3 floor, ±1 step cap on a +5 request,
  by:0 no-op, immutability (input object unchanged), other axes untouched.
