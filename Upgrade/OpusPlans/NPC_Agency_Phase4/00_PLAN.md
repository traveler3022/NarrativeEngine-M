# NPC Agency — Phase 4 Plan (Evolution + Retroactive Fill)

> Status: **PLAN / not built** — written 2026-06-16 (Opus) from a review session after Phase 3 shipped.
> Spec parent: `../dynamic_world__npc_agency__arc_direction__DESIGN.md` (§3, §9.2, §9.5–9.8).
> Phases 1–3 are DONE & green (schema, generation, tick engine). This phase closes the gaps that
> Phase 3 left as "scaffolded but not wired" — the ones that make NPCs **change over time** and make
> the system **work on old campaigns**. The Arc Direction / Oracle (System 2, §4) is still OUT of
> scope and tracked separately.

---

## 0. Why this phase exists (the two headline gaps)

The Phase-3 tick engine moves NPC *goals* off-screen, but two promises from the original design are
NOT yet real:

1. **Numbers don't move.** The personality hexagon, traits, and skill level are effectively
   **write-once** — set at creation or one-time migration, then frozen. The design (§9.2 #5) wanted
   later updates to be **+/− deltas** so character progression is *visible* over time. Right now the
   recurring AI update only edits free-text personality / drives / wants — it never touches the
   hexagon. So an NPC who trains for months looks numerically identical to day one.

2. **It must work retroactively.** For an existing campaign loaded from an old save, **any null/missing
   agency field should self-populate** so the engine works without the player re-authoring anyone.
   Lazy fill exists (`populateAgencyFields`) but only covers some fields, only fires for on-stage cast,
   and never re-checks. The invariant we want: *load an old campaign → within a few scenes every NPC is
   fully populated → the engine just works.*

The rest (promotion, rung ladder, collisions) are the design's deferred refinements, folded in here
because they share the same root: **NPCs should evolve, not just exist.**

---

## 1. The six missing pieces (priority order)

| # | Piece | One line | Priority |
|---|---|---|---|
| F | **NPC-update uses the LATEST schema** | the recurring AI update reads/writes the new fields (wants/hex/traits/relations/pcRelation), not legacy values | 🔴 headline |
| A | **Hexagon drift (+/− deltas)** | the AI update + the engine nudge hexagon axes over time, clamped −3..+3, surfaced as a SHIFT | 🔴 headline |
| B | **Null-backfill / retroactive fill** | every null agency field self-populates for any eligible NPC, over time, idempotently | 🔴 headline |
| C | **Power-rung ladder** | a real skill tier (Novice→Master + ceiling) that climbs on justified breakthroughs | 🟠 |
| D | **Promotion / audition** | engine promotes a dormant background NPC into a small deep-tier of agents; rotates membership | 🟠 |
| E | **Collisions / co-occurrence** | two NPCs converging on the same want/place → contested roll, tone from their relation | 🟡 |

> A and F are the same touchpoint (`updateExistingNPCs`) — build them together.

---

## 1b. Piece F — NPC-update must reflect the LATEST schema, not old values 🔴

**Problem:** `updateExistingNPCs` ([npcGeneration.ts:420](../../src/services/npc/npcGeneration.ts)) is still written
against the **pre-agency data model**. It sends the legacy values to the model and parses them back —
not the current schema. So the recurring update is operating on stale fields:

| What the update touches today | What it SHOULD touch (latest schema) |
|---|---|
| `drives` (coreWant/sessionWant/sceneWant) | `wants` (short/medium/long) — drives is superseded (§9.4) |
| raw `affinity` 0–100 | `pcRelation` (−3..+3) — affinity re-homed (§9.4 supersession map) |
| free-text `personality` only | `personalityHex` deltas (Piece A) + keep personality as flavor |
| — (never sent) | `traits` revisions, `relations` edges, `region` on travel |

**Why it matters:** the engine and the play-prompt already read the NEW fields (wants → goals, hex →
heat & directive, relations → scene). But the *update* writes the OLD ones — so over a campaign the two
drift apart: the model keeps editing `drives` while the engine ignores it, and the new fields silently
go stale. The update path must be migrated to the same schema everything else already uses.

**Build:**
1. **Send the latest values** in the `[CURRENT NPC STATES]` block: wants (not drives), `pcRelation`
   band, hexagon, traits, region. Stop sending `drives`/raw `affinity` (they're superseded).
2. **Parse into the latest fields:** want revisions (med/long text; short stays no-LLM), `pcRelation`
   delta, hexagon delta (shared with Piece A), trait add/remove (controlled vocab), relation edges.
3. **Never read a superseded value as the source of truth.** Where both exist on a migrated NPC, the
   new field wins; the legacy field is read-only fallback for un-migrated NPCs only (then Piece B fills it).
4. Guard: deltas/word-bands only — no raw number ever leaves to the payload (carry the Phase-3 rule).

This is the single highest-leverage fix in Phase 4: it stops the data model from quietly forking.

---

## 2. Piece A — Hexagon drift (the +/− delta) 🔴

**Goal:** the 6 axes (drive, diligence, boldness, warmth, empathy, composure) move over a campaign so
growth is visible — exactly the design's "+/− delta" intent. Always clamped to **−3..+3**; moves are
**small and rare** (±1), never resets.

**Two complementary sources (build both):**

| Source | Trigger | Cost | Notes |
|---|---|---|---|
| **On-screen (AI update)** | a transformative scene for the NPC | +0 (folds into existing `updateExistingNPCs` call) | add the current hexagon to the update prompt; accept `{axis: +1/-1}` deltas ONLY; reject anything bigger; clamp |
| **Off-screen (engine)** | a goal resolves in the tick engine | +0 (pure) | map outcome → axis nudge (e.g. crit-success on a combat goal → `+boldness` toward ceiling; repeated failure → `−composure`) |

**Wiring:**
- Extend `updateExistingNPCs` ([npcGeneration.ts:420](../../src/services/npc/npcGeneration.ts)): include `personalityHex` in the
  `[CURRENT NPC STATES]` block and in the allowed-changes list; parse `changes.personalityHex` as a
  **delta map**, apply with clamp, never accept a full overwrite.
- Reuse the existing `previousSnapshot` + `buildDriftAlert` pattern
  ([npcBehaviorDirective.ts:72](../../src/services/npc/npcBehaviorDirective.ts)) so the player/LLM sees
  `SHIFT: boldness 1→2` — progression becomes legible, per §9.4.
- Add a `hexDelta(axis, by)` pure helper (clamp, immutable) so both sources share one path; unit-test it.

**Guardrail:** deltas only. A drift that lets the AI rewrite the whole hexagon re-opens the
"numbers are meaningless" problem. ±1 per transformative event, capped at the ceiling (Piece C).

---

## 3. Piece B — Null-backfill / retroactive fill 🔴

**Requirement (player's words):** *"if value is null it should be populated so it can work for
retroactive RPG."* Loading any old campaign must converge to a fully-populated, engine-ready ledger
with zero manual authoring.

**The invariant:** for every agency field the engine reads, there is exactly one of:
(a) a safe non-null default, or (b) a lazy fill that runs until it's populated. No engine path may
silently no-op because a field was null.

**Fields that must be covered (audit each):**

| Field | Default vs. fill | Today |
|---|---|---|
| `personalityHex` | LLM fill (batched) | ✅ filled lazily |
| `traits` | LLM fill | ✅ filled lazily |
| `region` | LLM fill | ✅ filled lazily |
| `wants` (short/med/long) | pool draw + LLM long | ✅ seeded |
| `goalRecords` | derived from wants (pure) | ✅ on first tick |
| `pcRelation` | default Neutral (0) or migrate from `affinity` | ⚠️ partial |
| `relations` | default `{}` (sparse, Neutral) | ⚠️ check |
| `skillRung` / `ceiling` (Piece C, new) | LLM fill once + default Novice | ❌ new |

**Make the fill robust (3 changes to `populateAgencyFields`):**
1. **Cover all fields**, including the new rung (Piece C) and explicit empty-object seeds for `relations`.
2. **Don't depend on being on-stage.** Add a slow **background sweep**: each turn, take the next N
   un-populated eligible NPCs (not just the on-stage cast) and queue a batched fill, so a whole old
   campaign converges over a handful of scenes instead of only the NPCs you happen to mention.
3. **Idempotent + null-guarded** (already true) — only ever writes a field that is currently
   null/empty; never clobbers authored values. Add a test that re-running over a fully-populated
   ledger is a no-op.

**One unifying function (§9.3 hole 6):** this is the same `bulkNpcUpdate(npcIds, {needsGeneration})`
the design wants for big-bang relocation (graduation). Build it once; retroactive migration and
bulk relocation are the same call.

---

## 4. Piece C — Power-rung ladder 🟠

The design's strongest idea (§3c) and the player's "training result update." Today goals complete and
`canCrossTier`/`consumeTierCross` exist but **nothing calls them and there is no rung field.**

**Build:**
- New optional field(s) on `NPCEntry`: `skillRung?: number` (0=Novice … 4=Veteran/Master) + `rungCeiling?: number` (talent cap). Default Novice; ceiling LLM-set once (Piece B fills it).
- On a goal hitting `achieved` **with** `justifiedEventFlag` (the §9.7 both-conditions rule):
  call `consumeTierCross`, then bump `skillRung` by 1 **only if** below `rungCeiling`.
- Surface as a SHIFT word-band ("Skilled → Expert"); the rung is what the GM sees, never a raw number.
- Crit-success sets the flag (already wired); grinding alone can never cross a tier (already enforced
  by `canCrossTier`). This is mostly *wiring + one field*, not new formula work.

Ties to Piece A: a tier-cross can also grant a one-time hexagon nudge toward the relevant axis.

---

## 5. Piece D — Promotion / audition 🟠

Today selection is **flat**: every nearby eligible NPC is an agent; the heartbeat picks one at random.
The design (§3b) wanted most NPCs to stay dormant **props**, with the engine **auditioning** background
ones and promoting only the active into a small deep tier.

**Build (kept cheap to avoid the "parade of irrelevant NPCs" failure):**
- A lightweight **activity score** per NPC (recent ticks / recent on-stage). Add an `agencyAgent?: boolean`
  or derive membership each beat.
- **Deep tier cap = 2–3.** Heartbeat ticks deep-tier agents preferentially; a rare **audition roll**
  lets one background proximate NPC act, and sustained activity **promotes** it (relegate on dormancy).
- Pure + dice-driven; reuse the proximity roster. No LLM.

> Risk noted in the design: promotion needs taste the engine lacks. Keep the deep tier tiny and lean on
> the already-curated small ledger. This is the riskiest piece — build it AFTER A–C and only if the
> playtest shows the flat model feels noisy.

---

## 6. Piece E — Collisions / co-occurrence 🟡

The heartbeat picks one NPC at a time, so NPCs never interact off-screen. Hook exists
(`opportunityBonus` in `goalScore`, always 0).

**Build:**
- During a beat/timeskip, detect **two NPCs** whose chosen goal + region coincide.
- Roll **solo vs. tangled**; if tangled, read the NPC↔NPC relation to set tone
  (allies cooperate, rivals contest, ego overreaches) and feed `opportunityBonus` / a contested roll.
- Output a single shared delta (the loser's failure feeds the winner's win, §3d).

---

## 7. Out of scope (tracked elsewhere)

- **System 2 — Arc Direction / the Oracle (§4):** inventing *new* plot threads/twists. Separate system,
  separate phase. Do not fold in here.
- **UI separation (§6 sol. 4):** meta-commands as buttons. Immersion hygiene, build any time.
- **Phase-4 bulk relocation UI** beyond the shared `bulkNpcUpdate` call (graduation big-bang).

---

## 8. Suggested build order & farming tiers

MVP-first, and **A + B before everything** (they're the headline and they de-risk the rest):

1. 🟣 **Piece B** scaffolding — audit fields, add background sweep, unify as `bulkNpcUpdate`, no-op test.
   *(Strong — high blast radius, touches migration + persistence.)*
2. 🟢 **Piece A** `hexDelta` pure helper + clamp + tests. *(Cheap — exact pure fn.)*
3. 🟣 **Piece F + Piece A** wiring — migrate `updateExistingNPCs` to the latest schema (wants/hex/traits/
   relations/pcRelation, drop drives/raw-affinity) AND fold in hexagon delta-only parse + engine nudge on
   resolve + SHIFT surfacing. Same function, one pass. *(Strong — prompt + parse, the §9.2 #5 payoff.)*
4. 🟠 **Piece C** rung field + wire `canCrossTier`→bump. *(Mid — bounded stateful.)*
5. **GATE: playtest** — does an NPC visibly grow (hexagon SHIFT + rung) across a few time-skips? If yes,
   continue; if the flat/no-collision world already feels alive, stop.
6. 🟠 **Piece D** promotion/audition. 🟡 **Piece E** collisions. 🟢 tests throughout.

Discipline carried from Phase 3: engine emits STATE never prose; normal turn +0 LLM / timeskip +1;
deltas only (no full overwrites); never let a raw engine number reach a payload; skip `isPC`;
all new numbers live in `agencyConstants.ts`.

