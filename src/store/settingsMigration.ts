import type { AppSettings, AIPreset, LLMProvider, NPCEntry } from '../types';
import { uid } from '../utils/uid';

export const defaultPreset: AIPreset = {
    id: uid(),
    name: 'Default Setting',
    storyAI: {
        endpoint: 'http://localhost:11434/v1',
        apiKey: '',
        modelName: 'llama3',
        apiFormat: 'openai',
    },
    summarizerAI: {
        endpoint: 'http://localhost:11434/v1',
        apiKey: '',
        modelName: 'llama3',
        apiFormat: 'openai',
    },
    utilityAI: { endpoint: '', apiKey: '', modelName: '' },
    auxiliaryAI: { endpoint: '', apiKey: '', modelName: '' },
};

export const defaultSettings: AppSettings = {
    presets: [defaultPreset],
    activePresetId: defaultPreset.id,
    contextLimit: 4096,
    autoCondenseEnabled: true,
    condenseAggressiveness: 'balanced',
    debugMode: false,
    theme: 'system',
    showReasoning: true,
    uiScale: 1.0,
    enableDeepArchiveSearch: false,
    autoExtractDivergences: true,
    divergenceTokenBudget: 2000,
    autoArchiveStaleNPCsTurns: 15,
    divergenceScanBudget: 0,
    rulesBudgetPct: 0.10,
    autoGenerateRuleKeywords: true,
    embeddingModel: 'standard' as const,
    utilityTimeoutSeconds: 45,
    verboseUtilityLogging: false,
    aiTier: 'pro' as const,
};

/** Migrate old single-provider/multi-provider settings to presets format */
export function migrateSettings(data: Record<string, unknown>): AppSettings {
    const raw = (data.settings || {}) as Record<string, unknown>;

    // Already migrated -- has presets array
    if (Array.isArray(raw.presets) && raw.presets.length > 0) {
        const cleanedPresets = (raw.presets as any[]).map(p => {
            const { enemyAI: _e, neutralAI: _n, allyAI: _a, ...rest } = p;
            return rest as AIPreset;
        });
        return {
            presets: cleanedPresets,
            activePresetId: (raw.activePresetId as string) || cleanedPresets[0].id,
            contextLimit: (raw.contextLimit as number) ?? 4096,
            autoCondenseEnabled: (raw.autoCondenseEnabled as boolean) ?? true,
            condenseAggressiveness: (raw.condenseAggressiveness as AppSettings['condenseAggressiveness']) ?? 'balanced',
            debugMode: (raw.debugMode as boolean) ?? false,
            theme: (raw.theme as 'light' | 'dark' | 'system') ?? 'system',
            showReasoning: (raw.showReasoning as boolean) ?? true,
            uiScale: (raw.uiScale as number) ?? 1.0,
            enableDeepArchiveSearch: (raw.enableDeepArchiveSearch as boolean) ?? false,
            autoExtractDivergences: (raw.autoExtractDivergences as boolean) ?? true,
            divergenceTokenBudget: (raw.divergenceTokenBudget as number) ?? 2000,
            divergenceScanBudget: (raw.divergenceScanBudget as number) ?? 0,
            rulesBudgetPct: (raw.rulesBudgetPct as number) ?? 0.10,
            autoGenerateRuleKeywords: (raw.autoGenerateRuleKeywords as boolean) ?? true,
            embeddingModel: (raw.embeddingModel as 'standard' | 'high') ?? 'standard',
            utilityTimeoutSeconds: (raw.utilityTimeoutSeconds as number) ?? 45,
            verboseUtilityLogging: (raw.verboseUtilityLogging as boolean) ?? false,
            aiTier: (raw.aiTier as AppSettings['aiTier']) ?? 'pro',
        };
    }

    // Migration from old provider structure
    let migratedStoryProvider: LLMProvider = { ...defaultPreset.storyAI };

    if (Array.isArray(raw.providers) && raw.providers.length > 0) {
        const oldActive = (raw.providers as LLMProvider[]).find(p => p.id === raw.activeProviderId) || (raw.providers as LLMProvider[])[0];
        migratedStoryProvider = {
            endpoint: oldActive.endpoint || defaultPreset.storyAI.endpoint,
            apiKey: oldActive.apiKey || '',
            modelName: oldActive.modelName || defaultPreset.storyAI.modelName,
            apiFormat: oldActive.apiFormat || 'openai',
        };
    } else {
        migratedStoryProvider = {
            endpoint: (raw.endpoint as string) || defaultPreset.storyAI.endpoint,
            apiKey: (raw.apiKey as string) || '',
            modelName: (raw.modelName as string) || defaultPreset.storyAI.modelName,
            apiFormat: (raw.apiFormat as 'openai' | 'ollama') || 'openai',
        };
    }

    const legacyId = uid();
    const migratedPreset: AIPreset = {
        id: legacyId,
        name: 'Default Preset',
        storyAI: migratedStoryProvider,
        summarizerAI: { ...migratedStoryProvider },
        utilityAI: { endpoint: '', apiKey: '', modelName: '' },
        auxiliaryAI: { endpoint: '', apiKey: '', modelName: '' },
    };

    return {
        presets: [migratedPreset],
        activePresetId: legacyId,
        contextLimit: (raw.contextLimit as number) ?? 4096,
        autoCondenseEnabled: (raw.autoCondenseEnabled as boolean) ?? true,
        condenseAggressiveness: (raw.condenseAggressiveness as AppSettings['condenseAggressiveness']) ?? 'balanced',
        debugMode: (raw.debugMode as boolean) ?? false,
        theme: (raw.theme as 'light' | 'dark' | 'system') ?? 'system',
        showReasoning: (raw.showReasoning as boolean) ?? true,
        enableDeepArchiveSearch: (raw.enableDeepArchiveSearch as boolean) ?? false,
        autoExtractDivergences: (raw.autoExtractDivergences as boolean) ?? true,
        divergenceTokenBudget: (raw.divergenceTokenBudget as number) ?? 2000,
        divergenceScanBudget: (raw.divergenceScanBudget as number) ?? 0,
        rulesBudgetPct: (raw.rulesBudgetPct as number) ?? 0.10,
        autoGenerateRuleKeywords: (raw.autoGenerateRuleKeywords as boolean) ?? true,
        embeddingModel: (raw.embeddingModel as 'standard' | 'high') ?? 'standard',
        utilityTimeoutSeconds: (raw.utilityTimeoutSeconds as number) ?? 45,
        verboseUtilityLogging: (raw.verboseUtilityLogging as boolean) ?? false,
        aiTier: (raw.aiTier as AppSettings['aiTier']) ?? 'pro',
    };
}

export function backfillNPCCombatStats(npcs: NPCEntry[]): NPCEntry[] {
    return npcs.map(npc => {
        const combatTier = npc.combatTier || 'grunt';
        const archetype = npc.archetype || 'skirmisher';
        const stats = npc.stats || {
            VIT: 10,
            PWR: 10,
            RES: 10,
            FOC: 10,
            SPD: 10,
            WIL: 10
        };

        return {
            ...npc,
            isPC: npc.isPC ?? false,
            combatTier,
            archetype,
            stats,
            equippedWeapon: npc.equippedWeapon ?? '',
            knownSkills: npc.knownSkills ?? [],
            inventory: npc.inventory ?? [],
            condition: npc.condition ?? 'healthy',
            lastCondition: npc.lastCondition ?? 'healthy',
            lastSeenTimestamp: npc.lastSeenTimestamp ?? 0,
            recoveryNote: npc.recoveryNote ?? '',
            overrides: npc.overrides ?? []
        };
    });
}
