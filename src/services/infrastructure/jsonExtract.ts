/**
 * Shared JSON extraction helper for LLM responses.
 * Handles <think> blocks, markdown fences, and truncated JSON recovery.
 *
 * Returns { value, parseOk }:
 *   - parseOk: true  → parsed successfully (possibly via truncation recovery)
 *   - parseOk: false → unrecoverable; value is the caller-supplied fallback
 */
export function extractJsonRobust<T>(raw: string, fallback: T): { value: T; parseOk: boolean } {
    let clean = raw.replace(/<think[\s\S]*?<\/think>/gi, '');
    const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (mdMatch) clean = mdMatch[1];

    const start = clean.indexOf('{');
    if (start === -1) return { value: fallback, parseOk: false };

    let text = clean.slice(start);

    try {
        return { value: JSON.parse(text) as T, parseOk: true };
    } catch {
        // Truncated response — recover by finding last complete item at depth 1
        let depth = 0;
        let inString = false;
        let escape = false;
        let lastCompleteItemEnd = -1;

        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (escape) { escape = false; continue; }
            if (ch === '\\' && inString) { escape = true; continue; }
            if (ch === '"') { inString = !inString; continue; }
            if (inString) continue;
            if (ch === '{' || ch === '[') depth++;
            if (ch === '}' || ch === ']') {
                depth--;
                if (depth === 1) lastCompleteItemEnd = i;
            }
        }

        if (lastCompleteItemEnd > 0) {
            const recovered = text.slice(0, lastCompleteItemEnd + 1) + ']}';
            try {
                return { value: JSON.parse(recovered) as T, parseOk: true };
            } catch { /* fall through */ }
        }

        return { value: fallback, parseOk: false };
    }
}

/**
 * Robustly extracts the first JSON object or array found in a text string.
 * Handles <think> tags, markdown code blocks, and leading/trailing chatter.
 */
export function extractJson(text: string): string {
    // 1. Remove reasoning blocks if present
    let clean = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // 2. Try to find content between triple backticks first
    const markdownMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (markdownMatch) {
        clean = markdownMatch[1];
    }

    // 3. Final fallback: find the first { or [ and the last } or ]
    const firstObj = clean.indexOf('{');
    const firstArr = clean.indexOf('[');
    const start = (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) ? firstObj : firstArr;

    if (start !== -1) {
        const lastObj = clean.lastIndexOf('}');
        const lastArr = clean.lastIndexOf(']');
        const end = (lastObj !== -1 && (lastArr === -1 || lastObj > lastArr)) ? lastObj : lastArr;

        if (end !== -1 && end > start) {
            return clean.substring(start, end + 1).trim();
        }
    }

    return clean.trim();
}

