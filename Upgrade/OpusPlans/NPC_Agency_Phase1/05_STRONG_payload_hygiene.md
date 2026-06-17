# 05 — Payload hygiene  🟣 STRONG (Claude — do not farm)

**Why Claude:** surgical edits to the live LLM prompt pipeline. High blast radius (every turn's
payload), test + UI tendrils. §9.4 governing principle: *retire conflicting old signals from the
PAYLOAD immediately so the LLM never sees contradictory signal* — while keeping the DATA intact.

**Prerequisite:** `01` types committed; `03` band formatters (`agencyBands.ts`) exist.

## Changes (payload layer only — no data deletion)

1. **Drop `aff:NN` from `minifyNPC`** — `src/services/payload/contextMinifier.ts:152`.
   Remove the ` aff:${aff} ` segment from the emitted line. Keep the `affinity` field on the
   data; just stop sending it (redundant with the word-band `[Aff: …]` already in `PLAY AS:`).

2. **Stop NPC-pressure injection into the payload.** Find where pressure is concatenated into the
   NPC context (the pressure injector noted in §9.4 as "expired") and stop injecting it. Leave the
   pressure tracker/data + UI alone — that's a later cleanup with its own tendrils.

3. **Route personality through word-bands only** — `buildBehaviorDirective` in
   `src/services/npc/npcBehaviorDirective.ts`. Add the hexagon to the `PLAY AS:` line via
   `describeHex` (from `agencyBands.ts`); ensure raw personality text is not double-sent alongside
   the bands. `minifyNPC` must not emit raw personality if the directive now carries the hex
   bands — reconcile the two transport paths so the LLM sees ONE personality signal.

4. **Emit on-stage relations as words.** In the `[ACTIVE NPC CONTEXT]` assembly
   (`src/services/payload/payloadWorldContext.ts:~394`), for each pair of NPCs **both present
   on-stage**, emit a one-line `relationBand`-worded fact ("X and Y are Hostile"). Sparse: skip
   absent edges (Neutral default). Only on-stage pairs — never the whole graph.

5. **`pcRelation` band** — surface the re-homed PC edge as a word-band in `PLAY AS:` (this can
   reuse the existing `[Aff: …]` slot once `affinity` reading is migrated to `pcRelation` with a
   fallback to old `affinity` for un-migrated NPCs).

## Rules
- DATA stays; only the PAYLOAD changes. No field deletions this phase.
- No new LLM calls. Everything folds into the existing GM call (+0 cost).
- Numbers never reach the LLM — bands only.
- Update/adjust any snapshot/payload tests that assert the old `aff:NN` / pressure strings.

## DONE =
- `npm run build` green; payload no longer contains `aff:NN`, pressure block, or double
  personality; on-stage relations appear as words; existing tests updated + green.
