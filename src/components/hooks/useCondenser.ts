import { useState, useRef, useCallback, useMemo } from 'react';
import type { AppSettings, ChatMessage, LLMProvider } from '../../types';
import type { SaveProgress } from '../../services/saveFileEngine';
import { useAppStore } from '../../store/useAppStore';
import { condenseHistory, getCondenseBudgetRatio } from '../../services/condenser';
import { runSaveFilePipeline } from '../../services/saveFileEngine';
import { api } from '../../services/apiClient';
import { toast } from '../Toast';

interface UseCondenserDeps {
    activeCampaignId: string | null;
    isStreaming: boolean;
    messages: ChatMessage[];
    condenser: { condensedSummary: string; condensedUpToIndex: number; isCondensing: boolean };
    settings: AppSettings;
    context: any;
    npcLedger: any[];
    setCondensed: (summary: string, upToIndex: number) => void;
    setCondensing: (v: boolean) => void;
    resetCondenser: () => void;
    updateContext: (patch: any) => void;
    setArchiveIndex: (entries: any[]) => void;
    setSemanticFacts: (facts: any[]) => void;
    getActiveSummarizerEndpoint: () => LLMProvider | undefined;
    getActiveStoryEndpoint: () => LLMProvider | undefined;
}

export function useCondenser(deps: UseCondenserDeps) {
    const condenseAbortRef = useRef<AbortController | null>(null);
    const [editingSummary, setEditingSummary] = useState(false);
    const [summaryDraft, setSummaryDraft] = useState('');
    const [condensePhase, setCondensePhase] = useState<'save' | 'extract' | 'compress' | null>(null);
    const [saveProgress, setSaveProgress] = useState<SaveProgress | null>(null);

    const triggerCondense = useCallback(async () => {
        if (deps.condenser.isCondensing) return;
        deps.setCondensing(true);
        condenseAbortRef.current = new AbortController();
        const budgetRatio = getCondenseBudgetRatio(deps.settings.condenseAggressiveness);
        try {
            const provider = deps.getActiveSummarizerEndpoint() ?? deps.getActiveStoryEndpoint();
            if (!provider) return;
            const uncondensed = deps.messages.slice(deps.condenser.condensedUpToIndex + 1);

            setCondensePhase('save');
            try {
                const saveResult = await runSaveFilePipeline(
                    provider as LLMProvider,
                    uncondensed,
                    undefined,
                    undefined,
                    deps.settings.contextLimit,
                    (p) => setSaveProgress(p),
                    condenseAbortRef.current.signal
                );
                if (saveResult.coreMemorySlots) deps.updateContext({ coreMemorySlots: saveResult.coreMemorySlots });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                toast.warning(`Save pipeline failed — ${msg}`);
            }

            setCondensePhase('compress');
            const result = await condenseHistory(
                provider,
                deps.messages,
                deps.condenser.condensedUpToIndex,
                deps.condenser.condensedSummary,
                deps.activeCampaignId || '',
                deps.npcLedger.filter((n: any) => !n.archived).map((n: any) => n.name),
                deps.settings.contextLimit,
                condenseAbortRef.current.signal,
                budgetRatio,
                (batch, total) => setSaveProgress({ phase: 'compress', batch, totalBatches: total }),
            );
            deps.setCondensed(result.summary, result.upToIndex);

            if (deps.activeCampaignId) {
                const [indexResult, factsResult] = await Promise.allSettled([
                    api.archive.getIndex(deps.activeCampaignId),
                    api.facts.get(deps.activeCampaignId).catch(() => [])
                ]);

                if (indexResult.status === 'fulfilled') {
                    deps.setArchiveIndex(indexResult.value);
                }

                if (factsResult.status === 'fulfilled') {
                    deps.setSemanticFacts(factsResult.value);
                }
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error('[Condenser]', err);
                toast.error('Condenser failed');
            }
        } finally {
            setCondensePhase(null);
            setSaveProgress(null);
            deps.setCondensing(false);
            condenseAbortRef.current = null;
        }
    }, [
        deps.condenser.isCondensing,
        deps.condenser.condensedUpToIndex,
        deps.condenser.condensedSummary,
        deps.activeCampaignId,
        deps.messages,
        deps.context,
        deps.npcLedger,
        deps.settings.contextLimit,
        deps.setCondensing,
        deps.getActiveSummarizerEndpoint,
        deps.getActiveStoryEndpoint,
        deps.updateContext,
        deps.setCondensed,
        deps.setArchiveIndex,
        deps.setSemanticFacts,
    ]);

    const handleRetcon = useCallback(() => {
        if (!confirm('Retcon: Delete all messages and keep only the summary?')) return;
        const sysMsg: ChatMessage = {
            id: Date.now().toString(36),
            role: 'system',
            content: deps.condenser.condensedSummary,
            timestamp: Date.now(),
        };
        useAppStore.setState({ messages: [sysMsg] });
        deps.setCondensed('', 0);
        setEditingSummary(false);
    }, [deps.condenser.condensedSummary, deps.setCondensed, setEditingSummary]);

    return useMemo(() => ({
        triggerCondense,
        condenseAbortRef,
        condensePhase,
        saveProgress,
        editingSummary,
        setEditingSummary,
        summaryDraft,
        setSummaryDraft,
        handleRetcon,
    }), [
        triggerCondense,
        condensePhase,
        editingSummary,
        summaryDraft,
        handleRetcon
    ]);
}