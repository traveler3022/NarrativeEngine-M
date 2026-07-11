/**
 * @refactor RF-010 (real extraction — W5)
 * @waves W5
 * @see architecture/POSTMORTEM_W4.md
 *
 * NPC lifecycle service — owns embedding/cleanup logic for NPC mutations.
 *
 * EXTRACTED from npcSlice.ts. The slice previously contained this logic
 * and imported embedding/storage services directly (state→domain violation).
 * Now the slice only holds state; this service does the work.
 */

import type { NPCEntry } from '../types';
import { embedText, getCurrentModelId } from './embedding';
import { embeddingStorage } from './storage/embeddingStorage';
import { imageStorage } from './storage/imageStorage';
import { buildNPCEmbeddingText, findLedgerMatches } from './npc';

/** Re-embed an NPC after its embeddable fields change. */
export function reembedNPC(campaignId: string, npc: NPCEntry): void {
    embedText(buildNPCEmbeddingText(npc))
        .then(vec => vec && embeddingStorage.store(campaignId, npc.id, Array.from(vec), 'npc', getCurrentModelId()))
        .catch(e => console.warn(`[NPC] Re-embed failed for ${npc.name}:`, e));
}

/** Delete an NPC's embedding vector and portrait. */
export function deleteNPCAssets(campaignId: string, npcId: string): void {
    embeddingStorage.deleteByTypeAndId(campaignId, 'npc', npcId)
        .catch(e => console.warn('[NPC] Vector delete failed:', e));
    imageStorage.deletePortrait(campaignId, npcId)
        .catch(e => console.warn('[NPC] Portrait delete failed:', e));
}

/** Check if a name collides with existing ledger entries. */
export function nameMatchesLedger(name: string, ledger: NPCEntry[]): boolean {
    return findLedgerMatches(name, ledger).length > 0;
}
