/**
 * NPC domain types — hoisted from types/index.ts (Phase 4.2).
 *
 * Self-contained: only imports SceneEventType from the parent for
 * NPCEntry.fieldTags. All other types are primitives or local.
 */

import type { SceneEventType } from './index';

export type NPCDrives = {
    coreWant: string;
    sessionWant: string;
    sceneWant: string;
};

export type HexAxis = 'drive' | 'diligence' | 'boldness' | 'warmth' | 'empathy' | 'composure';
export type PersonalityHex = Record<HexAxis, number>;

export type NPCWants = {
    short: string[];
    medium: string[];
    long: string;
};

export type SceneStakes = 'calm' | 'tense' | 'dangerous';

export type GoalHorizon = 'med' | 'long';
export type GoalState = 'active' | 'achieved' | 'blocked' | 'retired';
export type Goal = {
    text: string;
    horizon: GoalHorizon;
    tier: 'default' | 'mature';
    base_heat: number;
    lastAdvancedTick: number;
    failStreak: number;
    progress: number;
    quota: number;
    state: GoalState;
    justifiedEventFlag?: boolean;
};

export type RelationGraph = Record<string, number>;

export type NPCBehavioralTrigger = {
    keyword: string;
    shift: string;
};

export type NPCPressureHistory = {
    turn: number;
    type: 'ignored' | 'engaged';
    delta: number;
    reason: string;
};

export type NPCPressure = {
    ignored: number;
    engaged: number;
    lastDecayTurn: number;
    history: NPCPressureHistory[];
};

export type CombatTier = 'minion' | 'grunt' | 'elite' | 'boss' | 'legendary';
export type Archetype = 'bulwark' | 'assassin' | 'caster' | 'skirmisher' | 'brute';

export type StatBlock = {
    VIT: number;
    PWR: number;
    RES: number;
    FOC: number;
    SPD: number;
    WIL: number;
};

export type NPCEntry = {
    id: string;
    name: string;
    aliases: string;
    appearance: string;
    appearanceTags?: string;
    faction: string;
    storyRelevance: string;
    disposition: string;
    status: string;
    goals: string;
    voice: string;
    personality: string;
    exampleOutput: string;
    affinity: number;
    drives?: NPCDrives;
    behavioralTriggers?: NPCBehavioralTrigger[];
    hardBoundaries?: string[];
    softBoundaries?: string[];
    previousSnapshot?: { personality: string; voice: string; affinity: number; personalityHex?: PersonalityHex; pcRelation?: number; skillRung?: number };
    shiftNote?: string;
    shiftTurnCount?: number;
    tier?: 'recurring' | 'oneshot' | 'walkon';
    recalledByEmbedding?: boolean;
    lastUpdateScene?: number;
    isPC?: boolean;
    combatTier?: CombatTier;
    archetype?: Archetype;
    stats?: StatBlock;
    inventory?: string[];
    condition?: 'healthy' | 'wounded' | 'critical' | 'dead';
    lastCondition?: 'healthy' | 'wounded' | 'critical' | 'dead';
    lastSeenTimestamp?: number;
    recoveryNote?: string;
    portrait?: boolean;
    portraitSeed?: number;
    wants?: NPCWants;
    personalityHex?: PersonalityHex;
    traits?: string[];
    region?: string;
    haunt?: string;
    relations?: RelationGraph;
    pcRelation?: number;
    populated?: boolean;
    agencyLocked?: boolean;
    goalRecords?: Goal[];
    skillRung?: number;
    rungCeiling?: number;
    agencyActivity?: { value: number; tick: number };
    repressionPressure?: number;
    relationMeter?: number;
    primaryGroup?: string;
    secondaryGroup?: string;
    fieldTags?: Record<string, SceneEventType[]>;
};
