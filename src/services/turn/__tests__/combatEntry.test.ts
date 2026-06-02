import { describe, it, expect } from 'vitest';
import { buildCombatEntryArgs, type ClassifiedFoe } from '../combatEntry';
import type { NPCEntry } from '../../../types';

const makeNPC = (overrides: Partial<NPCEntry> & { id: string; name: string }): NPCEntry => ({
    id: overrides.id,
    name: overrides.name,
    aliases: overrides.aliases ?? '',
    appearance: overrides.appearance ?? '',
    faction: overrides.faction ?? '',
    storyRelevance: overrides.storyRelevance ?? '',
    disposition: overrides.disposition ?? '',
    status: overrides.status ?? '',
    goals: overrides.goals ?? '',
    voice: overrides.voice ?? '',
    personality: overrides.personality ?? '',
    exampleOutput: overrides.exampleOutput ?? '',
    affinity: overrides.affinity ?? 50,
    ...overrides,
});

describe('buildCombatEntryArgs', () => {
    it('matches NPC by name case-insensitively', () => {
        const npc = makeNPC({ id: 'n1', name: 'Sasuke', combatTier: 'elite', archetype: 'assassin' });
        const result = buildCombatEntryArgs(['sasuke'], [npc]);
        expect(result.namedNpcIds).toContain('n1');
        expect(result.unknownFoeNames).toHaveLength(0);
    });

    it('matches NPC by alias', () => {
        const npc = makeNPC({ id: 'n2', name: 'Michiko Tanaka', aliases: 'Michi, Shadow Lady' });
        const result = buildCombatEntryArgs(['Michi'], [npc]);
        expect(result.namedNpcIds).toContain('n2');
    });

    it('always includes all PCs in pcIds', () => {
        const pc = makeNPC({ id: 'pc1', name: 'Hero', isPC: true });
        const enemy = makeNPC({ id: 'e1', name: 'Goblin' });
        const result = buildCombatEntryArgs(['Goblin'], [pc, enemy]);
        expect(result.pcIds).toContain('pc1');
        expect(result.namedNpcIds).toContain('e1');
    });

    it('puts unrecognized entities into unknownFoeNames', () => {
        const result = buildCombatEntryArgs(['three hooligans', 'Dark Wizard'], []);
        expect(result.namedNpcIds).toHaveLength(0);
        expect(result.pcIds).toHaveLength(0);
        expect(result.unknownFoeNames).toEqual(['three hooligans', 'Dark Wizard']);
    });

    it('deduplicates NPC lookups', () => {
        const npc = makeNPC({ id: 'n1', name: 'Sasuke' });
        const result = buildCombatEntryArgs(['Sasuke', 'sasuke', 'SASUKE'], [npc]);
        expect(result.namedNpcIds).toEqual(['n1']);
    });

    it('returns empty args for empty entities', () => {
        const result = buildCombatEntryArgs([], []);
        expect(result.namedNpcIds).toHaveLength(0);
        expect(result.pcIds).toHaveLength(0);
        expect(result.unknownFoeNames).toHaveLength(0);
        expect(result.mookSpecs).toHaveLength(0);
    });

    it('classifies NPC as enemy (non-PC) correctly', () => {
        const enemy = makeNPC({ id: 'e1', name: 'Bandit', isPC: false });
        const result = buildCombatEntryArgs(['Bandit'], [enemy]);
        expect(result.namedNpcIds).toContain('e1');
        expect(result.pcIds).toHaveLength(0);
    });

    it('classifies NPC as PC and puts in pcIds (not namedNpcIds)', () => {
        const pc = makeNPC({ id: 'pc1', name: 'Aria', isPC: true });
        const result = buildCombatEntryArgs(['Aria'], [pc]);
        expect(result.pcIds).toContain('pc1');
        expect(result.namedNpcIds).not.toContain('pc1');
    });

    it('includes all PCs even if not in entitiesReferenced', () => {
        const pc = makeNPC({ id: 'pc1', name: 'Aria', isPC: true });
        const enemy = makeNPC({ id: 'e1', name: 'Bandit', isPC: false });
        const result = buildCombatEntryArgs(['Bandit'], [pc, enemy]);
        expect(result.pcIds).toContain('pc1');
        expect(result.namedNpcIds).toContain('e1');
        expect(result.namedNpcIds).not.toContain('pc1');
    });
});