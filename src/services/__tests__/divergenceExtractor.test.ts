import { describe, it, expect } from 'vitest';
import { parseCombinedSealOutput } from '../archive/divergenceExtractor';

function makeValidSealJson(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        summary: {
            title: 'Test Chapter',
            summary: 'A test summary.',
            keywords: ['test'],
            npcs: ['Aldric'],
            majorEvents: ['Something happened'],
            unresolvedThreads: [],
            tone: 'mixed',
            themes: ['test'],
        },
        divergences: {
            locations: [],
            npc_events: [],
            promises_debts: [],
            world_state: [],
            party_facts: [],
            rules_lore: [],
            misc: [],
        },
        sceneEvents: {},
        ...overrides,
    });
}

describe('parseCombinedSealOutput — resolvedThreads', () => {
    it('parses valid resolvedThreads and exact-matches against openThreads', () => {
        const json = makeValidSealJson({
            resolvedThreads: ['The missing heir', 'The cursed amulet'],
        });
        const result = parseCombinedSealOutput(json, 'ch01', ['001'], [], ['The missing heir', 'The cursed amulet', 'An open thread']);
        expect(result.resolvedThreads).toEqual(['The missing heir', 'The cursed amulet']);
    });

    it('drops strings not in openThreads', () => {
        const json = makeValidSealJson({
            resolvedThreads: ['The missing heir', 'Invented by LLM'],
        });
        const result = parseCombinedSealOutput(json, 'ch01', ['001'], [], ['The missing heir']);
        expect(result.resolvedThreads).toEqual(['The missing heir']);
    });

    it('ignores non-array junk without error', () => {
        const json = makeValidSealJson({
            resolvedThreads: 'not an array',
        });
        const result = parseCombinedSealOutput(json, 'ch01', ['001'], [], ['The missing heir']);
        expect(result.resolvedThreads).toBeUndefined();
        expect(result.divergenceParseError).toBeUndefined();
    });

    it('returns undefined when key is absent', () => {
        const json = makeValidSealJson();
        const result = parseCombinedSealOutput(json, 'ch01', ['001'], []);
        expect(result.resolvedThreads).toBeUndefined();
    });

    it('filters out non-string entries and trims', () => {
        const json = makeValidSealJson({
            resolvedThreads: ['  The missing heir  ', 42, '', null],
        });
        const result = parseCombinedSealOutput(json, 'ch01', ['001'], [], ['The missing heir']);
        expect(result.resolvedThreads).toEqual(['The missing heir']);
    });

    it('when openThreads is undefined, keeps all valid strings', () => {
        const json = makeValidSealJson({
            resolvedThreads: ['The missing heir', 'Something else'],
        });
        const result = parseCombinedSealOutput(json, 'ch01', ['001'], [], undefined);
        expect(result.resolvedThreads).toEqual(['The missing heir', 'Something else']);
    });
});

describe('parseCombinedSealOutput — existing seal parse still works', () => {
    it('parses summary and divergences as before', () => {
        const json = makeValidSealJson();
        const result = parseCombinedSealOutput(json, 'ch01', ['001'], []);
        expect(result.summary).not.toBeNull();
        expect(result.summary!.title).toBe('Test Chapter');
        expect(result.divergences).toEqual([]);
        expect(result.divergenceParseError).toBeUndefined();
    });
});