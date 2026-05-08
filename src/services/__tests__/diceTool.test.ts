import { describe, it, expect } from 'vitest';
import { mapTier } from '../diceTier';
import { handleDiceTool, getToolDefinitions } from '../toolHandlers';
import type { DiceConfig } from '../../types';

const defaultConfig: DiceConfig = { catastrophe: 2, failure: 6, success: 15, triumph: 19, crit: 20 };

describe('mapTier', () => {
    it('returns Catastrophe for rolls <= catastrophe threshold', () => {
        expect(mapTier(1, defaultConfig)).toBe('Catastrophe');
        expect(mapTier(2, defaultConfig)).toBe('Catastrophe');
    });

    it('returns Failure for rolls between catastrophe+1 and failure', () => {
        expect(mapTier(3, defaultConfig)).toBe('Failure');
        expect(mapTier(6, defaultConfig)).toBe('Failure');
    });

    it('returns Success for rolls between failure+1 and success', () => {
        expect(mapTier(7, defaultConfig)).toBe('Success');
        expect(mapTier(15, defaultConfig)).toBe('Success');
    });

    it('returns Triumph for rolls between success+1 and triumph', () => {
        expect(mapTier(16, defaultConfig)).toBe('Triumph');
        expect(mapTier(19, defaultConfig)).toBe('Triumph');
    });

    it('returns Narrative Boon for rolls above triumph', () => {
        expect(mapTier(20, defaultConfig)).toBe('Narrative Boon');
    });

    it('uses default config when none provided', () => {
        expect(mapTier(1)).toBe('Catastrophe');
        expect(mapTier(10)).toBe('Success');
        expect(mapTier(20)).toBe('Narrative Boon');
    });
});

describe('handleDiceTool', () => {
    it('returns valid JSON with result and tier for d20', () => {
        const result = handleDiceTool(JSON.stringify({ dice: '1d20', reason: 'Attack' }), { diceConfig: defaultConfig });
        const parsed = JSON.parse(result.toolResult);
        expect(parsed.dice).toBe('1d20');
        expect(parsed.reason).toBe('Attack');
        expect(typeof parsed.result).toBe('number');
        expect(parsed.result).toBeGreaterThanOrEqual(1);
        expect(parsed.result).toBeLessThanOrEqual(20);
        expect(['Catastrophe', 'Failure', 'Success', 'Triumph', 'Narrative Boon']).toContain(parsed.tier);
    });

    it('returns no tier for non-d20 rolls', () => {
        const result = handleDiceTool(JSON.stringify({ dice: '2d6', reason: 'Damage' }), { diceConfig: defaultConfig });
        const parsed = JSON.parse(result.toolResult);
        expect(parsed.dice).toBe('2d6');
        expect(typeof parsed.result).toBe('number');
        expect(parsed.result).toBeGreaterThanOrEqual(2);
        expect(parsed.result).toBeLessThanOrEqual(12);
        expect(parsed.tier).toBeUndefined();
    });

    it('handles modifier in dice expression', () => {
        const result = handleDiceTool(JSON.stringify({ dice: '1d20+5', reason: 'Check with bonus' }), { diceConfig: defaultConfig });
        const parsed = JSON.parse(result.toolResult);
        expect(parsed.dice).toBe('1d20+5');
        expect(typeof parsed.result).toBe('number');
        expect(parsed.result).toBeGreaterThanOrEqual(6);
        expect(parsed.result).toBeLessThanOrEqual(25);
        expect(parsed.tier).toBeDefined();
    });

    it('falls back to 1d20 on malformed input', () => {
        const result = handleDiceTool(JSON.stringify({ dice: 'garbage', reason: 'test' }), { diceConfig: defaultConfig });
        const parsed = JSON.parse(result.toolResult);
        expect(parsed.dice).toBe('garbage');
        expect(typeof parsed.result).toBe('number');
    });

    it('handles malformed JSON arguments', () => {
        const result = handleDiceTool('not json', { diceConfig: defaultConfig });
        const parsed = JSON.parse(result.toolResult);
        expect(parsed.dice).toBe('1d20');
        expect(typeof parsed.result).toBe('number');
    });
});

describe('getToolDefinitions', () => {
    it('returns base tools when allowDiceTool is false', () => {
        const tools = getToolDefinitions({ allowDiceTool: false });
        const names = tools.map(t => t.function.name);
        expect(names).toContain('query_campaign_lore');
        expect(names).toContain('update_scene_notebook');
        expect(names).not.toContain('roll_dice');
    });

    it('includes roll_dice when allowDiceTool is true', () => {
        const tools = getToolDefinitions({ allowDiceTool: true });
        const names = tools.map(t => t.function.name);
        expect(names).toContain('query_campaign_lore');
        expect(names).toContain('update_scene_notebook');
        expect(names).toContain('roll_dice');
    });
});