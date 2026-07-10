import type { ChatMessage, NPCEntry, SceneStakes } from '../../types';
import type { TurnCallbacks, TurnState } from './turnTypes';
import type { OpenAIMessage } from '../llm/llmService';
import { handlePostTurn } from './turnPostProcess';
import { classifySceneStakes } from './sceneStakesTag';
import { tierAllows } from './aiTier';
import { shouldCondense, computeTrimIndex, getCondenseBudgetRatio } from '../payload';
import { notify } from '../../ports/notification';
import { messaging } from '../../ports/messaging';
import { npc as npcPort } from '../../ports/npc';
import { campaignContext } from '../../ports/campaignContext';
import { archive } from '../../ports/archive';
import { uiState } from '../../ports/uiState';
import { campaignRepository } from '../../ports/campaignRepository';
import { settings } from '../../ports/settings';
import { uid } from '../../utils/uid';

// ── In-memory snapshot ─────────────────────────────────────────────────
interface PendingTurnSnapshot {
    snapshotId: string;
    turnState: TurnState;
    messages: ChatMessage[];
    cachedPayload: OpenAIMessage[];
    displayInput: string;
    activeCampaignId: string;
    npcLedger: NPCEntry[];
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

export function findPendingCommitMessage(messages: ChatMessage[]): ChatMessage | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === 'assistant' && m.pendingCommit) return m;
        if (m.role === 'system' && m.name === 'scene-marker') break;
    }
    return null;
}

export function findRetryableMessage(messages: ChatMessage[]): ChatMessage | null {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === 'assistant' && m.retryable) return m;
        if (m.role === 'system' && m.name === 'scene-marker') break;
    }
    return null;
}

// ── Build commit callbacks from ports ──────────────────────────────────
function buildCommitCallbacks(_activeCampaignId: string): TurnCallbacks {
    return {
        onCheckingNotes: () => {},
        addMessage: (msg) => messaging.appendUserMessage(msg),
        updateLastAssistant: (content) => messaging.recordAssistantReply({ content } as ChatMessage),
        updateLastMessage: (patch) => {
            const msgs = messaging.getMessages();
            if (msgs.length > 0) messaging.editMessage(msgs[msgs.length - 1].id, patch);
        },
        updateContext: (patch) => campaignContext.applyContextPatch(patch),
        setArchiveIndex: (entries) => archive.replaceArchiveIndex([...entries]),
        updateNPC: (id, patch) => npcPort.updateNPC(id, patch),
        addNPC: (n) => npcPort.registerNPC(n),
        addNpcSuggestions: (names, ctx) => npcPort.suggestNPCs(names, ctx),
        setCondensed: (upToIndex) => messaging.condenseHistory(upToIndex),
        setStreaming: () => {},
        setLastPayloadTrace: (trace) => uiState.setLastPayloadTrace(trace),
        setSemanticFacts: (facts) => archive.replaceSemanticFacts([...facts]),
        setChapters: (chapters) => archive.replaceChapters([...chapters]),
        setPipelinePhase: (phase) => uiState.setPipelinePhase(phase),
        setStreamingStats: (stats) => uiState.setStreamingStats(stats),
        setDivergenceRegister: (reg) => {
            archive.replaceDivergenceRegister(reg);
        },
        updateMessageDivergence: (messageId, divergenceIds) => archive.flagMessageDivergence(messageId, divergenceIds),
        applyPressurePatch: (id, p) => npcPort.applyPressure(id, p),
        setOnStageNpcIds: (ids) => npcPort.setOnStageNPCs(ids),
    };
}

// ── commitPendingTurn ──────────────────────────────────────────────────
export async function commitPendingTurn(): Promise<void> {
    const snapshot = pendingSnapshot;
    const messages = messaging.getMessages();

    const pendingMsg = findPendingCommitMessage([...messages]);
    if (!pendingMsg || !pendingMsg.swipeSet) {
        clearPendingTurnSnapshot();
        return;
    }

    const variantIdx = pendingMsg.swipeActiveIndex ?? 0;
    const variant = pendingMsg.swipeSet[variantIdx];
    if (!variant) {
        clearPendingTurnSnapshot();
        return;
    }

    const text = pendingMsg.content;

    let sceneStakes: SceneStakes = variant.sceneStakes;
    if (!variant.tagPresent) {
        const s = settings.getSettings();
        const utilityProvider = snapshot?.turnState.getUtilityEndpoint?.();
        const aiTier = snapshot?.turnState.settings.aiTier ?? s.aiTier;
        if (utilityProvider && tierAllows(aiTier ?? 'pro', 'sceneStakesClassify')) {
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

    campaignContext.applyContextPatch({ lastSceneStakes: sceneStakes });

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

    const freshMsgs = messaging.getMessages();
    const idx = freshMsgs.findIndex(m => m.id === pendingMsg.id);
    if (idx !== -1) {
        const updated = [...freshMsgs];
        const { swipeSet: _ss, pendingCommit: _pc, swipeActiveIndex: _si, retryable: _r, precontext: _pc2, ...rest } = updated[idx];
        updated[idx] = rest as ChatMessage;
        messaging.replaceMessages(updated);
        campaignRepository.saveCampaignState(activeCampaignId, {
            context: campaignContext.getContext(),
            messages: updated,
            condenser: messaging.getCondenserState(),
        }).catch(e => console.warn('[Commit] saveCampaignState failed:', e));
    }

    clearPendingTurnSnapshot();
}

// ── Rebuild TurnState from ports (crash recovery path) ─────────────────
function rebuildStateFromLiveStore(): TurnState {
    const s = settings.getSettings();
    const ctx = campaignContext.getContext();
    const msgs = messaging.getMessages();
    const condenser = messaging.getCondenserState();
    const npcLedger = npcPort.getNPCLedger();
    const archiveIndex = archive.getArchiveIndex();
    const semanticFacts = archive.getSemanticFacts();
    const chapters = archive.getChapters();
    const activeCampaignId = campaignContext.getActiveCampaignId();
    const divergenceRegister = archive.getDivergenceRegister();
    const onStageNpcIds = [...npcPort.getOnStageNPCIds()];
    const npcPressure = npcPort.getPressureMap();
    const pinnedChapterIds = [...archive.getPinnedChapterIds()];

    return {
        input: '',
        displayInput: '',
        settings: s,
        context: ctx,
        messages: [...msgs] as ChatMessage[],
        condenser,
        loreChunks: [],
        npcLedger: [...npcLedger] as NPCEntry[],
        archiveIndex: [...archiveIndex],
        semanticFacts: [...semanticFacts],
        chapters: [...chapters],
        activeCampaignId,
        provider: undefined,
        getMessages: () => [...messaging.getMessages()] as ChatMessage[],
        getFreshProvider: () => undefined,
        getFreshSummarizerProvider: () => undefined,
        getUtilityEndpoint: () => undefined,
        getFreshAuxiliaryProvider: () => undefined,
        getExtractionProvider: () => undefined,
        incrementBookkeepingTurnCounter: () => campaignContext.incrementBookkeepingCounter(),
        autoBookkeepingInterval: campaignContext.getAutoBookkeepingInterval(),
        resetBookkeepingTurnCounter: () => campaignContext.resetBookkeepingCounter(),
        timeline: [],
        pinnedChapterIds,
        clearPinnedChapters: () => archive.clearPinnedChapters(),
        divergenceRegister,
        onStageNpcIds,
        npcPressure,
        pinnedExcerpts: [],
    };
}

export async function reconcilePendingCommitOnLaunch(): Promise<void> {
    const messages = messaging.getMessages();
    const pendingMsg = findPendingCommitMessage([...messages]);
    if (!pendingMsg || !pendingMsg.swipeSet) return;

    console.log('[Reconcile] Found pendingCommit on launch — firing deferred handlePostTurn');
    await commitPendingTurn();
}

export function isLatestGmMessage(messages: ChatMessage[], msgId: string): boolean {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === 'assistant') return m.id === msgId;
        if (m.role === 'system') continue;
        if (m.role === 'user') return false;
    }
    return false;
}

export function hasSwipeSet(msg: ChatMessage | undefined): boolean {
    return !!(msg && msg.swipeSet && msg.swipeSet.length > 0 && msg.pendingCommit);
}
