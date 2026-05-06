import type { ChatMessage, CondenseAggressiveness, LLMProvider } from '../types';

import { countTokens } from './tokenizer';
import { llmCall } from '../utils/llmCall';

const VERBATIM_WINDOW = 10;
const DEFAULT_BUDGET_RATIO = 0.75;
const META_SUMMARY_THRESHOLD = 6000;
const MAX_CHUNK_TOKENS = 24000;

export const AGGRESSIVENESS_RATIOS: Record<CondenseAggressiveness, number> = {
    aggressive: 0.50,
    balanced: 0.75,
    quality: 0.90,
};

export function getCondenseBudgetRatio(aggressiveness?: CondenseAggressiveness): number {
    if (!aggressiveness) return DEFAULT_BUDGET_RATIO;
    return AGGRESSIVENESS_RATIOS[aggressiveness] ?? DEFAULT_BUDGET_RATIO;
}

export function shouldCondense(
    messages: ChatMessage[],
    contextLimit: number,
    condensedUpToIndex: number,
    budgetRatio = DEFAULT_BUDGET_RATIO
): boolean {
    const uncondensedMessages = messages.slice(condensedUpToIndex + 1);
    if (uncondensedMessages.length <= VERBATIM_WINDOW) return false;

    const historyTokens = countTokens(
        uncondensedMessages.map((m) => m.content).join('')
    );
    return historyTokens > contextLimit * budgetRatio;
}

export function getVerbatimWindow(): number {
    return VERBATIM_WINDOW;
}

function buildCondenserPrompt(
    oldMessages: ChatMessage[],
    existingSummary: string
): string {
    const turns = oldMessages
        .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join('\n\n');

    const parts: string[] = [
        'You are a TTRPG session scribe. Compress the following chat turns into concise bullet points.',
        '',
        'RULES:',
        '1. Preserve ALL dice rolls, damage numbers, HP/MP changes exactly',
        '2. Preserve ALL item names, NPC names, location names EXACTLY as written',
        '3. Use the existing summary for continuity — do NOT paraphrase, rename, or synonym-swap any proper nouns',
        '4. Drop flavour text and generic narration',
        '5. EXCEPTION: Tag any memorable/dramatic moments (epic quotes, confessions, dramatic reveals, promises) with [MEMORABLE: "exact quote or moment"]. These survive future compression.',
        '6. Output format: bullet points grouped by scene/event',
        '7. Be extremely concise — aim for 70% compression',
    ];

    if (existingSummary) {
        parts.push('', 'PREVIOUS CONDENSED SUMMARY (incorporate and update):', existingSummary);
    }

    parts.push('', 'TURNS TO SUMMARIZE:', turns);

    return parts.join('\n');
}

function buildMergePrompt(chunkSummaries: string[]): string {
    return [
        'You are a TTRPG session scribe. Merge the following session chunk summaries into one concise summary (max 3 paragraphs).',
        '',
        'RULES:',
        '1. Preserve major character deaths, epic loot, unresolved plot hooks',
        '2. Preserve ALL proper nouns exactly as written',
        '3. Be extremely concise — remove redundant events, merge similar points',
        '4. Output as prose paragraphs, not bullet points',
        '',
        'CHUNK SUMMARIES:',
        chunkSummaries.join('\n\n'),
    ].join('\n');
}

export async function condenseHistory(
    provider: LLMProvider,
    messages: ChatMessage[],
    condensedUpToIndex: number,
    existingSummary: string,
    _campaignId: string,
    _npcNames: string[],
    contextLimit: number,
    signal?: AbortSignal,
    budgetRatio = DEFAULT_BUDGET_RATIO,
    onProgress?: (batch: number, totalBatches: number) => void,
): Promise<{ summary: string; upToIndex: number }> {
    const uncondensed = messages.slice(condensedUpToIndex + 1);
    const candidateToCondense = uncondensed.slice(0, -VERBATIM_WINDOW);

    if (candidateToCondense.length === 0) {
        return { summary: existingSummary, upToIndex: condensedUpToIndex };
    }

    // --- Phase 4: T3 → T4 Promotion (run first on existing summary) ---
    let finalExistingSummary = existingSummary;
    if (finalExistingSummary && countTokens(finalExistingSummary) > META_SUMMARY_THRESHOLD) {
        console.log('[Archive Memory] Promoting T3 summary to meta-summary...', { tokens: countTokens(finalExistingSummary) });
        const metaPrompt = `You are a TTRPG session scribe. Compress the following older session summary into a highly condensed story-arc level summary (max 3 paragraphs). Preserve major character deaths, epic loot, and unresolved plot hooks.\n\nOLDER SUMMARY:\n${finalExistingSummary}`;

        console.log('[Condenser] Sending T3 meta-summary request...', { promptTokens: countTokens(metaPrompt) });

        try {
            finalExistingSummary = await llmCall(provider, metaPrompt, { signal, priority: 'normal' });
            console.log('[Archive Memory] T3 successfully meta-summarized.');
        } catch (err) {
            console.error('[Archive Memory] Meta-summary API failed, retaining old T3 summary.');
        }
    }

    // --- Cap chunk budget ---
    const budgetLimit = Math.min(
        Math.floor(contextLimit * budgetRatio),
        MAX_CHUNK_TOKENS,
    );

    let basePromptPart = buildCondenserPrompt([], finalExistingSummary);
    let baseTokens = countTokens(basePromptPart);

    let estimatedTotalCandidateTokens = 0;
    for (const msg of candidateToCondense) {
        estimatedTotalCandidateTokens += countTokens(`\n\n[${msg.role.toUpperCase()}]: ${msg.content}`);
    }

    const estimatedBatches = Math.max(1, Math.ceil((baseTokens + estimatedTotalCandidateTokens) / budgetLimit));

    console.log('[Condenser] Budget breakdown:', {
        contextLimit,
        budgetLimit,
        MAX_CHUNK_TOKENS,
        baseTokens,
        maxBaseTokens: Math.floor(budgetLimit * 0.5),
        existingSummaryTokens: countTokens(finalExistingSummary),
        perChunkMessageBudget: budgetLimit - baseTokens,
        candidateCount: candidateToCondense.length,
        candidateTokens: estimatedTotalCandidateTokens,
        estimatedBatches,
    });

    interface ChunkPlan {
        messages: ChatMessage[];
        lastMsgIndex: number;
    }

    const chunkPlans: ChunkPlan[] = [];
    let planMessages: ChatMessage[] = [];
    let planTokens = baseTokens;
    let planLastMsgIndex = condensedUpToIndex;

    for (const msg of candidateToCondense) {
        const turnText = `\n\n[${msg.role.toUpperCase()}]: ${msg.content}`;
        const cost = countTokens(turnText);

        if (planTokens + cost > budgetLimit && planMessages.length > 0) {
            chunkPlans.push({ messages: planMessages, lastMsgIndex: planLastMsgIndex });
            planMessages = [];
            planTokens = baseTokens;
        }

        planMessages.push(msg);
        planTokens += cost;
        planLastMsgIndex = messages.indexOf(msg);
    }

    if (planMessages.length > 0) {
        chunkPlans.push({ messages: planMessages, lastMsgIndex: planLastMsgIndex });
    }

    const totalBatches = chunkPlans.length;
    let completedBatches = 0;

    const chunkPromises = chunkPlans.map((plan, i) => {
        const { messages: chunkMsgs } = plan;
        const prompt = buildCondenserPrompt(
            chunkMsgs,
            finalExistingSummary,
        );

        return (async () => {
            console.log('[Condenser] Sending condensation request...', {
                turns: chunkMsgs.length,
                promptTokens: countTokens(prompt),
                budgetLimit,
                batch: i + 1,
            });

            try {
                const summary = await llmCall(provider, prompt, { signal, priority: 'normal' }) || existingSummary;
                completedBatches++;
                onProgress?.(completedBatches, totalBatches);
                return { index: i, summary, lastMsgIndex: plan.lastMsgIndex };
            } catch (err) {
                if ((err as Error).name === 'AbortError') {
                    throw err;
                }
                console.warn('[Condenser] Chunk condensation failed, retrying once...', err);
                try {
                    const summary = await llmCall(provider, prompt, { signal, priority: 'normal' }) || existingSummary;
                    completedBatches++;
                    onProgress?.(completedBatches, totalBatches);
                    return { index: i, summary, lastMsgIndex: plan.lastMsgIndex };
                } catch (retryErr) {
                    if ((retryErr as Error).name === 'AbortError') {
                        throw retryErr;
                    }
                    console.error('[Condenser] Chunk condensation failed after retry:', retryErr);
                    return { index: i, summary: null, lastMsgIndex: plan.lastMsgIndex };
                }
            }
        })();
    });

    let results: { index: number; summary: string | null; lastMsgIndex: number }[];
    try {
        results = await Promise.all(chunkPromises);
    } catch (err) {
        if ((err as Error).name === 'AbortError') {
            return { summary: finalExistingSummary, upToIndex: condensedUpToIndex };
        }
        throw err;
    }

    results.sort((a, b) => a.index - b.index);

    const firstFailedIdx = results.findIndex(r => r.summary === null);
    const successResults = firstFailedIdx === -1 ? results : results.slice(0, firstFailedIdx);

    const chunkSummaries = successResults.map(r => r.summary!);

    const lastProcessedIndex = successResults.length > 0
        ? successResults[successResults.length - 1].lastMsgIndex
        : condensedUpToIndex;

    let freshSummary: string;
    if (chunkSummaries.length === 0) {
        freshSummary = '';
    } else if (chunkSummaries.length === 1) {
        freshSummary = chunkSummaries[0];
    } else {
        const combined = chunkSummaries.join('\n\n');
        const combinedTokens = countTokens(combined);
        if (combinedTokens <= META_SUMMARY_THRESHOLD) {
            freshSummary = combined;
        } else {
            const mergePrompt = buildMergePrompt(chunkSummaries);
            console.log('[Condenser] Merging chunk summaries...', { chunks: chunkSummaries.length, tokens: combinedTokens });
            try {
                freshSummary = await llmCall(provider, mergePrompt, { signal, priority: 'normal' });
            } catch (err) {
                console.error('[Condenser] Merge failed, falling back to concatenation:', err);
                freshSummary = combined;
            }
        }
    }

    let finalSummary: string;
    if (finalExistingSummary && freshSummary) {
        finalSummary = `${finalExistingSummary}\n\n${freshSummary}`;
    } else if (finalExistingSummary) {
        finalSummary = finalExistingSummary;
    } else {
        finalSummary = freshSummary;
    }

    console.log(`[Condenser] Condensation complete. Processed ${chunkSummaries.length}/${totalBatches} chunks. Bookmark at index: ${lastProcessedIndex}`);

    return { summary: finalSummary, upToIndex: lastProcessedIndex };
}
