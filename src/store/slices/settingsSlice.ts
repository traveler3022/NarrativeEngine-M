import type { StateCreator } from 'zustand';
import type { AppSettings, LLMProvider, AIPreset } from '../../types';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { encryptSettingsPresets, decryptSettingsPresets } from '../../services/infrastructure';
import { toast } from '../../components/Toast';
import {
    applyTheme,
    watchSystemTheme,
    applyUIScale
} from '../../services/infrastructure/themeService';
import {
    defaultSettings,
    migrateSettings
} from '../settingsMigration';

// ── DEFAULT constants ──────────────────────────────────────────────────

// Surprise Engine — mundane world-flavor events. Genre-agnostic archetypes;
// the GM AI fills in world-appropriate specifics from context.
export const DEFAULT_SURPRISE_TYPES = [
    "STREET_DRAMA", "FOUND_OBJECT", "OVERHEARD_GOSSIP", "ANIMAL_INCIDENT",
    "VENDOR_DISPUTE", "STRANGER_MOMENT", "MINOR_MISHAP", "CROWD_REACTION",
    "WEATHER_SHIFT", "UNEXPECTED_KINDNESS"
];

export const DEFAULT_SURPRISE_TONES = [
    "MUNDANE", "AMUSING", "AWKWARD", "CURIOUS",
    "TENSE", "HEARTWARMING", "CHAOTIC", "BITTERSWEET"
];

// Encounter Engine — threat SITUATIONS, not specific enemies. The GM AI
// resolves what the threat actually is based on the current location.
export const DEFAULT_ENCOUNTER_TYPES = [
    "HOSTILE_PRESENCE", "TERRITORIAL_THREAT", "PATROL_CONFRONTATION",
    "AMBUSH_LAID", "DESPERATE_ATTACKER", "SCAVENGING_PREDATOR",
    "RIVAL_CLAIM", "CORNERED_ENTITY", "ENVIRONMENTAL_THREAT", "TRAP_TRIGGERED"
];

export const DEFAULT_ENCOUNTER_TONES = [
    "TENSE", "DESPERATE", "SUDDEN", "CALCULATED",
    "CHAOTIC", "PREDATORY", "TERRITORIAL", "GRIM"
];

// World Rumour Engine — quest hooks and local hearsay. NOT canon-changing
// world events. WHO heard/spread it, WHAT happened, WHERE locally, WHY it matters.
export const DEFAULT_WORLD_WHO = [
    "a passing merchant", "a frightened local", "a travelling soldier",
    "an inn regular", "a desperate farmer", "a wandering scout",
    "a shady fence", "an old hermit", "a wounded survivor", "a child from the outskirts"
];

export const DEFAULT_WORLD_WHERE = [
    "on the northern road", "near the old ruins", "at the edge of town",
    "along the main trade route", "in the nearby wilderness", "at a river crossing",
    "close to an abandoned structure", "at a well-known crossroads", "in the hills nearby", "at the border outpost"
];

export const DEFAULT_WORLD_WHY = [
    "and a reward is being offered", "and locals are too frightened to investigate",
    "suggesting treasure or valuables are involved", "hinting at danger ahead for travellers",
    "and no one who went to look has returned", "drawing unwanted attention from authorities",
    "and the full story isn't clear yet", "causing unrest among the local population"
];

export const DEFAULT_WORLD_WHAT = [
    "spotted raiders near", "claims something valuable was found at",
    "says a person went missing from", "heard screaming coming from",
    "found fresh tracks leading to", "saw lights moving around",
    "says a body was found near", "reports strange activity at",
    "is paying for an escort to", "overheard a deal being made involving"
];

// Debounced save to avoid hammering the API on rapid changes
let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function debouncedSaveSettings(settings: AppSettings, activeCampaignId: string | null) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
        const encryptedPresets = await encryptSettingsPresets(settings.presets);
        const encryptedSettings = { ...settings, presets: encryptedPresets };

        idbSet('nn_settings', { settings: encryptedSettings, activeCampaignId })
            .catch((e) => { console.error(e); toast.error('Failed to save settings to browser storage'); });
    }, 500);
}

// ── Slice type ─────────────────────────────────────────────────────────

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
};

// ── Slice creator ──────────────────────────────────────────────────────

export const createSettingsSlice: StateCreator<SettingsSlice & { activeCampaignId: string | null }, [], [], SettingsSlice> = (set, get) => ({
    settings: { ...defaultSettings },
    settingsLoaded: false,

    loadSettings: async () => {
        try {
            const localSettings = await idbGet('nn_settings');
            if (localSettings && localSettings.settings) {
                const migrated = migrateSettings(localSettings);
                const decryptedPresets = await decryptSettingsPresets(migrated.presets);
                const decrypted = { ...migrated, presets: decryptedPresets };
                
                set({
                    settings: {
                        presets: decrypted.presets,
                        activePresetId: decrypted.activePresetId,
                        contextLimit: decrypted.contextLimit,
                        autoCondenseEnabled: decrypted.autoCondenseEnabled,
                        condenseAggressiveness: decrypted.condenseAggressiveness,
                        enableDeepArchiveSearch: decrypted.enableDeepArchiveSearch,
                        autoExtractDivergences: decrypted.autoExtractDivergences,
                        divergenceTokenBudget: decrypted.divergenceTokenBudget,
                        divergenceScanBudget: decrypted.divergenceScanBudget,
                        autoArchiveStaleNPCsTurns: decrypted.autoArchiveStaleNPCsTurns,
                        rulesBudgetPct: decrypted.rulesBudgetPct,
                        autoGenerateRuleKeywords: decrypted.autoGenerateRuleKeywords,
                        embeddingModel: decrypted.embeddingModel,
                        utilityTimeoutSeconds: decrypted.utilityTimeoutSeconds,
                        verboseUtilityLogging: decrypted.verboseUtilityLogging,
                        aiTier: decrypted.aiTier,
                        theme: decrypted.theme ?? 'system',
                        uiScale: decrypted.uiScale ?? 1.0,
                        debugMode: decrypted.debugMode ?? false,
                        showReasoning: decrypted.showReasoning ?? true,
                    },
                    settingsLoaded: true,
                });

                applyTheme(decrypted.theme ?? 'system');
                watchSystemTheme();
                applyUIScale(decrypted.uiScale ?? 1.0);
                return;
            }
        } catch (e) {
            console.warn('Failed to load settings, using defaults', e);
            toast.warning('Could not load saved settings — using defaults');
        }
        set({ settingsLoaded: true });
    },

    updateSettings: (patch) => {
        set((s) => {
            const updated = { ...s.settings, ...patch };
            debouncedSaveSettings(updated, s.activeCampaignId);

            if (patch.theme !== undefined) applyTheme(patch.theme);
            if (patch.uiScale !== undefined) applyUIScale(patch.uiScale);

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
        const preset = get().getActivePreset();
        return preset?.storyAI;
    },

    getActiveSummarizerEndpoint: () => {
        const preset = get().getActivePreset();
        return preset?.summarizerAI;
    },

    getActiveUtilityEndpoint: () => {
        const preset = get().getActivePreset();
        return preset?.utilityAI;
    },

    getActiveAuxiliaryEndpoint: () => {
        const preset = get().getActivePreset();
        return preset?.auxiliaryAI;
    },
});

// Re-exports for backward compatibility
export { resolveTheme } from '../../services/infrastructure/themeService';
export { migrateSettings, defaultSettings } from '../settingsMigration';

