export { generateNPCProfile, updateExistingNPCs, backfillNPCDrives, buildNPCEmbeddingText } from './npcGeneration';
export { extractNPCNames, classifyNPCNames, validateNPCCandidates, COMBAT_TIER_ARCHETYPE_RUBRIC } from './npcDetector';
export { buildBehaviorDirective, buildDriftAlert } from './npcBehaviorDirective';
export { scanPressure, shouldArchiveNPC, findArchivedToRestore, buildPressurePatch, applyDecay, DECAY_RATE } from './npcPressureTracker';
export {
    deriveStatsFromBudget,
    TIER_DICE_BUDGETS,
    createItemDefFromTemplate,
    createSkillDefFromTemplate,
    resolveOrAddItemDef,
    resolveOrAddSkillDef,
    assignCombatLoadout,
} from './npcCombatGeneration';
