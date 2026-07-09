import { useAppStore } from '../store/useAppStore';
import { registerCampaignContext, type CampaignContextPort } from '../ports/campaignContext';

export const campaignContextAdapter: CampaignContextPort = {
    applyContextPatch:           (p) => useAppStore.getState().updateContext(p),
    incrementBookkeepingCounter: () => useAppStore.getState().incrementBookkeepingTurnCounter(),
    resetBookkeepingCounter:     () => useAppStore.getState().resetBookkeepingTurnCounter(),
    getContext:                  () => useAppStore.getState().context,
    getAutoBookkeepingInterval:  () => useAppStore.getState().autoBookkeepingInterval,
};

export function wireCampaignContext(): void { registerCampaignContext(campaignContextAdapter); }
