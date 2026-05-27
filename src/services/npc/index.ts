export { generateNPCProfile, updateExistingNPCs, backfillNPCDrives, buildNPCEmbeddingText } from './npcGeneration';
export { extractNPCNames, classifyNPCNames, validateNPCCandidates } from './npcDetector';
export { buildBehaviorDirective, buildDriftAlert } from './npcBehaviorDirective';
export { scanPressure, shouldArchiveNPC, findArchivedToRestore, buildPressurePatch } from './npcPressureTracker';
