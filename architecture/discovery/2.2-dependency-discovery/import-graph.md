# 2.2 Dependency Discovery — Import Graph

## Cross-Layer Import Edges (663 total)

### By direction and type:

| Direction | Static | Dynamic | Total |
|-----------|--------|---------|-------|
| store → services | 10 | 0 | 10 |
| services → store | 0 | 0 | 0 |
| services → components | 0 | 0 | 0 |
| store → components | 0 | 0 | 0 |
| components → store | 18 | 0 | 18 |
| components → services | 22 | 0 | 0 |
| services → ports | 26 | 0 | 26 |
| store → ports | 4 | 0 | 4 |

### store → services (10 static imports)

| Source | Target | What |
|--------|--------|------|
| campaignStore.ts | services/storage/imageStorage | imageStorage |
| campaignStore.ts | services/lore/loreIndexer | upgradeVectorOnlyDefault |
| campaignStore.ts | services/npc/agencyBands | affinityToPcRelation |
| campaignSlice.ts | services/engine/constants | DEFAULT_* arrays |
| campaignSlice.ts | services/embedding | runFullReindex, abortForCampaignSwitch |
| campaignSlice.ts | services/storage/embeddingStorage | embeddingStorage |
| campaignSlice.ts | services/campaign-state | EMPTY_REGISTER |
| chatSlice.ts | services/campaign-state | EMPTY_REGISTER, toggleChapter, etc. |
| chatSlice.ts | services/infrastructure | countTokens |
| chatSlice.ts | services/storage/imageStorage | imageStorage |
| npcSlice.ts | services/embedding | embedText, getCurrentModelId |
| npcSlice.ts | services/storage/embeddingStorage | embeddingStorage |
| npcSlice.ts | services/storage/imageStorage | imageStorage |
| npcSlice.ts | services/npc | buildNPCEmbeddingText, findLedgerMatches |
| settingsSlice.ts | services/infrastructure | encryptSettingsProviders |
| settingsSlice.ts | services/infrastructure/themeService | resolveTheme |
| settingsSlice.ts | services/engine/constants | DEFAULT_* arrays |
| useAppStore.ts | services/embedding/embeddingScheduler | registerStore |
| useAppStore.ts | services/engine/constants | DEFAULT_* arrays |

### Dynamic imports (runtime) — see runtime-graph.md
