# NPC Agency — Phase 4 Build Index (Evolution + Retroactive Fill)

> Spec: `../dynamic_world__npc_agency__arc_direction__DESIGN.md` §3, §9.2, §9.4–9.8
> Plan parent: `00_PLAN.md` (the six pieces + rationale). Phases 1–3 DONE & green.
> Phase 4 closes the "scaffolded but not wired" gaps: NPCs must **change over time** (numbers move)
> and the system must **work on old saves** (null fields self-populate). Arc Direction / Oracle
> (System 2, §4) stays OUT of scope.

---

## 🔒 Locked decisions (this session, 2026-06-17)
1. **Scope now:** Pieces **B, A, F, C** → 🚦 playtest gate → **D, E** only if the world still feels flat.
2. **Piece B has NO background sweep.** Fill stays **on-stage-only** (an NPC self-populates when first
   mentioned in a scene, as today). Old saves converge *as you encounter NPCs*, not eagerly.
   - **Consequence + required guard:** `buildProximityRoster` ([agencyHeartbeat.ts:23](../../src/services/npc/agencyHeartbeat.ts))
     filters by eligibility/proximity but **not `populated`**. Without the sweep, an un-mentioned
     proximate NPC could enter the roster unpopulated and the tick would no-op on it. So Piece B
     **adds a `populated` guard to the roster** instead of a sweep. Narrative logic: *an NPC only
     starts living off-screen after you've met them.*
3. **GLM 5.2 builds everything; Opus only authors the contract (WO-01) and does final integration.**

## Hard discipline (carried from Phase 3 — do not violate)
- **Engine emits STATE, never prose.** No raw engine number ever reaches a payload — surface as
  word-bands / SHIFT lines only (§9.5).
- **Deltas only, never full overwrites.** Hexagon/pcRelation/rung move by clamped ±1 deltas. A drift
  that lets the model rewrite the whole hexagon re-opens "numbers are meaningless."
- **Call budget:** normal turn **+0** (Piece A/F fold into the existing `updateExistingNPCs` call),
  timeskip **+1**. No new per-turn LLM call.
- **Skip `isPC` everywhere.** All new numbers live in `agencyConstants.ts`.
- **New field wins over legacy.** On a migrated NPC the new schema field is source of truth; the
  superseded legacy field (`drives`, raw `affinity`) is read-only fallback for un-migrated NPCs only.
- **Always `npm run build` (tsc -b), not just vitest** — F & G in earlier phases shipped build-breaks
  that only the real build caught.

---

## Model legend (rebalanced — GLM 5.2 is the primary builder)
| Tier | Model | Use for |
|---|---|---|
| 🟣 ARCHITECT | Opus / Claude | WO-01 contract (schema + knobs + supersession + `bulkNpcUpdate` shape); final integration, no-raw-number audit, full build. Does NOT implement pieces. |
| 🔵 BUILDER | GLM 5.2 | All pieces — pure helpers, prompt rewrite + parse migration, persistence wiring. Reviewed against the WO-01 contract. |
| 🟢 TESTS | Gemini Flash 3.5 | Pure-fn coverage, parse cases, idempotency no-op tests |

---

## Work-orders
| # | File | Piece | One line | Tier | Depends |
|---|---|---|---|---|---|
| 01 | `02_ARCHITECT_contract.md` | — | `NPCEntry` adds `skillRung?`/`rungCeiling?`; `agencyConstants` knobs (clamp bounds, rung tiers, drift caps); supersession map; `bulkNpcUpdate` signature; word-bands for hex-SHIFT + rung | 🟣 | P3 ✓ |
| 02 | `03_BUILDER_hexDelta.md` | A | `hexDelta(hex, axis, by)` pure helper — clamp −3..+3 (or rung ceiling), immutable, returns new hex | 🔵 | 01 |
| 03 | `04_BUILDER_pieceB_fill.md` | B | `populateAgencyFields` covers ALL engine-read fields (`relations:{}` seed, rung default); **`populated` guard in `buildProximityRoster`**; unify as `bulkNpcUpdate` | 🔵 | 01 |
| 04 | `05_BUILDER_pieceF_pieceA_update.md` | F+A | Migrate `updateExistingNPCs` to current schema: send/parse wants (not drives), `pcRelation` band (not raw affinity), hex **delta-only** parse + engine-resolve nudge, traits/relations; drop `drives`/raw-affinity from prompt; reuse `previousSnapshot`/`buildDriftAlert` → `SHIFT: boldness 1→2` | 🔵 | 01,02 |
| 05 | `06_BUILDER_pieceC_rung.md` | C | On goal `achieved` + `justifiedEventFlag` → `consumeTierCross` → bump `skillRung` if `< rungCeiling`; surface word-band; optional one-time hex nudge toward the goal's axis | 🔵 | 01,02 |
| 06 | (Opus, no file) | — | Final integration: confirm SHIFT/rung word-bands flow through the directive, no raw number leaks, `npm run build` + full test | 🟣 | 02–05 |
| — | 🚦 **GATE** | — | **Playtest: does an NPC visibly grow (hex SHIFT + rung) across a few time-skips?** If the flat world already feels alive, STOP. | — | 06 |
| 07 | `07_BUILDER_pieceD_audition.md` | D | activity score; deep-tier cap 2–3; audition roll promotes a background proximate NPC, relegate on dormancy; pure + dice, reuse roster | 🔵 | gate ✅ |
| 08 | `08_BUILDER_pieceE_collisions.md` | E | detect 2 NPCs same goal+region → solo vs tangled roll; tone from relation; single shared delta (loser feeds winner) via `opportunityBonus` | 🔵 | gate ✅, 07 |

> **GATE DECISION (2026-06-17): build D and E.** User wants both. **E is REFRAMED** (see WO-08): NOT
> autonomous off-screen NPC life — it's two PROXIMATE NPCs' events *tangling* into one shared beat the
> player witnesses, proximity-gated. D is needed to stop the flat random-pick parade bloating the cast.
> Knobs for both locked in `agencyConstants.ts`. WO-07/08 are LIGHT specs (rough direction; GLM designs,
> Opus checks) per the user's preferred workflow.
| 09 | `09_TESTS.md` | all | hexDelta clamp/edges; F parse (legacy/migrated/mixed, asserts no drives/raw-affinity written); B idempotent no-op over full ledger; rung ceiling-cap + grind-can't-cross | 🟢 | 02–05 |

---

## Sequence — headline-first (A+B+F de-risk everything)
1. **Opus ratifies + commits WO-01** (contract: types, knobs, supersession, `bulkNpcUpdate` sig). Nothing
   else starts until the contract is fixed — it's what lets GLM own the rest.
2. **GLM 02 (`hexDelta`)** — tiny exact pure fn, unblocks both A-wiring and C.
3. **GLM 03 (Piece B)** — field coverage + `populated` roster guard + `bulkNpcUpdate`. Highest blast
   radius (persistence/migration) — do early, Flash writes the no-op test alongside.
4. **GLM 04 (Piece F+A)** — the keystone: migrate `updateExistingNPCs`. Same function for F and A, ONE
   pass (do not split — avoids a merge conflict on the same touchpoint). Flash writes parse tests.
5. **GLM 05 (Piece C)** — rung field wiring on top of the now-correct update path.
6. **Opus 06** — integration + no-raw-number audit + `npm run build`.
7. **🚦 GATE — playtest.** Decide whether D/E are worth building.
8. **GLM 07 (D), 08 (E)** post-gate, only if needed. Flash tests throughout.

---

## Existing code to EXTEND / REUSE (grounded 2026-06-17 — do not reinvent)
- `services/npc/npcGeneration.ts::updateExistingNPCs()` (line ~420) — the **fork site**. Today it sends
  `Affinity x/100`, `CoreWant/SessionWant/SceneWant`, free-text `Personality`, and the examples teach
  the model to emit `drives`/`affinity`. Piece F rewrites the `[CURRENT NPC STATES]` block + the OUTPUT
  FORMAT/EXAMPLES + the parse switch (the `changes.drives`/`changes.wants` blocks at ~539).
- `services/npc/npcGeneration.ts::populateAgencyFields()` (line ~806) — the lazy-fill backbone. Piece B
  extends Phase 3 patterns; already idempotent + null-guarded + isPC-skipping. Add `relations:{}` seed,
  rung default; keep the empty-patch no-op.
- `services/npc/agencyHeartbeat.ts::buildProximityRoster()` (line ~23) — add the `populated` guard here.
- `services/npc/agencyProgress.ts::canCrossTier()/consumeTierCross()` (lines 48/56) — EXIST, nothing
  calls them. Piece C wires the call on goal `achieved` + `justifiedEventFlag`.
- `services/npc/agencyBands.ts` — band formatters; add the hex-SHIFT and rung word-bands here.
- `services/npc/npcBehaviorDirective.ts::buildDriftAlert()` (line ~72) — the `SHIFT:` surfacing pattern;
  reuse for hexagon drift so growth is legible.
- `services/turn/turnPostProcess.ts` (~363–407) — where `updateExistingNPCs`/`populateAgencyFields` are
  invoked (on-stage `existingNpcsToUpdate` set). Piece C's goal-resolve hook wires in beside these.
- `services/npc/agencyConstants.ts` — all new numbers (clamp bounds, rung tiers, drift caps) live here.

## After the gate
Playtest the "an NPC I trained months ago came back visibly stronger" beat. Then (separately) revisit
**System 2 — Arc Direction / the Oracle** (§4), still intentionally out of scope.
