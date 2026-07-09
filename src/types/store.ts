/**
 * Types that originated in the store layer but are needed by services.
 *
 * ── Why this file exists ───────────────────────────────────────────────
 * Before this file, services that needed `ArmedLoot`, `ReindexState`,
 * or `CampaignState` had to `import type` from `store/slices/uiSlice`
 * or `store/campaignStore`. That's a type-only leak — erased at
 * compile time, so it doesn't form a runtime cycle, but it still
 * makes services "know about" store internals. If the store ever
 * renamed or restructured those types, services broke.
 *
 * Hoisting them here breaks the leak cleanly:
 *
 *   store → types   (defines them here, re-exports for legacy callers)
 *   services → types  (canonical source, no store dependency)
 *
 * All three are pure data shapes — no behavior, no Zustand coupling.
 */

import type { ChatMessage, CondenserState, GameContext, PinnedExcerpt } from './index';

/** Loot payload armed by the user via the Loot button, awaiting resolution. */
export type ArmedLoot = {
    rolls: number;
    /** Soft override: replace weights at named pick nodes (root pick's options from the modal). */
    reweight?: Record<string, Record<string, number>>;
};

/** State of an in-progress embedding re-index, surfaced in the UI as a progress bar. */
export type ReindexState = {
    active: boolean;
    total: number;
    done: number;
    reason: 'switch' | 'lazy' | 'progressive' | null;
};

/** Persisted shape of a campaign's mutable state (chat + context + condenser). */
export type CampaignState = {
    context: GameContext;
    messages: ChatMessage[];
    condenser: CondenserState;
    pinnedExcerpts?: PinnedExcerpt[];
};
