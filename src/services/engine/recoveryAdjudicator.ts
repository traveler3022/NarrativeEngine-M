import type { LLMProvider } from '../../types';
import { llmCall } from '../../utils/llmCall';

export type RecoveryBand = 'healthy' | 'wounded' | 'critical';

const RECOVERY_BANDS: RecoveryBand[] = ['healthy', 'wounded', 'critical'];

const RECOVERY_PROMPT = `You are a combat recovery adjudicator for a tabletop RPG. Given an NPC's last known condition and the time elapsed since they were last seen, determine their current recovery state.

NPC last condition: {{lastCondition}}
Time elapsed since last seen: {{elapsedDescription}}
Recovery note: {{recoveryNote}}
Recent context: {{recentContext}}

Reply with exactly one word: healthy, wounded, or critical.
- healthy: the NPC has fully recovered or was only lightly wounded and time has passed
- wounded: the NPC is still injured but stable
- critical: the NPC is barely alive, still in dire shape

Reply with ONLY one of: healthy, wounded, critical`;

function describeElapsed(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return 'just now';
}

export function parseBandResponse(raw: string): RecoveryBand | null {
    const cleaned = raw.trim().toLowerCase();
    if (RECOVERY_BANDS.includes(cleaned as RecoveryBand)) {
        return cleaned as RecoveryBand;
    }
    const firstWord = cleaned.split(/\s+/)[0];
    if (RECOVERY_BANDS.includes(firstWord as RecoveryBand)) {
        return firstWord as RecoveryBand;
    }
    for (const band of RECOVERY_BANDS) {
        if (cleaned.includes(band)) {
            return band;
        }
    }
    return null;
}

export async function adjudicateRecoveryBand(input: {
    lastCondition: string;
    lastSeenTimestamp: number;
    recoveryNote?: string;
    recentContext?: string;
    provider?: LLMProvider;
}): Promise<RecoveryBand> {
    const now = Date.now();
    const elapsed = now - input.lastSeenTimestamp;

    if (!input.provider) {
        return fallbackRecoveryBand(input.lastCondition);
    }

    const elapsedDescription = describeElapsed(elapsed);
    const prompt = RECOVERY_PROMPT
        .replace('{{lastCondition}}', input.lastCondition)
        .replace('{{elapsedDescription}}', elapsedDescription)
        .replace('{{recoveryNote}}', input.recoveryNote || 'none')
        .replace('{{recentContext}}', input.recentContext || 'none');

    try {
        const raw = await llmCall(input.provider, prompt, {
            temperature: 0.1,
            maxTokens: 10,
            priority: 'high',
        });
        const band = parseBandResponse(raw);
        if (band) return band;
        console.warn(`[RecoveryAdjudicator] Unparseable LLM response: "${raw}", falling back to condition-based band`);
        return fallbackRecoveryBand(input.lastCondition);
    } catch (err) {
        console.warn('[RecoveryAdjudicator] AI call failed, falling back to condition-based band:', err);
        return fallbackRecoveryBand(input.lastCondition);
    }
}

export function fallbackRecoveryBand(lastCondition: string): RecoveryBand {
    switch (lastCondition) {
        case 'healthy': return 'healthy';
        case 'critical': return 'critical';
        default: return 'wounded';
    }
}