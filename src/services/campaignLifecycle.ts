/**
 * @refactor RF-008 (real extraction — W4 redo)
 * @waves W4
 * @see architecture/POSTMORTEM_W4.md
 * @see architecture/phase3-refactor-planning/3.1-refactor-case-catalog.md#RF-008
 *
 * Campaign lifecycle service — owns the orchestration logic for campaign
 * switching, loading, and auto-backup.
 *
 * EXTRACTED from campaignSlice.ts (W4 redo). The slice previously contained
 * this logic and imported services directly (state→domain violation).
 * Now the slice only holds state; this service does the work.
 *
 * Per POSTMORTEM_W4 rule: NO dynamic imports to hide dependencies.
 * This service imports other services directly (domain→domain is allowed).
 * It calls ports for state mutations (never imports the store).
 */

import { migrateDiceSystem } from '../types';
import { defaultContext } from '../types/defaultContext';
import { campaignContextPort, notificationPort, settingsPort } from '../ports';
import { debouncedSaveSettings } from './persistence/settingsStore';
import { abortForCampaignSwitch, runFullReindex, warmupEmbedder, getCurrentModelId } from './embedding';
import { embeddingStorage } from './storage/embeddingStorage';
import { offlineStorage } from './storage';
import { backgroundQueue } from './infrastructure';
import { commitPendingTurn } from './turn';
import { api } from './apiClient';
import {
  loadCampaignState, getLoreChunks, getNPCLedger, loadArchiveIndex,
  loadDivergenceRegister, loadChapters, loadSemanticFacts, loadTimeline, loadEntities,
} from './persistence/campaignStore';
import { EMPTY_REGISTER } from './campaign-state';
import type { CampaignHydrationData } from '../ports/CampaignContextPort';

let autoBackupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Switch to a different campaign. Orchestrates:
 * 1. Abort pending embedding work
 * 2. Commit any pending turn (belongs to outgoing campaign)
 * 3. Release outgoing campaign's vector cache
 * 4. Clear background queue
 * 5. Save settings for outgoing campaign
 * 6. Load all campaign-scoped data from persistence
 * 7. Hydrate store atomically via port
 * 8. Warmup embedder + check for stale vectors
 * 9. Start auto-backup timer
 */
export async function switchCampaign(id: string | null): Promise<void> {
  // 1. Abort pending embedding work
  abortForCampaignSwitch();

  // 2. Commit any pending turn before switching
  if (id !== campaignContextPort.getActiveCampaignId()) {
    try {
      await commitPendingTurn();
    } catch (e) {
      console.warn('[CampaignSwitch] commitPendingTurn failed:', e);
    }
  }

  // 3. Release outgoing campaign's vector cache
  const previousCampaignId = campaignContextPort.getActiveCampaignId();
  if (previousCampaignId && previousCampaignId !== id) {
    try {
      offlineStorage.embeddings.releaseCache(previousCampaignId);
    } catch (e) {
      console.warn('[CampaignSwitch] releaseCache failed:', e);
    }
  }

  // 4. Clear background queue
  backgroundQueue.clear('Campaign switched');

  // 5. Clear auto-backup timer
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer);
    autoBackupTimer = null;
  }

  // 6. Save settings for outgoing campaign
  const settings = settingsPort.getSettings();
  debouncedSaveSettings(settings, id);

  // 7. If null, just clear and return
  if (!id) {
    campaignContextPort.clearActiveCampaign();
    return;
  }

  // 8. Load all campaign-scoped data from persistence
  const [campaignState, loreChunks, npcLedger, archiveIndex, divReg] = await Promise.all([
    loadCampaignState(id),
    getLoreChunks(id),
    getNPCLedger(id),
    loadArchiveIndex(id),
    loadDivergenceRegister(id),
  ]);
  const [chapters, semanticFacts, timeline, entities] = await Promise.all([
    loadChapters(id).catch(() => []),
    loadSemanticFacts(id).catch(() => []),
    loadTimeline(id).catch(() => []),
    loadEntities(id).catch(() => []),
  ]);

  // 9. Hydrate store atomically via port
  const hydrationData: CampaignHydrationData = {
    activeCampaignId: id,
    context: migrateDiceSystem({ ...defaultContext, ...(campaignState?.context ?? {}) }),
    messages: campaignState?.messages ?? [],
    condenser: campaignState?.condenser ?? { condensedUpToIndex: -1 },
    pinnedExcerpts: campaignState?.pinnedExcerpts ?? [],
    loreChunks,
    npcLedger,
    archiveIndex,
    divergenceRegister: divReg ?? { ...EMPTY_REGISTER },
    chapters,
    semanticFacts,
    timeline,
    entities,
  };
  campaignContextPort.hydrateCampaign(hydrationData);

  // 10. Warmup embedder + check for stale vectors (background, non-blocking)
  warmupEmbedder()
    .then(async () => {
      console.log('[Embedder] Model warmed up and ready');
      const hasStale = await embeddingStorage.hasStaleVectors(id, getCurrentModelId());
      if (hasStale) {
        console.log('[Campaign] Stale embedding vectors detected, triggering lazy re-index');
        campaignContextPort.setReindexState({ active: true, total: 0, done: 0, reason: 'lazy' });
        runFullReindex(id, (progress) => {
          campaignContextPort.setReindexState({
            active: true,
            total: progress.total,
            done: progress.done,
            reason: 'lazy',
          });
        }).then(() => {
          campaignContextPort.setReindexState({ active: false, total: 0, done: 0, reason: null });
          notificationPort.success('Re-indexing complete');
        }).catch((_e) => {
          console.error('[Campaign] Lazy re-index failed:', _e);
          campaignContextPort.setReindexState({ active: false, total: 0, done: 0, reason: null });
        });
      }
    })
    .catch(e => {
      console.warn('[Embedder] Warmup failed, semantic search will use keyword fallback:', e);
    });

  // 11. Start auto-backup timer (10 min interval)
  autoBackupTimer = setInterval(async () => {
    const activeId = campaignContextPort.getActiveCampaignId();
    if (!activeId) return;
    try {
      await offlineStorage.backup.create(activeId, {
        trigger: 'auto',
        isAuto: true,
      });
    } catch (e) {
      console.warn('[Auto-Backup] Failed:', e);
    }
  }, 10 * 60 * 1000);
}

/**
 * Create a pre-operation backup before a destructive action.
 */
export async function preOpBackup(campaignId: string, trigger: string): Promise<void> {
  await api.backup.create(campaignId, { trigger, isAuto: true });
}
