import { offlineStorage } from './storage';
import { embedText, isEmbedderReady } from './embedder';

export type SearchHit = {
    id: string;
    score: number;
};

export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

function dedupeSubChunks(hits: SearchHit[]): SearchHit[] {
    const bestByBase = new Map<string, SearchHit>();
    for (const hit of hits) {
        const baseId = hit.id.replace(/#w\d+$/, '');
        const existing = bestByBase.get(baseId);
        if (!existing || hit.score > existing.score) {
            bestByBase.set(baseId, { ...hit, id: baseId });
        }
    }
    const deduped = Array.from(bestByBase.values());
    deduped.sort((a, b) => b.score - a.score);
    return deduped;
}

export async function searchVectors(
    campaignId: string,
    queryVectors: number[][],
    type: 'scene' | 'lore',
    topK = 20,
    minScore = 0
): Promise<SearchHit[]> {
    const allEmbeddings = await offlineStorage.embeddings.getAll(campaignId, type);
    if (allEmbeddings.length === 0) return [];

    const scored = allEmbeddings.map(entry => {
        let maxScore = 0;
        for (const qv of queryVectors) {
            const s = cosineSimilarity(qv, entry.vector);
            if (s > maxScore) maxScore = s;
        }
        return { id: entry.id, score: maxScore };
    });

    scored.sort((a, b) => b.score - a.score);

    const filtered = minScore > 0 ? scored.filter(h => h.score >= minScore) : scored;

    const topHits = filtered.slice(0, topK);

    return dedupeSubChunks(topHits);
}

export async function semanticSearch(
    campaignId: string,
    queries: string[],
    type: 'scene' | 'lore',
    topK?: number,
    minScore?: number
): Promise<string[] | undefined> {
    if (!isEmbedderReady()) return undefined;

    const queryVectors: number[][] = [];
    for (const q of queries) {
        const vec = await embedText(q);
        if (vec) queryVectors.push(Array.from(vec));
    }
    if (queryVectors.length === 0) return undefined;

    const hits = await searchVectors(campaignId, queryVectors, type, topK, minScore ?? 0);

    if (minScore && minScore > 0 && hits.length === 0) {
        const allEmbeddings = await offlineStorage.embeddings.getAll(campaignId, type);
        let bestScore = 0;
        for (const entry of allEmbeddings) {
            for (const qv of queryVectors) {
                const s = cosineSimilarity(qv, entry.vector);
                if (s > bestScore) bestScore = s;
            }
        }
        console.log(`[turnContext] semantic search returned 0 above floor (best=${bestScore.toFixed(3)})`);
    }

    return hits.map(h => h.id);
}
