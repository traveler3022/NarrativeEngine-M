# Dynamic World — NPC Agency & Arc Direction (Design)

> Status: **DESIGN / BRAINSTORM 2026-06-16** — not built, not scheduled. Captured from a
> long Opus brainstorm so the train of thought isn't lost. Self-contained; readable cold.
> Companion memory: `campaign-npcs-as-agents.md`. Relates to `product-direction-director-mode`.

---

## 0. Why this exists (the diagnosis)

Triggered by a real campaign: **Inkmark v2**, scene 338, "lost the fun." We peeled it
layer by layer; each layer corrected the last. The final root cause is **not** pacing,
prose, power-creep content, or a disabled engine. It's:

> **The protagonist (Hikaru) is "OP" only because he is the SINGLE AGENT in a world of
> fixed-level reactive props. The player had to author every arc-level turn himself →
> no surprise → no fun. You cannot be surprised by a plot you wrote.**

Unifying frame (credit: a Gemini full-context read of the campaign): the player is forced
to be **Author and Actor at the same time**. Every OOC command is a measurable instance of
the engine kicking the player out of character to do the GM's job:
- "Setup Shiro's backstory, her real name is Hotaru Tamamo" → installing a secret, not
  discovering one (zero shock value).
- "Let's do a 1st-year dark-horse side arc / 3rd-year excursion goes wrong" → scheduling
  one's own ambushes, then pretending to be surprised.
- "Change writing style / you did a stupid output I deleted / Toma is a spy, he doesn't
  document" → acting as editor.
- "My thread range is 15m not 2m / there are only 2 tattoo slots" → policing the rules.

**Smoking gun:** Alden is a transmigrator (same meta-knowledge cheat as the PC), introduced
arc 2, who has **never** deployed his prior-world knowledge, made a custom move, or grown.
A loaded gun that forgot it was a gun. Likewise Shiro→Hotaru was "dead weight / reactionary"
until the player *forced* an arc to give her agency. The forced arcs WORK — so the target
output already exists. **This project is about automating the character-development labor the
player already does well by hand, because doing it by OOC for a whole cast doesn't scale.**

Key reframe the player insisted on: this is **not antagonistic**. NPCs growing is an
**update function**, not a rival racing to beat the player. Alden getting stronger ≠ player
being beaten. It just means the world is alive. This dissolves the "being constantly beaten
feels bad" and the "how does a rival keep *pace*" (scaling) anxieties — both were artifacts
of an antagonistic framing.

---

## 1. The two systems (keep them separate)

The player correctly split the problem into two different mechanisms:

| | (1) NPC Agency Update | (2) Arc Direction Update |
|---|---|---|
| Operates on | **People** (their causes) | **Plot / world** (effects that reach the player) |
| Produces | tier/skill change, new want, disposition shift, assets, off-screen actions | new situation, hook, twist, the "what's the next arc about" |
| Driven by | **experience** (what happened to them) + their **want** | pacing + state from (1) + Oracle (fallback novelty) |
| Coherence | bounded by **growth envelope** | bounded by being **downstream of (1)** |

**Relationship:** (1) is the *causes*, (2) is the *effects reaching the player*. **(1) feeds
(2).** Most arc direction should *emerge* from NPC wins/failures/collisions (coherent by
construction). The **AI Oracle is (2)'s fallback**, not its engine — used only when the
NPC-driven plot is dry or a genuinely *new* vector is wanted (a threat that is no existing
agent). This keeps Oracle randomness rare and contained instead of being the "random
direction" generator the player hates.

---

## 2. Core architecture principles (decided)

1. **Engine × AI, two-pass.** Dice roll the bones; AI tells the story of what the bones
   said. Engine owns *when* and *whether-it-works* (cold, fair, un-gameable). AI owns *what
   it was* and *what it costs*. The AI **never decides success** — that removes its ability
   to fudge in anyone's favor (kills the "Yes-And" sycophancy trap).
   - REJECTED: a "Director LLM" that decides outcomes (Gemini Solution 1). An LLM deciding
     success is still an LLM — sycophancy moved up one floor. Keep **dice** as decider; LLM
     only interprets/narrates.

2. **Cheap model for simulation, premium model for the scene.** Off-screen ticks run on a
   cheap model (Flash/Haiku); the scene the player reads runs on the good model (Opus).
   Matches the user's model-usage preference (grunt work cheap, read-prose premium).

3. **Surprise WITH coherence (the standing requirement).** Every generated move must flow
   from established **want + kit + experience**, so it is surprising (player didn't author
   it) but never random. This is the line the player kept returning to: "spark life but NOT
   a random direction." Contrast the old WorldEvent/Trouble engines, which roll a DC off
   only the **last 10 messages** → noise. (worldEventActive was OFF; it was Mad-Libs
   who×where×why×what, producing lore violations like "Governor Tanaka walks into the
   neutral academy" — an Edelgard-strolls-into-your-classroom impossibility.)

4. **Failure is a story, not a no-op.** The outcome roll is not pass/fail gating. A failed
   move *turns* the world: a failed prediction means the threat hit *elsewhere* (new crisis);
   a humiliation creates an opening for the player; overreach humanizes the genius. Failure
   is often better story than success.

5. **Best beats = collision.** An agent's objective intersecting another agent's objective,
   or the player's active thread. Surprising but fully earned (both halves were already on
   the board).

---

## 3. System (1): NPC Agency Update

### 3a. Dossier — what promotes an NPC from prop to agent
Every NPC carries a **cheap, mostly-dormant stat line** (dormant = zero compute). The four
things that make an agent:
- **WANT** — the long game / direction of growth (the gradient; without it, "update" =
  arbitrary drift, not growth).
- **OBJECTIVE** — the current concrete step toward the want (changes over time).
- **KIT** — what they actually deploy (Alden: transmigrator trope-knowledge, combat-
  leadership, a grudge over his broken sword).
- **ASSETS** — what they've built/won so far (this *grows* = how they level alongside the
  player).
- **CLOCK / momentum** — when they last acted.
- **VISIBILITY** — what the player knows vs. what's hidden (seed of the delayed "holy
  shit").

### 3b. Emergence, NOT hero-building (the player's Q1)
A fixed, player-picked roster is hero-building with extra steps. The engine — not the player
— decides who rises, and it can pick someone never flagged (Thea Alcides, Selene Circe).
- Deep tier = **2–3 active agents max** (so they can compete / elbow — see 3d).
- A **rotating audition sample** of background NPCs gets one cheap "do you do something
  notable?" roll per beat. Almost all roll nothing. Occasionally one pops and is
  **promoted** into the deep tier. Membership rotates: promote on activity, relegate on
  dormancy. Spotlight is emergent; the surprise includes *who matters*.
- HONEST RISK: this is the riskiest piece. Done badly = a parade of irrelevant NPCs doing
  random things (the over-busy-world failure that makes "lost fun" worse). Promotion
  threshold needs taste the engine lacks. Even a bounded sample is real compute on a phone.

### 3c. Growth envelope (the player's Q2 — the prodigy cap) — STRONGEST IDEA
Stops two failure modes at once: arbitrary drift AND power absurdity (Thalia suddenly
wielding Gae Bolg and killing veteran instructors; Naruto can't train one month and beat
Kakashi). Coarse **rungs, not numbers**:

| | |
|---|---|
| Tiers | Novice → Competent → Skilled → Expert → Veteran/Master |
| Each NPC has | current rung + **ceiling rung** (talent) + slope (speed) |
| Rule | growth crawls toward ceiling with diminishing returns; cannot cross a tier without a *justified event* (breakthrough, new tattoo, mentor, near-death) |

A prodigy (ceiling Expert, fast slope) climbs *toward* Expert over years and stays a notch
under Veteran instructors — forever, unless something earns the jump. Dice operate *within*
the envelope, so they can never roll someone into a god. The envelope IS the coherence fence.
- HONEST LIMIT: rungs are clean for **discrete** things (slots, range = numbers — store &
  enforce programmatically, never let the LLM touch them). They're **fuzzy** for judgment
  ("is what Thalia just did within Expert?") — storing the rung is programmatic; judging an
  action against it still needs an LLM and is fallible.

### 3d. Competition / ego (the player's "agents elbow each other")
With 2–3 agents who know about each other, agent-vs-agent is a second free story layer.
**EGO = a volatility dial.** High ego → attempts harder objectives than it should (bigger
swings, more crits AND crit-fails), won't share credit, won't back down. When two agents'
moves land in the same space → **contested roll, ego as modifier**; loser's failure feeds
winner's win. Three optimizers (Alden, Agent B, the player) + dice = drama the player walks
into rather than writes.

### 3e. Worked example — Alden through the machine
> WANT: convinced he's the isekai protagonist; suspects the PC is a fellow transmigrator.
> TICK (during the player's 3-week forge): uses trope-knowledge to predict the Severed
> Throne's next target — and gets there first.
> SURFACES AS: player walks in to find Alden already saved someone the player didn't know
> was at risk, holding an artifact + reputation the player lacks — and looking at the PC
> like he's finally sure what they are.
> Player didn't write it. It isn't random. It makes the player go "holy shit."

---

## 4. System (2): Arc Direction Update

Runs **after** (1) each beat (causes before effects). Source priority:
1. Promote an existing agent's off-screen move (from System 1) into a plot hook. ← coherent,
   preferred path.
2. An agent collision → a plot event.
3. **AI Oracle** — only if 1 & 2 are dry, or to introduce genuine novelty / a new agent.

### 4a. The AI Oracle (Gemini Solution 2 — best of its four, but must be aimed)
Solo-RPG pattern (Ironsworn / Mythic GME): roll **abstract** words (Action: *Betray*,
Subject: *Supply*) from an agnostic internal table, then have a cheap LLM **ground them in
current lore** ("Hikaru is building The Anvil with Darius" → a steel shipment is intercepted
/ stamped by saboteurs).
- WHY it beats the old Mad-Libs WorldEvent: the *engine* never picks concrete who×where, so
  it can't manufacture "Tanaka in Convergence." The concreteness comes from grounding
  against real state.
- FLAW to fix: the abstract roll doesn't know the player's threads → can spark a twist
  that's lore-coherent yet *orthogonal* to what the player cares about = "random direction"
  returns. **Fix: point the Oracle at an existing agent or open thread, not the whole
  world.**
- REJECTED: Gemini's "database of excursion mishaps dropped on the player" = the Mad-Libs
  WorldEvent we already killed. Do not.

### 4b. Visibility / propagation
Each pending development gets a tier: **Hidden** (accrues silently → delayed reveal) /
**Report** (rumor, letter, a classmate mentions it) / **Direct** (lands on the player in a
scene). Optionally: outcome magnitude leaks visibility (a quiet crit-success is a hidden
time-bomb; a public crit-failure can't be hidden). Surface at the next seam.

---

## 5. How we RUN it — the heartbeat

Do **not** run updates every turn (expensive on mobile, floods the story). Two triggers only:

| Trigger | Mode | Why |
|---|---|---|
| **Time-skip** ("3 weeks forging") | **Batch** — simulate the whole gap | Where the freeze was felt most; big jump = NPCs return *changed*. Highest value, most bounded. **MVP trigger.** |
| **World-pulse at a seam** | **Trickle** — one small thing | Fires when tension is low / a thread just closed / N scenes since last pulse. Keeps the world breathing in real-time stretches. |

### Run order per beat (causes → effects)
**Pass 1 — NPC agency (per tracked agent + audition sample):**
1. dice: tempo roll — did this NPC act this beat? (can reuse the existing surprise/encounter
   **DC-with-reduction** mechanism as the move-timer — it's already built.)
2. if yes → outcome roll, **bounded by growth envelope** (crit-success → success → partial
   → failure → crit-failure).
3. cheap LLM interprets the roll into a concrete change grounded in **want + what happened**;
   writes to the dossier (tier / asset / disposition / new objective / off-screen action).

**Pass 2 — Arc direction (reads the now-updated world):**
4. scan: did any Pass-1 move produce a hook? did two agents collide?
5. if yes → promote the strongest into a "pending development" + visibility tier.
6. if nothing landed and pacing is flat → roll the Oracle, grounded against an open thread.
7. surface at the next seam.

One heartbeat, two passes, Oracle as relief valve.

---

## 6. The agnostic constraint (hard architectural boundary)

The app is **system-agnostic** — rules live in **world lore**, delivered by **RAG, which is
probabilistic retrieval**. Therefore:

> **A rule that lives only in lore will eventually be ABSENT on the exact turn it's violated.**
> (Almost certainly why Tanaka slipped — the neutrality rule existed in lore but wasn't
> retrieved/weighted that turn.) You cannot enforce with a layer that isn't guaranteed
> present. "Hardcode the rules" (Gemini round 1) is incoherent for this app.

Resolution (Gemini Solution 3 — Constraint Binding, the actual key): you don't hardcode
universal rules; you **lift the HARD ones OUT of soft RAG into a privileged, always-injected,
action-adjacent constraint layer.** The app already has the seed — `rulesRaw` uses
`<!-- rag: always, priority: 10 -->`. The gap is **mutable per-entity invariants** living as
structured state, injected right before the action:
- `Max Slots: 2 / Current: 2`, `thread range: 15m`, an NPC's `current tier / ceiling`.
- These are the same class of object as the growth-envelope rungs → the envelope becomes
  enforceable *because* it lives here, not in RAG. RAG **informs**; only the structured layer
  **enforces**.

**Blunt boundary:** an agnostic engine can only reliably enforce what's been lifted into
structured state. The more you want enforced (tiers, ranges, ceilings, slots), the more must
be **declared as structure up front**. That's still authoring — but **once, as setup**,
instead of repeatedly mid-scene as OOC. The whole project moves Author-work to *before* play
so that *during* play the user is only the Actor.

### Also worth taking (not core)
- **Gemini Solution 4 — UI separation:** meta-commands (time-skip, atmosphere shift, trigger
  complication, edit NPC) become **buttons/panels**, the roleplay box is strictly
  in-character. Cheapest certain win; great on mobile; preserves the cognitive boundary. BUT
  it's symptom relief — if the world still doesn't move on its own, the user *still authors*,
  just via buttons. Necessary, not sufficient.

---

## 7. Open problems (honest, unsolved)

1. **The off-screen experience source (the real crux).** The envelope says *how much* an NPC
   can grow; it doesn't say *what happened* to make them grow. On-screen change is grounded
   in real events; off-screen change must be *invented* — and the time-skip batch is exactly
   where invention is unavoidable, so that's where **continuity-rot** concentrates. Two paths,
   real tradeoff: (a) update only from on-screen events (safe, coherent, but they only grow
   when present) vs. (b) give them a thin off-screen life (alive — the thing the user
   actually misses across montages — but invites the Tanaka problem).
2. **Quantifying rungs/ceilings for free-form narrative** — coarse tiers help, but mapping
   "what an NPC just did" onto a rung is LLM judgment and will be inconsistent.
3. **Audition/promotion taste** — avoiding a parade of irrelevant background NPCs (noise).
4. **Batched-skip latency & cross-agent consistency** — several sequential cheap-LLM calls +
   dice + state writes per skip; agents' moves must not contradict each other. Tolerable for a
   skip (player expects time passing); means the seam-pulse must stay tiny.
5. **Seam / low-tension detection** — do it with cheap heuristics (scene type, scenes-since-
   last-pulse, thread-just-closed) before reaching for an LLM classifier.
6. **Yes-And / secret-holding friction** — for growth to feel like *discovery* not
   *installation*, the engine must hold secrets the player didn't author (assign wants,
   ceilings, hidden potential without asking, reveal through play). The user will instinctively
   want to override this, being used to being Author.

---

## 8. Suggested build order (MVP-first)

1. **Constraint layer (Section 6)** — lift one mutable invariant (e.g. tattoo slots, or a
   single NPC's tier) out of RAG into structured, always-injected, dice-checkable state. The
   only piece *guaranteed* to work; proves the enforcement architecture. Smallest viable slice.
2. **Time-skip batch update (System 1, Pass 1)** — one trigger, end-to-end: skip → tempo +
   outcome roll bounded by envelope → cheap-LLM interpret → dossier write, for 2–3 agents.
   This is where Alden froze; get one "you skipped 3 weeks and the world moved" moment working.
3. **Pass 2 surfacing** — promote a Pass-1 move into a pending development with a visibility
   tier; surface at the next seam.
4. **Audition/promotion (emergence)** — only after deep-tier agents feel good.
5. **Oracle fallback + seam-pulse (trickle)** — last; the relief valve and the real-time
   breathing.
6. **UI separation (Section 6)** — parallel/any time; cheap immersion hygiene.

> Decision gate after step 2: does one good "the world moved while I was away" moment make the
> user *want* to reopen the campaign? If yes, finish the stack. If a far simpler version (just
> force 2 NPCs to have an agenda each scene) already gives the "oh," the heavy machine is over-
> built — test the cheap version before committing.

---

## 9. HOW — the build plan (the player's implementation list)

> Added 2026-06-16 from a focused HOW session. Sections 0–8 are *why/what*; this is *how/what-
> we-touch*. Captured because the player kept finding holes and never reaching implementation —
> the fix is to **lock the phasing** so each hole lands in the phase that owns it instead of
> blocking the whole design.

### 9.0 Refined mechanics this session settled (carry into the phases)

These corrections supersede earlier loose wording:

- **Agency ≠ power-up.** The unit is an **action**; growth is one *rare* kind of action. A living
  world is mostly mundane (Castor lounges, Isolde reads), not everyone leveling. "NPC agency,"
  not "NPC power-up engine."
- **The 8 wants are two subsystems sharing one ledger field:**
  - **NEEDS** (the shorts: eat, sleep, release stress, change scenery) = depleting **meters**
    that satisfy → refill. Drive mundane action. Ungated, unbudgeted, ~no LLM.
  - **GOALS** (med/long: get strong, rebel into a royal house, beat Hikaru) = **directional**,
    advance via progress-quota, retire on completion. Drive the *budgeted* big events.
- **Selection = Maslow.** Needs gate goals: a hungry/tired/stressed NPC acts on the need this
  beat; only a satisfied NPC spends the beat on a goal. This makes the world breathe **cheaply**
  *and* self-rations escalation (needs crowd out constant grinding) before any hard cap applies.
- **Proximity comes from STRUCTURED STATE, not interaction logs.** `location` + `affiliations`
  + relationship edges + open-thread entanglement, with recency as a *decaying booster only*.
  Gareth stays cast-tier because he's co-located, even if un-interacted-with. Requires every
  cast NPC to carry `location`/`affiliations` fields.
- **Two scarcity mechanisms for two tiers** (don't conflate): **cast** (can't hide) → cap the
  *fuel* upstream at the roll (finite tracked artifacts, justified-event gating); **fog**
  (hideable) → cap the *reveal* downstream (≈2 big events/seam, staggered reveal queue, event-
  type cooldown, decay on stale banked reveals).
- **Hard gates live OUTSIDE the dice.** Karma moves *difficulty*; an absolute property moves
  *permission*. `Isolde.faithful + married_to=Gareth` → any romance-action by non-Gareth =
  pre-roll **auto-fail**, no roll. But the NPC **keeps the want** (wanting what you can't have
  is human) — it produces *behavior* (pining, jealousy, rivalry) not success, until a `divorce`
  event flips the flag.
- **Call budget is the whole point.** Normal turn **+0** LLM calls; seam **+0** (folded into the
  existing GM call); time-skip **+1 batched** (all NPCs); NPC promotion **+1 once** (frozen
  after). Simulation is dice/state; the LLM only *narrates what surfaces*, batched, at seams.

### 9.1 The 4-phase plan (lock this)

| Phase | Theme | LLM | Gate before next |
|---|---|---|---|
| **1** | **Schema + UI** — lift wants/personality/relations into structured state, make them visible in the ledger | none | a populated ledger is visible & migrates old saves |
| **2** | **Generation + lifecycle** — populate the data, maintain want completion | gen only | NPCs *have* full want/personality/relation data |
| **3** | **Tick engine** — make them move off-screen (heat, dice, karma, quotas) | sim none / narrate batched | one good "the world moved while I was away" beat |
| **4** | **Scale + integrate** — bulk relocation, feed relations into the live scene call | piggyback | — |

**Discipline:** Phases 1 & 2 require **zero** dice/heat/karma/quota decisions — those are all
Phase 3. Build the data model, *see* a living ledger, then tune formulas against real data.
Stop at the gate after Phase 2 and re-ask the decision gate (§8): does a populated ledger
already make you want to play, or do you need the ticks?

### 9.2 The player's 13 items, mapped to phases

**Phase 1 — Schema + UI**
1. Expand NPC ledger to support **8 wants**; DB supports it; visible in the ledger UI.
5. (fields) NPC **personality as numbers** (e.g. `drive: 2/10`) as ledger fields; later updates
   are **+/- deltas** so character progression is visible. *(translation logic = Phase 2; dice
   use = Phase 3.)*
11. (field) **Entity relationship for wants that touch another NPC** (Castor→Isolde, Isolde
    married Gareth) — stored as structured relation state.
13. (field) **NPC↔NPC entity relation values** in the ledger (each NPC holds a value toward
    each other).
14. (NEW field) **Characteristic / trait tags** — max **5** per NPC, drawn from a **controlled
    vocabulary** (each tag has a mechanical hook: hard-gates, heat bias, karma modifier — e.g.
    `faithful`→romance gate, `lazy`→low laze-heat, `cowardly`→worse danger rolls). **Player-
    editable** via a **searchable dropdown** in the ledger — this IS the player's veto (lock
    Isolde `faithful` so the engine can't NTR them; §7.6 override, made legitimate). Free-text
    flavor stays in the bio, separate from the mechanical tags.
15. (NEW field) **Location** — coarse **`region`** (academy / Ryuten) drives cast-vs-fog + off-
    screen tick eligibility; optional **`haunt`** (garden) is flavor for reports only. **NO fine
    spot/private/danger location ontology** — scene-presence is the GM's existing job, privacy is
    the existing Witness-Tracking system, danger is the stakes tag (§9.3 hole 2). Region changes
    only on travel/scene-transition, so the "player moves around" worry never touches the cast.
    - **`haunt`-interweave (simple version, decided):** pass the delta's `haunt` + a soft
      `mayBeVisible` flag to the GM and let it weave "seen from here" moments ("through the office
      window you catch Castor lounging in the park…") opportunistically, **+0 cost**. Accept that
      it's GM-judgment / occasional, not guaranteed. **Do NOT build a location adjacency graph**
      for reliable line-of-sight — flavor doesn't justify the ontology. Escape hatch: if "seen
      from here" turns out to be *core* fun rather than spice, revisit adjacency then.

**Phase 2 — Generation + lifecycle**
2. Expand NPC update/generation to emit **typed wants: 4 short / 3 med / 1 long** per NPC.
4. **Want pools**: short + med drawn from a pool; **long is LLM-generated at character
   creation.**
5. (translate) First `npcUpdate()` translates **personality text → number** via the engine.
3. Expand update/generation to **close finished wants**; a short want, once injected, is marked
   **complete immediately — no LLM call** for it.
6. NPCs flagged **protagonist / main character never get want updates** (the user controls them).

**Phase 3 — Tick engine**
7. **Dice formula + heat generation** so NPCs actually move on tasks; shorts usually win, but
   **heat builds on med/long** until the NPC works toward them.
8. **Med/long progress-quota** (engine-tracked count to completion) so a single long roll can't
   teleport a house into royalty — progress-based; the story AI narrates the *actions* toward it.
9. **Karma dice formula** → success / success-but… / fail-but… / fail, turning even "go eat in
   the cafeteria" into story (failed → bullied on the way? no food left? → a hook the story AI
   explains).
12. **Opportunity/co-occurrence roll**: if two NPCs trigger the same want in the same place,
    roll whether it's a solo or mingled activity; if mingled, read the **entity relation** to
    set the tone (friendly / good / neutral).

**Phase 4 — Scale + integrate**
10. **Bulk NPC update / lazy loading** for big-bang events (graduation): `Location: Deferred
    until next load`; when generating from a deferred value, a **special clause infers logically
    from the NPC's wants + faction background.**
13. (pass-through) When both NPCs are present in a scene, **feed their entity-relation into the
    existing story-AI call** as words ("X and Y are friendly," "X and Y are arch-enemies").

### 9.3 The 7 holes — RESOLVED (2026-06-16 bounce session)

Found while phasing; each now has a decided mechanic. Several **collapsed into each other** —
the 7 are really ~4 builds.

1. **Trigger + roster → DECIDED.**
   - **Fire** per player input via an **escalating-DC pity timer** (DC 20→15→10→5→0 until it
     triggers) — reuse the existing §5 "DC-with-reduction" mechanism. All engine, no LLM.
   - On fire: **random** pick among proximate NPCs (total random is fine — if Alden acts twice
     it's on him; the player can always force focus by *interacting* with an NPC, which makes the
     GM write about them anyway). Then a per-NPC roll picks which want progresses.
   - **Proximity scan = `region` granularity** (one indexed query: same region OR shared
     affiliation OR has edge). Coarse + stable → moving *within* a region never churns the cast;
     only *travel between regions* does (a discrete event = the `bulkNpcUpdate` hook).
   - **Off-screen ticks NEVER assert physical presence in the player's scene.** They write
     deltas; the GM decides visibility (report, on-visit, or "seen from here" interweave — see
     chat note). Fine "who's in the room" stays the GM's job, not the engine's.

2. **Scene danger signal → DECIDED (decoupled from Combat Mode).**
   - Primary: the **existing GM call emits a `sceneStakes` tag** (`calm / tense / dangerous`) as
     structured metadata — **+0 calls**, and semantic so it catches *political* danger, not just
     combat. Do **not** tie this to Combat Mode (that feature's fate is a separate question).
   - Fallback: if the GM omits the tag, fire a **cheap utility classifier** to read the scene.
   - **Telemetry:** log the fallback rate. Persistent fallback = the GM prompt is broken → fix
     signal, not a silent crutch.
   - This is the **action-context filter** too (old hole 4 merges here): `dangerous` blocks
     relaxing + long-goals, allows sustaining-needs + medium-goals (→ betrayal/drastic).

3. **Hard-constraint gate → DECIDED, and it's per-TRAIT not per-marriage.** The gate is driven by
   the new trait tag (§9.2 #14): `faithful` → pre-roll auto-fail for non-spouse romance;
   `promiscuous` → no gate (affair narrative + relationship fallout). Karma moves difficulty;
   traits move permission. The NPC keeps the want regardless (behavior, not success).

4. **(merged into hole 2.)** Action-context filter = the `sceneStakes` gradient.

5. **Need decay/refill → Phase-3 detail.** Needs are meters that deplete→satisfy→refill (Maslow
   engine, §9.0); goal-heat builds separately. Formula is Phase 3, designed against real data.

6. **Migration/backfill → DECIDED, no script.** `bulkNpcUpdate(npcIds, {region, needsGeneration:
   true})` stamps a flag across many NPCs with **zero generation**; actual generation runs
   **lazily on first use** (proximate + heartbeat fires), inferring wants/personality from
   **faction background + last-known want + relocation context**. **One function unifies migration
   (old saves) AND big-bang relocation (graduation).**

7. **Observability + surfacing → DECIDED (one digest, two views).** A pre-GM **digest**
   ("X/Y/Z triggered: …") is computed each fire and fed into the **single existing GM call** as
   context (+0 calls).
   - **Debug view** = everything (every roll/tick) → DebugPanel, for Phase-3 tuning.
   - **Player view** = only **Direct/Report** ticks. **Hidden** ticks go to state silently (debug-
     only) so the delayed "holy shit" reveal isn't spoiled.

---

## 9.4 What already exists + supersession / migration map (code-grounded 2026-06-16)

Read of the live pipeline. **~half of Phase 1 is extending existing types, and the word-band
trick is already in production** — Phase 1 is lower-risk than it looked.

### What already exists (reuse, don't reinvent)
- **Tiered wants** — `NPCDrives = {coreWant, sessionWant, sceneWant}` (`types/index.ts:377`).
  Already a 3-tier (long/med/short) want, as single strings.
- **The store-number/show-word band IS already shipped** — `affinityDescriptor(0-100)` →
  "Nemesis/Wary/Neutral/Devoted" (`npcBehaviorDirective.ts:3`). The hexagon is this pattern ×6:
  add six `descriptor(-3..+3)→bandName` fns, emit into the `PLAY AS` directive.
- **Hard/soft gates seed** — `hardBoundaries`→"WON'T:", `softBoundaries`→"RESENTS:"
  (`npcBehaviorDirective.ts:32`).
- **Progression visibility** — `previousSnapshot` + `buildDriftAlert` already emit "SHIFT:
  affinity 50→60" to the LLM (`npcBehaviorDirective.ts:57`). Reuse for hexagon shifts.
- **Two LLM transport paths**, both concatenated per-NPC into `[ACTIVE NPC CONTEXT]`
  (`payloadWorldContext.ts:394`): `minifyNPC` (dense line — **leaks raw `aff:50` + raw
  personality text**) and `buildBehaviorDirective` (word-banded `PLAY AS:`).
- **Active-NPC selection is MENTION-based** — `selectActiveNPCs` picks NPCs named in the last 10
  messages, cap 10 (`payloadWorldContext.ts:105`). This is "who's in the dialogue," **NOT**
  structural proximity. Our agency roster is a **separate, region-based** computation that sits
  *beside* this. Two notions of "active": *mentioned* (payload) vs *present* (agency).
- **No location field** on `NPCEntry` (has `faction`, `lastSeenTimestamp`, `lastUpdateScene`).
  Confirms `region`/`haunt` is genuinely new.

### Supersession decisions (the new system replaces old functions)
| Old | New | Migration discipline (DATA ≠ PAYLOAD) |
|---|---|---|
| `aff:50` in `minifyNPC` | drop from payload | stop **sending** now (redundant w/ word-band) |
| `npc.affinity` number | **NPC→PC edge in entity-relation graph** | **RE-HOME, don't delete** — migrate values into `relations[PC]` or every save loses NPC↔PC sentiment |
| NPC pressure injector | expired (heat/tick supersedes) | **stop injecting now**; delete tracker in a *later* cleanup (has test/UI tendrils) |
| `NPCDrives` (3 strings) | tiered 8-want system | **seed** from it: core→long goal, session→a medium, scene→a need (don't blank) |
| `hardBoundaries`/`softBoundaries` | traits system | **NOT 1:1** — boundaries are free-text specifics, traits are controlled-vocab switches. Let both coexist (traits drive engine gates; boundaries stay free-text "WON'T" flavor) or one-time-generate the conversion. No lossy collapse. |
| mention-based `selectActiveNPCs` | location-aware proximity roster | new computation **beside** it, not replacing |
| raw number/text in `minifyNPC` | word-bands via behavior-directive only | hexagon numbers **never** touch `minifyNPC` |

### New payload sends
- **Entity-relation between present cast NPCs** → emerging party drama, as words ("X and Y are
  arch-rivals"), folded into the existing `[ACTIVE NPC CONTEXT]` block (+0 calls).
- **Personality as word-bands** — self-describing; needs **no extra GM instruction line**.

### Governing principle (made precise)
> "Anything that clashes with the old function should not be sent."

Applied at **two layers, differently**:
- **Payload layer** — retire conflicting old signals *immediately* (no `aff:50`, no pressure
  injection, no double personality) so the LLM never sees contradictory signal.
- **Data layer** — *re-home* affinity → relation graph, *seed* wants from drives, *keep*
  boundaries as flavor. Code deletion is a **later** cleanup, once the new path is proven. This
  keeps existing campaigns intact while the LLM immediately sees only the new, cleaner signal.

### Decided shapes + cost decoupling (2026-06-16)
- **Relation-value scale = `-3..+3`, word-banded** (same store-number/show-word transport as the
  personality hexagon; one band-formatter reused; no raw number leaks to the LLM). Bands:
  `Arch-enemy / Hostile / Cold / Neutral / Friendly / Close / Devoted`.
- **Decouple NPC-UPDATE requests from stale/unused NPCs.** Today the auto-UPDATE path can spend
  tokens asking the LLM to update NPCs that are no longer in play. **Gate the update request by
  relevance** (cast/proximity + recently on-stage): only NPCs that are actually used get an
  update call. No point paying to update someone the campaign has moved past. Mirrors the agency
  roster's cast/fog split — fog NPCs neither tick nor get update calls.

### Q1/Q2 decisions (2026-06-16 PM session — locked with the PM)

**Q1 — relation-graph storage & scaling.** The graph is a **directed** entity-relationship table
(X→Y can differ from Y→X; asymmetry is correct — X may worship Y while Y despises X). The naive
full matrix (N×N) is REJECTED: 100 NPCs → ~9,900 edges, almost all meaningless. **"No opinion" is
the default Neutral and costs zero to store.** Four guards, cheapest first:
1. **Sparse adjacency list** — each NPC stores only its **non-neutral** edges (`relations?:
   Record<targetId, -3..+3>`); silence = Neutral. ~hundreds of edges, not ~10k. **(Phase 1)**
2. **Edges born from a CAUSE, never matrix-filled** — created only on shared faction, co-scene,
   a want that targets another NPC, or manual authoring. The graph can't self-explode. **(Phase 1)**
3. **Per-NPC cap** — a social-hub NPC keeps ~top-8 strongest edges; weakest/stalest decay to
   Neutral. No unbounded growth. **(Phase 3 — only bites once generation fills edges; tune then.)**
4. **Cast-tier only** — walk-ons/one-shots store no web at all. **(Phase 3.)**
- **Payload cost is FLAT regardless of total graph size:** the LLM only ever sees edges between
  NPCs **both present in the current scene** (folded into `[ACTIVE NPC CONTEXT]` as words). 10 NPCs
  or 1,000, the AI sees only the 1–3 on-stage pairs.
- **Dangling edges on NPC delete = tolerated** (resolve-by-id miss → treat as Neutral/skip);
  no cascade cleanup needed.
- **PC edge = dedicated slot, not a graph key** (the PC isn't a guaranteed ledger id). Re-home
  `npc.affinity` here.
- Context: the live NPC ledger is **already harshly curated / small**, so guards 3–4 are
  comfortably Phase-3 — the real-world edge count starts tiny.

**Q2 — want-generation wiring.** **REUSE the existing auto-UPDATE path** (don't build a parallel
generator). **Only MEDIUM/LONG goals ever cost an LLM call**; SHORT wants just draw from the pool
with **no LLM call**, and **repeats are intentional** (an NPC rolling "hungry" twice = a living
person, not a bug). Confirms §9.0 / §9.5-Piece-A: shorts are ungated background flavor.

---

## 9.5 Phase-3 formulas — Piece A (selection) + content-gating (2026-06-16)

> The Phase-3 corpus has 5 pieces in dependency order: **A** heat+selection · B karma dice+degrees ·
> C progress-quota · D timeskip curve · E trait vocab + want pools. **A is locked below; B–E open.**

### Piece A — the tick selection engine (GOALS are the engine, not needs)
Emphasis correction from the first draft: there is **no Maslow needs-floor**. Needs are background;
**goals drive everything**; the system exists so NPCs *do more than survive*.

- **No global clock / no background regen.** Heat only matters for the NPC **when chosen**. Nothing
  accumulates as a running process for absent NPCs. (If picked twice → "he was hungry," fine.)
- **Only GOALS (med/long) carry heat, via lazy neglect:**
  ```
  neglect = now − goal.lastAdvancedTick          // computed at tick-time, zero bg cost
  score(goal) = base_heat + neglect × drive_mult × context_allow + opportunity_bonus
  drive_mult: Driven ×1.5 … Listless ×0.6   |   context_allow = 0 if danger-tag blocks the tier
  ```
  → an ignored NPC's goal **festers** and erupts *big* when finally ticked (the anti-freeze + the
  surprise). No "he's sleepy after 50 turns" nonsense.
- **The tick:**
  ```
  heartbeat fires → pick NPC (random among region-proximate)
    1. context: danger? → long-goals blocked, survival-needs eligible
    2. COLOR ROLL (novelty): rare (~5%, higher for eccentric/impulsive) trait-bounded whiplash
    3. else → advance highest-score goal   (the common case)
    4. needs surface only if goals all blocked, or a rare flavor roll — NEVER from absence
  ```

### The want taxonomy, reshaped
- **Hunger / sleep / character-activity** = pure **flavor text**, barely modeled, surface only under
  danger or a rare flavor roll.
- **Intimacy / sexual** = a **story driver** (mate-seeking), folded into **GOALS** (medium), **NOT
  trait-gated — everyone has it — only tier-gated** (`mature` mode). Engine emits a structured *fact*
  (`partner, location, witnessed-by`); targets resolve against the relation graph + hard-gates
  (faithful/married → auto-fail/redirect). Completion → successor goal (keep/protect/jealousy = medium).
- **Novelty** = NOT a want; a rare **trait-bounded generative whiplash** (stern knight caught with
  ice cream). Rare-ness is what affords a small cheap-LLM generation. Respects mature tier gate.

### THE AGNOSTIC BOUNDARY (the architecture that makes it clean)
> **The engine emits STATE, never prose.** It produces "intimacy event / violent betrayal / blackmail
> leverage" as structured facts; the **story AI + the user's own model + their settings** decide how
> explicit the narration is. The dev is a state-machine author, NOT a content moderator.

Two **independent** gating layers:

| Layer | Role | Default |
|---|---|---|
| **Mature mode** | opt-in flag → unlocks `mature`-tier pool entries for engine *selection* (Warhammer-gore MC, political blackmail / bodily-exchange leverage, dark RP — a real market) | **OFF** |
| **Player traits / hard-gates** | per-NPC veto; override generation for the player's protected cast (lock Isolde `faithful` → no affair even in mature mode) | player-authored |

Composition: **mature mode = the world's ceiling; player traits = per-character floors.** They don't
fight. Dark RP fully reachable (agnostic) **and** the player keeps authority over their own cast (safe).
Age/content gating beyond these two layers is the consumer's responsibility (app shell, storefront, local law) — the engine is agnostic and emits state, not moral judgments.

### Pool structure (Piece E preview)
Every pool entry carries: `{ text, tier: 'default'|'mature', hook? }`.
Three pools: **trait vocab**, **want pool** (short/med; long stays LLM-gen), **action pool**
(context-filtered). `matureMode` gates `tier`; player traits gate per-NPC permission.

### New schema this turn
(none — `age` field removed; content gating is `tier` + player traits only)

### Still open (Phase-3 corpus): **C** progress-quota · **D** timeskip duration→tick curve ·
**E** trait/want/action pool contents (authoring, with the tier tags above).

---

## 9.6 Phase-3 formulas — Piece B (karma dice + degrees of success) (2026-06-16)

**B is the INNERMOST resolution** — runs only after the multi-tier gating upstream (heartbeat fired
→ NPC selected from proximate roster → goal chosen). It's a per-*selected-goal* cost, not per-turn.

**Two orthogonal mechanics stacked** (BG3 conflates them; we keep them apart):
- **Karma nudge** (BG3 "Karmic Dice" = anti-streak) → how *hard* the roll is.
- **Degrees band** (PbtA/D&D) → how the result *reads*.

### The roll — d20 vs DC, 6 bands by margin
(`d20` chosen for consistency with combat mode; d100 available later if finer band tuning wanted.)
```
roll = d20 + mods ;  margin = roll − DC

Critical Success : nat 20  OR margin ≥ +10
Success          : margin +3 … +9
Success, but…    : margin  0 … +2     ← barely → costs something
Fail, but…       : margin −1 … −3     ← just missed → a hook / silver lining
Failure          : margin −4 … −9
Critical Failure : nat 1   OR margin ≤ −10
```
Bell-ish spread: the **"but" bands sit in the fat middle (common)** = the story-rich partials;
crits are rare. 6 bands > 4 because the two "but" outcomes are where the story lives.

### Karma nudge — per-GOAL, hidden
```
each GOAL tracks failStreak (engine-only, NEVER in payload)
on resolve:  Fail/Crit-Fail → failStreak += 1 ;  any Success-tier → failStreak = 0
karma_bonus = min(failStreak × 2, +6)   // applied to NEXT roll's mods
```
After 3 straight fails → +6, can't deadlock (Alden-freeze killed at the dice layer). Resets on any
success so it never snowballs into auto-wins. **Per-goal, not per-NPC** — a streak on *this* pursuit
eases *this* pursuit only (global NPC-wide karma would be a weird "luck" stat; not needed for
anti-deadlock — add separately only if a "cursed week" flavor is ever wanted).

### Two exceptions that keep it coherent
1. **Hard gate is pre-roll and does NOT build karma.** `faithful`-locked target → forced *blocked*,
   `failStreak` untouched. Else karma would grind through the moral wall. Karma moves *difficulty*,
   never *permission*.
2. **Envelope caps the crit.** Crit Success advances the goal but **cannot cross a tier** — at most
   it sets `justifiedEventFlag` toward a future cross (Piece C owns the actual cross). Dice operate
   *within* the envelope, always — no crit rockets a Novice to Veteran.

### Output → feeds Piece C (progress) AND the surfacing budget
```
Crit Success : progress +2  (+ may set justifiedEventFlag)
Success      : progress +1
Success, but : progress +1  + COST/complication
Fail, but    : progress +0  + HOOK
Failure      : progress +0
Crit Failure : progress −1  (setback) + story consequence
```
Free integration: **crits + both "but" bands are exactly what's worth surfacing**; clean
success/fail on a minor goal resolves silently → the band table doubles as the 2-big-event
"is this interesting?" filter, no separate check needed.

### Consolidated GOAL record (all hidden columns in one place)
```
Goal (med/long) {
  text                          → reaches LLM (+ derived word-bands)
  horizon: 'med' | 'long'
  tier: 'default' | 'mature'  // content gate
  base_heat                   ┐
  lastAdvancedTick            │ Piece A (neglect = now − this)
  failStreak                  │ Piece B (karma, hidden)
  progress, quota             │ Piece C (anti-teleport)
  state: active|achieved|blocked|retired
  justifiedEventFlag?         ┘ set by crit, consumed by tier-cross (C)
}
```
Everything except `text` is engine-internal and never hits the payload.

---

## 9.7 Phase-3 formulas — Piece C (progress-quota) + Piece D (timeskip curve) (2026-06-16)

### Piece C — progress-quota (anti-teleport)
A goal completes only at `progress ≥ quota`; the band table in §9.6 supplies the increments
(`+2/+1/+0/−1`). `quota` scales with goal magnitude (tunable — these are knobs):
```
create custom spell ≈ 6     beat Hikaru ≈ 10     make house royal ≈ 20
```
A long-term goal **should NOT be finishable fast** — high quota is correct, not a bug.
**Tier-cross rule:** crossing a growth-envelope tier needs **both** `progress ≥ quota` **AND** a
`justifiedEventFlag` (set by a Crit Success, §9.6) — pure accumulation never crosses a tier. So
no amount of grinding turns a Novice into a Veteran without an earned breakthrough.

### Piece D — timeskip duration → tick budget (log curve)
Three properties at once: **total ↑ with duration**, **effective rate ↓**, **bounded.** Only a
logarithm does all three.
```
ticks_per_agent = min(CAP, round( k × log2(1 + weeks) ))      k ≈ 1.5   CAP ≈ 10   (tunable)
```
| Skip | → ticks | eff rate (ticks/wk) |
|---|---|---|
| 1 wk | 2 | 2.0 |
| 3 wk (forge) | 3 | 1.0 |
| 1 mo | 3 | 0.75 |
| 3 mo | 6 | 0.50 |
| 6 mo | 7 | 0.27 |
| 1 yr | 9 | 0.17 |
| 2 yr+ | 10 (cap) | →0 |

Effective rate collapses (2.0→0.17) while total still climbs (2→9) = "more than a quick skip, but
diminishing." Bindings: this is a **CEILING** (each tick still rolls a tempo check, can fail →
actual ≤ table); **goals-only** (needs skipped over months); **allocated to hottest goals first**
(festering goals pay off); surfacing still caps output at ≈2 reveals, rest bank/report. Cheap
(dice/state); only LLM cost = the single batched "what you return to" narration.

---

## 9.8 Phase-3 formulas — Piece E (pool contents) (2026-06-16) — SPEC COMPLETE

E is **never fully "done"** (pools grow forever) — so this is a **starter corpus + fixed structure +
the rule for adding entries**. Every entry: `{ text, tier: 'default'|'mature', hook? }`.

### E1 — Trait vocabulary (controlled, ≤5/NPC; each a SWITCH with a hook)
Rule: universal spectrum → hexagon axis (lazy = low Diligence, NOT a trait); specific switch/gate →
trait.

| Trait | Tier | Hook |
|---|---|---|
| `faithful` | default | hard-gate: blocks non-spouse romance targeting them |
| `promiscuous` | default | opens romance; +intimacy heat |
| `ambitious` | default | +long-goal base_heat; drive_mult ↑ |
| `vengeful` | default | relation ≤ Hostile → spawn revenge goal |
| `loyal` | default | gate: won't betray Close/Devoted |
| `cowardly` | default | karma penalty in `dangerous` context |
| `honorable` | default | gate: blocks underhanded actions |
| `proud` | default | ego: attempts above-tier goals (bigger swings) |
| `protective` | default | spawn protect-goals for Close/Devoted |
| `jealous` | default | rival in romance thread → spawn rivalry goal |
| `scheming` | default | unlocks manipulation/leverage MEDIUM goals (political) |
| `eccentric`/`impulsive` | default | ↑ novelty color-roll frequency |
| `sadistic` | mature | unlocks cruelty actions |
| `predatory` | mature | removes restraint on intimacy targeting |
| `bloodthirsty` | mature | unlocks gore/violence-for-pleasure (Warhammer-MC market) |
| `ruthless` | mature | unlocks coercion / bodily-exchange leverage (dark-political market) |

### E2 — Want pools
- **SHORT (needs/flavor, background):** `eat, rest, groom, train casually, read, drink, wander` —
  all default, no quota, no heat engine.
- **MEDIUM (goal templates):** master a skill • win a contest/duel/rank • earn wealth • gain
  mentor/ally • court a partner • uncover a secret • gain reputation •
  protect/keep someone • settle a grudge | **mature:** blackmail/leverage a rival • seduce for
  leverage • eliminate a rival.
- **LONG (NOT a pool — LLM-generated at creation):** archetype seeds for coherence — `ascend to
  power`, `become the strongest`, `avenge/restore`, `transcend/transform`; model grounds one
  against bio + faction.

### E3 — Action pools (verbs, context-filtered → then hexagon/trait-weighted)
| Context | default | mature (gated) |
|---|---|---|
| Peaceful | read, train, socialize, court, study, craft, travel, gossip, lounge | seduce, coerce |
| Dangerous | scout, guard, tend-wounded, ration, rally, retreat, **scheme, strike-first, betray** | torture, kill-for-pleasure |

Danger blocks leisure verbs and opens betrayal/drastic ones → "medium goal in danger → betrayal."

### Connection (one line)
A chosen **goal** (E2) picks a **verb** from the context-filtered **action pool** (E3), menu
pre-filtered by `tier`(mature), then **weighted by hexagon + traits** (E1) — the
`weighted_pick` from §9.0.

### Rule for growing pools (so E is never a blocker)
> Every new entry declares `{ text, tier }`; a **trait** additionally declares a
> **mechanical hook** (gate / heat-bias / karma-mod / goal-spawn). No free-text — every item is
> engine-readable. Structure fixed, content open.

### E1-expanded — Trait vocabulary (expanded corpus)

```json
[
  { "text": "faithful", "tier": "default", "hook": "gate: blocks non-spouse romance targeting them" },
  { "text": "promiscuous", "tier": "default", "hook": "heat-bias: raises intimacy heat" },
  { "text": "ambitious", "tier": "default", "hook": "heat-bias: raises long-goal base_heat; drive_mult up" },
  { "text": "vengeful", "tier": "default", "hook": "goal-spawn: relation <= Hostile -> spawn revenge goal" },
  { "text": "loyal", "tier": "default", "hook": "gate: won't betray Close/Devoted" },
  { "text": "cowardly", "tier": "default", "hook": "karma-mod: penalty in dangerous context" },
  { "text": "honorable", "tier": "default", "hook": "gate: blocks underhanded actions" },
  { "text": "proud", "tier": "default", "hook": "heat-bias: attempts above-tier goals (bigger swings)" },
  { "text": "protective", "tier": "default", "hook": "goal-spawn: spawn protect-goals for Close/Devoted" },
  { "text": "jealous", "tier": "default", "hook": "goal-spawn: rival in romance thread -> spawn rivalry goal" },
  { "text": "scheming", "tier": "default", "hook": "gate: unlocks manipulation/leverage medium goals" },
  { "text": "eccentric", "tier": "default", "hook": "heat-bias: raises novelty color-roll frequency" },
  { "text": "impulsive", "tier": "default", "hook": "heat-bias: raises novelty color-roll frequency" },
  { "text": "sadistic", "tier": "mature", "hook": "gate: unlocks cruelty actions" },
  { "text": "predatory", "tier": "mature", "hook": "gate: removes restraint on intimacy targeting" },
  { "text": "bloodthirsty", "tier": "mature", "hook": "gate: unlocks gore/violence-for-pleasure" },
  { "text": "ruthless", "tier": "mature", "hook": "gate: unlocks coercion/bodily-exchange leverage" },
  { "text": "superstitious", "tier": "default", "hook": "gate: blocks arcane actions without ritual preparation" },
  { "text": "mercenary", "tier": "default", "hook": "heat-bias: raises wealth goal priority" },
  { "text": "stubborn", "tier": "default", "hook": "gate: won't abandon current goal on failure" },
  { "text": "curious", "tier": "default", "hook": "goal-spawn: new information spawns investigate goal" },
  { "text": "territorial", "tier": "default", "hook": "gate: blocks voluntary retreat from home region" },
  { "text": "paranoid", "tier": "default", "hook": "karma-mod: penalty on trust-dependent rolls" },
  { "text": "generous", "tier": "default", "hook": "heat-bias: raises altruistic goal priority" },
  { "text": "secretive", "tier": "default", "hook": "gate: won't reveal hidden information voluntarily" },
  { "text": "pacifist", "tier": "default", "hook": "gate: blocks initiating violent actions" },
  { "text": "romantic", "tier": "default", "hook": "heat-bias: raises courtship goal priority" },
  { "text": "authoritarian", "tier": "default", "hook": "goal-spawn: power vacuum spawns dominate goal" },
  { "text": "nomadic", "tier": "default", "hook": "heat-bias: raises relocation goal priority" },
  { "text": "ascetic", "tier": "default", "hook": "gate: blocks luxury and wealth-pursuit goals" },
  { "text": "obsessive", "tier": "default", "hook": "heat-bias: doubles heat accumulation on current goal" },
  { "text": "mistrustful", "tier": "default", "hook": "gate: won't accept aid from Hostile/Cold relations" },
  { "text": "competitive", "tier": "default", "hook": "goal-spawn: peer success spawns rivalry goal" },
  { "text": "xenophobic", "tier": "default", "hook": "gate: blocks cooperation with out-group factions" },
  { "text": "pragmatic", "tier": "default", "hook": "karma-mod: bonus on partial-success outcome bands" },
  { "text": "oath-bound", "tier": "default", "hook": "gate: blocks actions violating sworn commitment" },
  { "text": "defiant", "tier": "default", "hook": "gate: blocks compliance with authority demands" },
  { "text": "opportunistic", "tier": "default", "hook": "goal-spawn: power shift spawns exploit goal" },
  { "text": "ritual-bound", "tier": "default", "hook": "gate: blocks major actions without completed routine" },
  { "text": "manipulative", "tier": "mature", "hook": "goal-spawn: detected weakness spawns exploit goal" },
  { "text": "possessive", "tier": "mature", "hook": "heat-bias: raises ownership/jealousy heat on Close relations" },
  { "text": "fanatical", "tier": "mature", "hook": "goal-spawn: ideological trigger spawns convert/destroy goal" },
  { "text": "addictive", "tier": "mature", "hook": "gate: can't refuse vice actions; karma-mod penalty on self-control" },
  { "text": "depraved", "tier": "mature", "hook": "gate: removes moral constraint gates from action pool" },
  { "text": "treacherous", "tier": "mature", "hook": "gate: can betray Close/Devoted without karma penalty" },
  { "text": "extortionist", "tier": "mature", "hook": "goal-spawn: compromising information spawns leverage goal" },
  { "text": "corrupt", "tier": "mature", "hook": "heat-bias: raises illicit/underhanded goal priority" }
]
```

### E2-expanded — Want pools (expanded corpus)

```json
[
  { "text": "eat", "tier": "default", "kind": "short" },
  { "text": "rest", "tier": "default", "kind": "short" },
  { "text": "groom", "tier": "default", "kind": "short" },
  { "text": "train casually", "tier": "default", "kind": "short" },
  { "text": "read", "tier": "default", "kind": "short" },
  { "text": "drink", "tier": "default", "kind": "short" },
  { "text": "wander", "tier": "default", "kind": "short" },
  { "text": "bathe", "tier": "default", "kind": "short" },
  { "text": "pray", "tier": "default", "kind": "short" },
  { "text": "forage", "tier": "default", "kind": "short" },
  { "text": "socialize casually", "tier": "default", "kind": "short" },
  { "text": "play a game", "tier": "default", "kind": "short" },
  { "text": "sunbathe", "tier": "default", "kind": "short" },
  { "text": "tidy", "tier": "default", "kind": "short" },
  { "text": "reminisce", "tier": "default", "kind": "short" },
  { "text": "daydream", "tier": "default", "kind": "short" },
  { "text": "smoke", "tier": "default", "kind": "short" },
  { "text": "snack", "tier": "default", "kind": "short" },
  { "text": "people-watch", "tier": "default", "kind": "short" },
  { "text": "collect curiosities", "tier": "default", "kind": "short" },
  { "text": "sketch", "tier": "default", "kind": "short" },
  { "text": "meditate", "tier": "default", "kind": "short" },
  { "text": "shop", "tier": "default", "kind": "short" },
  { "text": "master a skill", "tier": "default", "kind": "medium" },
  { "text": "win a contest", "tier": "default", "kind": "medium" },
  { "text": "earn wealth", "tier": "default", "kind": "medium" },
  { "text": "gain a mentor", "tier": "default", "kind": "medium" },
  { "text": "court a partner", "tier": "default", "kind": "medium" },
  { "text": "uncover a secret", "tier": "default", "kind": "medium" },
  { "text": "gain reputation", "tier": "default", "kind": "medium" },
  { "text": "protect someone", "tier": "default", "kind": "medium" },
  { "text": "settle a grudge", "tier": "default", "kind": "medium" },
  { "text": "find a home", "tier": "default", "kind": "medium" },
  { "text": "join a faction", "tier": "default", "kind": "medium" },
  { "text": "heal from trauma", "tier": "default", "kind": "medium" },
  { "text": "clear their name", "tier": "default", "kind": "medium" },
  { "text": "forge an alliance", "tier": "default", "kind": "medium" },
  { "text": "reclaim lost property", "tier": "default", "kind": "medium" },
  { "text": "craft a masterpiece", "tier": "default", "kind": "medium" },
  { "text": "escape a binding", "tier": "default", "kind": "medium" },
  { "text": "prove their worth", "tier": "default", "kind": "medium" },
  { "text": "secure a legacy", "tier": "default", "kind": "medium" },
  { "text": "find a lost person", "tier": "default", "kind": "medium" },
  { "text": "build a refuge", "tier": "default", "kind": "medium" },
  { "text": "win someone's trust", "tier": "default", "kind": "medium" },
  { "text": "lead a group", "tier": "default", "kind": "medium" },
  { "text": "cross a threshold", "tier": "default", "kind": "medium" },
  { "text": "restore a ruin", "tier": "default", "kind": "medium" },
  { "text": "blackmail a rival", "tier": "mature", "kind": "medium" },
  { "text": "seduce for leverage", "tier": "mature", "kind": "medium" },
  { "text": "eliminate a rival", "tier": "mature", "kind": "medium" },
  { "text": "corrupt an official", "tier": "mature", "kind": "medium" },
  { "text": "exploit a weakness", "tier": "mature", "kind": "medium" },
  { "text": "frame a rival", "tier": "mature", "kind": "medium" },
  { "text": "usurp a position", "tier": "mature", "kind": "medium" },
  { "text": "claim a consort", "tier": "mature", "kind": "medium" },
  { "text": "force a union", "tier": "mature", "kind": "medium" }
]
```

### E3-expanded — Action pools (expanded corpus)

```json
[
  { "text": "read", "tier": "default", "context": "peaceful" },
  { "text": "train", "tier": "default", "context": "peaceful" },
  { "text": "socialize", "tier": "default", "context": "peaceful" },
  { "text": "court", "tier": "default", "context": "peaceful" },
  { "text": "study", "tier": "default", "context": "peaceful" },
  { "text": "craft", "tier": "default", "context": "peaceful" },
  { "text": "travel", "tier": "default", "context": "peaceful" },
  { "text": "gossip", "tier": "default", "context": "peaceful" },
  { "text": "lounge", "tier": "default", "context": "peaceful" },
  { "text": "bathe", "tier": "default", "context": "peaceful" },
  { "text": "cook", "tier": "default", "context": "peaceful" },
  { "text": "garden", "tier": "default", "context": "peaceful" },
  { "text": "paint", "tier": "default", "context": "peaceful" },
  { "text": "sing", "tier": "default", "context": "peaceful" },
  { "text": "pray", "tier": "default", "context": "peaceful" },
  { "text": "meditate", "tier": "default", "context": "peaceful" },
  { "text": "shop", "tier": "default", "context": "peaceful" },
  { "text": "gamble", "tier": "default", "context": "peaceful" },
  { "text": "haggle", "tier": "default", "context": "peaceful" },
  { "text": "teach", "tier": "default", "context": "peaceful" },
  { "text": "heal", "tier": "default", "context": "peaceful" },
  { "text": "perform", "tier": "default", "context": "peaceful" },
  { "text": "compose", "tier": "default", "context": "peaceful" },
  { "text": "forage", "tier": "default", "context": "peaceful" },
  { "text": "dine", "tier": "default", "context": "peaceful" },
  { "text": "seduce", "tier": "mature", "context": "peaceful" },
  { "text": "coerce", "tier": "mature", "context": "peaceful" },
  { "text": "intimidate", "tier": "mature", "context": "peaceful" },
  { "text": "blackmail", "tier": "mature", "context": "peaceful" },
  { "text": "manipulate", "tier": "mature", "context": "peaceful" },
  { "text": "exploit trust", "tier": "mature", "context": "peaceful" },
  { "text": "scout", "tier": "default", "context": "dangerous" },
  { "text": "guard", "tier": "default", "context": "dangerous" },
  { "text": "tend-wounded", "tier": "default", "context": "dangerous" },
  { "text": "ration", "tier": "default", "context": "dangerous" },
  { "text": "rally", "tier": "default", "context": "dangerous" },
  { "text": "retreat", "tier": "default", "context": "dangerous" },
  { "text": "scheme", "tier": "default", "context": "dangerous" },
  { "text": "strike-first", "tier": "default", "context": "dangerous" },
  { "text": "betray", "tier": "default", "context": "dangerous" },
  { "text": "ambush", "tier": "default", "context": "dangerous" },
  { "text": "fortify", "tier": "default", "context": "dangerous" },
  { "text": "negotiate", "tier": "default", "context": "dangerous" },
  { "text": "scavenge", "tier": "default", "context": "dangerous" },
  { "text": "sabotage", "tier": "default", "context": "dangerous" },
  { "text": "evacuate", "tier": "default", "context": "dangerous" },
  { "text": "patrol", "tier": "default", "context": "dangerous" },
  { "text": "hold ground", "tier": "default", "context": "dangerous" },
  { "text": "disarm", "tier": "default", "context": "dangerous" },
  { "text": "rescue", "tier": "default", "context": "dangerous" },
  { "text": "torture", "tier": "mature", "context": "dangerous" },
  { "text": "kill-for-pleasure", "tier": "mature", "context": "dangerous" },
  { "text": "maim", "tier": "mature", "context": "dangerous" },
  { "text": "enslave", "tier": "mature", "context": "dangerous" },
  { "text": "terrorize", "tier": "mature", "context": "dangerous" }
]
```

---

> **§9 SPEC COMPLETE (2026-06-16).** Phase 1 fully specified; formula corpus A–E locked. Next
> session entry point: **build Phase 1** (schema + UI: tiered wants, hexagon w/ word-bands, traits,
> region/haunt, relation graph) — extend/re-home existing types per §9.4. Phase-3 formulas
> (§9.5–9.8) are ready to implement when Phase 3 begins; all numbers flagged tunable.
