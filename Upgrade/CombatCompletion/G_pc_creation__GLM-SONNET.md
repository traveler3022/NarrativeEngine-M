# Phase G — Guided PC Creation

## Problem
There is **no player-character creation flow**. A protagonist can only be made by ticking the `isPC` checkbox on the generic NPC edit form (`NPCEditForm.tsx:396`) and hand-filling every field — no guided flow, no stat allocation, no profile seeding. Combat **hard-requires** a PC (`combatSlice.ts:92` aborts combat if no `isPC` combatant), so this is also the missing on-ramp to the whole feature. New players are dropped into an empty campaign with no idea who they are or what the world is.

## What already exists (reuse, don't rebuild)
- **`generateNPCProfile(provider, history, npcName, addNPCToStore, existingLedger?, campaignId?)`** (`src/services/npc/npcGeneration.ts:93`) generates a full profile from **any** `ChatMessage[]` "history" — so questionnaire Q&A pairs feed straight in.
- **`addNPC`** store action (`src/store/slices/npcSlice.ts:113`) is the single ledger-insert path (same one manual + auto-gen use).
- **`[CHARACTER PROFILE]`** volatile block is already injected (`payloadBuilder.ts:120`) from `context.characterProfile` / `characterProfileActive`. `characterProfileParser.ts` (`scanCharacterProfile`) shows the existing profile-text pattern.
- **Aux-provider pattern** for cheap grounded calls: `charIntroEngine.ts` / `combatScanner.ts` via `utils/llmCall`.
- **Engine config-table pattern** (deterministic scripted output): `engineRolls.ts`, `charIntroEngine.ts` config arrays in `types/index.ts`.
- **No stepper/wizard component exists** — the multi-step UI shell is net-new.

## Locked decisions (with user)
- **Engine-spine, lore-visible, LLM-optional — never LLM-mandatory.** Degrades to pure-engine if no aux provider is configured.
- **Stats = engine point-buy / standard array** (deterministic player allocation, 8–20 band) + an **"I want to be OP!"** button that swaps in an inflated budget *and* bumps `combatTier`. Stats come from the engine, not the LLM.
- **Questions = engine static script** (no LLM cost for the questions themselves).
- **World Primer = browsable lore chunks + optional LLM digest.**
- **Assist = tiered opt-in** (per-field suggest + full-auto draft).
- **Output = isPC ledger entry + seeded `[CHARACTER PROFILE]` block.**

## Depends on
- **Phase B** — so the PC receives a resolvable loadout (weapon/skills).
- **Phase D** — reuses the enriched `generateNPCProfile` (stats/loadout assignment) and the on-demand compendium-def creation.

## Model tiers
- **Opus:** the engine question script, point-buy budget tables (normal + OP), the profile-merge contract (engine stats override LLM stats), and the per-field/full-auto lore-grounded suggestion prompts. Write the test contract.
- **GLM 5.1 / Sonnet:** generation reuse + merge, ledger write, characterProfile/context wiring, lore-chunk access for the primer.
- **Gemini Flash 3.5:** the stepper UI, the World Primer panel, the empty-history CTA.

## Build

### 1. Entry point — empty-history CTA (`ChatArea.tsx`)
When the active campaign's chat history is empty, the middle screen shows a **"Create Character"** call-to-action (+ secondary **"Generate one for me"**) instead of a blank chat. This is the onboarding gate; it also pre-satisfies the combat PC guard. Reuse the existing empty/placeholder render path in `ChatArea`.

### 2. Engine static question script — `src/services/engine/pcCreationScript.ts` (new, pure)
A fixed, deterministic interview definition (config array, like the engine event tables): name → concept/background → playstyle → voice sample → drives → archetype lean → stat point-buy. Also defines the **point-buy budgets**: a `NORMAL` budget and an `OP` budget, plus the `combatTier` each implies. No LLM. Pure + unit-testable.

### 3. Stat allocator + OP toggle
A point-buy/standard-array allocator UI driven by the script's budget. Live-preview derived AC/HP/FOC via engine helpers (`computeAC`/`computeMaxHP`/`computeMaxFOC`). The **"I want to be OP!"** button swaps `NORMAL → OP` budget and bumps `combatTier`. The allocation result is the authoritative stat source.

### 4. World Primer panel — `src/components/pc/WorldPrimerPanel.tsx` (new)
Surfaces the active campaign's `[CHUNK: ...]` lore browsably (free, reuse existing lore retrieval/chunk access). An optional **"Summarize for newcomers"** button runs one aux call → a short digest. Hidden/disabled gracefully if no lore or no provider.

### 5. Tiered opt-in LLM assist
- **Per-field "✨ Suggest from world":** on narrative questions (concept, background, faction-lean), one lore-grounded aux call fills the field; fully editable.
- **"Generate for me":** runs the whole interview from lore (+ optional one-line concept) → a **draft** PC for review/tweak. Never an instant commit.
- Both reuse the aux-provider pattern, grounded in campaign lore chunks. **All assist buttons hide when no aux provider is configured.**

### 6. Parse → profile → merge (`npcGeneration.ts`)
Assemble narrative answers as `ChatMessage[]` Q&A pairs → `generateNPCProfile` produces personality/voice/drives/archetype/example-dialogue + a Phase-D loadout. **Merge rule:** LLM supplies narrative + archetype + gear; the **engine point-buy stats + `combatTier` override** whatever the generator emitted for stats. Extend `generateNPCProfile` (or wrap it) to accept a questionnaire history and an explicit stat/tier override.

### 7. Write outputs
- `addNPC(entry)` with `isPC: true`, the merged profile, point-buy stats, OP-adjusted `combatTier`, and the loadout.
- Generate a narrative `characterProfile` string → set `context.characterProfile` + `characterProfileActive: true` so the `[CHARACTER PROFILE]` block is seeded for the very first story turn.

### 8. Stepper shell — `src/components/pc/PCCreationWizard.tsx` (new)
Multi-step modal hosting: script questions (with per-field suggest) → World Primer (side panel/tab) → point-buy + OP toggle → review/commit. Match existing premium dark/light vanilla-CSS tokens and the modal patterns in `NPCLedgerModal.tsx` / `CampaignHub.tsx`.

## Files
- **Create** `src/services/engine/pcCreationScript.ts` (question script + point-buy budgets, pure; export via `engine/index.ts`).
- **Create** `src/components/pc/PCCreationWizard.tsx`, `src/components/pc/WorldPrimerPanel.tsx`.
- **Modify** `src/components/ChatArea.tsx` (empty-history CTA).
- **Modify** `src/services/npc/npcGeneration.ts` (questionnaire history + stat/tier override merge + lore-grounded suggestion helpers).
- **Modify** context/`characterProfile` wiring (set `characterProfile` + `characterProfileActive` on commit).
- **Reuse** `npcSlice.ts:addNPC`, existing lore-chunk retrieval, `utils/llmCall` aux pattern.
- **Create** `src/services/__tests__/pcCreation.test.ts`.

## Test contract (write FIRST)
- Point-buy respects the `NORMAL` budget; `OP` budget allows higher allocation and bumps `combatTier`.
- Questionnaire history → a valid PC profile with `isPC: true`.
- **Merge:** engine point-buy stats + `combatTier` override the generator's stat output (assert the committed stats equal the allocator, not the LLM).
- `characterProfile` + `characterProfileActive` set after commit; `[CHARACTER PROFILE]` block then appears in the built payload.
- Empty-history CTA renders for a fresh campaign; disappears once history exists.
- Null-safe: assist/digest/full-auto buttons hidden when no aux provider; pure engine path still completes a PC.
- Full-auto yields an **editable draft**, not an instant commit.

## Done when
From an empty campaign, a player builds a protagonist end-to-end via the wizard (engine-only **or** with optional lore assist), it lands in the ledger as the PC, the story AI sees the `[CHARACTER PROFILE]` on turn one, and combat can start (PC guard satisfied). `npx vitest pcCreation` green; `npm run lint && npm run build` green.

## Watch out
- **Engine purity:** `pcCreationScript.ts` (script + budgets) imports no store/UI/LLM. The LLM steps are separate, optional, and aux-provider-based.
- Keep stats authoritative from point-buy — never let a "Suggest"/full-auto path silently overwrite the player's allocation without review.
- OP budget still keys gear/dice to the bumped `combatTier` (Phase B/D anti-inflation) — "OP" means strong-for-tier, not unbounded.
- Reuse `NPCLedgerModal`/`CampaignHub` modal + styling conventions; don't introduce a new UI lib or state pattern.
