/**
 * Shared constants and helpers for utility-AI prompts (planner, archivist,
 * fact clusterer, NPC drift, lore check, etc.). These are NOT used for the
 * main story turn.
 *
 * Design: every utility prompt is built as
 *   [STATIC PERSONA] / [STATIC TASK + SCHEMA] / [STATIC RULES] /
 *   [STATIC FEW-SHOTS?] / [STATIC FOOTER] / INPUT_DELIMITER / [DYNAMIC DATA]
 *
 * Everything above the INPUT_DELIMITER is byte-identical across calls of the
 * same prompt type, which lets infrastructure prompt-caches reuse it.
 *
 * Output contract is unchanged: utilities still emit free-text JSON which is
 * parsed by extractJson / extractJsonRobust downstream.
 */

export const INPUT_DELIMITER = '----- INPUT -----';

/**
 * Strictest existing JSON-only phrasing in the codebase. Matches the wording
 * used by the retrieval planner today, which is the most carefully tuned.
 */
export const JSON_ONLY_FOOTER =
    'Respond with ONE JSON object only. No prose, no markdown fences.';

export const JSON_ARRAY_ONLY_FOOTER =
    'Respond with ONE JSON array only. No prose, no markdown fences.';

/** Anchor line to put immediately before INPUT_DELIMITER to keep attention on the schema. */
export const ANCHOR_BEFORE_INPUT =
    'Now produce the JSON described above for the INPUT below.';

// ─────────────────────────────────────────────────────────────────────────
// Personas (kept short — task + role only; the schema/rules carry the rest)
// ─────────────────────────────────────────────────────────────────────────

export const TTRPG_PERSONA_ARCHIVIST = 'You are a TTRPG campaign archivist.';
export const TTRPG_PERSONA_GM_ASSISTANT = 'You are a background GM assistant running silently.';
export const TTRPG_PERSONA_STATE_ANALYZER = 'You are a background game state analyzer.';
export const TTRPG_PERSONA_RETRIEVAL_PLANNER =
    'You are a retrieval planner for a TTRPG campaign archive. Output a JSON object that helps focus memory recall for the GM\'s next turn.';

// ─────────────────────────────────────────────────────────────────────────
// De-duplicated rule blocks (verbatim text pulled from current prompts so
// every callsite sees byte-identical instructions)
// ─────────────────────────────────────────────────────────────────────────

/** Canonical event types — kept as a single source so any future change updates all callers. */
export const EVENT_TYPES_LIST =
    'combat, discovery, item_acquired, item_lost, relationship_shift, travel, promise, betrayal, death, revelation, quest_milestone, other';

/** Pulled from saveFileEngine.ts (was inlined as `knownByRules`). */
export const KNOWNBY_RULES = `KNOWNBY RULES:
- knownBy: list the canonical NPC IDs of characters who WITNESSED or could reasonably know this fact.
- For rules_lore and locations categories, knownBy should be omitted or null (broadcast knowledge — everyone can know).
- For npc_events, promises_debts, party_facts, world_state, and misc: list only NPCs who were present or directly informed.
- If the fact is public knowledge (announced publicly, observed by all present), list all witnesses.
- If unsure who knows, omit knownBy (treated as broadcast).`;

/** Pulled from saveFileEngine.ts NPC INNER STATE RULES. */
export const NPC_INNER_STATE_RULES = `NPC INNER STATE RULES:
- "npcInnerState" captures an NPC's beliefs, posture, and attitude AFTER this chapter's events — NOT a list of events ("X happened").
- Write what is true about the NPC's inner world now: what they believe, how they regard other characters, what has shifted in them.
- 1-2 sentences max per NPC. Aim for texture and specificity, not plot recaps.
- Include ONLY NPCs whose inner state meaningfully shifted during this chapter. Omit NPCs with no arc movement.
- Example: "Helena Broadmarsh": "Pale, processing the violation of natural order; trusts Grey absolutely but now fears him."
- If no NPC inner state shifted meaningfully, output "npcInnerState": {}.`;

/** Pulled from saveFileEngine.ts SCENE EVENT RULES. */
export const SCENE_EVENT_RULES = `SCENE EVENT RULES:
- eventType MUST be one of: ${EVENT_TYPES_LIST}
- importance is 1-10 (same scale as chapter importance)
- text is one short sentence describing what happened
- characters/locations/items/concepts are optional arrays of canonical names (use NPC names from the ledger above when possible)
- cause/result are short plain-text causal beats (one short clause each, optional)
- Cap at MAXIMUM 3 events per scene. Skip scenes with nothing meaningful (use [] or omit the scene key).
- Only include scenes from this chapter's scene IDs.`;

/** Pulled from npcGeneration.ts APPEARANCE UPDATE RULES. */
export const APPEARANCE_UPDATE_RULES = `APPEARANCE UPDATE RULES:
- "appearance" should only be updated if the prose explicitly describes a CHANGE to the NPC's physical state (e.g., they received a new scar, changed clothing, aged). Do NOT update appearance just because the AI re-describes them — preserve the original canonical description.
- If appearance is currently blank or "[inferred]" and the new prose provides concrete details, update it with those grounded details.`;

/** Pulled from npcGeneration.ts DRIVES UPDATE RULES. */
export const DRIVES_UPDATE_RULES = `DRIVES UPDATE RULES:
- "drives" is an object with "coreWant", "sessionWant", and "sceneWant".
- "coreWant" is a deep character truth — almost never changes. Only update if a transformative event reshapes who this NPC is.
- "sessionWant" is their arc-level objective — update if the story has clearly moved to a new arc or their long-term situation shifted.
- "sceneWant" is their immediate scene-level goal — this changes OFTEN. Update whenever the scene context, NPC's situation, or conversation direction has shifted. Always include a new sceneWant if the old one is clearly resolved or irrelevant.
- If the NPC has "Drives: NOT YET POPULATED", you MUST provide ALL THREE drive fields (coreWant, sessionWant, sceneWant) plus at least one behavioralTrigger, one hardBoundary, and one softBoundary.
- Only include the "drives" field if at least one sub-field changed or needs to be populated.`;

// ─────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────

/**
 * Joins prompt sections with a blank line between them, skipping any
 * empty / null / undefined entries. Keeps callsites readable.
 */
export function joinPromptSections(...sections: Array<string | null | undefined>): string {
    return sections
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map(s => s.trim())
        .join('\n\n');
}
