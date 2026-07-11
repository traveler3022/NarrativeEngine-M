/**
 * @refactor RF-004, RF-008 (infrastructure)
 * @waves W0(advance)/W1(close)/W4(real extraction)
 * @see ../ports/CampaignContextPort.ts
 *
 * CampaignContextAdapter — thin delegate from CampaignContextPort
 * to useAppStore (campaignSlice).
 */

import { useAppStore } from '../store/useAppStore';
import type { CampaignContextPort, CampaignHydrationData } from '../ports/CampaignContextPort';

export function createCampaignContextAdapter(): CampaignContextPort {
  const get = () => useAppStore.getState();

  return {
    applyContextPatch: (patch) => get().updateContext(patch),
    incrementBookkeepingCounter: () => get().incrementBookkeepingTurnCounter(),
    resetBookkeepingCounter: () => get().resetBookkeepingTurnCounter(),
    getContext: () => get().context,
    getActiveCampaignId: () => get().activeCampaignId,
    hydrateCampaign: (data: CampaignHydrationData) => {
      useAppStore.setState(data as Partial<ReturnType<typeof useAppStore.getState>>);
    },
    clearActiveCampaign: () => {
      useAppStore.setState({ activeCampaignId: null } as Partial<ReturnType<typeof useAppStore.getState>>);
    },
    setReindexState: (state) => {
      useAppStore.getState().setEmbeddingsReindexing(state);
    },
  };
}
