/**
 * settingsAdapter — wires the Zustand store behind SettingsPort.
 */

import { useAppStore } from '../store/useAppStore';
import { registerSettings, type SettingsPort } from '../ports/settings';

export const settingsAdapter: SettingsPort = {
    getSettings: () => useAppStore.getState().settings,
    getActivePreset: () => {
        const s = useAppStore.getState();
        return s.settings.presets.find(p => p.id === s.settings.activePresetId) ?? null;
    },
    getActiveImageEndpoint: () => useAppStore.getState().getActiveImageEndpoint() ?? null,
    getActiveTier: () => useAppStore.getState().settings.aiTier ?? 'pro',
    getActiveStoryEndpoint: () => useAppStore.getState().getActiveStoryEndpoint(),
    getActiveSummarizerEndpoint: () => useAppStore.getState().getActiveSummarizerEndpoint(),
    getActiveUtilityEndpoint: () => useAppStore.getState().getActiveUtilityEndpoint(),
    getActiveAuxiliaryEndpoint: () => useAppStore.getState().getActiveAuxiliaryEndpoint(),
};

export function wireSettings(): void {
    registerSettings(settingsAdapter);
}
