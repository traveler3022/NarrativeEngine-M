/**
 * Campaign state save — extracted from campaignSlice.ts (W4 redo).
 *
 * This is a persistence function, not reactive state. Moved here so store
 * slices can import it without a state→domain boundary violation.
 * state→persistence is allowed (persistence is infrastructure).
 */

import type { GameContext, ChatMessage, CondenserState, PinnedExcerpt } from '../../types';
import { notificationPort } from '../../ports';
import { saveCampaignState } from './campaignStore';

let stateTimer: ReturnType<typeof setTimeout> | null = null;
let _getStateForSave: (() => { context: GameContext; messages: ChatMessage[]; condenser: CondenserState; pinnedExcerpts?: PinnedExcerpt[] }) | null = null;

export function registerCampaignStateGetter(getter: () => { context: GameContext; messages: ChatMessage[]; condenser: CondenserState; pinnedExcerpts?: PinnedExcerpt[] }) {
    _getStateForSave = getter;
}

export function debouncedSaveCampaignState(campaignId: string | null, _state: { context: GameContext; messages: ChatMessage[]; condenser: CondenserState; pinnedExcerpts?: PinnedExcerpt[] }) {
    if (!campaignId) return;
    if (stateTimer) clearTimeout(stateTimer);
    stateTimer = setTimeout(async () => {
        const state = _getStateForSave ? _getStateForSave() : _state;
        try {
            await saveCampaignState(campaignId, state);
        } catch (e) {
            console.error(e);
            notificationPort.error('Failed to save campaign state');
        }
    }, 1000);
}
