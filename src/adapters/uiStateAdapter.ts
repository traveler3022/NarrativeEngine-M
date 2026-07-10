import { useAppStore } from '../store/useAppStore';
import { registerUIState, type UIStatePort } from '../ports/uiState';

export const uiStateAdapter: UIStatePort = {
    setPipelinePhase:    (p) => useAppStore.getState().setPipelinePhase(p),
    setStreamingStats:   (s) => useAppStore.getState().setStreamingStats(s),
    setLastPayloadTrace: (t) => useAppStore.getState().setLastPayloadTrace(t),
};

export function wireUIState(): void { registerUIState(uiStateAdapter); }
