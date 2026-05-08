import { embeddingStorage, EMBEDDING_VERSION } from './storage/embeddingStorage';
import { embedText, isEmbedderReady, warmupEmbedder } from './embedder';
import { getList, k, type SceneRecord } from './storage/_helpers';
import { offlineStorage } from './storage';

export type BackfillProgress = {
    total: number;
    done: number;
    current: string;
};

let backfillCursor: { campaignId: string; type: 'scene' | 'lore'; index: number } | null = null;

function setBackfillCursor(cursor: typeof backfillCursor) {
    backfillCursor = cursor;
}

export function getBackfillCursor() {
    return backfillCursor;
}

export async function runBackfill(
    campaignId: string,
    onProgress?: (progress: BackfillProgress) => void
): Promise<void> {
    if (!isEmbedderReady()) {
        await warmupEmbedder();
        if (!isEmbedderReady()) {
            console.warn('[Backfill] Embedder not ready, skipping');
            return;
        }
    }

    const allRecords = await embeddingStorage.getAllWithVersion(campaignId);
    const outdated = allRecords.filter(r => r.version < EMBEDDING_VERSION);

    if (outdated.length === 0) {
        console.log('[Backfill] All embeddings up to date');
        return;
    }

    console.log(`[Backfill] ${outdated.length} outdated embeddings to re-index (version ${EMBEDDING_VERSION})`);

    const sceneRecords: SceneRecord[] = await getList(k(campaignId, 'scenes'));
    const sceneMap = new Map(sceneRecords.map(s => [s.sceneId, s]));

    const YIELD_EVERY = 10;
    let done = 0;

    for (let i = 0; i < outdated.length; i++) {
        const record = outdated[i];
        setBackfillCursor({ campaignId, type: record.type, index: i });

        if (record.type === 'scene') {
            const sceneRec = sceneMap.get(record.id);
            if (sceneRec) {
                const combinedText = `${sceneRec.userContent}\n${sceneRec.assistantContent}`;
                const vector = await embedText(combinedText);
                if (vector) {
                    await embeddingStorage.store(campaignId, record.id, Array.from(vector), 'scene');
                }
            } else {
                await embeddingStorage.deleteByTypeAndId(campaignId, 'scene', record.id);
            }
        } else {
            const baseId = record.id.replace(/#w\d+$/, '');
            const loreChunks = await getLoreChunksForBackfill(campaignId);
            const chunk = loreChunks.find(c => c.id === baseId) || loreChunks.find(c => c.id === record.id);
            if (chunk) {
                const vector = await embedText(chunk.content);
                if (vector) {
                    await embeddingStorage.store(campaignId, record.id, Array.from(vector), 'lore');
                }
            } else {
                await embeddingStorage.deleteByTypeAndId(campaignId, 'lore', record.id);
            }
        }

        done++;
        onProgress?.({ total: outdated.length, done, current: `${record.type}:${record.id}` });

        if (done % YIELD_EVERY === 0) {
            await new Promise(r => setTimeout(r, 0));
        }
    }

    const subChunked = allRecords.filter(r =>
        r.version < EMBEDDING_VERSION && r.type === 'lore' && r.id.includes('#w')
    );
    for (const oldSub of subChunked) {
        if (outdated.find(r => r.id === oldSub.id && r.type === oldSub.type)) continue;
    }

    setBackfillCursor(null);
    console.log(`[Backfill] Complete. Re-indexed ${done} embeddings.`);
}

async function getLoreChunksForBackfill(_campaignId: string): Promise<Array<{ id: string; content: string }>> {
    try {
        const { chunkLoreFile } = await import('./loreChunker');
        const { useAppStore } = await import('../store');
        const state = useAppStore.getState();
        const loreRaw = state.context?.loreRaw;
        if (loreRaw) {
            return chunkLoreFile(loreRaw).map(c => ({ id: c.id, content: c.content }));
        }
    } catch {
        console.warn('[Backfill] Could not access lore chunks from store');
    }
    return [];
}

export async function backfillScenes(
    campaignId: string,
    sceneIds: string[],
    onProgress?: (progress: BackfillProgress) => void
): Promise<void> {
    if (!isEmbedderReady()) {
        await warmupEmbedder();
        if (!isEmbedderReady()) return;
    }

    const sceneRecords: SceneRecord[] = await getList(k(campaignId, 'scenes'));
    const sceneMap = new Map(sceneRecords.map(s => [s.sceneId, s]));

    let done = 0;
    for (const sceneId of sceneIds) {
        const sceneRec = sceneMap.get(sceneId);
        if (!sceneRec) continue;

        const combinedText = `${sceneRec.userContent}\n${sceneRec.assistantContent}`;
        const vector = await embedText(combinedText);
        if (vector) {
            await embeddingStorage.store(campaignId, sceneId, Array.from(vector), 'scene');
        }

        done++;
        onProgress?.({ total: sceneIds.length, done, current: `scene:${sceneId}` });

        if (done % 10 === 0) {
            await new Promise(r => setTimeout(r, 0));
        }
    }
}