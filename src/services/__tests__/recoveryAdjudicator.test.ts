import { describe, it, expect } from 'vitest';
import { fallbackRecoveryBand, parseBandResponse } from '../../services/engine/recoveryAdjudicator';

describe('fallbackRecoveryBand', () => {
    it('healthy condition → healthy band', () => {
        expect(fallbackRecoveryBand('healthy')).toBe('healthy');
    });
    it('wounded condition → wounded band', () => {
        expect(fallbackRecoveryBand('wounded')).toBe('wounded');
    });
    it('critical condition → critical band', () => {
        expect(fallbackRecoveryBand('critical')).toBe('critical');
    });
    it('dead condition defaults to wounded band (conservative)', () => {
        expect(fallbackRecoveryBand('dead')).toBe('wounded');
    });
    it('unknown condition defaults to wounded band', () => {
        expect(fallbackRecoveryBand('unknown')).toBe('wounded');
    });
});

describe('parseBandResponse', () => {
    it('parses exact single word "healthy"', () => {
        expect(parseBandResponse('healthy')).toBe('healthy');
    });
    it('parses exact single word "wounded"', () => {
        expect(parseBandResponse('wounded')).toBe('wounded');
    });
    it('parses exact single word "critical"', () => {
        expect(parseBandResponse('critical')).toBe('critical');
    });
    it('parses case-insensitively', () => {
        expect(parseBandResponse('Wounded')).toBe('wounded');
        expect(parseBandResponse('HEALTHY')).toBe('healthy');
    });
    it('parses with leading/trailing whitespace', () => {
        expect(parseBandResponse('  critical  ')).toBe('critical');
    });
    it('parses when word is embedded in a sentence', () => {
        expect(parseBandResponse('The NPC is wounded')).toBe('wounded');
    });
    it('returns null for completely unparseable response', () => {
        expect(parseBandResponse('maybe fine')).toBeNull();
    });
    it('parses first matching band word in sentence', () => {
        expect(parseBandResponse('wounded but recovering, now healthy')).toBe('wounded');
    });
});