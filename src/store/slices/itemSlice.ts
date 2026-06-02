import type { StateCreator } from 'zustand';
import type { ItemDef } from '../../types';
import { toast } from '../../components/Toast';

let itemTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSaveItemCompendium(campaignId: string | null, items: ItemDef[]) {
    if (!campaignId) return;
    if (itemTimer) clearTimeout(itemTimer);
    itemTimer = setTimeout(async () => {
        try {
            const { saveItemCompendium } = await import('../../store/campaignStore');
            await saveItemCompendium(campaignId, items);
        } catch (e) {
            console.error(e);
            toast.error('Failed to save item compendium');
        }
    }, 500);
}

export type ItemSlice = {
    items: ItemDef[];
    setItemCompendium: (items: ItemDef[]) => void;
    addItemDef: (item: ItemDef) => void;
    updateItemDef: (id: string, patch: Partial<ItemDef>) => void;
    removeItemDef: (id: string) => void;
};

type ItemDeps = ItemSlice & {
    activeCampaignId: string | null;
};

export const createItemSlice: StateCreator<ItemDeps, [], [], ItemSlice> = (set) => ({
    items: [],
    setItemCompendium: (items) => set((s) => {
        debouncedSaveItemCompendium(s.activeCampaignId, items);
        return { items };
    }),
    addItemDef: (item) => set((s) => {
        const next = [...s.items, item];
        debouncedSaveItemCompendium(s.activeCampaignId, next);
        return { items: next };
    }),
    updateItemDef: (id, patch) => set((s) => {
        const next = s.items.map(i => i.id === id ? { ...i, ...patch } : i);
        debouncedSaveItemCompendium(s.activeCampaignId, next);
        return { items: next };
    }),
    removeItemDef: (id) => set((s) => {
        const next = s.items.filter(i => i.id !== id);
        debouncedSaveItemCompendium(s.activeCampaignId, next);
        return { items: next };
    }),
});
