import { saveCampaignState, saveNPCLedger } from '../store/campaignStore';
import { registerCampaignRepository, type CampaignRepositoryPort } from '../ports/campaignRepository';

export const campaignRepositoryAdapter: CampaignRepositoryPort = {
    saveCampaignState: (id, state) => saveCampaignState(id, state),
    saveNPCLedger:     (id, npcs) => saveNPCLedger(id, npcs),
};

export function wireCampaignRepository(): void { registerCampaignRepository(campaignRepositoryAdapter); }
