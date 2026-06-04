# Combat Mode Completion — Build Index

## Why this exists
Combat Mode v1.1 (PR #4, on `main`) shipped the **engine, state slices, HUD, and scanner**, but a gap audit found it **mechanically alive yet not integrated**: enemies don't take turns, gear is dead data, and combat is narratively siloed from the story. This folder finishes the feature.

Read the original design first: `docs/COMBAT_MODE_PLAN.md` (the thesis, A1–A11 spec, codebase map). These briefs assume that context.

**Thesis (unchanged):** *Every number comes from the engine; the AI only supplies bounded labels; combat is part of the story.*

## How to use these briefs
Each phase file is **self-contained for cold pickup** by a delegated model sharing this repo. A higher tier writes the test contract / prompts first; the workhorse implements against pinned tests (TDD makes cheap-model delegation safe). Respect `Depends on`.

| Tier | Role | Phases |
|------|------|--------|
| **Opus** (Claude Code) | contracts, prompts, bounded-enum design, critical review | A/B/C/D/F/G design portions |
| **GLM 5.1 / Sonnet** (Opencode) | integration glue, wiring, store plumbing | A–G implementation |
| **Gemini Flash 3.5** (Antigravity) | boilerplate, UI forms, CRUD, test scaffolding | E + G (UI), D schema, test scaffolds |

## Phase order (by dependency)

**Tier tag is in the filename** (`__OPUS` = advanced, `__GLM-SONNET` = medium, `__FLASH` = cheap) so you route each brief to the cheapest capable model without wasting Opus quota. Tag = the *floor* tier that can own the phase once its contract exists.

| Phase | File | Tier | What | Severity | Depends on |
|-------|------|------|------|----------|-----------|
| **A** | `A_enemy_ai__OPUS.md` | 🔴 Opus | Deterministic 3-tier enemy turn resolver | Game-breaking | — |
| **B** | `B_gear_resolution__GLM-SONNET.md` | 🟡 GLM/Sonnet | Compendium/gear dereference + FOC + armor | High | A |
| **C** | `C_story_integration__OPUS.md` | 🔴 Opus | Engine result → Story AI via full context pipeline | High | A, B |
| **D** | `D_npc_generation__GLM-SONNET.md` | 🟡 GLM/Sonnet | AI assigns stats + starting loadout at gen-time | Medium | B |
| **E** | `E_authoring_ui__FLASH.md` | 🟢 Flash | NPC stat/inventory/override editors + compendium UI | Medium | B |
| **F** | `F_recovery_polish__GLM-SONNET.md` | 🟡 GLM/Sonnet | Recovery band on re-encounter + jitter config | Low | C |
| **G** | `G_pc_creation__GLM-SONNET.md` | 🟡 GLM/Sonnet | Guided PC creation (engine script + point-buy + lore-aware optional assist) | Medium | B, D |

**Why these tiers:** Opus only on **A** (the cascade + bounded override vocab is the keystone D/E/G all consume) and **C** (touches the core payload pipeline + prompt ordering — a wrong move regresses normal turns). Everything else is medium wiring, except **E** which is pure UI/CRUD boilerplate. Note: A and C still produce *contracts/prompts* that the medium phases consume — do A and C first.

**Critical path to "combat actually works":** A → B → C. Phases D/E (content authoring) and F (polish) follow in parallel once B is stable. **Phase G** (PC creation — the player on-ramp + combat PC-requirement) depends on B + D and can run alongside E.

## Global verification
- Per-phase: `npx vitest src/services/__tests__/combat*.test.ts`
- Integration gate: `npm run lint && npm run test && npm run build`
- Manual (`/run` or preview tools): start fight → enemies act → gear matters → narration is in-voice with scene continuity → next story turn references the fight → reappearing NPC shows recovery band.

## Conventions
- Engine stays **pure** (`src/services/engine/`): no store/UI/LLM imports. Unit-testable.
- New slices follow the manual slice-creator + `debouncedSaveX()` (500ms) + `campaignStore` CRUD pattern.
- Engine-authored chat uses `ChatMessage.name` markers (e.g. `'combat-ledger'`).
- Never let the AI author a number — only bounded labels/enums.
