import type { NPCEntry, LLMProvider, CombatTier, Archetype } from '../../types';
import { llmCall } from '../../utils/llmCall';

export type ClassifiedFoe = {
    name: string;
    combatTier: CombatTier;
    archetype: Archetype;
    count: number;
};

export type CombatEntryArgs = {
    namedNpcIds: string[];
    pcIds: string[];
    mookSpecs: { combatTier: CombatTier; archetype: Archetype; count: number }[];
    unknownFoeNames: string[];
};

const VALID_TIERS: CombatTier[] = ['minion', 'grunt', 'elite', 'boss', 'legendary'];
const VALID_ARCHETYPES: Archetype[] = ['bulwark', 'assassin', 'caster', 'skirmisher', 'brute'];

const FOE_CLASSIFIER_PROMPT = `You are a combat encounter classifier for a text RPG. Given a list of unknown foe names and the
recent scene, infer each foe's combat threat level, fighting style, and quantity.

Use these rubrics EXACTLY:

combatTier (raw threat / how dangerous in a fight):
- "minion": fodder, untrained, dies fast (street thug, conscript, rat, mob goon) — this includes anything described as basic/simple/crude/weak/unskilled or a generic mass-produced construct (e.g. a 'basic golem').
- "grunt": competent rank-and-file (trained soldier, seasoned bandit, city guard). DEFAULT if unsure.
- "elite": a standout threat (captain, veteran duelist, skilled mage, gang boss).
- "boss": a major antagonist who anchors an encounter (warlord, dragon, crime lord).
- "legendary": world-class, a fight against them is a set-piece (ancient wyrm, demigod).

archetype (how they fight — drives AI behavior):
- "bulwark": tanky defender, protects allies (knight, bodyguard, shield-bearer).
- "brute": raw offense, heavy hits (berserker, ogre, brawler).
- "assassin": fast, precise, burst (rogue, ninja, sniper).
- "skirmisher": mobile, adaptable, hit-and-run. DEFAULT if unsure.
- "caster": magic/tech ranged, fragile (mage, hacker, mystic sniper).

Rules:
- If the foe name is plural or collective ("three hooligans", "guards"), set count accordingly;
  otherwise default count to 1.
- If you cannot confidently determine tier or archetype, default to "grunt" and "skirmisher".
- Do NOT invent foes not in the input list. Classify ONLY the names given.

Respond with ONLY a JSON array, no prose, no markdown:
[{"name":"<exact name from input>","combatTier":"grunt","archetype":"skirmisher","count":1}]`;

function stripThinkBlocks(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function clampClassifiedFoe(raw: Record<string, unknown>): ClassifiedFoe {
    const name = typeof raw.name === 'string' ? raw.name : 'Unknown Foe';
    const rawTier = typeof raw.combatTier === 'string' ? raw.combatTier : 'grunt';
    const rawArchetype = typeof raw.archetype === 'string' ? raw.archetype : 'skirmisher';
    const rawCount = typeof raw.count === 'number' ? raw.count : 1;

    return {
        name,
        combatTier: VALID_TIERS.includes(rawTier as CombatTier) ? (rawTier as CombatTier) : 'grunt',
        archetype: VALID_ARCHETYPES.includes(rawArchetype as Archetype) ? (rawArchetype as Archetype) : 'skirmisher',
        count: Math.max(1, Math.round(rawCount)),
    };
}

export async function classifyUnknownFoes(
    foeNames: string[],
    recentScene: string,
    provider: LLMProvider,
): Promise<ClassifiedFoe[]> {
    if (foeNames.length === 0) return [];

    const prompt = `${FOE_CLASSIFIER_PROMPT}\n\n----- INPUT -----\n\n[Foe names]\n${foeNames.join(', ')}\n\n[Recent scene]\n${recentScene}`;

    try {
        const raw = await llmCall(provider, prompt, {
            temperature: 0.2,
            priority: 'high',
            maxTokens: 300,
        });

        if (!raw || raw.trim().length === 0) {
            return foeNames.map(name => ({ name, combatTier: 'grunt' as CombatTier, archetype: 'skirmisher' as Archetype, count: 1 }));
        }

        const cleaned = stripThinkBlocks(raw);
        let parsed: unknown;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            return foeNames.map(name => ({ name, combatTier: 'grunt' as CombatTier, archetype: 'skirmisher' as Archetype, count: 1 }));
        }

        if (!Array.isArray(parsed)) {
            return foeNames.map(name => ({ name, combatTier: 'grunt' as CombatTier, archetype: 'skirmisher' as Archetype, count: 1 }));
        }

        const results: ClassifiedFoe[] = parsed
            .filter((item: unknown) => typeof item === 'object' && item !== null)
            .map((item: unknown) => clampClassifiedFoe(item as Record<string, unknown>));

        const coveredNames = new Set(results.map(r => r.name.toLowerCase()));
        for (const name of foeNames) {
            if (!coveredNames.has(name.toLowerCase())) {
                results.push({ name, combatTier: 'grunt', archetype: 'skirmisher', count: 1 });
            }
        }

        return results;
    } catch (err) {
        console.warn('[CombatEntry] Foe classifier call failed:', err);
        return foeNames.map(name => ({ name, combatTier: 'grunt' as CombatTier, archetype: 'skirmisher' as Archetype, count: 1 }));
    }
}

export function buildCombatEntryArgs(
    entitiesReferenced: string[],
    npcLedger: NPCEntry[],
): CombatEntryArgs {
    const namedNpcIds: string[] = [];
    const pcIds: string[] = [];
    const unknownFoeNames: string[] = [];

    const lowerToId = new Map<string, string>();
    for (const npc of npcLedger) {
        const names = [npc.name, ...(npc.aliases || '').split(',').map(a => a.trim()).filter(Boolean)];
        for (const n of names) {
            lowerToId.set(n.toLowerCase(), npc.id);
        }
    }

    for (const entity of entitiesReferenced) {
        const match = lowerToId.get(entity.toLowerCase());
        if (match) {
            const npc = npcLedger.find(n => n.id === match)!;
            if (npc.isPC) {
                if (!pcIds.includes(npc.id)) pcIds.push(npc.id);
            } else {
                if (!namedNpcIds.includes(npc.id)) namedNpcIds.push(npc.id);
            }
        } else {
            unknownFoeNames.push(entity);
        }
    }

    for (const npc of npcLedger) {
        if (npc.isPC && !pcIds.includes(npc.id)) {
            pcIds.push(npc.id);
        }
    }

    return {
        namedNpcIds,
        pcIds,
        mookSpecs: [],
        unknownFoeNames,
    };
}