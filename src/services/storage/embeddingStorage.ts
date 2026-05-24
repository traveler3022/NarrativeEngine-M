import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

export const EMBEDDING_VERSION = 3;

const LEGACY_MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

export type EmbeddingRecord = {
    vector: number[];
    version: number;
    updatedAt: number;
    modelId?: string;
};

export const embeddingStorage = {
    async store(campaignId: string, id: string, vector: number[], type: 'scene' | 'lore' | 'npc' | 'rule', modelId?: string): Promise<void> {
        const record: EmbeddingRecord = {
            vector,
            version: EMBEDDING_VERSION,
            updatedAt: Date.now(),
            modelId: modelId ?? LEGACY_MODEL_ID,
        };
        await idbSet(`nn_embed_${campaignId}_${type}_${id}`, record);
    },

    async getRecord(campaignId: string, id: string, type: 'scene' | 'lore' | 'npc' | 'rule'): Promise<EmbeddingRecord | null> {
        const entry = await idbGet(`nn_embed_${campaignId}_${type}_${id}`) as EmbeddingRecord | null;
        return entry ?? null;
    },

    async get(campaignId: string, id: string): Promise<number[] | null> {
        const entry = await idbGet(`nn_embed_${campaignId}_scene_${id}`) as EmbeddingRecord | null;
        if (entry) return entry.vector;
        const loreEntry = await idbGet(`nn_embed_${campaignId}_lore_${id}`) as EmbeddingRecord | null;
        return loreEntry?.vector ?? null;
    },

    async getAll(campaignId: string, type?: 'scene' | 'lore' | 'npc' | 'rule'): Promise<Array<{ id: string; vector: number[] }>> {
        const results: Array<{ id: string; vector: number[] }> = [];
        const types = type ? [type] : ['scene', 'lore', 'npc', 'rule'] as const;
        for (const t of types) {
            const prefix = `nn_embed_${campaignId}_${t}_`;
            const allKeys = await import('idb-keyval').then(m => m.keys());
            for (const key of allKeys) {
                if (typeof key === 'string' && key.startsWith(prefix)) {
                    const id = key.slice(prefix.length);
                    const entry = await idbGet(key) as EmbeddingRecord | null;
                    if (entry) results.push({ id, vector: entry.vector });
                }
            }
        }
        return results;
    },

    async getAllWithVersion(campaignId: string, type?: 'scene' | 'lore' | 'npc' | 'rule'): Promise<Array<{ id: string; vector: number[]; version: number; type: 'scene' | 'lore' | 'npc' | 'rule'; modelId: string }>> {
        const results: Array<{ id: string; vector: number[]; version: number; type: 'scene' | 'lore' | 'npc' | 'rule'; modelId: string }> = [];
        const types = type ? [type] : ['scene', 'lore', 'npc', 'rule'] as const;
        for (const t of types) {
            const prefix = `nn_embed_${campaignId}_${t}_`;
            const allKeys = await import('idb-keyval').then(m => m.keys());
            for (const key of allKeys) {
                if (typeof key === 'string' && key.startsWith(prefix)) {
                    const id = key.slice(prefix.length);
                    const entry = await idbGet(key) as EmbeddingRecord | { vector: number[] } | null;
                    if (entry) {
                        const version = 'version' in entry ? entry.version : 1;
                        const modelId = 'modelId' in entry && entry.modelId ? entry.modelId : LEGACY_MODEL_ID;
                        results.push({ id, vector: entry.vector, version, type: t, modelId });
                    }
                }
            }
        }
        return results;
    },

    async hasStaleVectors(campaignId: string, currentModelId: string): Promise<boolean> {
        const all = await this.getAllWithVersion(campaignId);
        return all.some(r => r.modelId !== currentModelId);
    },

    async countByModel(campaignId: string): Promise<Record<string, number>> {
        const all = await this.getAllWithVersion(campaignId);
        const counts: Record<string, number> = {};
        for (const r of all) {
            counts[r.modelId] = (counts[r.modelId] ?? 0) + 1;
        }
        return counts;
    },

    async delete(campaignId: string, id: string): Promise<void> {
        await idbDel(`nn_embed_${campaignId}_scene_${id}`).catch(() => {});
        await idbDel(`nn_embed_${campaignId}_lore_${id}`).catch(() => {});
        await idbDel(`nn_embed_${campaignId}_npc_${id}`).catch(() => {});
        await idbDel(`nn_embed_${campaignId}_rule_${id}`).catch(() => {});
    },

    async deleteAll(campaignId: string): Promise<void> {
        const allKeys = await import('idb-keyval').then(m => m.keys());
        const prefix = `nn_embed_${campaignId}_`;
        for (const key of allKeys) {
            if (typeof key === 'string' && key.startsWith(prefix)) {
                await idbDel(key);
            }
        }
    },

    async deleteByTypeAndId(campaignId: string, type: 'scene' | 'lore' | 'npc' | 'rule', id: string): Promise<void> {
        await idbDel(`nn_embed_${campaignId}_${type}_${id}`).catch(() => {});
    },
};