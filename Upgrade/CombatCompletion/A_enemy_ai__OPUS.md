# Phase A — Enemy AI Resolver (the #1 unblock)

## Problem
Enemies never take turns. `ARCHETYPE_BEHAVIORS` (weighted action tables) exists at `src/services/engine/combatEngine.ts:287–318` but **nothing consumes it**. `resolveActionQueue` (`combatEngine.ts:368`) only maps over actions handed to it; `runCombatTurn` (`turnOrchestrator.ts:473`) resolves the PC's action and nothing else. NPC `overrides[]` (`types/index.ts`) is never read. Result: combat is one-sided — the player hits dummies.

This is the game-breaking gap. Fix it first; it has no dependencies.

## Spec reference
`docs/COMBAT_MODE_PLAN.md` section **A7** — deterministic, zero-LLM, 3-tier cascade checked in priority order:
1. **NPC personal override** — ledger `{trigger, action}` from a bounded vocab (e.g. `onAllyFatal(Chie)→interpose`).
2. **Archetype conditional** — e.g. bulwark protects an ally below 30% VIT.
3. **Archetype weighted roll** (`ARCHETYPE_BEHAVIORS`) + a **target-selection table** per archetype.

Keep a little randomness (anti-exploit). **LLM calls per round = 2 flat** regardless of enemy count — enemies are pure functions.

## Model tiers
- **Opus:** design the cascade contract, the per-archetype target-selection table, and the bounded override trigger/action vocab. Write the test contract first.
- **GLM 5.1 / Sonnet:** implement the resolver + wire into the round loop against pinned tests.

## Build

### 1. `selectEnemyAction()` — new pure function in `combatEngine.ts`
```
selectEnemyAction(
  actor: Combatant,
  state: CombatState,
  overrides: NPCOverride[],        // from the actor's ledger entry, may be []
  rng: () => number,               // injectable for deterministic tests
): CombatAction
```
Cascade:
1. **Override pass:** evaluate each override's `trigger` against current `state` (ally HP thresholds, ally fatal, self HP, round#). First match → emit its `action` targeting per the trigger. Triggers come from a **bounded enum** (Opus to finalize), e.g. `onSelfBelow(pct)`, `onAllyBelow(pct)`, `onAllyFatal(id)`, `onRound(n)`. Actions: `interpose`, `attack`, `guard`, `defend`, `reposition`, `cast`.
2. **Archetype conditional:** hardcoded per-archetype rule (Opus authors the small set), e.g. `bulwark` → if any ally < 30% HP and self adjacent, `guard`/`interpose` that ally.
3. **Weighted roll:** sample `ARCHETYPE_BEHAVIORS[actor.archetype]` by weight using `rng()`. Map the chosen action label → a concrete `CombatAction` (resolve target via the target table).

### 2. Target-selection table — new `ARCHETYPE_TARGETING` in `combatEngine.ts`
Per archetype, a target preference (Opus authors), e.g.:
- `assassin` → lowest-HP enemy (finisher);
- `brute` → highest-threat / nearest;
- `caster` → backline (Apart) preferred;
- `bulwark` → whoever threatens a protected ally;
- `skirmisher` → opportunistic, weighted random.
Always inject minor randomness so it isn't fully exploitable. Exclude downed/dead combatants. Respect range legality (don't pick a Close attack on an Apart target unless the action is a reposition-to-close).

### 3. Wire into the round — `turnOrchestrator.ts:runCombatTurn`
Before `runCombatRound`, for every combatant in `turnOrder` that is **not a PC** and is alive, call `selectEnemyAction` and append to the action list. The existing SPD sort (`sortTurnOrderBySPD`) then orders all actions (PC + enemies) together. PCs only act from their submitted HUD action.

## Files
- **Modify** `src/services/engine/combatEngine.ts` — add `selectEnemyAction`, `ARCHETYPE_TARGETING`, override-eval helper. Export from `engine/index.ts`.
- **Modify** `src/services/turn/turnOrchestrator.ts` — gather enemy actions in `runCombatTurn` before resolve.
- **Types** `src/types/index.ts` — formalize `NPCOverride { trigger: string; action: string }` if not already concrete; ensure `Combatant` carries `isPC` (it does via `combatSlice.ts:67`).
- **Create** `src/services/__tests__/combatEnemyAI.test.ts`.

## Test contract (write FIRST)
- Determinism: same `rng` seed → same action.
- Override priority: when an override trigger is met, it wins over conditional/weighted.
- Conditional: bulwark with a sub-30% ally emits a protect action.
- Weighted distribution: over N samples, action frequencies match `ARCHETYPE_BEHAVIORS` weights within tolerance.
- Targeting: assassin picks lowest-HP enemy; dead combatants never targeted.
- PC exclusion: PCs never get an auto-generated action.
- Round integrity: a full round with 1 PC + 3 enemies resolves all four actions in SPD order.

## Done when
Scripted combat: submit one PC action, observe a full two-sided round with all enemies acting deterministically under seed. `npx vitest combatEnemyAI` green; existing `combatTurn`/`combatEngine` tests still green.

## Watch out
- Keep `selectEnemyAction` pure — `rng` injected, no `Math.random()` inside the testable core (mirror the existing `jitter` pattern but make rng injectable here).
- Don't break the 2-LLM-calls-per-round budget: enemy selection is pure, **no LLM**.
- `interpose` may need the deferred REACT primitive (A11). For v1, degrade `interpose` to `guard`-the-ally (no interrupt) and leave a `// TODO REACT` — do not build the interrupt subsystem here.
