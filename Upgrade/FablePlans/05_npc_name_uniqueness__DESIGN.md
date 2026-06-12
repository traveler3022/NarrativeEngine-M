# NPC Name Uniqueness — Deterministic Swap Layer (Design Brief)

> Status: **DESIGN / DISCUSSION** — not yet approved for build. Two open decisions
> at the bottom must be answered before implementation. This doc is self-contained
> so it can be picked up cold in a local session.

## Problem

The story AI reuses NPC names. Players see seven different "Voss"es because each new
character is minted independently with no awareness of names already in the ledger.

Two failure shapes observed:
- **Name reuse**: a brand-new character is introduced with a name already owned by an
  existing NPC.
- **Bad disambiguation fallback**: `generateNPCProfile` (in
  `src/services/npc/npcGeneration.ts`) appends `' the Younger'` when its collision
  retry also collides — producing "Voss the Younger" instead of a real distinct name.

## What already shipped (prompt-level guards)

These are in place on branch `claude/blissful-faraday-5wnkow` and reduce — but do not
eliminate — the problem:

1. **`[RESERVED CHARACTER NAMES]` block** in the story payload
   (`src/services/payload/payloadWorldContext.ts`, `buildReservedNamesBlock`). Lists
   every ledger name (names only, archived included) and instructs the model: new
   characters get distinct names; shared family/clan/house surname allowed ONLY with an
   explicit in-story relation; first names never reused. Placed first among world blocks
   so budget trimming can't drop it.
2. **Reserved list fed into `generateNPCProfile`** initial + retry prompts so the
   generator avoids collisions up front.
3. **Detector hardening** (`src/services/npc/npcDetector.ts`): `classifyNPCNames` now
   matches symmetrically (so "Voss the Younger" / "Maren Blackwood" resolve to existing
   ledger entries "Voss"/"Maren" instead of duplicating), plus org-name blocklist
   additions.

**Limitation:** all of the above are *instructions*. A weak story model can still ignore
them. This brief covers the **deterministic backstop** that doesn't depend on model
compliance.

## Proposed architecture: deterministic name swap

Core idea (from product owner): stop hoping the prompt works. After the AI emits prose,
the engine detects a name collision and **mechanically swaps** the offending name with an
unused, culturally-consistent name drawn from a per-campaign pool.

```
AI GM emits prose
  → Engine detects newly-introduced name
  → Check against NPC ledger
  → If collision: draw replacement from campaign name pool (Math.random over unused names)
  → Rewrite prose with swapped name BEFORE display/archive/detection commit
```

### Hard problem 1 — the trigger is co-reference, not string match

"Voss" appearing in prose can mean (a) the *existing* Voss legitimately in the scene, or
(b) a *new* character being minted with a taken name. A naive "name in ledger → swap"
would rename the real Voss mid-scene and corrupt canon — **strictly worse than a
duplicate**.

Only fire the swap when **ALL THREE** hold:
1. Prose matches an **introduction pattern** (the detector's intro passes: "a man named
   Voss", role-apposition "the merchant Voss", first-ever-appearance phrasing) — NOT a
   bare mention.
2. The name **collides** with an existing ledger entry (first-name match; see relation
   rule below).
3. The colliding ledger NPC is **NOT on-stage / not in the active NPC context** this
   turn. If the existing Voss is plausibly present, it's almost certainly a reference →
   do nothing.

Ambiguous middle cases: **do not swap — flag instead.** A wrong swap is visible and
destructive; a duplicate is annoying but fixable. Bias toward inaction.

**Relation exception (preserve this):** key the collision on **first names only**.
"John Ashwood" when "Rick Ashwood" exists is legal/intentional (siblings, shared
clan/dojo surname like "Bluedragon"). Shared-surname-different-first-name must never
trigger a swap.

### Hard problem 2 — swap must precede everything downstream

The rewrite has to happen at a single canonical point **between generation and commit**,
before:
- **Display** — otherwise the player watches "Voss" turn into "Maddox" on screen.
- **Archive / embeddings / fact extraction** — otherwise you get a ghost: stored scenes
  say Voss, ledger says Maddox.

Implication: the swap lives in the **turn post-process pipeline**
(`src/services/turn/turnPostProcess.ts` / `turnOrchestrator.ts`), before the assistant
message is committed and before NPC detection runs on it. Either buffer the stream until
the check passes, or accept a brief post-stream correction pass (see Open Decision 1).

### Name pools — generate from campaign lore, don't hand-classify cultures

The risk in the owner's original sketch: static cultural pools (western / japanese /
arabic / …) plus per-campaign classification is exactly where "Hikaru shows up in a
western setting" sneaks back in. Mixed/cosmopolitan settings (the Shinobi world, a
port city) break hard classification.

**Cleaner approach — pool is generated from the campaign's own lore, once, at seed time:**
- One-shot utility call at campaign setup: *"Here's the lore doc. Give me ~150 first
  names and ~60 surnames that fit this world, grouped by faction/region if the lore
  defines them."*
- Store in the campaign bundle (`src/services/campaignBundle.ts` is the likely home).
- Mark names as consumed when assigned; background refill when the pool runs low.
- The pool is automatically culture-correct because it came from the same document that
  defines the culture. No criss-crossing.

The `Math.random()` draw then runs with **zero latency in the response path**.

This also makes the owner's proposed fallback ("unique name not in any group → ask
utility AI for 10 similar-vibe options") **mostly unnecessary** — the pool *is* the
pre-computed answer to that question. Keep the utility call only as the **cold-start
fallback**: campaign with no lore doc, or pool exhausted mid-session.

### Resulting layered defense

1. **Prompt guard** (shipped) — prevents most reuse, depends on model compliance.
2. **Pool-based deterministic swap** (this brief) — catches leaks, zero latency, no
   model dependency.
3. **Flag-don't-swap** for ambiguous co-reference cases — human/owner resolves.

## Relevant code (entry points for implementation)

- `src/services/npc/npcDetector.ts` — `extractNPCNames` (intro passes), `classifyNPCNames`
  (ledger collision logic, already symmetric). Trigger condition 1 & 2 live here.
- `src/services/payload/payloadWorldContext.ts` — `buildReservedNamesBlock`, active-NPC
  selection (`selectActiveNPCs`, on-stage logic). Source of "is the existing NPC on
  stage" for trigger condition 3.
- `src/services/turn/turnPostProcess.ts` / `turnOrchestrator.ts` — where the swap must be
  inserted (between generation and commit).
- `src/services/npc/npcGeneration.ts` — `generateNPCProfile`, current `' the Younger'`
  fallback to be retired once the pool exists.
- `src/services/campaignBundle.ts` — likely home for the persisted name pool.

## Open decisions (answer before build)

**Decision 1 — Streaming behavior.** Options:
- (a) Post-stream correction: text streams live, name visibly updates once at turn end.
  Lower perceived latency, but a brief visible flicker on the rare swap turn.
- (b) Buffer/hold stream until name check passes: clean, no flicker, but adds latency to
  *every* turn for a check that fires rarely.

**Decision 2 — Pool seeding.** Options:
- (a) Auto-generate the name bank from the campaign lore doc at setup time (utility call,
  stored in bundle). Hands-off, culture-correct by construction.
- (b) Hand-curated pools authored as part of the world files (like the `Example_Setup`
  docs), giving authors explicit control.
- (Not mutually exclusive: could auto-generate with author override.)

## Scope guardrails

- Do NOT swap on bare name mentions — introduction patterns only.
- Do NOT swap when the colliding NPC is on-stage.
- First-name collision only; respect the shared-surname relation exception.
- One canonical rewrite point; display/archive/detection all read post-swap text.
- Bias toward flagging over swapping in any ambiguous case.
