import type { NPCEntry, NPCPressureHistory } from '../../types';

export const DECAY_RATE = 0.1;
const MAX_HISTORY = 50;

function npcNamePatterns(npc: NPCEntry): string[] {
    const aliases = (npc.aliases || '').split(',').map(a => a.trim().toLowerCase()).filter(Boolean);
    return [npc.name.toLowerCase(), ...aliases].filter(Boolean);
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Word-boundary match, not bare substring. Substring matching caused short or
// common NPC names to "match" any prose that happened to contain those letters
// (e.g. "Al" inside "alley", "Tom" inside "tomorrow"), which falsely registered
// engagement every turn and reset the staleness clock so NPCs never archived —
// and likewise restored archived NPCs by accident. \b anchors to whole words.
function mentionsName(text: string, patterns: string[]): boolean {
    const lower = text.toLowerCase();
    return patterns.some(p => {
        if (!p) return false;
        return new RegExp(`\\b${escapeRegExp(p)}\\b`).test(lower);
    });
}

function pronounNearName(text: string, patterns: string[]): boolean {
    const lower = text.toLowerCase();
    for (const p of patterns) {
        const idx = lower.indexOf(p);
        if (idx === -1) continue;
        const window = lower.slice(Math.max(0, idx - 30), idx + p.length + 30);
        if (/\b(he|she|him|her|they|them|it)\b/.test(window)) return true;
    }
    return false;
}

function directsActionAt(text: string, patterns: string[]): boolean {
    const lower = text.toLowerCase();
    return patterns.some(p => {
        return lower.includes(`ask ${p}`) || lower.includes(`tell ${p}`) ||
               lower.includes(`talk to ${p}`) || lower.includes(`speak to ${p}`) ||
               lower.includes(`address ${p}`) || lower.includes(`i tell ${p}`) ||
               lower.includes(`i ask ${p}`);
    });
}

function crossesSoftBoundary(text: string, boundaries: string[] | undefined): boolean {
    if (!boundaries || boundaries.length === 0) return false;
    const lower = text.toLowerCase();
    return boundaries.some(b => lower.includes(b.toLowerCase()));
}

function triggersKeyword(text: string, triggers: NPCEntry['behavioralTriggers']): string | null {
    if (!triggers || triggers.length === 0) return null;
    const lower = text.toLowerCase();
    for (const t of triggers) {
        if (lower.includes(t.keyword.toLowerCase())) return t.keyword;
    }
    return null;
}

export type PressureUpdate = {
    npcId: string;
    ignoredDelta: number;
    engagedDelta: number;
    reasons: string[];
};

export function scanPressure(
    playerInput: string,
    activeNPCs: NPCEntry[],
    gmResponse?: string
): PressureUpdate[] {
    const updates: PressureUpdate[] = [];

    for (const npc of activeNPCs) {
        if (!npc.name) continue;

        const patterns = npcNamePatterns(npc);
        let ignoredDelta = 0;
        let engagedDelta = 0;
        const reasons: string[] = [];

        if (mentionsName(playerInput, patterns)) {
            engagedDelta += 1;
            reasons.push('name mentioned');
        }

        if (pronounNearName(playerInput, patterns)) {
            engagedDelta += 0.5;
            reasons.push('pronoun near name');
        }

        if (directsActionAt(playerInput, patterns)) {
            engagedDelta += 2;
            reasons.push('directed action at NPC');
        }

        const matchedTrigger = triggersKeyword(playerInput, npc.behavioralTriggers);
        if (matchedTrigger) {
            ignoredDelta += 1;
            reasons.push(`trigger keyword: "${matchedTrigger}"`);
        }

        if (crossesSoftBoundary(playerInput, npc.softBoundaries)) {
            ignoredDelta += 1;
            reasons.push('soft boundary crossed');
        }

        if (gmResponse) {
            if (mentionsName(gmResponse, patterns)) {
                engagedDelta += 0.8;
                reasons.push('GM mentioned NPC');
            }

            if (pronounNearName(gmResponse, patterns)) {
                engagedDelta += 0.3;
                reasons.push('GM pronoun near NPC name');
            }

            const gmTrigger = triggersKeyword(gmResponse, npc.behavioralTriggers);
            if (gmTrigger) {
                engagedDelta += 0.5;
                reasons.push(`GM trigger: "${gmTrigger}"`);
            }
        }

        if (ignoredDelta > 0 || engagedDelta > 0) {
            updates.push({
                npcId: npc.id,
                ignoredDelta,
                engagedDelta,
                reasons,
            });
        }
    }

    return updates;
}

export function applyDecay(current: number, lastDecayTurn: number, currentTurn: number): number {
    const turnsSinceDecay = currentTurn - lastDecayTurn;
    if (turnsSinceDecay <= 0) return current;
    return Math.max(0, current - DECAY_RATE * turnsSinceDecay);
}

const ARCHIVE_THRESHOLD_TURNS = 15;
const ARCHIVE_PRESSURE_FLOOR = 0.5;
// Affinity is a 0-100 scale (0=Nemesis, 50=Neutral, 100=Ally) and NPCs are
// CREATED at 50 — see npcGeneration.ts. Only protect NPCs the player has built
// a genuine bond with. A previous value of 7 protected every default NPC (50 >= 7),
// which silently disabled auto-archive entirely and let ledgers grow to 295+.
const ARCHIVE_AFFINITY_PROTECT = 70;

function lastEngagedTurn(npc: NPCEntry): number {
    const history = npc.pressure?.history ?? [];
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].type === 'engaged') return history[i].turn;
    }
    return 0;
}

export function shouldArchiveNPC(npc: NPCEntry, currentTurn: number, thresholdTurns = ARCHIVE_THRESHOLD_TURNS): { shouldArchive: boolean; turnsSince: number } {
    if (npc.archived) return { shouldArchive: false, turnsSince: 0 };
    if ((npc.affinity ?? 0) >= ARCHIVE_AFFINITY_PROTECT) return { shouldArchive: false, turnsSince: 0 };
    if (npc.shiftNote) return { shouldArchive: false, turnsSince: 0 };

    const last = lastEngagedTurn(npc);
    const turnsSince = currentTurn - last;
    if (turnsSince < thresholdTurns) return { shouldArchive: false, turnsSince };

    const decayedEngaged = applyDecay(npc.pressure?.engaged ?? 0, npc.pressure?.lastDecayTurn ?? 0, currentTurn);
    const decayedIgnored = applyDecay(npc.pressure?.ignored ?? 0, npc.pressure?.lastDecayTurn ?? 0, currentTurn);
    return {
        shouldArchive: decayedEngaged < ARCHIVE_PRESSURE_FLOOR && decayedIgnored < ARCHIVE_PRESSURE_FLOOR,
        turnsSince,
    };
}

export function findArchivedToRestore(playerInput: string, archivedNPCs: NPCEntry[]): string[] {
    return archivedNPCs
        .filter(n => mentionsName(playerInput, npcNamePatterns(n)))
        .map(n => n.id);
}

export function buildPressurePatch(
    npc: NPCEntry,
    update: PressureUpdate,
    currentTurn: number
): Partial<NPCEntry> {
    const prev = npc.pressure;
    const prevIgnored = applyDecay(prev?.ignored ?? 0, prev?.lastDecayTurn ?? 0, currentTurn);
    const prevEngaged = applyDecay(prev?.engaged ?? 0, prev?.lastDecayTurn ?? 0, currentTurn);

    const newIgnored = Math.round((prevIgnored + update.ignoredDelta) * 10) / 10;
    const newEngaged = Math.round((prevEngaged + update.engagedDelta) * 10) / 10;

    const newHistory: NPCPressureHistory[] = [...(prev?.history ?? [])];

    for (const reason of update.reasons) {
        const type = update.ignoredDelta > 0 ? 'ignored' as const : 'engaged' as const;
        const delta = type === 'ignored' ? update.ignoredDelta : update.engagedDelta;
        newHistory.push({ turn: currentTurn, type, delta, reason });
    }

    if (newHistory.length > MAX_HISTORY) {
        newHistory.splice(0, newHistory.length - MAX_HISTORY);
    }

    return {
        pressure: {
            ignored: newIgnored,
            engaged: newEngaged,
            lastDecayTurn: currentTurn,
            history: newHistory,
        },
    };
}
