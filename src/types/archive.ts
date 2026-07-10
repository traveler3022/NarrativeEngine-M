import type { SceneEvent } from './index';

export type WitnessSource = 'header' | 'aux_fallback' | 'body_fallback' | 'seal_correction' | 'empty';

/**
 * Archive + Divergence domain types — hoisted from types/index.ts (Phase 4.3).
 */

export type DivergenceCategory =
    | 'locations'
    | 'npc_events'
    | 'promises_debts'
    | 'world_state'
    | 'party_facts'
    | 'rules_lore'
    | 'misc';

export type DivergenceEntry = {
    id: string;
    chapterId: string;
    category: DivergenceCategory;
    text: string;
    sceneRef: string;
    npcIds: string[];
    // Who knows this fact. Tokens: "player" | "npc:<id>" | "faction:<name-normalized>".
    // undefined = public/broadcast (common knowledge). [] = secret, no NPC knows it.
    knownBy?: string[];
    // Stable snake_case subject slug shared by ALL facts about the same subject
    // (e.g. "alex_chen.identity"). The scene number is the version axis. undefined = ungrouped.
    subjectToken?: string;
    pinned: boolean;
    enabled?: boolean;
    source: 'auto' | 'manual';
    reviewFlag?: boolean;
    unrecognizedNpcNames?: string[];
};

export type TopicCluster = {
    id: string;
    name: string;
    factIds: string[];
};

export type TopicClusters = {
    groups: TopicCluster[];
    generatedAt: string;
    generatedFromFactCount: number;
};

export type DivergenceRegister = {
    entries: DivergenceEntry[];
    chapterToggles: Record<string, boolean>;
    categoryToggles: Record<string, Record<DivergenceCategory, boolean>>;
    lastUpdatedSceneId: string;
    lastUpdatedAt: number;
    version: 2;
    topicClusters?: TopicClusters;
};

export type ArchiveIndexEntry = {
    sceneId: string;         // zero-padded, e.g. "014" — matches ## SCENE header in .archive.md
    timestamp: number;
    keywords: string[];      // proper nouns, quoted strings, [MEMORABLE:] tags
    npcsMentioned: string[]; // NPC names detected in the scene
    npcsWitnessed?: string[]; // NPC IDs physically present/witnessing the scene
    witnessSource?: WitnessSource; // how npcsWitnessed was determined
    userSnippet: string;     // first ~100 chars of user message (human-readable preview)
    keywordStrengths?: Record<string, number>;
    npcStrengths?: Record<string, number>;
    importance?: number;
    events?: SceneEvent[];    // optional: structured events extracted at seal time (back-compat: undefined for pre-existing entries)
};

export type ArchiveScene = {
    sceneId: string;
    content: string;
    tokens: number;
};

export type ContextSourceClassification = 'stable_truth' | 'summary' | 'world_context' | 'volatile_state' | 'scene_local' | 'player_input';

export type SemanticFact = {
    id: string;
    subject: string;
    predicate: string;
    object: string;
    importance: number;
    sceneId: string;
    timestamp: number;
    source?: 'regex' | 'llm';
    confidence?: number;
};

export type ArchiveChapter = {
    chapterId: string;
    title: string;
    sceneRange: [string, string];
    sceneIds: string[];
    summary: string;
    keywords: string[];
    npcs: string[];
    majorEvents: string[];
    unresolvedThreads: string[];
    tone: string;
    themes: string[];
    sceneCount: number;
    sealedAt?: number;
    invalidated?: boolean;
    _lastSeenSessionId?: string;
    npcInnerState?: Record<string, string>; // NPC name -> 1-2 sentence belief/posture note
    resolvedThreads?: string[]; // exact strings from earlier chapters' unresolvedThreads that this chapter settled
};

