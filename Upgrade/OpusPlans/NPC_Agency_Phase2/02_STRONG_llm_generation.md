# 02 — LLM generation extensions  🟣 STRONG (Claude — prompt engineering)

**Why Strong:** prompt design + robust JSON parse/validation of model output. Errors here =
malformed NPCs at scale.

## Scope
Two LLM-facing helpers + extend new-NPC generation. **Generation only — no dice/heat.**

### A. `generateLongWant(npc, ctx)` — the single long goal
- §9.8 E2: long is NOT a pool; the model grounds ONE long goal against bio + faction, seeded by
  archetypes (`ascend to power`, `become the strongest`, `avenge/restore`, `transcend/transform`).
- Output: one concise string. Validate non-empty; fall back to a faction-appropriate default.

### B. `translatePersonalityToHex(personalityText)` — text → 6 numbers (§9.2 #5)
- Ask the model to rate the NPC on the 6 axes (drive, diligence, boldness, warmth, empathy,
  composure), each an integer **-3..+3** (0 = average). Provide the axis meanings in the prompt.
- Parse to `PersonalityHex`; **clamp each to -3..+3**; default missing axes to 0.
- This runs on the **utility/generation model**, not the story model.

### C. Extend `generateNPCProfile()` (`npcGeneration.ts:97`)
New NPCs should come out already populated:
- add `wants` (short/medium via work-order 03's pool draw — import, don't duplicate; long via A),
- add `personalityHex` (via B, from the personality text the same call produces),
- add `traits` (≤5 from controlled vocab — let the model pick from `TRAIT_NAMES`, validate against
  it, drop unknowns, cap 5),
- add `region` (from context if available, else ''),
- set `populated: true`.

## Rules
- Reuse the existing provider/call + JSON-parse helpers in `npcGeneration.ts` (match its style).
- Validate everything from the model: clamp hex, filter traits to known vocab, cap counts.
- Numbers are engine-internal — never surface them in prose; this is data generation only.
- Respect `matureMode` (passed through) when allowing mature traits/wants.

## DONE =
- New NPCs generate with wants/hexagon/traits/region/`populated:true`; `npm run build` green;
  a malformed-model-output path is handled (no crash, sane fallbacks).
