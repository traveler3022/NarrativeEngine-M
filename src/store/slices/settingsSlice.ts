/**
 * @refactor RF-010, RF-007
 * @violations 4 (see architecture/reverse-engineering/0.15-architecture-violations/RAW_DATA.json)
 * @waves W6; W0(advance)/W3(close)
 * @ports (logic extraction), NotificationPort
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md
 * @see architecture/phase3-refactor-planning/3.6-traceability-matrix.md
 * @see REFACTOR-MAP.md
 */

import type { StateCreator } from 'zustand';
import type { AppSettings, LLMProvider, AIPreset } from '../../types';
import {
    defaultSettings,
} from '../../utils/settingsMigration';
import { loadSettingsFromPersistence, debouncedSaveSettings, applySettingsVisuals } from '../../services/settingsLifecycle';

// Re-export for backward compat
export { debouncedSaveSettings } from '../../services/settingsLifecycle';

// Engine constants moved to types/engineConstants.ts — re-export for backward compat
export {
    DEFAULT_SURPRISE_TYPES, DEFAULT_SURPRISE_TONES,
    DEFAULT_ENCOUNTER_TYPES, DEFAULT_ENCOUNTER_TONES,
    DEFAULT_WORLD_WHO, DEFAULT_WORLD_WHERE, DEFAULT_WORLD_WHY, DEFAULT_WORLD_WHAT,
} from '../../types/engineConstants';

export type SettingsSlice = {
    settings: AppSettings;
    settingsLoaded: boolean;
    updateSettings: (patch: Partial<AppSettings>) => void;
    loadSettings: () => Promise<void>;

    addPreset: (preset: AIPreset) => void;
    updatePreset: (id: string, patch: Partial<AIPreset>) => void;
    removePreset: (id: string) => void;
    setActivePreset: (id: string) => void;
    getActivePreset: () => AIPreset | undefined;
    getActiveStoryEndpoint: () => LLMProvider | undefined;
    getActiveSummarizerEndpoint: () => LLMProvider | undefined;
    getActiveUtilityEndpoint: () => LLMProvider | undefined;
    getActiveAuxiliaryEndpoint: () => LLMProvider | undefined;
    getActiveImageEndpoint: () => LLMProvider | undefined;

    addProvider: (provider: LLMProvider) => void;
    updateProvider: (id: string, patch: Partial<LLMProvider>) => void;
    removeProvider: (id: string) => void;
};

export const createSettingsSlice: StateCreator<SettingsSlice & { activeCampaignId: string | null }, [], [], SettingsSlice> = (set, get) => ({
    settings: { ...defaultSettings },
    settingsLoaded: false,

    loadSettings: async () => {
        const result = await loadSettingsFromPersistence();
        if (result.loaded && result.settings) {
            set({ settings: result.settings, settingsLoaded: true });
        } else {
            set({ settingsLoaded: true });
        }
    },

    updateSettings: (patch) => {
        set((s) => {
            const updated = { ...s.settings, ...patch };
            debouncedSaveSettings(updated, s.activeCampaignId);
            applySettingsVisuals(patch);
            return { settings: updated };
        });
    },

    addPreset: (preset) => {
        set((s) => {
            const newSettings = {
                ...s.settings,
                presets: [...s.settings.presets, preset],
            };
            debouncedSaveSettings(newSettings, s.activeCampaignId);
            return { settings: newSettings };
        });
    },

    updatePreset: (id, patch) => {
        set((s) => {
            const newPresets = s.settings.presets.map((p) =>
                p.id === id ? { ...p, ...patch } : p
            );
            const newSettings = { ...s.settings, presets: newPresets };
            debouncedSaveSettings(newSettings, s.activeCampaignId);
            return { settings: newSettings };
        });
    },

    removePreset: (id) => {
        set((s) => {
            const newPresets = s.settings.presets.filter((p) => p.id !== id);
            if (newPresets.length === 0) return {};
            const newActiveId = s.settings.activePresetId === id
                ? newPresets[0].id
                : s.settings.activePresetId;
            const newSettings = { ...s.settings, presets: newPresets, activePresetId: newActiveId };
            debouncedSaveSettings(newSettings, s.activeCampaignId);
            return { settings: newSettings };
        });
    },

    setActivePreset: (id) => {
        set((s) => {
            const newSettings = { ...s.settings, activePresetId: id };
            debouncedSaveSettings(newSettings, s.activeCampaignId);
            return { settings: newSettings };
        });
    },

    getActivePreset: () => {
        const s = get();
        return s.settings.presets.find((p) => p.id === s.settings.activePresetId) || s.settings.presets[0];
    },

    getActiveStoryEndpoint: () => {
        const s = get();
        const preset = s.getActivePreset();
        if (!preset) return undefined;
        return s.settings.providers.find(p => p.id === preset.storyAIProviderId);
    },

    getActiveSummarizerEndpoint: () => {
        const s = get();
        const preset = s.getActivePreset();
        if (!preset) return undefined;
        if (!preset.summarizerAIProviderId) return undefined;
        return s.settings.providers.find(p => p.id === preset.summarizerAIProviderId);
    },

    getActiveUtilityEndpoint: () => {
        const s = get();
        const preset = s.getActivePreset();
        if (!preset) return undefined;
        if (!preset.utilityAIProviderId) return undefined;
        return s.settings.providers.find(p => p.id === preset.utilityAIProviderId);
    },

    getActiveAuxiliaryEndpoint: () => {
        const s = get();
        const preset = s.getActivePreset();
        if (!preset) return undefined;
        if (!preset.auxiliaryAIProviderId) return undefined;
        return s.settings.providers.find(p => p.id === preset.auxiliaryAIProviderId);
    },

    getActiveImageEndpoint: () => {
        const s = get();
        const preset = s.getActivePreset();
        if (!preset) return undefined;
        if (!preset.imageAIProviderId) return undefined;
        return s.settings.providers.find(p => p.id === preset.imageAIProviderId);
    },

    addProvider: (provider) => {
        set((s) => {
            const newSettings = {
                ...s.settings,
                providers: [...s.settings.providers, provider],
            };
            debouncedSaveSettings(newSettings, s.activeCampaignId);
            return { settings: newSettings };
        });
    },

    updateProvider: (id, patch) => {
        set((s) => {
            const newProviders = s.settings.providers.map((p) =>
                p.id === id ? { ...p, ...patch } : p
            );
            const newSettings = { ...s.settings, providers: newProviders };
            debouncedSaveSettings(newSettings, s.activeCampaignId);
            return { settings: newSettings };
        });
    },

    removeProvider: (id) => {
        set((s) => {
            if (s.settings.providers.length <= 1) return {};
            const newProviders = s.settings.providers.filter(p => p.id !== id);
            if (newProviders.length === 0) return {};
            const firstProviderId = newProviders[0].id;
            const newPresets = s.settings.presets.map(preset => {
                const updated = { ...preset };
                if (updated.storyAIProviderId === id) {
                    updated.storyAIProviderId = firstProviderId;
                }
                if (updated.summarizerAIProviderId === id) {
                    updated.summarizerAIProviderId = '';
                }
                if (updated.utilityAIProviderId === id) {
                    updated.utilityAIProviderId = '';
                }
                if (updated.auxiliaryAIProviderId === id) {
                    updated.auxiliaryAIProviderId = '';
                }
                if (updated.imageAIProviderId === id) {
                    updated.imageAIProviderId = '';
                }
                return updated;
            });
            const newSettings = { ...s.settings, providers: newProviders, presets: newPresets };
            debouncedSaveSettings(newSettings, s.activeCampaignId);
            return { settings: newSettings };
        });
    },
});

// resolveTheme re-export removed — import directly from services/infrastructure/themeService
export { migrateSettings, defaultSettings } from '../../utils/settingsMigration';