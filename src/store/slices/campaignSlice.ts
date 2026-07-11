/**
 * @refactor RF-008 (real extraction — W4 redo)
 * @violations 0 (all logic extracted)
 * @waves W4
 * @see architecture/POSTMORTEM_W4.md
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-008
 *
 * CampaignSlice — PURE STATE ONLY.
 *
 * All orchestration logic extracted to services/campaignLifecycle.ts.
 * All persistence helpers extracted to services/persistence/.
 *
 * This slice contains ONLY:
 * - State fields (activeCampaignId, context, bookkeepingTurnCounter)
 * - Simple setters (set, get)
 *
 * NO service imports. NO dynamic imports. NO business logic.
 *
 * UI components call services/campaignLifecycle.switchCampaign() directly.
 */

import type { StateCreator } from 'zustand';
import type { GameContext, ChatMessage, CondenserState, DivergenceRegister } from '../../types';
import type { ArchiveSlice } from './archiveSlice';
import type { LoreSlice } from './loreSlice';
import type { NPCSlice } from './npcSlice';
import type { ChatSlice } from './chatSlice';
import { defaultContext } from '../../types/defaultContext';
import { debouncedSaveCampaignState } from '../../services/persistence/campaignStateSave';

// Re-export for backward compat
export { defaultContext } from '../../types/defaultContext';

// ── Slice type ─────────────────────────────────────────────────────────

export type CampaignSlice = {
    activeCampaignId: string | null;
    context: GameContext;
    updateContext: (patch: Partial<GameContext>) => void;

    // Auto Bookkeeping
    bookkeepingTurnCounter: number;
    autoBookkeepingInterval: number;
    setAutoBookkeepingInterval: (interval: number) => void;
    resetBookkeepingTurnCounter: () => void;
    incrementBookkeepingTurnCounter: () => number;
};

// ── Combined state needed for cross-slice access ───────────────────────

type CampaignDeps = CampaignSlice & ArchiveSlice & LoreSlice & NPCSlice & ChatSlice & {
    settings: import('../../types').AppSettings;
    messages: ChatMessage[];
    condenser: CondenserState;
    divergenceRegister: DivergenceRegister;
};

// ── Slice creator ──────────────────────────────────────────────────────

export const createCampaignSlice: StateCreator<CampaignDeps, [], [], CampaignSlice> = (set, get) => ({
    activeCampaignId: null,

    context: { ...defaultContext },
    updateContext: (patch) =>
        set((s) => {
            const newContext = { ...s.context, ...patch };
            debouncedSaveCampaignState(s.activeCampaignId, { context: newContext, messages: s.messages, condenser: s.condenser, pinnedExcerpts: s.pinnedExcerpts });
            return { context: newContext };
        }),

    // Auto Bookkeeping
    bookkeepingTurnCounter: 0,
    autoBookkeepingInterval: 5,
    setAutoBookkeepingInterval: (interval) => set({ autoBookkeepingInterval: interval } as Partial<CampaignDeps>),
    resetBookkeepingTurnCounter: () => set({ bookkeepingTurnCounter: 0 } as Partial<CampaignDeps>),
    incrementBookkeepingTurnCounter: () => {
        const s = get();
        const newVal = s.bookkeepingTurnCounter + 1;
        set({ bookkeepingTurnCounter: newVal } as Partial<CampaignDeps>);
        return newVal;
    },
});
