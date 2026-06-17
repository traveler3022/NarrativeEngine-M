# 06 — Pipeline wiring  🟣 STRONG (Claude — do not farm)

**Why Strong:** integrates 02–05 into the live turn/update pipeline. High blast radius (runs every
turn's post-process). The Q2 decision made real: **EXTEND the existing path, don't add a parallel
generator.**

## Wire-ups (in `services/turn/turnPostProcess.ts` + `services/npc/npcGeneration.ts`)
1. **New NPCs** already populated via extended `generateNPCProfile` (02) — confirm callers pass
   `matureMode` through.
2. **Existing-NPC updates** — in `updateExistingNPCs` (`npcGeneration.ts:283`), gate the candidate
   list through `filterUpdatableNPCs` (05) so stale/locked NPCs don't get update calls. Allow the
   update to emit want changes as **+/- text edits** to medium/long (keep them strings).
3. **Lazy migration** — register `populateAgencyFields` (04) in the existing background queue
   beside `backfillNPCDrives` (`turnPostProcess.ts:349`), selecting `!populated && eligible &&
   relevant` NPCs.
4. **Short-want lifecycle** — when a short want surfaces/acts, call `completeShortWant` (05) and
   top up via `drawShortWants` (03). No LLM for shorts (§9.2 #3).
5. **matureMode** — add `matureMode?: boolean` to `AppSettings` (default false) if not present;
   thread it to generation + draws.

## Guardrails
- Respect `tierAllows(state.settings.aiTier, 'npcUpdate')` — don't add LLM calls outside the
  existing tier gate.
- Keep call budget honest (§9.0): generation/migration are batched; shorts cost 0 LLM.
- Skip `isPC`/`agencyLocked` everywhere.
- Update/extend any post-process tests that assert the old update shape.

## DONE =
- New + existing + legacy NPCs all flow agency data through the ONE existing pipeline; no parallel
  path; `npm run build` green; `npm run test` green (update affected tests).
