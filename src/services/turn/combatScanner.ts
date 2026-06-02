import type { LLMProvider } from '../../types';
import { llmCall } from '../../utils/llmCall';

export type CombatIntent = 'combat_start' | 'combat_action' | 'narrative';

export type CombatScanResult = {
    intent: CombatIntent;
    confidence: number;
    entitiesReferenced: string[];
};

const COMBAT_SCANNER_PROMPT = `You are a combat-intent classifier for a text RPG. Read the player's latest input in the
context of recent scene history and decide whether it initiates or constitutes physical combat.

Classify into exactly one intent:
- "combat_start": the player is starting a fight or violence is breaking out — drawing a
  weapon on someone, throwing the first strike, ambushing, or clearly committing to attack.
- "combat_action": a combat maneuver when a fight is ALREADY underway (attack, defend, move,
  use a technique).
- "narrative": anything else — dialogue, exploration, social pressure, threats WITHOUT a
  committed attack, description, travel, shopping, investigation. This is the default.

Rules:
- Verbal threats, posturing, intimidation, or "I ready my sword" WITHOUT a committed strike
  are "narrative", not "combat_start". Only commit to "combat_start" when an attack is
  actually launched or violence is unambiguously beginning.
- When uncertain, choose "narrative" with low confidence.
- entitiesReferenced: list the names or short labels of any foes/targets the player names or
  clearly points at (e.g. ["the pirate", "Sasuke"]). Empty array if none.

Respond with ONLY a JSON object, no prose, no markdown:
{"intent":"combat_start|combat_action|narrative","confidence":0.0,"entitiesReferenced":[]}`;

const COMBAT_CONFIDENCE_THRESHOLD = 0.6;

const VIOLENCE_VERBS = new Set([
    'attack', 'strike', 'stab', 'shoot', 'charge', 'draw', 'slash', 'punch', 'kick',
    'smash', 'clash', 'fight', 'kill', 'hit', 'pierce', 'bash', 'slam', 'tackle',
    'grapple', 'lunge', 'throw', 'fire', 'blast', 'chop', 'hack', 'beat',
    'assault', 'ambush', 'rush', 'swing', 'thrust', 'parry', 'dodge', 'block',
    'counter', 'defend', 'flee', 'retreat', 'advance', 'engage', 'disarm', 'knock',
    'slay', 'murder', 'execute', 'destroy', 'eliminate',
]);

const VIOLENCE_STEMS = [
    'attack', 'strike', 'stab', 'shoot', 'charg', 'draw', 'slash', 'punch', 'kick',
    'smash', 'clash', 'fight', 'kill', 'hit', 'pierce', 'bash', 'slam', 'tackle',
    'grappl', 'lung', 'throw', 'fire', 'blast', 'chop', 'hack', 'beat',
    'assault', 'ambush', 'rush', 'swing', 'thrust', 'parri', 'dodg', 'block',
    'counter', 'defend', 'flee', 'retreat', 'advanc', 'engag', 'disarm', 'knock',
    'slay', 'murder', 'execut', 'destroy', 'eliminat',
];

function wordMatchesVerb(word: string): boolean {
    if (VIOLENCE_VERBS.has(word)) return true;
    for (const stem of VIOLENCE_STEMS) {
        if (word.startsWith(stem) && word.length <= stem.length + 3) return true;
    }
    return false;
}

export function combatKeywordPrefilter(
    input: string,
    derivedNouns: string[],
    extraKeywords: string[],
): boolean {
    const lower = input.toLowerCase();
    const words = lower.split(/[^a-zA-Z0-9']+/);

    for (const w of words) {
        if (wordMatchesVerb(w)) return true;
    }

    for (const noun of derivedNouns) {
        const lNoun = noun.toLowerCase();
        for (const w of words) {
            if (w === lNoun || w.startsWith(lNoun) || lNoun.startsWith(w)) return true;
        }
    }

    for (const kw of extraKeywords) {
        const lkw = kw.toLowerCase();
        if (lower.includes(lkw)) return true;
    }

    return false;
}

export type CombatRoutingDecision = 'enter' | 'ask' | 'narrative';

export function routeCombatIntent(
    scan: CombatScanResult,
    config: {
        autoEnterThreshold?: number;
        askThreshold?: number;
        confirmOnBorderline?: boolean;
    },
    inCombat: boolean,
): CombatRoutingDecision {
    if (inCombat) return 'narrative';
    if (scan.intent !== 'combat_start') return 'narrative';

    const autoEnter = config.autoEnterThreshold ?? 0.75;
    const ask = config.askThreshold ?? 0.45;

    if (scan.confidence >= autoEnter) return 'enter';
    if (config.confirmOnBorderline !== false && scan.confidence >= ask) return 'ask';
    return 'narrative';
}

const FALLBACK_RESULT: CombatScanResult = {
    intent: 'narrative',
    confidence: 0,
    entitiesReferenced: [],
};

function stripThinkBlocks(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function parseScanResult(raw: string): CombatScanResult {
    const cleaned = stripThinkBlocks(raw);
    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        return FALLBACK_RESULT;
    }

    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof (parsed as Record<string, unknown>).intent !== 'string'
    ) {
        return FALLBACK_RESULT;
    }

    const obj = parsed as Record<string, unknown>;
    const validIntents: CombatIntent[] = ['combat_start', 'combat_action', 'narrative'];
    const intent: CombatIntent = validIntents.includes(obj.intent as CombatIntent)
        ? (obj.intent as CombatIntent)
        : 'narrative';

    const confidence =
        typeof obj.confidence === 'number' && isFinite(obj.confidence)
            ? Math.max(0, Math.min(1, obj.confidence))
            : 0;

    const entitiesReferenced = Array.isArray(obj.entitiesReferenced)
        ? obj.entitiesReferenced.filter((e: unknown) => typeof e === 'string') as string[]
        : [];

    return { intent, confidence, entitiesReferenced };
}

export function applyRoutingRules(scan: CombatScanResult, inCombat: boolean): CombatScanResult {
    if (scan.intent === 'combat_start' && scan.confidence >= COMBAT_CONFIDENCE_THRESHOLD) {
        return scan;
    }

    if (scan.intent === 'combat_action') {
        if (!inCombat) {
            return { ...FALLBACK_RESULT };
        }
        return scan;
    }

    return { ...FALLBACK_RESULT };
}

export async function scanCombatIntent(
    playerInput: string,
    recentHistory: string,
    combatAssistantProvider: LLMProvider,
    inCombat: boolean
): Promise<CombatScanResult> {
    const prompt = `${COMBAT_SCANNER_PROMPT}\n\n----- INPUT -----\n\n[PLAYER INPUT]\n${playerInput}\n\n[RECENT SCENE]\n${recentHistory}`;

    try {
        const raw = await llmCall(combatAssistantProvider, prompt, {
            temperature: 0.1,
            priority: 'high',
            maxTokens: 200,
        });

        if (!raw || raw.trim().length === 0) {
            return FALLBACK_RESULT;
        }

        const parsed = parseScanResult(raw);
        return applyRoutingRules(parsed, inCombat);
    } catch (err) {
        console.warn('[CombatScanner] Scanner call failed, falling back to narrative:', err);
        return FALLBACK_RESULT;
    }
}