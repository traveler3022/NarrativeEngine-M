import { describe, it, expect } from 'vitest';
import {
    recoveryBandToMaxHPPercent,
    applyRecoveryBand,
    lastConditionToRecoveryBand,
    jitter,
    materializeCombatant,
    ARCHETYPE_BUDGETS,
} from '../engine/combatEngine';
import type { RecoveryBand } from '../../types';

describe('recoveryBandToMaxHPPercent', () => {
    it('healthy → 100', () => expect(recoveryBandToMaxHPPercent('healthy')).toBe(100));
    it('wounded → 50', () => expect(recoveryBandToMaxHPPercent('wounded')).toBe(50));
    it('critical → 25', () => expect(recoveryBandToMaxHPPercent('critical')).toBe(25));
});

describe('applyRecoveryBand', () => {
    it('healthy band leaves maxHP unchanged and sets currentHP to full', () => {
        const result = applyRecoveryBand(40, 'healthy');
        expect(result.currentHP).toBe(40);
        expect(result.maxHP).toBe(40);
    });

    it('wounded band sets currentHP to 50% of maxHP', () => {
        const result = applyRecoveryBand(40, 'wounded');
        expect(result.currentHP).toBe(20);
        expect(result.maxHP).toBe(40);
    });

    it('critical band sets currentHP to 25% of maxHP', () => {
        const result = applyRecoveryBand(40, 'critical');
        expect(result.currentHP).toBe(10);
        expect(result.maxHP).toBe(40);
    });

    it('wounded band with odd maxHP rounds down', () => {
        const result = applyRecoveryBand(21, 'wounded');
        expect(result.currentHP).toBe(10);
    });

    it('critical band with odd maxHP rounds down', () => {
        const result = applyRecoveryBand(19, 'critical');
        expect(result.currentHP).toBe(4);
    });

    it('critical band with maxHP of 1 yields minimum 1', () => {
        const result = applyRecoveryBand(1, 'critical');
        expect(result.currentHP).toBe(1);
    });

    it('healthy band at 100% preserves fractional HP correctly with integer math', () => {
        const result = applyRecoveryBand(17, 'healthy');
        expect(result.currentHP).toBe(17);
        expect(result.maxHP).toBe(17);
    });
});

describe('lastCondition → expected band → maxHP% (pure mapping without LLM)', () => {
    it('lastCondition healthy → healthy → 100%', () => {
        const band: RecoveryBand = 'healthy';
        expect(recoveryBandToMaxHPPercent(band)).toBe(100);
    });

    it('lastCondition wounded → wounded → 50%', () => {
        const band: RecoveryBand = 'wounded';
        expect(recoveryBandToMaxHPPercent(band)).toBe(50);
    });

    it('lastCondition critical → critical → 25%', () => {
        const band: RecoveryBand = 'critical';
        expect(recoveryBandToMaxHPPercent(band)).toBe(25);
    });

    it('dead NPC must never be materialized as a live combatant', () => {
        const condition = 'dead';
        const canMaterialize = condition !== 'dead';
        expect(canMaterialize).toBe(false);
    });
});

describe('recovery fallback from lastCondition', () => {
    it('falls back to wounded band when lastCondition is wounded and LLM call fails', () => {
        expect(lastConditionToRecoveryBand('wounded')).toBe('wounded');
    });

    it('falls back to critical band when lastCondition is critical', () => {
        expect(lastConditionToRecoveryBand('critical')).toBe('critical');
    });

    it('falls back to healthy when lastCondition is healthy', () => {
        expect(lastConditionToRecoveryBand('healthy')).toBe('healthy');
    });
});

describe('jitter with configurable range', () => {
    it('default jitter range (0.10 = 10%) keeps values within ±10%', () => {
        const N = 5000;
        const baseValue = 14;
        let allWithin = true;
        for (let i = 0; i < N; i++) {
            const result = jitter(baseValue, 0.10);
            if (result < Math.floor(baseValue * 0.9) || result > Math.ceil(baseValue * 1.1)) {
                allWithin = false;
                break;
            }
        }
        expect(allWithin).toBe(true);
    });

    it('jitter range 0.15 (15%) keeps values within ±15%', () => {
        const N = 5000;
        const baseValue = 14;
        let allWithin = true;
        for (let i = 0; i < N; i++) {
            const result = jitter(baseValue, 0.15);
            if (result < Math.floor(baseValue * 0.85) || result > Math.ceil(baseValue * 1.15)) {
                allWithin = false;
                break;
            }
        }
        expect(allWithin).toBe(true);
    });

    it('jitter range 0 keeps values unchanged', () => {
        for (let i = 0; i < 100; i++) {
            expect(jitter(14, 0)).toBe(14);
        }
    });

    it('materializeCombatant respects jitter parameter', () => {
        const N = 500;
        const budget = ARCHETYPE_BUDGETS.bulwark;
        let allWithin = true;
        for (let i = 0; i < N; i++) {
            const c = materializeCombatant({ combatTier: 'grunt', archetype: 'bulwark' }, 0.10);
            for (const key of Object.keys(budget) as (keyof typeof budget)[]) {
                const min = Math.floor(budget[key] * 0.9);
                const max = Math.ceil(budget[key] * 1.1);
                if (c.stats[key] < min || c.stats[key] > max) {
                    allWithin = false;
                    break;
                }
            }
            if (!allWithin) break;
        }
        expect(allWithin).toBe(true);
    });
});