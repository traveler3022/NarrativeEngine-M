/**
 * Pure helper functions for MemoryTab — hoisted from MemoryTab.tsx.
 *
 * These are stateless utilities (label formatting, chip coloring)
 * that don't touch the store or React. Keeping them separate makes
 * the main MemoryTab component easier to scan.
 */

import type { NPCEntry } from '../../types';
import { parseKnownByToken } from '../../services/campaign-state';

/** Human-readable label for a single knownBy token. */
export function knownByTokenLabel(tok: string, npcLedger: NPCEntry[]): string {
    const parsed = parseKnownByToken(tok);
    if (!parsed) {
        const npc = npcLedger.find(n => n.id === tok.trim());
        return npc ? npc.name : 'unknown';
    }
    if (parsed.kind === 'player') return 'the player';
    if (parsed.kind === 'faction') return `${parsed.name} members`;
    const npc = npcLedger.find(n => n.id === parsed.id);
    return npc ? npc.name : 'someone (removed)';
}

/** Render the knownBy list as a short "known to: ..." suffix string. */
export function knownBySummary(knownBy: string[] | undefined, npcLedger: NPCEntry[]): string {
    if (knownBy === undefined) return 'public';
    if (knownBy.length === 0) return 'secret (player only)';
    return knownBy.map(t => knownByTokenLabel(t, npcLedger)).join(', ');
}

/** Tri-state chip color for the knownBy summary in a row. */
export function knownByChipClass(knownBy: string[] | undefined): string {
    if (knownBy === undefined) return 'text-emerald-400';
    if (knownBy.length === 0) return 'text-red-400';
    return 'text-amber-400';
}

/** Derive a readable group label from a subjectToken slug. */
export function subjectLabel(token: string): string {
    const parts = token.split(/[._]/).filter(Boolean);
    if (parts.length === 0) return token;
    const pretty = parts.map(p =>
        p.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    );
    if (pretty.length >= 2) {
        const attr = pretty.pop();
        return `${pretty.join(' ')} · ${attr}`;
    }
    return pretty.join(' ');
}
