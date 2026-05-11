import type { ChatMessage, LLMProvider, CoreMemorySlot } from '../types';
import { countTokens } from './tokenizer';
import { extractJson } from './payloadBuilder';
import { llmCall } from '../utils/llmCall';

const PROMPT_OVERHEAD_RESERVE = 4000;
const BATCH_TIMEOUT_MS = 90_000;
const MAX_SAVE_PIPELINE_TOKENS = 2_000_000;

function computeBatchLimit(contextLimit: number): number {
    return Math.max(Math.floor(contextLimit * 0.70) - PROMPT_OVERHEAD_RESERVE, 16_000);
}

export type SaveProgress = {
    phase: 'slots' | 'compress';
    batch: number;
    totalBatches: number;
    error?: string;
};

async function callWithTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    });
    try { return await Promise.race([p, timeout]); }
    finally { clearTimeout(timer!); }
}

function chunkMessagesByTokenBudget(messages: ChatMessage[], budget: number): ChatMessage[][] {
    const chunks: ChatMessage[][] = [];
    let currentChunk: ChatMessage[] = [];
    let currentTokens = 0;

    for (const msg of messages) {
        const cost = countTokens(msg.content);
        if (currentTokens + cost > budget && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentTokens = 0;
        }
        currentChunk.push(msg);
        currentTokens += cost;
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);
    return chunks;
}

// ─── Core Memory Slots Generator (JSON Slot Format) ───

function buildCoreMemorySlotsPrompt(messages: ChatMessage[], existingSlots?: CoreMemorySlot[]): string {
    const turns = messages
        .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
        .join('\n\n');

    const existingContext = existingSlots && existingSlots.length > 0
        ? JSON.stringify(existingSlots, null, 2)
        : '[No existing slots — generate fresh]';

    return [
        'You are a TTRPG session state tracker. Generate the CURRENT Core Memory Slots as a JSON array of memory slots.',
        '',
        'OUTPUT FORMAT — respond with a JSON array of memory slot objects:',
        '[',
        '    {',
        '        "key": "PLAYER_STATUS",',
        '        "value": "Current player status description",',
        '        "priority": 8,',
        '        "sceneId": 42',
        '    },',
        '    ...',
        ']',
        '',
        'RULES:',
        '1. REQUIRED keys (must be present): PLAYER_STATUS, LOCATION, TIME_DATE',
        '2. Maximum 15 slots total',
        '3. priority: 1-10 (10 = most critical, must be preserved)',
        '4. sceneId: the scene number where this information was learned',
        '5. Merge with existing slots — update values when new info is learned',
        '6. Higher priority slots should contain more critical campaign state',
        '7. Use concise, factual values — NO prose or narrative',
        '8. Preserve ALL proper nouns exactly as written',
        '',
        'EXISTING SLOTS (update these with new information):',
        existingContext,
        '',
        'SESSION TURNS:',
        turns,
    ].join('\n');
}

function validateCoreMemorySlots(output: string): {
    valid: boolean;
    missing: string[];
    slots?: CoreMemorySlot[];
} {
    try {
        const arr = JSON.parse(output);
        if (!Array.isArray(arr)) return { valid: false, missing: ['JSON array'] };
        const REQUIRED_KEYS = ['PLAYER_STATUS', 'LOCATION', 'TIME_DATE'];
        const present = new Set(arr.map((s: any) => s.key));
        const missing = REQUIRED_KEYS.filter(k => !present.has(k));
        return { valid: missing.length === 0, missing, slots: arr };
    } catch {
        return { valid: false, missing: ['JSON parse'] };
    }
}

export async function generateCoreMemorySlots(
    messages: ChatMessage[],
    endpoint: { endpoint: string; apiKey: string; modelName: string },
    existingSlots?: CoreMemorySlot[],
    countTokensFn?: (text: string) => number,
    contextLimit?: number,
    onProgress?: (p: SaveProgress) => void,
    signal?: AbortSignal
): Promise<{ slots?: CoreMemorySlot[]; success: boolean }> {
    if (!countTokensFn) {
        const prompt = buildCoreMemorySlotsPrompt(messages, existingSlots);
        console.log(`[SaveFileEngine] Generating Core Memory Slots (single-pass)...`, {
            messages: messages.length,
        });

        let output: string;
        try {
            output = await callWithTimeout(llmCall(endpoint, prompt, { signal }), BATCH_TIMEOUT_MS, 'slots single-pass');
        } catch {
            return { slots: existingSlots, success: false };
        }
        const { valid, slots } = validateCoreMemorySlots(output);

        if (valid) {
            return { slots, success: true };
        }
        return { slots: existingSlots, success: false };
    }

    const batchLimit = computeBatchLimit(contextLimit ?? 4096);
    const chunks = chunkMessagesByTokenBudget(messages, batchLimit);
    let runningSlots: CoreMemorySlot[] = existingSlots ? [...existingSlots] : [];
    let anySuccess = false;

    for (let ci = 0; ci < chunks.length; ci++) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

        const chunk = chunks[ci];
        const prompt = buildCoreMemorySlotsPrompt(chunk, runningSlots);

        onProgress?.({ phase: 'slots', batch: ci + 1, totalBatches: chunks.length });
        console.log(`[SaveFileEngine] Generating Core Memory Slots... (Batch ${ci + 1}/${chunks.length})`, {
            messages: chunk.length,
            promptTokens: countTokensFn(prompt)
        });

        let output: string;
        try {
            output = await callWithTimeout(
                llmCall(endpoint, prompt, { signal }),
                BATCH_TIMEOUT_MS,
                `slots batch ${ci + 1}`
            );
        } catch (err) {
            const isTimeout = err instanceof Error && err.message.includes('timeout');
            console.warn(`[SaveFileEngine] Core Memory Slots batch ${ci + 1} ${isTimeout ? 'timeout' : 'LLM call failed'}`);
            onProgress?.({ phase: 'slots', batch: ci + 1, totalBatches: chunks.length, error: isTimeout ? 'timeout' : String(err) });
            if ((err as DOMException)?.name === 'AbortError') throw err;
            continue;
        }
        const { valid, slots } = validateCoreMemorySlots(output);

        if (valid && slots) {
            const slotMap = new Map(runningSlots.map(s => [s.key, s]));
            for (const slot of slots) {
                slotMap.set(slot.key, slot);
            }
            runningSlots = Array.from(slotMap.values());
            anySuccess = true;
        } else {
            console.warn(`[SaveFileEngine] Core Memory Slots batch ${ci + 1} failed validation`);
        }
    }

    return {
        slots: runningSlots,
        success: anySuccess
    };
}

// ─── Full Pipeline ───

export async function runSaveFilePipeline(
    provider: LLMProvider,
    recentMessages: ChatMessage[],
    existingSlots?: CoreMemorySlot[],
    countTokensFn?: (text: string) => number,
    contextLimit?: number,
    onProgress?: (p: SaveProgress) => void,
    signal?: AbortSignal
): Promise<{
    coreMemorySlots?: CoreMemorySlot[];
    success: boolean;
}> {
    const totalTokens = recentMessages.reduce((sum, m) => sum + countTokens(m.content), 0);
    if (totalTokens > MAX_SAVE_PIPELINE_TOKENS) {
        throw new Error(`Save pipeline refused: ${totalTokens} tokens exceeds 2M cap. Trim history via Retcon or disable legacy condenser.`);
    }

    const slotsResult = await generateCoreMemorySlots(recentMessages, provider, existingSlots, countTokensFn, contextLimit, onProgress, signal);

    return {
        coreMemorySlots: slotsResult.slots,
        success: slotsResult.success
    };
}

// ─── Chapter Summary Generator ───

const CHAPTER_SUMMARY_TOKEN_BUDGET = 8000;

export type ChapterSummaryOutput = {
    title: string;
    summary: string;
    keywords: string[];
    npcs: string[];
    majorEvents: string[];
    unresolvedThreads: string[];
    tone: string;
    themes: string[];
};

function truncateScenesToBudget(
    scenes: { sceneId: string; content: string }[],
    budget: number = CHAPTER_SUMMARY_TOKEN_BUDGET
): { sceneId: string; content: string }[] {
    const totalTokens = scenes.reduce((sum, s) => sum + countTokens(s.content), 0);
    if (totalTokens <= budget) return scenes;

    // Strategy: keep ~20% oldest + ~60% newest, drop middle oldest scenes
    const keepCount = Math.floor(scenes.length * 0.8);
    const dropCount = scenes.length - keepCount;
    const dropFromStart = Math.floor(dropCount * 0.25); // Keep some oldest context
    const dropFromEnd = dropCount - dropFromStart;

    return [
        ...scenes.slice(0, scenes.length - dropFromEnd - dropFromStart),
        ...scenes.slice(scenes.length - dropFromEnd),
    ];
}

function buildChapterSummaryPrompt(
    scenes: { sceneId: string; content: string }[],
    chapterTitle?: string
): string {
    const truncated = truncateScenesToBudget(scenes);
    const sceneContent = truncated.map(s => `--- SCENE ${s.sceneId} ---\n${s.content}`).join('\n\n');

    return [
        'You are a TTRPG campaign archivist. Generate a structured chapter summary.',
        '',
        `CHAPTER: ${chapterTitle || 'Untitled'}`,
        `SCENES: ${scenes.length} scenes`,
        '',
        'OUTPUT FORMAT — respond with a JSON object:',
        '{',
        '    "title": "Short evocative chapter title",',
        '    "summary": "3-5 sentence narrative summary of what happened",',
        '    "keywords": ["keyword1", "keyword2", ...],',
        '    "npcs": ["NPC Name 1", "NPC Name 2", ...],',
        '    "majorEvents": ["Event description 1", "Event description 2"],',
        '    "unresolvedThreads": ["Thread 1", "Thread 2"],',
        '    "tone": "one of: combat-heavy, exploration, social, mystery, political, emotional, mixed",',
        '    "themes": ["theme1", "theme2"]',
        '}',
        '',
        'RULES:',
        '1. Keywords should be distinctive nouns/places/factions — not generic words',
        '2. NPCs should include all significant named characters who appeared or were discussed',
        '3. Major events are plot-critical beats only (not every combat round)',
        '4. Unresolved threads are open plot hooks, promises, or mysteries',
        '5. Title should be 2-5 words, evocative',
        '6. Summary should read like a campaign journal entry, not a list',
        '',
        'SCENE CONTENT:',
        sceneContent,
    ].join('\n');
}

/**
 * Extract JSON from LLM output, handling markdown fences and common errors.
 */
export function parseChapterSummaryOutput(raw: string): ChapterSummaryOutput | null {
    const cleaned = extractJson(raw.trim());

    try {
        const parsed = JSON.parse(cleaned);

        // Validate required fields
        const required: (keyof ChapterSummaryOutput)[] = [
            'title', 'summary', 'keywords', 'npcs',
            'majorEvents', 'unresolvedThreads', 'tone', 'themes'
        ];

        for (const field of required) {
            if (!(field in parsed)) {
                console.warn(`[ChapterSummary] Missing field: ${field}`);
                parsed[field] = field === 'summary' || field === 'tone' ? '' : [];
            }
        }

        return parsed as ChapterSummaryOutput;
    } catch (e) {
        console.error('[ChapterSummary] Failed to parse JSON:', e);
        return null;
    }
}

export async function generateChapterSummary(
    provider: LLMProvider,
    scenes: { sceneId: string; content: string }[],
    chapterTitle?: string,
    maxRetries = 1
): Promise<ChapterSummaryOutput | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const prompt = attempt === 0
            ? buildChapterSummaryPrompt(scenes, chapterTitle)
            : buildChapterSummaryPrompt(scenes, chapterTitle) +
            '\n\nPREVIOUS ATTEMPT FAILED. Output ONLY valid JSON with all required fields.';

        console.log(`[SaveFileEngine] Generating Chapter Summary... (Attempt ${attempt + 1})`, {
            sceneCount: scenes.length,
            promptTokens: countTokens(prompt)
        });

        const output = await llmCall(provider, prompt);
        const result = parseChapterSummaryOutput(output);

        if (result) {
            return result;
        }
        console.warn(`[SaveFileEngine] Chapter Summary attempt ${attempt + 1} failed parsing`);
    }

    return null;
}

// ─── Combined Seal Call (summary + divergences in ONE LLM call) ───

import type { DivergenceEntry } from '../types';
import { DIVERGENCE_CATEGORIES, CATEGORY_DEFINITIONS, coerceCategory, stripReasoning } from './divergenceRegister';
import { uid } from '../utils/uid';

const COMBINED_SEAL_TOKEN_BUDGET = 12000;

function buildCombinedSealPrompt(
    scenes: { sceneId: string; content: string }[],
    chapterTitle: string,
    sceneIds: string[],
    npcLedger: { id: string; name: string; aliases: string }[]
): string {
    const truncated = truncateScenesToBudget(scenes, COMBINED_SEAL_TOKEN_BUDGET);
    const sceneContent = truncated.map(s => `--- SCENE ${s.sceneId} ---\n${s.content}`).join('\n\n');

    const npcList = npcLedger.map(n =>
        `- ${n.name} (id: ${n.id}${n.aliases ? ', also known as: ' + n.aliases : ''})`
    ).join('\n');

    const divergenceSlots = DIVERGENCE_CATEGORIES.filter(c => c !== 'misc').map(c =>
        `### ${c.toUpperCase()}\nDefinition: ${CATEGORY_DEFINITIONS[c]}\nOutput: JSON array for this slot, or [] if empty.`
    ).join('\n\n');

    return `You are a TTRPG campaign archivist. Perform TWO tasks in a single response:

TASK 1 — Generate a structured chapter summary.
TASK 2 — Extract established facts that would BREAK A FUTURE SCENE if the AI contradicted them.

CHAPTER: "${chapterTitle || 'Untitled'}"
SCENE IDs IN THIS CHAPTER: ${sceneIds.join(', ')}

NPC LEDGER (resolve names to IDs):
${npcList || '(no NPCs in ledger)'}

SCENE CONTENT:
${sceneContent}

OUTPUT FORMAT — a single JSON object with exactly two top-level keys: "summary" and "divergences".

The "summary" value must be this JSON shape:
{
    "title": "Short evocative chapter title",
    "summary": "3-5 sentence narrative summary of what happened",
    "keywords": ["keyword1", "keyword2"],
    "npcs": ["NPC Name 1", "NPC Name 2"],
    "majorEvents": ["Event description 1", "Event description 2"],
    "unresolvedThreads": ["Thread 1", "Thread 2"],
    "tone": "one of: combat-heavy, exploration, social, mystery, political, emotional, mixed",
    "themes": ["theme1", "theme2"]
}

The "divergences" value must be an object with one key per category slot. Each value is an array of fact objects, or [] if empty. Example:
{
    "locations": [
        { "text": "Eastern gate destroyed by siege", "sceneRef": "014", "npcIds": [], "unrecognizedNpcNames": [] }
    ],
    "npc_events": [
        { "text": "Grak allied with the player", "sceneRef": "018", "npcIds": ["npc_42"], "unrecognizedNpcNames": [] }
    ],
    "promises_debts": [],
    "world_state": [],
    "party_facts": [],
    "rules_lore": [],
    "misc": []
}

Category definitions:

${divergenceSlots}

### MISC
Definition: ${CATEGORY_DEFINITIONS.misc}
Output: JSON array for this slot, or [] if empty.

DIVERGENCE EXTRACTION RULES:
- Each fact is ONE SHORT SENTENCE, max 15 words. No compound sentences, no explanations.
- sceneRef must be one of: ${sceneIds.join(', ')}
- npcIds: list the NPC ledger IDs mentioned. If a name appears that is NOT in the ledger, put it in unrecognizedNpcNames instead.
- Focus on: permanent changes, new information, relationship shifts, acquisitions, losses, oaths, regime changes.
- Skip transient details, emotional narration, momentary states, and anything the archive would already surface.
- If a slot is empty, output [] for that slot.

SUMMARY RULES:
1. Keywords should be distinctive nouns/places/factions — not generic words
2. NPCs should include all significant named characters who appeared or were discussed
3. Major events are plot-critical beats only (not every combat round)
4. Unresolved threads are open plot hooks, promises, or mysteries
5. Title should be 2-5 words, evocative
6. Summary should read like a campaign journal entry, not a list`;
}

export type CombinedSealResult = {
    summary: ChapterSummaryOutput | null;
    divergences: DivergenceEntry[];
    divergenceParseError?: boolean;
};

export function parseCombinedSealOutput(
    raw: string,
    chapterId: string,
    sceneIds: string[],
    npcLedger: { id: string; name: string; aliases: string }[]
): CombinedSealResult {
    const cleaned = stripReasoning(raw);
    const jsonStr = extractJson(cleaned);

    let parsed: { summary?: unknown; divergences?: unknown };
    let divergenceParseError = false;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        console.warn('[CombinedSeal] JSON parse failed, attempting summary-only fallback');
        const summaryOnly = parseChapterSummaryOutput(raw);
        return { summary: summaryOnly, divergences: [], divergenceParseError: true };
    }

    let summary: ChapterSummaryOutput | null = null;
    if (parsed.summary && typeof parsed.summary === 'object') {
        summary = parseChapterSummaryOutput(JSON.stringify(parsed.summary));
    } else {
        summary = parseChapterSummaryOutput(raw);
    }

    const entries: DivergenceEntry[] = [];
    if (parsed.divergences && typeof parsed.divergences === 'object') {
        const divObj = parsed.divergences as Record<string, unknown[]>;
        const sceneSet = new Set(sceneIds);
        const fallbackScene = sceneIds[0] ?? '000';
        const npcNameMap = new Map<string, string>();
        for (const npc of npcLedger) {
            npcNameMap.set(npc.name.toLowerCase(), npc.id);
            if (npc.aliases) {
                for (const alias of npc.aliases.split(',')) {
                    npcNameMap.set(alias.trim().toLowerCase(), npc.id);
                }
            }
        }

        for (const category of DIVERGENCE_CATEGORIES) {
            const slotArr = divObj[category];
            if (!Array.isArray(slotArr)) continue;

            for (const item of slotArr) {
                if (!item || typeof item !== 'object') continue;
                const rawItem = item as Record<string, unknown>;
                const text = typeof rawItem.text === 'string' ? rawItem.text.trim() : '';
                if (!text) continue;

                const sceneRef = typeof rawItem.sceneRef === 'string' && sceneSet.has(rawItem.sceneRef)
                    ? rawItem.sceneRef
                    : fallbackScene;

                const rawNpcIds: string[] = Array.isArray(rawItem.npcIds) ? rawItem.npcIds.filter((id): id is string => typeof id === 'string') : [];
                const resolvedNpcIds: string[] = [];
                const unrecognized: string[] = Array.isArray(rawItem.unrecognizedNpcNames)
                    ? rawItem.unrecognizedNpcNames.filter((n): n is string => typeof n === 'string')
                    : [];

                for (const id of rawNpcIds) {
                    const found = npcLedger.some(n => n.id === id);
                    if (found) {
                        resolvedNpcIds.push(id);
                    } else {
                        unrecognized.push(id);
                    }
                }

                const stillUnrecognized: string[] = [];
                for (const name of unrecognized) {
                    const matched = npcNameMap.get(name.toLowerCase());
                    if (matched && !resolvedNpcIds.includes(matched)) {
                        resolvedNpcIds.push(matched);
                    } else {
                        stillUnrecognized.push(name);
                    }
                }

                const hasReviewFlag = stillUnrecognized.length > 0;

                entries.push({
                    id: `div_${uid()}`,
                    chapterId,
                    category: coerceCategory(category),
                    text,
                    sceneRef,
                    npcIds: resolvedNpcIds,
                    pinned: false,
                    source: 'auto',
                    reviewFlag: hasReviewFlag || undefined,
                    unrecognizedNpcNames: stillUnrecognized.length > 0 ? stillUnrecognized : undefined,
                });
            }
        }
    } else {
        divergenceParseError = true;
    }

    return { summary, divergences: entries, divergenceParseError: divergenceParseError || undefined };
}

export async function sealChapterCombined(
    provider: LLMProvider,
    scenes: { sceneId: string; content: string }[],
    chapterId: string,
    chapterTitle: string,
    sceneIds: string[],
    npcLedger: { id: string; name: string; aliases: string }[],
    maxRetries = 2
): Promise<CombinedSealResult> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const prompt = buildCombinedSealPrompt(scenes, chapterTitle, sceneIds, npcLedger);
        const label = attempt === 0 ? '' : ' (retry)';

        console.log(`[CombinedSeal] Generating summary + divergences${label}...`, {
            sceneCount: scenes.length,
            sceneIds: sceneIds.length,
            promptTokens: countTokens(prompt),
        });

        const output = await llmCall(provider, prompt, { priority: 'low', maxTokens: 2000 });
        const result = parseCombinedSealOutput(output, chapterId, sceneIds, npcLedger);

        if (result.summary && !result.divergenceParseError) {
            return result;
        }
        if (result.summary && result.divergenceParseError) {
            console.warn(`[CombinedSeal] Attempt ${attempt + 1}: summary OK but divergence parse failed — retrying divergences`);
            continue;
        }
        console.warn(`[CombinedSeal] Attempt ${attempt + 1} produced no usable output`);
    }

    return { summary: null, divergences: [], divergenceParseError: true };
}
