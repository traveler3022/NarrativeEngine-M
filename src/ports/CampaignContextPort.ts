/**
 * @refactor RF-004, RF-008 (infrastructure)
 * @waves W0(advance)/W1(close)/W4(real extraction)
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-004
 * @see REFACTOR-MAP.md
 *
 * CampaignContextPort — contract between domain services and campaign context state.
 */

import type {
  GameContext,
  ChatMessage,
  CondenserState,
  DivergenceRegister,
  PinnedExcerpt,
  LoreChunk,
  NPCEntry,
  ArchiveIndexEntry,
  ArchiveChapter,
  SemanticFact,
  TimelineEvent,
  EntityEntry,
} from '../types';

/** Data needed to hydrate all campaign-scoped state atomically. */
export interface CampaignHydrationData {
  activeCampaignId: string;
  context: GameContext;
  messages: ChatMessage[];
  condenser: CondenserState;
  pinnedExcerpts?: PinnedExcerpt[];
  loreChunks: LoreChunk[];
  npcLedger: NPCEntry[];
  archiveIndex: ArchiveIndexEntry[];
  divergenceRegister: DivergenceRegister;
  chapters: ArchiveChapter[];
  semanticFacts: SemanticFact[];
  timeline: TimelineEvent[];
  entities: EntityEntry[];
}

export interface CampaignContextPort {
  /** Apply a patch to the campaign context. */
  applyContextPatch(patch: Partial<GameContext>): void;

  /** Increment and return the bookkeeping turn counter. */
  incrementBookkeepingCounter(): number;

  /** Reset the bookkeeping turn counter to 0. */
  resetBookkeepingCounter(): void;

  /** Read the current campaign context. */
  getContext(): GameContext;

  /** Read the active campaign id (null if no campaign loaded). */
  getActiveCampaignId(): string | null;

  /** Hydrate all campaign-scoped state atomically (used by campaignLifecycle service). */
  hydrateCampaign(data: CampaignHydrationData): void;

  /** Clear the active campaign (set to null). */
  clearActiveCampaign(): void;

  /** Update the embedding reindex progress UI state. */
  setReindexState(state: { active: boolean; total: number; done: number; reason: 'switch' | 'lazy' | 'progressive' | null }): void;
}

export const campaignContextPort: CampaignContextPort = {
  applyContextPatch: () => throwNotWired('CampaignContextPort.applyContextPatch'),
  incrementBookkeepingCounter: () => throwNotWired('CampaignContextPort.incrementBookkeepingCounter'),
  resetBookkeepingCounter: () => throwNotWired('CampaignContextPort.resetBookkeepingCounter'),
  getContext: () => throwNotWired('CampaignContextPort.getContext'),
  getActiveCampaignId: () => throwNotWired('CampaignContextPort.getActiveCampaignId'),
  hydrateCampaign: () => throwNotWired('CampaignContextPort.hydrateCampaign'),
  clearActiveCampaign: () => throwNotWired('CampaignContextPort.clearActiveCampaign'),
  setReindexState: () => throwNotWired('CampaignContextPort.setReindexState'),
};

export function wireCampaignContext(impl: CampaignContextPort): void {
  Object.assign(campaignContextPort, impl);
}

function throwNotWired(method: string): never {
  throw new Error(
    `${method} called before wireCampaignContext(). ` +
    `Ensure wireAllAdapters() runs in main.tsx before React mounts.`
  );
}
