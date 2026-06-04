# Phase F — Recovery Band & Config Reconciliation

## Problem
Two loose ends from the audit:
1. **Recovery band unbuilt.** Terminate writes `condition`/`lastCondition`/`lastSeenTimestamp` to the ledger (`combatSlice.ts:132–159`), but the **re-encounter** logic (A5: AI adjudicates a recovery band from time + context → starting maxHP% of 100/50/25) does not exist. A wounded NPC that reappears materializes at full HP.
2. **Config drift.** Mook stat jitter is hardcoded `JITTER_RANGE = 0.15` (±15%) in `combatEngine.ts:328`, but the EnginesTab UI knob advertises **10%**. The knob has no effect.

Both are low-severity polish — do them last.

## Spec reference
`docs/COMBAT_MODE_PLAN.md` **A5** — "no numeric carryover. Ledger stores `lastCondition` + `lastSeenTimestamp` + optional `recoveryNote`. On reappearance the AI adjudicates a recovery band (healthy/wounded/critical) from time+context; engine sets starting maxHP % (100/50/25). No recovery *system* — lazy-evaluated at re-encounter. Death is absolute."

## Depends on
**Phase C** — uses the AI seam (aux/utility provider) for the recovery adjudication call.

## Model tiers
- **Opus:** design the recovery adjudication prompt (bounded output: one of `healthy|wounded|critical`).
- **GLM 5.1 / Sonnet:** wire the call + materialize integration.
- **Gemini Flash 3.5:** the config plumbing for jitter.

## Build

### 1. Recovery band on re-encounter
When a named NPC with a non-`healthy` `lastCondition` is materialized into combat (`combatSlice.ts:initiateCombat`, the named-NPC branch ~line 45), lazily adjudicate a band:
- Aux/utility provider call (reuse `charIntroEngine`/scanner pattern): inputs = `lastCondition`, elapsed time since `lastSeenTimestamp`, `recoveryNote`, brief recent context. Output = bounded `healthy|wounded|critical`.
- Map band → starting maxHP%: `healthy=100`, `wounded=50`, `critical=25`. Apply to `currentHP` (and optionally a cap on `maxHP` for the instance).
- **Death is absolute:** if `condition === 'dead'`, the NPC must not be materializable as a live combatant — guard it, and ensure it still feeds the existing witness/archive system.
- Lazy + cached: only adjudicate at the moment of re-encounter, not every turn.

### 2. Jitter from config — `combatEngine.ts:328` / `materializeCombatant`
Replace the hardcoded `JITTER_RANGE` with the EnginesTab `mookJitter` setting (read from settings, passed into `materializeCombatant` or a module-level configurable). Default to the spec's 10% so code and UI agree. Keep `jitter()` pure (rng injectable for tests).

## Files
- **Modify** `src/store/slices/combatSlice.ts` (recovery band on named-NPC materialize; dead-guard).
- **Modify** `src/services/engine/combatEngine.ts` (jitter reads config; recovery-band → maxHP% helper, pure).
- **New (small)** recovery adjudication call — colocate with combat services or reuse an existing aux-call util (`utils/llmCall`).
- **Modify** settings wiring so `mookJitter` reaches the engine.
- **Create** `src/services/__tests__/combatRecovery.test.ts`.

## Test contract (write FIRST)
- `lastCondition` + elapsed time → expected band → expected maxHP% (100/50/25), pure mapping tested without the LLM (mock the band).
- A `dead` NPC is never materialized as a live combatant; witness/archive path intact.
- `jitter()` honors the configured percentage (e.g. 0.10 → values within ±10%); default is 10%.
- Recovery is evaluated once per re-encounter, not per round.

## Done when
A wounded NPC reappears at reduced HP per AI judgment, dead NPCs stay dead, and the EnginesTab jitter knob measurably changes mook stat spread. `npx vitest combatRecovery` green; full `npm run lint && npm run test && npm run build` green.

## Watch out
- Keep the band mapping (pure) separate from the LLM call (impure) so the math is unit-testable without a provider.
- Fail safe: if the aux call fails, default to the conservative band implied by `lastCondition` (e.g. `wounded`→50%) rather than blocking combat start.
- Don't reintroduce numeric HP carryover — only the coarse band crosses the boundary (A5).
