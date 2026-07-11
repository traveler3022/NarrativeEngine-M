# 2.2 Dependency Discovery — Runtime Graph

## Dynamic Imports (non-test, non-eval)

### services dynamic imports

| File | Target | Type | Purpose |
|------|--------|------|---------|
| apiClient.ts | ports/campaignRepository | candidate | saveCampaignState, saveNPCLedger |
| apiClient.ts | ./infrastructure | internal | encryptSettingsPresets |
| backfillRunner.ts | ../lore | internal | chunkLoreFile |
| backfillRunner.ts | ports/campaignContext | candidate | getContext |
| embedder.ts | ports/settings | candidate | getSettings |
| embedder.ts | ./embeddingScheduler | internal | abortForModelSwitch |
| turnPostProcess.ts | ../storage | internal | offlineStorage (3x) |
| factsTimelineStage.ts | ../../campaign-state | internal | resolveTimeline |
| rulesStage.ts | ../../lore | internal | chunkLoreFile |
| campaignBundle.ts | ./embedding + ./storage | internal | embedText, offlineStorage |
| storage/index.ts | ../embedding | internal | embedText |
| storage/imageStorage.ts | idb-keyval | external | keys() |

### store dynamic imports

| File | Target | Purpose |
|------|--------|---------|
| campaignStore.ts | services/apiClient (4x) | api.backup, api.campaigns |
| campaignStore.ts | services/campaign-state | migrateV1ToV2 |
| campaignSlice.ts | services/turn | commitPendingTurn |
| campaignSlice.ts | services/storage | offlineStorage |
| campaignSlice.ts | services/infrastructure | backgroundQueue |
| campaignSlice.ts | services/embedding | warmupEmbedder |
| campaignSlice.ts | services/apiClient | api |
| campaignSlice.ts | store/campaignStore | saveCampaignState (via saveController) |
| chatSlice.ts | store/campaignStore | saveCampaignState |
| loreSlice.ts | store/campaignStore | saveLoreChunks |
| npcSlice.ts | store/campaignStore | saveNPCLedger |
| pressureSlice.ts | store/campaignStore | savePressure |
| saveController.ts | store/campaignStore | saveCampaignState |

### components dynamic imports

| File | Target | Purpose |
|------|--------|---------|
| CampaignHub.tsx | services/lore | enrichLoreKeywords |
| ChatArea.tsx | store/campaignStore | saveDivergenceRegister |
| DivergenceEntryModal.tsx | utils/llmCall + services/infrastructure | llmCall, extractJson |
| LoreTab.tsx | store/campaignStore (2x) | saveLoreChunks |
| PCCreationWizard.tsx | utils/llmCall + utils/uid | llmCall, uid |
| WorldPrimerPanel.tsx | utils/llmCall | llmCall |

## Runtime Flow Summary

```
Component (user action)
  → dynamic import store/campaignStore
    → saveCampaignState / saveLoreChunks / saveNPCLedger
      → (idb-keyval persistence)

Component (user action)
  → dynamic import services/lore
    → enrichLoreKeywords
      → ports/loreRepository (candidate)
        → adapters/loreRepositoryAdapter
          → store/campaignStore.saveLoreChunks

Store slice (state change)
  → dynamic import services/apiClient
    → api.backup.create / api.campaigns.saveState
      → ports/campaignRepository (candidate)
        → adapters/campaignRepositoryAdapter
          → store/campaignStore.saveCampaignState

Store slice (campaign switch)
  → dynamic import services/embedding
    → warmupEmbedder / runFullReindex
      → services/embedding/embedder
        → ports/settings (candidate)
```
