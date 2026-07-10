import type { ChatMessage, NPCEntry, SceneStakes } from '../../types';
import type { TurnCallbacks, TurnState } from './turnTypes';
import type { OpenAIMessage } from '../llm/llmService';
import { handlePostTurn } from './turnPostProcess';
import { classifySceneStakes } from './sceneStakesTag';
import { tierAllows } from './aiTier';
import { shouldCondense, computeTrimIndex, getCondenseBudgetRatio } from '../payload';
import { notify } from '../../ports/notification';
import { messaging } from '../../ports/messaging';
import { npc } from '../../ports/npc';
import { settings } from '../../ports/settings';
import { campaignContext } from '../../ports/campaignContext';
import { archive } from '../../ports/archive';
import { divergence } from '../../ports/divergence';
import { campaignRepository } from '../../ports/campaignRepository';
import { uid } from '../../utils/uid';

// ── In-memory snapshot ─────────────────────────────────────────────────
// Lost on crash — that's OK. Relaunch reconciliation rebuilds from the live
// store (no "next turn's messages" exist after a crash, so live == snapshot).
interface PendingTurnSnapshot {
    snapshotId: string;                 // uid() — matched by ChatMessage.precontext.capturedPayloadRef
    turnState: TurnState;               // ORIGINAL reference — do NOT rebuild from live
    messages: ChatMessage[];              // messages at swipe-1 completion time (frozen)
    cachedPayload: OpenAIMessage[];      // for swipes 2–5 (sanitizePayloadForApi(false))
    displayInput: string;                // user's display input for this turn
    activeCampaignId: string;            // campaign at turn time
    npcLedger: NPCEntry[];               // ledger at turn time
}

let pendingSnapshot: PendingTurnSnapshot | null = null;

export function capturePendingTurnSnapshot(
    state: TurnState,
    cachedPayload: OpenAIMessage[],
    displayInput: string,
): void {
    pendingSnapshot = {
        snapshotId: uid(),
        turnState: state,
        messages: [...state.getMessages()],
        cachedPayload: [...cachedPayload],
        displayInput,
        activeCampaignId: state.activeCampaignId ?? '',
        npcLedger: state.npcLedger,
    };
}

export function getActiveSnapshotId(): string | null {
    return pendingSnapshot?.snapshotId ?? null;
}

export function clearPendingTurnSnapshot(): void {
    pendingSnapshot = null;
}

export function getPendingTurnSnapshot(): PendingTurnSnapshot | null {
    return pendingSnapshot;
}

export function getCachedSwipePayload(): OpenAIMessage[] | null {
    return pendingSnapshot?.cachedPayload ?? null;
}

// Smart Retry v1: patch the user-message slot in the cached payload (soft-edit).
// Preserves engine appendages by splicing only the player-authored prefix —
// the caller passes the new FULL prompt text and the engine-tag patterns are
// applied here. This mutates the in-memory singleton directly; if no snapshot
// is active, the call is a no-op (the caller should fall back to full rewind).
export function patchCachedUserPrompt(newPromptText: string): void {
    if (!pendingSnapshot) return;
    const payload = pendingSnapshot.cachedPayload;
    let lastUserIdx = -1;
    for (let i = payload.length - 1; i >= 0; i--) {
        if (payload[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;
    const original = payload[lastUserIdx].content;
    if (typeof original !== 'string') return;

    // Engine tag patterns — must match the orchestrator's append points.
    const patterns: RegExp[] = [
        /\n\[RESOLVED ROLL — /,
        /\n\[LOOT DROP: /,
        /\n\[DICE FAIRNESS/i,
        /\n\[CHARACTER INTRO/i,
    ];
    let splitIdx = original.length;
    for (const pat of patterns) {
        const m = original.match(pat);
        if (m && m.index !== undefined && m.index < splitIdx) splitIdx = m.index;
    }
    const engineSuffix = original.slice(splitIdx);
    payload[lastUserIdx] = { ...payload[lastUserIdx], content: newPromptText.trim() + engineSuffix };
}

// ── Find the latest GM message with a pending commit ───────────────────
export function findPendingCommitMessage(messages: ChatMessage[]): ChatMessage | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === 'assistant' && m.pendingCommit) return m;
        // Only scan the tail — the pending message is always the latest GM bubble
        // (no scene-marker follows it because handlePostTurn was deferred).
        if (m.role === 'system' && m.name === 'scene-marker') break;
    }
    return null;
}

// Smart Retry v1: find the latest assistant message marked retryable (the story
// AI was aborted or failed final retry). Like findPendingCommitMessage but for
// the pre-commit failure state. Used by delete/regenerate handlers to clear
// the orphaned precontext + the in-memory snapshot when the turn is discarded.
export function findRetryableMessage(messages: ChatMessage[]): ChatMessage | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === 'assistant' && m.retryable) return m;
        if (m.role === 'system' && m.name === 'scene-marker') break;
    }
    return null;
}

// ── Build fresh callbacks from the ports for commit ─────────────────────
// setLastPayloadTrace / setPipelinePhase / setStreamingStats are UI-transient
// state (see architecture/BOUNDARIES.md non-goals) and handlePostTurn never
// invokes them on the commit path, so they're omitted here — same as the
// existing onCheckingNotes/setStreaming no-ops below.
function buildCommitCallbacks(activeCampaignId: string): TurnCallbacks {
    return {
        onCheckingNotes: () => {},
        addMessage: (msg) => messaging.appendMessage(msg),
        updateLastAssistant: (content) => {
            const msgs = messaging.getMessages();
            const last = msgs[msgs.length - 1];
            if (last && last.role === 'assistant') messaging.editMessage(last.id, { content });
        },
        updateLastMessage: (patch) => {
            const msgs = messaging.getMessages();
            const last = msgs[msgs.length - 1];
            if (last) messaging.editMessage(last.id, patch);
        },
        updateContext: (patch) => campaignContext.applyContextPatch(patch),
        setArchiveIndex: (entries) => archive.setArchiveIndex(entries),
        updateNPC: (id, patch) => npc.updateNPC(id, patch),
        addNPC: (n) => npc.registerNPC(n),
        addNpcSuggestions: (names, ctx) => npc.suggestNPCs(names, ctx),
        setCondensed: (upToIndex) => messaging.condenseHistory(upToIndex),
        setStreaming: () => {},
        setSemanticFacts: (facts) => archive.setSemanticFacts(facts),
        setChapters: (chapters) => archive.setChapters(chapters),
        setDivergenceRegister: (reg) => {
            divergence.setDivergenceRegister(reg);
            if (activeCampaignId) {
                campaignRepository.saveDivergenceRegister(activeCampaignId, reg)
                    .catch(e => console.warn('[Commit] saveDivergenceRegister failed:', e));
            }
        },
        updateMessageDivergence: (messageId, divergenceIds) => messaging.flagDivergence(messageId, divergenceIds),
        applyPressurePatch: (id, p) => npc.applyPressure(id, p),
        setOnStageNpcIds: (ids) => npc.setOnStageNPCs(ids),
    };
}

// ── commitPendingTurn ──────────────────────────────────────────────────
// Fires handlePostTurn with the visible variant's CURRENT (possibly edited)
// text. Guards against late swipe results. Reworded failure toast for the
// commit path.
export async function commitPendingTurn(): Promise<void> {
    const snapshot = pendingSnapshot;
    const messages = [...messaging.getMessages()];

    const pendingMsg = findPendingCommitMessage(messages);
    if (!pendingMsg || !pendingMsg.swipeSet) {
        // No pending turn (normal first-turn case, or already committed).
        clearPendingTurnSnapshot();
        return;
    }

    const variantIdx = pendingMsg.swipeActiveIndex ?? 0;
    const variant = pendingMsg.swipeSet[variantIdx];
    if (!variant) {
        clearPendingTurnSnapshot();
        return;
    }

    // The visible variant's CURRENT text — read from the message content
    // (which reflects edits the user may have made while browsing).
    const text = pendingMsg.content;

    // Determine scene stakes from the chosen variant.
    let sceneStakes: SceneStakes = variant.sceneStakes;
    if (!variant.tagPresent) {
        const utilityProvider = snapshot?.turnState.getUtilityEndpoint?.() ?? settings.getActiveUtilityEndpoint();
        const aiTier = snapshot?.turnState.settings.aiTier ?? settings.getSettings().aiTier;
        if (utilityProvider && tierAllows(aiTier, 'sceneStakesClassify')) {
            try {
                const recentScene = (snapshot?.messages ?? messages).slice(-3).map(m => {
                    const role = m.role === 'assistant' ? 'GM' : m.role.toUpperCase();
                    return `[${role}]: ${(m.content || '').slice(0, 500)}`;
                }).join('\n\n');
                sceneStakes = await classifySceneStakes(utilityProvider, recentScene + '\n\n' + text.slice(0, 1000));
            } catch (e) {
                console.warn('[Commit] scene-stakes fallback classify failed:', e);
            }
        }
    }

    // Update context with lastSceneStakes from the chosen variant (commit only).
    campaignContext.applyContextPatch({ lastSceneStakes: sceneStakes });

    // Build the commit state — use the ORIGINAL TurnState reference but
    // override getMessages so the importance rater reads the snapshot,
    // never live getMessages() (a late commit must not see the next turn's messages).
    const commitState: TurnState = snapshot
        ? { ...snapshot.turnState, getMessages: () => snapshot.messages }
        : rebuildStateFromLiveStore();

    const commitCallbacks = buildCommitCallbacks(commitState.activeCampaignId ?? '');
    const displayInput = snapshot?.displayInput ?? '';
    const activeCampaignId = commitState.activeCampaignId!;
    const npcLedger = commitState.npcLedger;

    try {
        await handlePostTurn(
            commitState,
            commitCallbacks,
            displayInput,
            activeCampaignId,
            npcLedger,
            text,
        );

        // Auto-condense check — moved to commit (was in the orchestrator completion callback).
        if (commitState.settings.autoCondenseEnabled) {
            const allMsgs = commitState.getMessages();
            if (shouldCondense(allMsgs, commitState.settings.contextLimit, commitState.condenser.condensedUpToIndex, getCondenseBudgetRatio(commitState.settings.condenseAggressiveness))) {
                const newIndex = computeTrimIndex(allMsgs, commitState.condenser.condensedUpToIndex);
                if (newIndex !== commitState.condenser.condensedUpToIndex) {
                    messaging.condenseHistory(newIndex);
                }
            }
        }
    } catch (err) {
        console.error('[Commit] handlePostTurn failed:', err);
        notify.error('Turn committed but some archive updates may be missing. Your story is saved.');
    }

    // Clear the swipe set + pendingCommit marker — the bubble is now a
    // normal historical message.
    const freshMsgs = messaging.getMessages();
    const idx = freshMsgs.findIndex(m => m.id === pendingMsg.id);
    if (idx !== -1) {
        messaging.editMessage(pendingMsg.id, {
            swipeSet: undefined,
            pendingCommit: undefined,
            swipeActiveIndex: undefined,
            retryable: undefined,
            precontext: undefined,
        });
        campaignRepository.saveCampaignState(activeCampaignId, {
            context: campaignContext.getContext(),
            messages: [...messaging.getMessages()],
            condenser: messaging.getCondenserState(),
            pinnedExcerpts: [...archive.getPinnedExcerpts()],
        }).catch(e => console.warn('[Commit] saveCampaignState failed:', e));
    }

    clearPendingTurnSnapshot();
}

// ── Rebuild TurnState from the live store (crash recovery path) ────────
// Used when pendingCommit is true on launch but the in-memory snapshot was
// lost (WebView/renderer death). At relaunch, no "next turn's messages"
// exist, so reading live is safe — the snapshot invariant (don't see the
// next turn's messages) holds vacuously.
function rebuildStateFromLiveStore(): TurnState {
    return {
        input: '',
        displayInput: '',
        settings: settings.getSettings(),
        context: campaignContext.getContext(),
        messages: [...messaging.getMessages()],
        condenser: messaging.getCondenserState(),
        loreChunks: [...archive.getLoreChunks()],
        npcLedger: [...npc.getNPCLedger()],
        archiveIndex: [...archive.getArchiveIndex()],
        semanticFacts: [...archive.getSemanticFacts()],
        chapters: [...archive.getChapters()],
        activeCampaignId: campaignContext.getActiveCampaignId(),
        provider: settings.getActiveStoryEndpoint(),
        getMessages: () => [...messaging.getMessages()],
        getFreshProvider: () => settings.getActiveStoryEndpoint(),
        getFreshSummarizerProvider: () => {
            const s = settings.getActiveSummarizerEndpoint();
            return (s?.endpoint && s?.modelName) ? s : undefined;
        },
        getUtilityEndpoint: () => settings.getActiveUtilityEndpoint(),
        getFreshAuxiliaryProvider: () => {
            const aux = settings.getActiveAuxiliaryEndpoint();
            return aux?.modelName ? aux : settings.getActiveStoryEndpoint();
        },
        getExtractionProvider: () => {
            const hasEndpoint = (p?: { endpoint?: string; modelName?: string }) => !!(p?.endpoint && p?.modelName);
            const a = settings.getActiveAuxiliaryEndpoint();
            if (hasEndpoint(a)) return a!;
            const s = settings.getActiveSummarizerEndpoint();
            if (hasEndpoint(s)) return s!;
            return settings.getActiveStoryEndpoint();
        },
        incrementBookkeepingTurnCounter: () => campaignContext.incrementBookkeepingCounter(),
        autoBookkeepingInterval: campaignContext.getAutoBookkeepingInterval(),
        resetBookkeepingTurnCounter: () => campaignContext.resetBookkeepingCounter(),
        timeline: [...archive.getTimeline()],
        pinnedChapterIds: [...archive.getPinnedChapterIds()],
        clearPinnedChapters: () => archive.clearPinnedChapters(),
        divergenceRegister: divergence.getDivergenceRegister(),
        onStageNpcIds: [...npc.getOnStageNPCIds()],
        npcPressure: { ...npc.getPressureMap() },
        pinnedExcerpts: [...archive.getPinnedExcerpts()],
    };
}

// ── Launch reconciliation ──────────────────────────────────────────────
// On app launch, if any message has pendingCommit=true, fire handlePostTurn
// with the then-visible variant's text, then clear the marker. Covers
// WebView/renderer death mid-browse.
export async function reconcilePendingCommitOnLaunch(): Promise<void> {
    const pendingMsg = findPendingCommitMessage([...messaging.getMessages()]);
    if (!pendingMsg || !pendingMsg.swipeSet) return;

    console.log('[Reconcile] Found pendingCommit on launch — firing deferred handlePostTurn');
    await commitPendingTurn();
}

// ── Swipe-set helpers ──────────────────────────────────────────────────
// Check if a message is the latest GM message (eligible for 🔄)
export function isLatestGmMessage(messages: ChatMessage[], msgId: string): boolean {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === 'assistant') return m.id === msgId;
        // Skip trailing system messages (scene-marker, timeskip-seam, etc.)
        if (m.role === 'system') continue;
        // If we hit a user message first, this isn't the latest GM
        if (m.role === 'user') return false;
    }
    return false;
}

// Check if a message has a browseable swipe set (pre-commit)
export function hasSwipeSet(msg: ChatMessage | undefined): boolean {
    return !!(msg && msg.swipeSet && msg.swipeSet.length > 0 && msg.pendingCommit);
}