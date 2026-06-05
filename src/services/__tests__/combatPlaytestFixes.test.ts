import { describe, it, expect } from 'vitest';
import {
    materializeCombatant,
    TIER_STAT_SCALE,
    clampStat,
    STAT_MIN,
    STAT_MAX,
    computeAC,
} from '../engine/combatEngine';
import { deriveStatsFromBudget } from '../npc/npcCombatGeneration';
import { handleProposeInventoryTool } from '../turn/toolHandlers';
import { createItemDefFromProposal, RARITY_ITEM_BUDGET } from '../npc/itemFactory';
import { formatCombatLogForChat, emitCombatLedgerMessage } from '../turn/turnOrchestrator';
import type { ActionResolution, Combatant } from '../engine/combatEngine';
import type { CombatState } from '../../types';

describe('Part 2: TIER_STAT_SCALE and clampStat', () => {
    it('exports pinned scale values', () => {
        expect(TIER_STAT_SCALE.minion).toBe(0.75);
        expect(TIER_STAT_SCALE.grunt).toBe(1.0);
        expect(TIER_STAT_SCALE.elite).toBe(1.2);
        expect(TIER_STAT_SCALE.boss).toBe(1.4);
        expect(TIER_STAT_SCALE.legendary).toBe(1.7);
    });

    it('STAT_MIN=6 STAT_MAX=20', () => {
        expect(STAT_MIN).toBe(6);
        expect(STAT_MAX).toBe(20);
    });

    it('clampStat clamps to [6, 20]', () => {
        expect(clampStat(3)).toBe(6);
        expect(clampStat(25)).toBe(20);
        expect(clampStat(14)).toBe(14);
        expect(clampStat(6)).toBe(6);
        expect(clampStat(20)).toBe(20);
        expect(clampStat(5.7)).toBe(6);
        expect(clampStat(20.3)).toBe(20);
    });
});

describe('Part 2: materializeCombatant applies tier scaling', () => {
    it('minion mook stats < grunt mook stats for the same archetype (brute, zero jitter)', () => {
        const minion = materializeCombatant({ combatTier: 'minion', archetype: 'brute' }, 0);
        const grunt = materializeCombatant({ combatTier: 'grunt', archetype: 'brute' }, 0);
        expect(minion.stats.PWR).toBeLessThan(grunt.stats.PWR);
        expect(minion.stats.RES).toBeLessThan(grunt.stats.RES);
        expect(minion.ac).toBeLessThan(grunt.ac);
        expect(minion.maxHP).toBeLessThan(grunt.maxHP);
    });

    it('elite mook stats > grunt mook stats for the same archetype (zero jitter)', () => {
        const elite = materializeCombatant({ combatTier: 'elite', archetype: 'brute' }, 0);
        const grunt = materializeCombatant({ combatTier: 'grunt', archetype: 'brute' }, 0);
        expect(elite.stats.PWR).toBeGreaterThan(grunt.stats.PWR);
        expect(elite.stats.RES).toBeGreaterThan(grunt.stats.RES);
    });

    it('grunt stats unchanged at ×1.0 (zero jitter)', () => {
        const g = materializeCombatant({ combatTier: 'grunt', archetype: 'brute' }, 0);
        expect(g.stats.PWR).toBe(18);
        expect(g.stats.VIT).toBe(14);
    });

    it('minion brute ≈ PWR 14, AC 9, low HP (with jitter=0)', () => {
        const m = materializeCombatant({ combatTier: 'minion', archetype: 'brute' }, 0);
        expect(m.stats.PWR).toBe(clampStat(18 * 0.75));
        expect(m.ac).toBe(computeAC(clampStat(12 * 0.75), 0));
    });
});

describe('Part 2: deriveStatsFromBudget uses shared TIER_STAT_SCALE', () => {
    it('derives same scaled stats as materializeCombatant (zero jitter)', () => {
        const fromDerive = deriveStatsFromBudget('minion', 'brute');
        const fromMaterialize = materializeCombatant({ combatTier: 'minion', archetype: 'brute' }, 0);
        expect(fromDerive.PWR).toBe(fromMaterialize.stats.PWR);
        expect(fromDerive.VIT).toBe(fromMaterialize.stats.VIT);
        expect(fromDerive.RES).toBe(fromMaterialize.stats.RES);
    });
});

describe('Part 1: formatCombatLogForChat', () => {
    const makeCombatant = (id: string, name: string, ac: number): Combatant => ({
        id, name,
        stats: { VIT: 10, PWR: 10, RES: 10, FOC: 10, SPD: 10, WIL: 10 },
        currentHP: 10, maxHP: 10, currentFOC: 5, maxFOC: 5,
        combatTier: 'grunt', archetype: 'brute', ac, proficiencyBonus: 2,
    });

    const makeState = (combatants: Record<string, Combatant>): CombatState => ({
        active: true, round: 2, turnOrder: Object.keys(combatants), activeTurnIndex: 0,
        combatants, rangeRelations: {},
    });

    it('attack HIT includes vs AC', () => {
        const state = makeState({ pc: makeCombatant('pc', 'Hero', 12), foe: makeCombatant('foe', 'Golem', 13) });
        const resolutions: ActionResolution[] = [{
            actorId: 'pc', targetId: 'foe', type: 'attack',
            hit: true, critical: false, damage: 7, naturalRoll: 14, total: 19,
        }];
        const log = formatCombatLogForChat(2, resolutions, state);
        expect(log).toContain('vs AC 13');
        expect(log).toContain('HIT');
        expect(log).toContain('7 dmg');
    });

    it('attack MISS includes vs AC', () => {
        const state = makeState({ pc: makeCombatant('pc', 'Hero', 12), foe: makeCombatant('foe', 'Golem', 12) });
        const resolutions: ActionResolution[] = [{
            actorId: 'pc', targetId: 'foe', type: 'attack',
            hit: false, critical: false, damage: 0, naturalRoll: 3, total: 9,
        }];
        const log = formatCombatLogForChat(2, resolutions, state);
        expect(log).toContain('vs AC 12');
        expect(log).toContain('MISS');
    });

    it('emitCombatLedgerMessage includes combat log when resolutions provided', () => {
        const state = makeState({ pc: makeCombatant('pc', 'Hero', 12), foe: makeCombatant('foe', 'Golem', 13) });
        const resolutions: ActionResolution[] = [{
            actorId: 'pc', targetId: 'foe', type: 'attack',
            hit: true, critical: false, damage: 5, naturalRoll: 12, total: 16,
        }];
        const msg = emitCombatLedgerMessage('Round 2 · Hero 10/10 · Golem 5/10', 2, resolutions, state);
        expect(msg.name).toBe('combat-ledger');
        expect(msg.content).toContain('vs AC 13');
        expect(msg.content).toContain('HIT');
    });
});

describe('Part 3: handleProposeInventoryTool', () => {
    it('clamps bad enums to defaults', () => {
        const { proposal } = handleProposeInventoryTool(JSON.stringify({
            name: 'Test Sword',
            op: 'steal',
            kind: 'potion',
            quality: 'mythic',
            scalingStat: 'CHA',
            range: 'Far',
        }));
        expect(proposal.op).toBe('grant');
        expect(proposal.kind).toBe('misc');
        expect(proposal.quality).toBe('common');
        expect(proposal.scalingStat).toBe('PWR');
        expect(proposal.range).toBe('Close');
    });

    it('strips forbidden numeric keys', () => {
        const { proposal } = handleProposeInventoryTool(JSON.stringify({
            name: 'Hacked Sword',
            damageDice: 20,
            bonus: 99,
            hp: 999,
            dice: '3d6',
            ac: 30,
            armorBonus: 10,
        }));
        expect(proposal.name).toBe('Hacked Sword');
        expect((proposal as any).damageDice).toBeUndefined();
        expect((proposal as any).bonus).toBeUndefined();
        expect((proposal as any).hp).toBeUndefined();
        expect((proposal as any).ac).toBeUndefined();
        expect((proposal as any).armorBonus).toBeUndefined();
    });

    it('valid enum values pass through', () => {
        const { proposal } = handleProposeInventoryTool(JSON.stringify({
            name: 'Custom Blade',
            op: 'equip',
            kind: 'weapon',
            quality: 'rare',
            scalingStat: 'SPD',
            range: 'Reach',
            properties: ['fire', 'finesse'],
            equip: true,
            description: 'A rare blade',
        }));
        expect(proposal.op).toBe('equip');
        expect(proposal.kind).toBe('weapon');
        expect(proposal.quality).toBe('rare');
        expect(proposal.scalingStat).toBe('SPD');
        expect(proposal.range).toBe('Reach');
        expect(proposal.properties).toEqual(['fire', 'finesse']);
        expect(proposal.equip).toBe(true);
        expect(proposal.description).toBe('A rare blade');
    });
});

describe('Part 3: createItemDefFromProposal', () => {
    it('weapon: maps quality to dice/bonus', () => {
        const def = createItemDefFromProposal({
            name: 'Rare Sword', op: 'grant', kind: 'weapon', quality: 'rare',
            scalingStat: 'SPD', range: 'Close', properties: ['fire'], equip: false, description: '',
        }, []);
        expect(def.damageDice).toBe(RARITY_ITEM_BUDGET.rare.weaponDice);
        expect(def.bonus).toBe(RARITY_ITEM_BUDGET.rare.weaponBonus);
        expect(def.scalingStat).toBe('SPD');
        expect(def.rarity).toBe('rare');
        expect(def.properties).toEqual(['fire']);
    });

    it('armor: gets armor property and armorBonus', () => {
        const def = createItemDefFromProposal({
            name: 'Chain Mail', op: 'grant', kind: 'armor', quality: 'uncommon',
            scalingStat: 'PWR', range: 'Close', properties: ['heavy'], equip: true, description: '',
        }, []);
        expect(def.damageDice).toBe(0);
        expect(def.bonus).toBe(RARITY_ITEM_BUDGET.uncommon.armorBonus);
        expect(def.properties).toContain('armor');
        expect(def.properties).toContain('heavy');
    });

    it('consumable: zero dice and bonus', () => {
        const def = createItemDefFromProposal({
            name: 'Healing Potion', op: 'grant', kind: 'consumable', quality: 'common',
            scalingStat: 'PWR', range: 'Close', properties: ['healing'], equip: false, description: '',
        }, []);
        expect(def.damageDice).toBe(0);
        expect(def.bonus).toBe(0);
        expect(def.rarity).toBe('common');
    });

    it('de-dups by case-insensitive name', () => {
        const existing = { id: 'x1', name: 'custom sword', description: '', damageDice: 6, bonus: 0, scalingStat: 'PWR' as const, properties: [], range: 'Close' as const, rarity: 'common' as const };
        const def = createItemDefFromProposal({
            name: 'Custom Sword', op: 'grant', kind: 'weapon', quality: 'rare',
            scalingStat: 'PWR', range: 'Close', properties: [], equip: false, description: '',
        }, [existing]);
        expect(def.id).toBe('x1');
    });

    it('pinned RARITY_ITEM_BUDGET values', () => {
        expect(RARITY_ITEM_BUDGET.common).toEqual({ weaponDice: 6, weaponBonus: 0, armorBonus: 1 });
        expect(RARITY_ITEM_BUDGET.uncommon).toEqual({ weaponDice: 8, weaponBonus: 1, armorBonus: 2 });
        expect(RARITY_ITEM_BUDGET.rare).toEqual({ weaponDice: 10, weaponBonus: 2, armorBonus: 3 });
        expect(RARITY_ITEM_BUDGET.epic).toEqual({ weaponDice: 12, weaponBonus: 3, armorBonus: 4 });
        expect(RARITY_ITEM_BUDGET.legendary).toEqual({ weaponDice: 12, weaponBonus: 4, armorBonus: 5 });
    });
});
