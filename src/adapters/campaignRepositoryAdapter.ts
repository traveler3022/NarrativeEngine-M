import { saveCampaignState, saveNPCLedger, saveDivergenceRegister } from '../store/campaignStore';
import { registerCampaignRepository, type CampaignRepositoryPort } from '../ports/campaignRepository';

export const campaignRepositoryAdapter: CampaignRepositoryPort = {
    saveCampaignState: (id, state) => saveCampaignState(id, state),
    saveNPCLedger:     (id, npcs) => saveNPCLedger(id, npcs),
    saveDivergenceRegister: (id, register) => saveDivergenceRegister(id, register),
};

export function wireCampaignRepository(): void { registerCampaignRepository(campaignRepositoryAdapter); }
