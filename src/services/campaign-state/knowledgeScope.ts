/**
 * knowledgeScope.ts
 *
 * Pure helpers for the Knowledge Compendium (NPC omniscience cage).
 * No I/O, no side effects — fully unit-testable. See Upgrade/OpusPlans/NPC_Omniscient/.
 *
 * knownBy token grammar: "player" | "npc:<id>" | "faction:<name-normalized>".
 *   undefined = public/broadcast.  [] = secret (no NPC knows).
 */

/** Normalize a faction string for matching: lowercase, trim, collapse internal whitespace. */
export function normalizeFaction(s: string): string {
    return (s ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Normalize a raw subject slug from the LLM into a stable token.
 * lowercase → spaces/dashes to underscore → strip everything but [a-z0-9._] →
 * collapse separator runs → trim separators → cap at 40 chars.
 * "Alex.Status" -> "alex.status"; "alex status" -> "alex_status"; "  " -> undefined.
 */
export function normalizeSubjectToken(raw: string): string | undefined {
    if (!raw || typeof raw !== 'string') return undefined;
    let s = raw.toLowerCase().trim();
    s = s.replace(/[\s-]+/g, '_');        // spaces & dashes -> underscore
    s = s.replace(/[^a-z0-9._]/g, '');    // drop any other punctuation
    s = s.replace(/[._]{2,}/g, m => m[0]); // collapse separator runs to the first char
    s = s.replace(/^[._]+|[._]+$/g, '');  // trim leading/trailing separators
    if (s.length > 40) s = s.slice(0, 40).replace(/[._]+$/, '');
    return s || undefined;
}

export type KnownByToken =
    | { kind: 'player' }
    | { kind: 'npc'; id: string }
    | { kind: 'faction'; name: string }; // name already normalized-lower

/** Parse a single knownBy token. Returns null for malformed tokens (caller should ignore). */
export function parseKnownByToken(tok: string): KnownByToken | null {
    if (typeof tok !== 'string') return null;
    const t = tok.trim();
    if (t.toLowerCase() === 'player') return { kind: 'player' };
    if (t.startsWith('npc:')) {
        const id = t.slice(4).trim();
        return id ? { kind: 'npc', id } : null;
    }
    if (t.startsWith('faction:')) {
        const name = normalizeFaction(t.slice(8));
        return name ? { kind: 'faction', name } : null;
    }
    return null;
}

/**
 * Does any currently on-stage character know this fact?
 *   undefined knownBy => true (public).  [] => false (secret, no NPC knows).
 *   "npc:<id>" matches iff id is on stage.
 *   "faction:<name>" matches iff some on-stage NPC's faction normalizes to <name>.
 *   "player" never makes a fact "known" to an NPC (the player is not an NPC).
 */
export function isKnownToAnyOnStage(
    knownBy: string[] | undefined,
    onStageNpcIds: string[],
    npcLedger: { id: string; faction?: string }[],
): boolean {
    if (knownBy === undefined) return true; // public
    if (knownBy.length === 0) return false; // secret
    const onStage = new Set(onStageNpcIds);
    const presentFactions = new Set<string>();
    for (const npc of npcLedger) {
        if (onStage.has(npc.id) && npc.faction) {
            const f = normalizeFaction(npc.faction);
            if (f) presentFactions.add(f);
        }
    }
    for (const tok of knownBy) {
        const parsed = parseKnownByToken(tok);
        if (!parsed) continue;
        if (parsed.kind === 'npc' && onStage.has(parsed.id)) return true;
        if (parsed.kind === 'faction' && presentFactions.has(parsed.name)) return true;
        // 'player' is intentionally not an on-stage NPC knower.
    }
    return false;
}
