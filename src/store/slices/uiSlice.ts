import type { StateCreator } from 'zustand';
import type { ManualRollMode, PayloadTrace, PipelinePhase, StreamingStats } from '../../types';
// ArmedLoot and ReindexState canonical home is types/store.ts. Re-exported
// here so existing callers within the store layer keep working.
export type { ArmedLoot, ReindexState } from '../../types/store';
import type { ArmedLoot, ReindexState } from '../../types/store';

export type UISlice = {
    settingsOpen: boolean;
    drawerOpen: boolean;
    npcLedgerOpen: boolean;
    backupModalOpen: boolean;
    lastPayloadTrace?: PayloadTrace[];
    pipelinePhase: PipelinePhase;
    streamingStats: StreamingStats | null;
    mobileView: 'chat' | 'context' | 'npcs' | 'settings';
    keyboardVisible: boolean;
    setKeyboardVisible: (visible: boolean) => void;
    toggleSettings: () => void;
    toggleDrawer: () => void;
    toggleNPCLedger: () => void;
    toggleBackupModal: () => void;
    setLastPayloadTrace: (trace?: PayloadTrace[]) => void;
    setPipelinePhase: (phase: PipelinePhase) => void;
    setStreamingStats: (stats: StreamingStats | null) => void;
    setMobileView: (view: 'chat' | 'context' | 'npcs' | 'settings') => void;
    deepArmed: boolean;
    setDeepArmed: (val: boolean) => void;
    toggleDeepArmed: () => void;
    // Player-called dice ("dice me"): the armed MODE, resolved at send time. null = not armed.
    armedRoll: ManualRollMode | null;
    setArmedRoll: (mode: ManualRollMode | null) => void;
    // Loot Engine WO-05: armed loot drop config, resolved at send time. Mirrors armedRoll.
    armedLoot: ArmedLoot | null;
    armLoot: (payload: ArmedLoot) => void;
    clearArmedLoot: () => void;
    embeddingsReindexing: ReindexState;
    setEmbeddingsReindexing: (state: ReindexState) => void;
};

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
    settingsOpen: false,
    drawerOpen: true,
    npcLedgerOpen: false,
    backupModalOpen: false,
    pipelinePhase: 'idle' as PipelinePhase,
    streamingStats: null,
    mobileView: 'chat' as const,
    keyboardVisible: false,
    setKeyboardVisible: (visible) => set({ keyboardVisible: visible }),
    toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
    toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
    toggleNPCLedger: () => set((s) => ({ npcLedgerOpen: !s.npcLedgerOpen })),
    toggleBackupModal: () => set((s) => ({ backupModalOpen: !s.backupModalOpen })),
    setLastPayloadTrace: (trace) => set({ lastPayloadTrace: trace }),
    setPipelinePhase: (phase) => set({ pipelinePhase: phase }),
    setStreamingStats: (stats) => set({ streamingStats: stats }),
    setMobileView: (view) => set({ mobileView: view }),
    deepArmed: false,
    setDeepArmed: (val) => set({ deepArmed: val }),
    toggleDeepArmed: () => set((s) => ({ deepArmed: !s.deepArmed })),
    armedRoll: null,
    setArmedRoll: (mode) => set({ armedRoll: mode }),
    armedLoot: null,
    armLoot: (payload) => set({ armedLoot: payload }),
    clearArmedLoot: () => set({ armedLoot: null }),
    embeddingsReindexing: { active: false, total: 0, done: 0, reason: null },
    setEmbeddingsReindexing: (state) => set({ embeddingsReindexing: state }),
});

