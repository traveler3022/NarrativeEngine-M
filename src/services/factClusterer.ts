import type { DivergenceRegister, TopicClusters, TopicCluster, LLMProvider } from '../types';
import { llmCall } from '../utils/llmCall';

/**
 * Robustly extract a JSON object from a potentially truncated LLM response.
 * Handles cut-off JSON by closing any open structure before parsing.
 */
function extractJsonRobust(raw: string): { groups: Array<{ name: string; factIds: string[] }> } {
    // Strip reasoning blocks and markdown fences
    let clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (mdMatch) clean = mdMatch[1];

    // Find the outermost JSON object
    const start = clean.indexOf('{');
    if (start === -1) throw new Error('No JSON object found in response');

    let text = clean.slice(start);

    // Try parsing as-is first
    try {
        return JSON.parse(text);
    } catch {
        // Response was truncated — attempt recovery by closing open structure
        // Count brackets to decide what to append
        let depth = 0;
        let inString = false;
        let escape = false;
        let lastCompleteGroupEnd = -1;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (escape) { escape = false; continue; }
            if (ch === '\\' && inString) { escape = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{' || ch === '[') depth++;
            if (ch === '}' || ch === ']') {
                depth--;
                // A depth-2 close means we just finished a group object inside the groups array
                if (depth === 2) lastCompleteGroupEnd = i;
            }
        }

        // Truncate to last complete group and close the structure
        if (lastCompleteGroupEnd > 0) {
            text = text.slice(0, lastCompleteGroupEnd + 1) + ']}';
            try {
                return JSON.parse(text);
            } catch {
                // fall through to error
            }
        }

        throw new Error(`Unexpected end of JSON input — response was truncated (received ${raw.length} chars). Try a model with a larger output limit.`);
    }
}

export async function runFactClustering(
    register: DivergenceRegister,
    utilityProvider: LLMProvider,
    contextLimit: number,
): Promise<TopicClusters> {
    const entries = register.entries;
    if (entries.length === 0) {
        return { groups: [], generatedAt: new Date().toISOString(), generatedFromFactCount: 0 };
    }

    // Shorten fact text more aggressively for large registers to keep prompt manageable
    const textLimit = entries.length > 150 ? 80 : 120;
    const factLines = entries
        .map(e => `${e.id}|${e.chapterId}|${e.text.slice(0, textLimit)}`)
        .join('\n');

    const prompt = `You are organizing campaign facts for a TTRPG. Group the facts below by recurring entity or theme — a specific NPC, a location, an ongoing storyline, a faction, or a concept that appears across multiple facts.

FACTS (id|chapter|text):
${factLines}

RULES:
- Each fact must appear in exactly one group.
- Aim for 8–20 groups. Prefer specific names (e.g. "Yuki", "The Bridge District") over generic labels.
- IMPORTANT: Include ALL ${entries.length} fact IDs across your groups — do not omit any.
- Return ONLY valid complete JSON, no prose, no truncation:
{"groups":[{"name":"Yuki","factIds":["id1","id2"]},{"name":"Reaper Contract","factIds":["id3"]}]}`;

    const maxTokens = Math.floor(contextLimit * 0.75);

    const raw = await llmCall(utilityProvider, prompt, {
        temperature: 0.2,
        maxTokens,
        timeoutMs: 120_000,
        trackingLabel: 'fact-clusterer',
    });

    const parsed = extractJsonRobust(raw);

    if (!Array.isArray(parsed.groups)) {
        throw new Error('AI response missing "groups" array.');
    }

    const knownIds = new Set(entries.map(e => e.id));
    const assignedIds = new Set<string>();

    const groups: TopicCluster[] = parsed.groups
        .filter(g => g.name && Array.isArray(g.factIds))
        .map((g, i) => {
            const validIds = g.factIds.filter(id => knownIds.has(id) && !assignedIds.has(id));
            validIds.forEach(id => assignedIds.add(id));
            return {
                id: `cluster-${i}-${g.name.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`,
                name: g.name,
                factIds: validIds,
            };
        })
        .filter(g => g.factIds.length > 0);

    // Any facts the AI omitted → Uncategorized
    const unassigned = entries.map(e => e.id).filter(id => !assignedIds.has(id));
    if (unassigned.length > 0) {
        groups.push({
            id: 'cluster-uncategorized',
            name: 'Uncategorized',
            factIds: unassigned,
        });
    }

    return {
        groups,
        generatedAt: new Date().toISOString(),
        generatedFromFactCount: entries.length,
    };
}
