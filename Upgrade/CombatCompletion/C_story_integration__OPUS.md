# Phase C — Story Integration (Engine → Story AI)

> **Status:** Phases A (enemy AI) and B (gear resolution) are merged to `main`. Work Phase C directly on `main` (the user prefers no feature branches). The combat engine now produces richer `ActionResolution`s — enemies act, gear/skills/heals resolve — so the narration block this phase builds must cover all resolution types (`attack`/`mental`/`heal`/`move`/`defend`).
>
> **Carryover from the Phase B review (read before building the narration block):**
> - `ActionResolution` now includes a **`heal`** type with a `healed` amount, and `mental` resolutions can carry `damage`. Make `buildCombatNarrationPrompt` (and the new context-block builder) render these, not just hits/misses.
> - **Known cosmetic bug to account for:** the heal resolution reports the skill's FOC *cost* under the `focRecovered` field (`combatEngine.ts:~758`) — a field that otherwise means "FOC gained" (DEF brace). When you summarize resolutions for the story AI, don't narrate a heal as if the caster *gained* FOC. Ideally rename to a `focSpent`-style field as part of this phase and update the brace path accordingly.

## Problem
Combat is narratively siloed. Today:
- The engine result goes to a **naked one-shot** `llmCall` (`CombatHUD.tsx:189–209`) built by `buildCombatNarrationPrompt` (`turnOrchestrator.ts:645–673`). That prompt is *only* the ledger line + resolutions + survivor HP — **no system prompt, no lore, no active NPCs, no recent history**. Narration reads like a combat-sim printout, disconnected from the story.
- The main payload builder has **zero** combat awareness (`grep` of `src/services/payload/` finds no combat refs except a skip). Live HP/FOC/positions never reach any prompt's volatile block.
- Combat-ledger messages are **explicitly skipped** from fitted history (`payloadHistoryFitting.ts:43`), so a subsequent regular story turn can't see that the fight happened.

## Locked architecture (decided with user)
**Combat is part of the story.** The flow is:
```
player input → Scanner (combat?) → [if combat] Engine resolves (owns all numbers)
            → engine result injected as context → Story AI narrates with FULL context
            → live combat state lives in the payload while combat is active
```
The engine resolution becomes an **input to the story AI's normal context pipeline** — not a separate bare call. Reuse `gatherContext`/`payloadBuilder`, don't invent a parallel path.

## Spec reference
`docs/COMBAT_MODE_PLAN.md` **A8** (scanner + adjudicator), **A10** (ledger is "meatiness made visible"; AI *sees* the ledger for continuity; live HP/FOC in the **volatile** block only).

## Model tiers
- **Opus:** design the injection format (the `[COMBAT ENGINE RESULT]` + live-state block), the narration system framing, and the scanner step-0 contract. Write the test contract.
- **GLM 5.1 / Sonnet:** wire payload builder, history fitting, and the narration call.

## Build

### 1. Inject live combat state into the volatile block — `payloadBuilder.ts`
The volatile assembly (`payloadBuilder.ts:118–126`) currently pushes rules/character/inventory/scene-note. When `context.combatModeActive` and a live `combatState` exists, push a `[COMBAT STATE: VOLATILE]` block: round#, each living combatant `name HP cur/max · FOC cur/max [position/status]`, and range relations summary. This is the live snapshot the story AI reads every generation during a fight.
- The builder is store-free; thread `combatState` in through the existing context/gather path (`turnContext.ts` / `gatherContext`). Add it to `GameContext` or pass alongside.

### 2. Keep the ledger visible — `payloadHistoryFitting.ts:43`
Today: `if (msg.name === 'combat-ledger') continue;` drops it entirely. Change so ledger lines are **retained in fitted history** during/after combat (they're terse by design). If keeping all of them is too heavy, keep the **last N** rounds and let the volatile block carry the current snapshot. The story AI must be able to reference what happened.

### 3. Replace the naked narration with a full-context call
Instead of `llmCall(storyProvider, bareprompt)` in `CombatHUD.tsx`, route the engine result through the **real context pipeline**: build the normal payload (system + canon + volatile [now incl. combat state] + lore RAG + active NPCs + recent history) and append the `[COMBAT ENGINE RESULT — narrate, numbers are FINAL]` block (ledger + resolutions + player intent). Send via the same `sendMessage`/streaming path the story turn uses so narration streams in-voice and in-context.
- Practically: factor the engine-result block builder (keep `buildCombatNarrationPrompt`'s content) but feed it as the final user/context turn of a full `gatherContext` payload rather than as the entire prompt.
- Preserve **engine-resolves-before-narration** ordering (already true) and the **2-LLM-calls-per-round** budget (adjudicate + narrate).

### 4. Scanner as robust Step-0 — confirm/harden
The scanner (`combatScanner.ts:scanCombatIntent`) is invoked as a pre-send hook in `ChatArea.tsx:180`, not inside `runTurn`. Verify it: (a) fails safe → default `narrative` (false positives are worse), (b) has the `initiate_combat` tool as backstop when no combatAssistant is configured, (c) reuses the `charIntroEngine` aux-provider pattern (it does). If the pre-send location is acceptable, document it; if it can be bypassed, move detection so every player turn passes through it.

## Files
- **Modify** `src/services/payload/payloadBuilder.ts` (volatile combat block).
- **Modify** `src/services/payload/payloadHistoryFitting.ts` (retain ledger / keep last N).
- **Modify** `src/services/turn/turnContext.ts` / `gatherContext` (thread `combatState`).
- **Modify** `src/services/turn/turnOrchestrator.ts` (narration via full-context payload; keep the result-block builder).
- **Modify** `src/components/combat/CombatHUD.tsx` (call the context-rich path, drop the bare `llmCall`).
- **Modify** `src/types/index.ts` (`GameContext` carries live combat snapshot if threaded that way).
- **Create/extend** `src/services/__tests__/combatStoryIntegration.test.ts`.

## Test contract (write FIRST)
- When `combatModeActive` + live `combatState`, the built payload contains the `[COMBAT STATE: VOLATILE]` block with correct HP/FOC.
- Ledger lines are present in fitted history for the next turn (not dropped).
- The narration payload includes system prompt + at least one lore/NPC context section + the `[COMBAT ENGINE RESULT]` block (assert ordering: result block last).
- Engine-before-narration ordering preserved; exactly 2 LLM calls per freeform round (adjudicate + narrate), 1 per button round (narrate only).

## Done when
A fight narrates **in-voice with scene/NPC continuity**, the story AI can reference combat outcomes on the following regular turn, and live HP/FOC is visible in the payload while combat is active. Integration test green; `npm run build` green.

## Watch out
- Don't double-count tokens: the volatile combat block + retained ledger lines must respect the existing budgeter (`payloadBudgeter.ts`). Keep blocks terse.
- Don't break non-combat turns: all combat injection is gated on `combatModeActive`.
- The `combatState` is ephemeral (wiped on terminate). After combat ends, the volatile block disappears but retained ledger lines + the written-back `condition` carry the aftermath.
