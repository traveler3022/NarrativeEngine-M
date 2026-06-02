import { describe, it, expect } from 'vitest';
import { routeCombatIntent, combatKeywordPrefilter, type CombatScanResult } from '../combatScanner';

describe('routeCombatIntent', () => {
    const makeScan = (intent: 'combat_start' | 'combat_action' | 'narrative', confidence: number, entities?: string[]): CombatScanResult => ({
        intent,
        confidence,
        entitiesReferenced: entities ?? [],
    });

    it('enters combat on combat_start with confidence >= autoEnterThreshold', () => {
        const result = routeCombatIntent(makeScan('combat_start', 0.80), { autoEnterThreshold: 0.75, askThreshold: 0.45 }, false);
        expect(result).toBe('enter');
    });

    it('enters combat at exactly autoEnterThreshold (0.75)', () => {
        const result = routeCombatIntent(makeScan('combat_start', 0.75), { autoEnterThreshold: 0.75, askThreshold: 0.45 }, false);
        expect(result).toBe('enter');
    });

    it('asks on combat_start with confidence in borderline zone (0.45–0.74)', () => {
        const result = routeCombatIntent(makeScan('combat_start', 0.55), { autoEnterThreshold: 0.75, askThreshold: 0.45, confirmOnBorderline: true }, false);
        expect(result).toBe('ask');
    });

    it('asks at exactly askThreshold (0.45)', () => {
        const result = routeCombatIntent(makeScan('combat_start', 0.45), { autoEnterThreshold: 0.75, askThreshold: 0.45, confirmOnBorderline: true }, false);
        expect(result).toBe('ask');
    });

    it('narrates on combat_start with confidence below askThreshold', () => {
        const result = routeCombatIntent(makeScan('combat_start', 0.30), { autoEnterThreshold: 0.75, askThreshold: 0.45 }, false);
        expect(result).toBe('narrative');
    });

    it('narrates on combat_action when NOT in combat', () => {
        const result = routeCombatIntent(makeScan('combat_action', 0.90), { autoEnterThreshold: 0.75, askThreshold: 0.45 }, false);
        expect(result).toBe('narrative');
    });

    it('narrates on intent=narrative always', () => {
        const result = routeCombatIntent(makeScan('narrative', 0.99), { autoEnterThreshold: 0.75, askThreshold: 0.45 }, false);
        expect(result).toBe('narrative');
    });

    it('forces narrative when inCombat is true (entry-only scanner)', () => {
        const result = routeCombatIntent(makeScan('combat_start', 0.99), { autoEnterThreshold: 0.75, askThreshold: 0.45 }, true);
        expect(result).toBe('narrative');
    });

    it('defaults confirmOnBorderline to true (skips ask zone)', () => {
        const result = routeCombatIntent(makeScan('combat_start', 0.50), { autoEnterThreshold: 0.75, askThreshold: 0.45 }, false);
        expect(result).toBe('ask');
    });

    it('narrates in borderline zone when confirmOnBorderline is false', () => {
        const result = routeCombatIntent(makeScan('combat_start', 0.50), { autoEnterThreshold: 0.75, askThreshold: 0.45, confirmOnBorderline: false }, false);
        expect(result).toBe('narrative');
    });

    it('uses default thresholds when config is empty', () => {
        const result080 = routeCombatIntent(makeScan('combat_start', 0.80), {}, false);
        expect(result080).toBe('enter');

        const result050 = routeCombatIntent(makeScan('combat_start', 0.50), {}, false);
        expect(result050).toBe('ask');

        const result020 = routeCombatIntent(makeScan('combat_start', 0.20), {}, false);
        expect(result020).toBe('narrative');
    });
});

describe('combatKeywordPrefilter', () => {
    it('matches violence verbs', () => {
        expect(combatKeywordPrefilter('I attack the guard', [], [])).toBe(true);
        expect(combatKeywordPrefilter('she strikes me', [], [])).toBe(true);
        expect(combatKeywordPrefilter('draw your sword!', [], [])).toBe(true);
    });

    it('matches compendium item names', () => {
        expect(combatKeywordPrefilter('I grab the Excalibur', ['Excalibur'], [])).toBe(true);
    });

    it('matches compendium skill names', () => {
        expect(combatKeywordPrefilter('I cast Fireball', [], ['Fireball'])).toBe(true);
    });

    it('matches NPC names from derived nouns', () => {
        expect(combatKeywordPrefilter('I confront Sasuke', ['Sasuke'], [])).toBe(true);
    });

    it('matches extra keywords', () => {
        expect(combatKeywordPrefilter('en garde!', [], ['en garde'])).toBe(true);
    });

    it('returns false for plain dialogue', () => {
        expect(combatKeywordPrefilter('Hello, how are you?', [], [])).toBe(false);
        expect(combatKeywordPrefilter('Nice weather today', [], [])).toBe(false);
        expect(combatKeywordPrefilter('I buy some bread', [], [])).toBe(false);
    });

    it('returns false for threats without combat verbs', () => {
        expect(combatKeywordPrefilter('You better watch out', [], [])).toBe(false);
        expect(combatKeywordPrefilter('I glare at him menacingly', [], [])).toBe(false);
    });

    it('matches regardless of case', () => {
        expect(combatKeywordPrefilter('I ATTACK the guard', [], [])).toBe(true);
        expect(combatKeywordPrefilter('FIREBALL go!', ['excalibur'], ['fireball'])).toBe(true);
    });
});