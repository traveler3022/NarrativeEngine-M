import { describe, it, expect } from 'vitest';
import { extractNPCNames, classifyNPCNames } from '../npcDetector';

describe('npcDetector', () => {
    describe('extractNPCNames', () => {
        it('extracts bracketed names', () => {
            const content = 'The merchant [Orin] approaches.';
            const names = extractNPCNames(content);
            expect(names).toContain('Orin');
        });

        it('extracts prose proper nouns', () => {
            const content = 'The guard Orin approaches the inn.';
            const names = extractNPCNames(content);
            expect(names).toContain('Orin');
        });

        it('filters Guard 1 and Clone A style names', () => {
            const content = 'Guard 1 attacks Clone A from the shadows.';
            const names = extractNPCNames(content);
            expect(names).not.toContain('Guard 1');
            expect(names).not.toContain('Clone A');
        });

        it('strips leading titles from prose names', () => {
            const content = 'Captain Aldric drew his sword.';
            const names = extractNPCNames(content);
            expect(names).toContain('Aldric');
            expect(names).not.toContain('Captain Aldric');
        });

        it('strips multiple titles', () => {
            const content = 'Sir Reginald and Lady Elara entered the hall.';
            const names = extractNPCNames(content);
            expect(names).toContain('Reginald');
            expect(names).toContain('Elara');
        });

        it('keeps names with connectives like "of"', () => {
            const content = 'Aldric of Westhold arrived.';
            const names = extractNPCNames(content);
            expect(names).toContain('Aldric of Westhold');
        });

        it('drops sentence-initial-only pronouns', () => {
            const content = 'She turned to leave. Bram watched her go.';
            const names = extractNPCNames(content);
            expect(names).not.toContain('She');
            expect(names).toContain('Bram');
        });

        it('keeps sentence-initial names that appear elsewhere', () => {
            const content = 'Suddenly, Bram appeared. Later, Bram fought the dragon.';
            const names = extractNPCNames(content);
            expect(names).toContain('Bram');
        });

        it('drops excluded names', () => {
            const content = 'Lyra met with Orin at the inn.';
            const names = extractNPCNames(content, ['Lyra']);
            expect(names).not.toContain('Lyra');
            expect(names).toContain('Orin');
        });

        it('filters common blocklisted words', () => {
            const content = 'The man and The woman talk. Meanwhile, Orin listens.';
            const names = extractNPCNames(content);
            expect(names).not.toContain('The');
            expect(names).not.toContain('Meanwhile');
            expect(names).toContain('Orin');
        });

        it('drops title-only candidates', () => {
            const content = 'Captain stood alone.';
            const names = extractNPCNames(content);
            expect(names).not.toContain('Captain');
        });

        it('works with SYSTEM: NPC_ENTRY tags', () => {
            const content = 'The innkeeper is [SYSTEM: NPC_ENTRY - Bram], a kindly fellow.';
            const names = extractNPCNames(content);
            expect(names).toContain('Bram');
        });

        it('drops dice mechanics terms that get capitalized', () => {
            const content = 'Disadvantage Catastrophe! The blade slips. A Normal Failure follows. Triumph eludes you.';
            const names = extractNPCNames(content);
            expect(names).not.toContain('Catastrophe');
            expect(names).not.toContain('Failure');
            expect(names).not.toContain('Triumph');
            expect(names).not.toContain('Disadvantage Catastrophe');
            expect(names).not.toContain('Normal Failure');
        });

        it('drops common sentence-initial words that get capitalized', () => {
            const content = 'Two guards stood watch. Not a sound. Every breath was tense. Equipment lay strewn. Academy training kicked in.';
            const names = extractNPCNames(content);
            expect(names).not.toContain('Two');
            expect(names).not.toContain('Not');
            expect(names).not.toContain('Every');
            expect(names).not.toContain('Equipment');
            expect(names).not.toContain('Academy');
        });

        it('keeps legit multi-word names like Seraphine Thornmere', () => {
            const content = 'Seraphine Thornmere entered the hall. Dorian Ashworth followed.';
            const names = extractNPCNames(content);
            expect(names).toContain('Seraphine Thornmere');
            expect(names).toContain('Dorian Ashworth');
        });

        it('deduplicates repeated names within a single response', () => {
            const content = 'Aldric drew his sword. Aldric struck. Aldric won.';
            const names = extractNPCNames(content);
            const aldricCount = names.filter(n => n === 'Aldric').length;
            expect(aldricCount).toBe(1);
        });

        it('handles multiple names in one passage', () => {
            const content = 'Captain Aldric and Sir Reginald met [Orin] the merchant. Bram served them ale.';
            const names = extractNPCNames(content);
            expect(names).toContain('Aldric');
            expect(names).toContain('Reginald');
            expect(names).toContain('Orin');
            expect(names).toContain('Bram');
        });
    });

    describe('classifyNPCNames', () => {
        it('marks unknown names as new', () => {
            const names = ['Aldric', 'Orin'];
            const ledger: any[] = [];
            const { newNames, existingNpcs } = classifyNPCNames(names, ledger);
            expect(newNames).toEqual(['Aldric', 'Orin']);
            expect(existingNpcs).toEqual([]);
        });

        it('matches existing NPC by exact name', () => {
            const names = ['Orin'];
            const ledger: any[] = [{ name: 'Orin', aliases: '' }];
            const { newNames, existingNpcs } = classifyNPCNames(names, ledger);
            expect(newNames).toEqual([]);
            expect(existingNpcs).toHaveLength(1);
        });

        it('respects exclude list', () => {
            const names = ['Lyra', 'Orin'];
            const ledger: any[] = [];
            const { newNames } = classifyNPCNames(names, ledger, ['Lyra']);
            expect(newNames).toEqual(['Orin']);
        });

        it('normalizes all-caps names to title case', () => {
            const names = ['ALDRIC'];
            const ledger: any[] = [];
            const { newNames } = classifyNPCNames(names, ledger);
            expect(newNames).toEqual(['Aldric']);
        });
    });
});
