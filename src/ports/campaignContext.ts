/**
 * CampaignContextPort — state access for campaign context + bookkeeping.
 *
 * Services that need to read/write GameContext (backfillRunner for
 * loreRaw/rulesRaw, pendingCommit for updateContext + bookkeeping)
 * used to call useAppStore.getState() directly.
 */

import type { GameContext } from '../types';

export interface CampaignContextPort {
    // Commands
    applyContextPatch(patch: Partial<GameContext>): void;
    incrementBookkeepingCounter(): number;
    resetBookkeepingCounter(): void;

    // Queries
    getContext(): GameContext;
    getAutoBookkeepingInterval(): number;
    getActiveCampaignId(): string | null;
}

let _impl: CampaignContextPort | null = null;

export function registerCampaignContext(impl: CampaignContextPort): void { _impl = impl; }

function impl(): CampaignContextPort {
    if (!_impl) throw new Error('CampaignContextPort not wired.');
    return _impl;
}

export const campaignContext: CampaignContextPort = {
    applyContextPatch:          (p) => impl().applyContextPatch(p),
    incrementBookkeepingCounter:() => impl().incrementBookkeepingCounter(),
    resetBookkeepingCounter:    () => impl().resetBookkeepingCounter(),
    getContext:                 () => impl().getContext(),
    getAutoBookkeepingInterval: () => impl().getAutoBookkeepingInterval(),
    getActiveCampaignId:        () => impl().getActiveCampaignId(),
};
