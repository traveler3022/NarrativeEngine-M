/**
 * CampaignRepositoryPort — persistence for campaign state + NPC ledger.
 *
 * apiClient.ts used to dynamically import saveCampaignState +
 * saveNPCLedger from store/campaignStore.
 */

import type { CampaignState } from '../types/store';
import type { NPCEntry, DivergenceRegister } from '../types';

export interface CampaignRepositoryPort {
    saveCampaignState(campaignId: string, state: CampaignState): Promise<void>;
    saveNPCLedger(campaignId: string, npcs: NPCEntry[]): Promise<void>;
    saveDivergenceRegister(campaignId: string, register: DivergenceRegister): Promise<void>;
}

let _impl: CampaignRepositoryPort | null = null;

export function registerCampaignRepository(impl: CampaignRepositoryPort): void { _impl = impl; }

function impl(): CampaignRepositoryPort {
    if (!_impl) throw new Error('CampaignRepositoryPort not wired.');
    return _impl;
}

export const campaignRepository: CampaignRepositoryPort = {
    saveCampaignState: (id, state) => impl().saveCampaignState(id, state),
    saveNPCLedger:     (id, npcs) => impl().saveNPCLedger(id, npcs),
    saveDivergenceRegister: (id, register) => impl().saveDivergenceRegister(id, register),
};
