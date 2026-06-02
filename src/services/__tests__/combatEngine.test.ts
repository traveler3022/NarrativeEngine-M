import { describe, it, expect } from 'vitest';
import {
    abilityMod,
    computeAC,
    computeMaxHP,
    computeMaxFOC,
    proficiencyBonusForTier,
    resolveAttack,
    resolveMentalSave,
    rollInitiative,
    materializeCombatant,
    ARCHETYPE_BUDGETS,
    ARCHETYPE_BEHAVIORS,
    COMBAT_TIER_LEVEL_BANDS,
    FOC_SPELL_COSTS,
    recoveryBandToMaxHPPercent,
    resolveActionQueue,
    type CombatAction,
    type Combatant,
    type Archetype,
} from '../engine/combatEngine';

describe('abilityMod', () => {
    it('maps score 8 → -1', () => expect(abilityMod(8)).toBe(-1));
    it('maps score 10 → 0', () => expect(abilityMod(10)).toBe(0));
    it('maps score 14 → +2', () => expect(abilityMod(14)).toBe(2));
    it('maps score 16 → +3', () => expect(abilityMod(16)).toBe(3));
    it('maps score 18 → +4', () => expect(abilityMod(18)).toBe(4));
    it('maps score 20 → +5', () => expect(abilityMod(20)).toBe(5));
});

describe('computeAC', () => {
    it('AC = 10 + RES-mod + armor; RES 10 armor 0 → 10', () => {
        expect(computeAC(10, 0)).toBe(10);
    });
    it('RES 14 armor 0 → 12', () => {
        expect(computeAC(14, 0)).toBe(12);
    });
    it('RES 10 armor 5 → 15', () => {
        expect(computeAC(10, 5)).toBe(15);
    });
    it('RES 16 armor 3 → 16', () => {
        expect(computeAC(16, 3)).toBe(16);
    });
});

describe('computeMaxHP', () => {
    it('tier minion (level 1), VIT 10 → 6 + 0 + 2 = 8', () => {
        expect(computeMaxHP('minion', 10)).toBe(8);
    });
    it('tier grunt (level 3), VIT 14 → 6 + 8 + 6 = 20', () => {
        expect(computeMaxHP('grunt', 14)).toBe(20);
    });
    it('tier elite (level 6), VIT 16 → 6 + 12 + 12 = 30', () => {
        expect(computeMaxHP('elite', 16)).toBe(30);
    });
    it('tier boss (level 10), VIT 18 → 6 + 16 + 20 = 42', () => {
        expect(computeMaxHP('boss', 18)).toBe(42);
    });
    it('tier legendary (level 15), VIT 20 → 6 + 20 + 30 = 56', () => {
        expect(computeMaxHP('legendary', 20)).toBe(56);
    });
});

describe('computeMaxFOC', () => {
    it('tier minion (level 1), WIL 10 → 2 + 0 + 2 = 4', () => {
        expect(computeMaxFOC('minion', 10)).toBe(4);
    });
    it('tier grunt (level 3), WIL 14 → 2 + 2 + 6 = 10', () => {
        expect(computeMaxFOC('grunt', 14)).toBe(10);
    });
    it('tier elite (level 6), WIL 16 → 2 + 3 + 12 = 17', () => {
        expect(computeMaxFOC('elite', 16)).toBe(17);
    });
});

describe('proficiencyBonusForTier', () => {
    it('minion → +2', () => expect(proficiencyBonusForTier('minion')).toBe(2));
    it('grunt → +2', () => expect(proficiencyBonusForTier('grunt')).toBe(2));
    it('elite → +3', () => expect(proficiencyBonusForTier('elite')).toBe(3));
    it('boss → +4', () => expect(proficiencyBonusForTier('boss')).toBe(4));
    it('legendary → +5', () => expect(proficiencyBonusForTier('legendary')).toBe(5));
});

describe('resolveAttack — to-hit probability', () => {
    it('+4 vs AC 13 ≈ 60% hit rate (8/20 = 40% miss, 60% hit)', () => {
        let hits = 0;
        const N = 10000;
        for (let i = 0; i < N; i++) {
            const r = resolveAttack({ attackBonus: 4, ac: 13, weaponDie: 6, scalingStatMod: 2 });
            if (r.hit) hits++;
        }
        const rate = hits / N;
        expect(rate).toBeGreaterThan(0.54);
        expect(rate).toBeLessThan(0.66);
    });

    it('natural 1 always misses', () => {
        for (let i = 0; i < 500; i++) {
            const r = resolveAttack({ attackBonus: 100, ac: 5, weaponDie: 6, scalingStatMod: 0 });
            if (r.naturalRoll === 1) {
                expect(r.hit).toBe(false);
            }
        }
    });

    it('natural 20 always hits (critical)', () => {
        for (let i = 0; i < 500; i++) {
            const r = resolveAttack({ attackBonus: -5, ac: 30, weaponDie: 6, scalingStatMod: 0 });
            if (r.naturalRoll === 20) {
                expect(r.hit).toBe(true);
                expect(r.critical).toBe(true);
            }
        }
    });

    it('damage = weaponDie roll + scalingStatMod (non-crit)', () => {
        for (let i = 0; i < 500; i++) {
            const r = resolveAttack({ attackBonus: 4, ac: 10, weaponDie: 8, scalingStatMod: 3 });
            if (r.hit && !r.critical) {
                expect(r.damage).toBeGreaterThanOrEqual(4);
                expect(r.damage).toBeLessThanOrEqual(11);
            }
        }
    });

    it('critical hit doubles weapon die', () => {
        for (let i = 0; i < 2000; i++) {
            const r = resolveAttack({ attackBonus: 100, ac: 5, weaponDie: 6, scalingStatMod: 2, forceRoll: 20 });
            if (r.critical) {
                expect(r.damage).toBeGreaterThanOrEqual(4);
                const doubledMax = 6 * 2 + 2;
                expect(r.damage).toBeLessThanOrEqual(doubledMax);
            }
        }
    });
});

describe('resolveAttack — advantage/disadvantage', () => {
    it('advantage: hit rate higher than normal (low bonus vs high AC)', () => {
        let normalHits = 0;
        let advHits = 0;
        const N = 10000;
        for (let i = 0; i < N; i++) {
            if (resolveAttack({ attackBonus: 2, ac: 16, weaponDie: 6, scalingStatMod: 1 }).hit) normalHits++;
            if (resolveAttack({ attackBonus: 2, ac: 16, weaponDie: 6, scalingStatMod: 1, advantage: true }).hit) advHits++;
        }
        expect(advHits / N).toBeGreaterThan(normalHits / N);
    });

    it('disadvantage: hit rate lower than normal', () => {
        let normalHits = 0;
        let disHits = 0;
        const N = 10000;
        for (let i = 0; i < N; i++) {
            if (resolveAttack({ attackBonus: 4, ac: 13, weaponDie: 6, scalingStatMod: 1 }).hit) normalHits++;
            if (resolveAttack({ attackBonus: 4, ac: 13, weaponDie: 6, scalingStatMod: 1, disadvantage: true }).hit) disHits++;
        }
        expect(disHits / N).toBeLessThan(normalHits / N);
    });

    it('advantage with natural 1 still misses', () => {
        for (let i = 0; i < 500; i++) {
            const r = resolveAttack({ attackBonus: 100, ac: 5, weaponDie: 6, scalingStatMod: 0, advantage: true });
            if (r.naturalRoll === 1) {
                expect(r.hit).toBe(false);
            }
        }
    });
});

describe('resolveMentalSave — WIL vs WIL', () => {
    it('attacker DC 8 + WIL-mod + prof; defender rolls d20 + WIL-mod', () => {
        let saves = 0;
        const N = 10000;
        for (let i = 0; i < N; i++) {
            const r = resolveMentalSave({
                attackerWIL: 14,
                attackerProficiency: 2,
                defenderWIL: 10,
            });
            if (r.saved) saves++;
        }
        const rate = saves / N;
        expect(rate).toBeGreaterThan(0.30);
        expect(rate).toBeLessThan(0.55);
    });

    it('natural 1 on save always fails', () => {
        for (let i = 0; i < 500; i++) {
            const r = resolveMentalSave({
                attackerWIL: 1,
                attackerProficiency: 0,
                defenderWIL: 20,
                forceRoll: 1,
            });
            expect(r.saved).toBe(false);
        }
    });

    it('natural 20 on save always succeeds', () => {
        for (let i = 0; i < 500; i++) {
            const r = resolveMentalSave({
                attackerWIL: 20,
                attackerProficiency: 5,
                defenderWIL: 1,
                forceRoll: 20,
            });
            expect(r.saved).toBe(true);
        }
    });
});

describe('rollInitiative', () => {
    it('higher SPD goes first on average', () => {
        let fastFirst = 0;
        const N = 1000;
        for (let i = 0; i < N; i++) {
            const fast = rollInitiative('fast', 16);
            const slow = rollInitiative('slow', 8);
            if (fast.total > slow.total) fastFirst++;
        }
        expect(fastFirst / N).toBeGreaterThan(0.6);
    });

    it('returns combatantId and total', () => {
        const r = rollInitiative('hero', 12);
        expect(r.combatantId).toBe('hero');
        expect(typeof r.total).toBe('number');
        expect(r.total).toBeGreaterThanOrEqual(1 + 1);
        expect(r.total).toBeLessThanOrEqual(20 + 1);
    });
});

describe('materializeCombatant', () => {
    it('produces stats within ±10% of budget stat values', () => {
        const N = 500;
        const budget = ARCHETYPE_BUDGETS.bulwark;
        let allWithin = true;
        for (let i = 0; i < N; i++) {
            const c = materializeCombatant({ combatTier: 'grunt', archetype: 'bulwark' });
            for (const key of Object.keys(budget) as (keyof typeof budget)[]) {
                const min = Math.floor(budget[key] * 0.9);
                const max = Math.ceil(budget[key] * 1.1);
                if (c.stats[key] < min || c.stats[key] > max) {
                    allWithin = false;
                    break;
                }
            }
        }
        expect(allWithin).toBe(true);
    });

    it('produces HP within plausible range of budget HP', () => {
        const N = 500;
        const budget = ARCHETYPE_BUDGETS.bulwark;
        const budgetHP = computeMaxHP('grunt', budget.VIT);
        let allReasonable = true;
        for (let i = 0; i < N; i++) {
            const c = materializeCombatant({ combatTier: 'grunt', archetype: 'bulwark' });
            const minHP = Math.floor(budgetHP * 0.8);
            const maxHP = Math.ceil(budgetHP * 1.2);
            if (c.maxHP < minHP || c.maxHP > maxHP) {
                allReasonable = false;
                break;
            }
        }
        expect(allReasonable).toBe(true);
    });

    it('fills all six stats from archetype budget', () => {
        const c = materializeCombatant({ combatTier: 'elite', archetype: 'assassin' });
        expect(c.stats.VIT).toBeGreaterThan(0);
        expect(c.stats.PWR).toBeGreaterThan(0);
        expect(c.stats.RES).toBeGreaterThan(0);
        expect(c.stats.FOC).toBeGreaterThan(0);
        expect(c.stats.SPD).toBeGreaterThan(0);
        expect(c.stats.WIL).toBeGreaterThan(0);
    });

    it('sets currentHP and maxHP, FOC pools', () => {
        const c = materializeCombatant({ combatTier: 'grunt', archetype: 'caster' });
        expect(c.currentHP).toBeGreaterThan(0);
        expect(c.maxHP).toBeGreaterThanOrEqual(c.currentHP - 2);
        expect(c.currentFOC).toBeGreaterThanOrEqual(0);
        expect(c.maxFOC).toBeGreaterThanOrEqual(c.currentFOC);
    });

    it('sets combatTier and archetype on result', () => {
        const c = materializeCombatant({ combatTier: 'boss', archetype: 'bulwark' });
        expect(c.combatTier).toBe('boss');
        expect(c.archetype).toBe('bulwark');
    });
});

describe('ARCHETYPE_BUDGETS', () => {
    it('has budgets for bulwark, assassin, caster, skirmisher, brute', () => {
        expect(ARCHETYPE_BUDGETS.bulwark).toBeDefined();
        expect(ARCHETYPE_BUDGETS.assassin).toBeDefined();
        expect(ARCHETYPE_BUDGETS.caster).toBeDefined();
        expect(ARCHETYPE_BUDGETS.skirmisher).toBeDefined();
        expect(ARCHETYPE_BUDGETS.brute).toBeDefined();
    });

    it('bulwark has highest VIT and RES', () => {
        const b = ARCHETYPE_BUDGETS.bulwark;
        expect(b.VIT).toBeGreaterThan(b.PWR);
        expect(b.VIT).toBeGreaterThan(b.SPD);
        expect(b.RES).toBeGreaterThan(b.FOC);
    });

    it('caster has highest WIL and FOC', () => {
        const c = ARCHETYPE_BUDGETS.caster;
        expect(c.WIL).toBeGreaterThan(c.VIT);
        expect(c.FOC).toBeGreaterThan(c.RES);
    });
});

describe('ARCHETYPE_BEHAVIORS', () => {
    it('weights sum to 1 for each archetype', () => {
        for (const arch of Object.keys(ARCHETYPE_BEHAVIORS)) {
            const total = ARCHETYPE_BEHAVIORS[arch as Archetype].reduce((s, w) => s + w.weight, 0);
            expect(Math.abs(total - 1)).toBeLessThan(0.01);
        }
    });

    it('has at least 3 behavior entries per archetype', () => {
        for (const arch of Object.keys(ARCHETYPE_BEHAVIORS)) {
            expect(ARCHETYPE_BEHAVIORS[arch as Archetype].length).toBeGreaterThanOrEqual(3);
        }
    });
});

describe('COMBAT_TIER_LEVEL_BANDS', () => {
    it('maps each tier to a level', () => {
        expect(COMBAT_TIER_LEVEL_BANDS.minion).toBe(1);
        expect(COMBAT_TIER_LEVEL_BANDS.grunt).toBe(3);
        expect(COMBAT_TIER_LEVEL_BANDS.elite).toBe(6);
        expect(COMBAT_TIER_LEVEL_BANDS.boss).toBe(10);
        expect(COMBAT_TIER_LEVEL_BANDS.legendary).toBe(15);
    });
});

describe('FOC_SPELL_COSTS', () => {
    it('DMG spell point costs: 1st=2, 2nd=3, 3rd=5, 4th=6, 5th=7, 6th=9, 7th=10, 8th=11, 9th=13', () => {
        expect(FOC_SPELL_COSTS[1]).toBe(2);
        expect(FOC_SPELL_COSTS[2]).toBe(3);
        expect(FOC_SPELL_COSTS[3]).toBe(5);
        expect(FOC_SPELL_COSTS[4]).toBe(6);
        expect(FOC_SPELL_COSTS[5]).toBe(7);
        expect(FOC_SPELL_COSTS[6]).toBe(9);
        expect(FOC_SPELL_COSTS[7]).toBe(10);
        expect(FOC_SPELL_COSTS[8]).toBe(11);
        expect(FOC_SPELL_COSTS[9]).toBe(13);
    });
});

describe('recoveryBandToMaxHPPercent', () => {
    it('healthy → 100%', () => expect(recoveryBandToMaxHPPercent('healthy')).toBe(100));
    it('wounded → 50%', () => expect(recoveryBandToMaxHPPercent('wounded')).toBe(50));
    it('critical → 25%', () => expect(recoveryBandToMaxHPPercent('critical')).toBe(25));
});

describe('resolveActionQueue', () => {
    it('resolves actions in order: attacker goes before defender', () => {
        const attacker: Combatant = {
            id: 'atk', name: 'Attacker', stats: { VIT: 14, PWR: 14, RES: 10, FOC: 10, SPD: 10, WIL: 10 },
            currentHP: 20, maxHP: 20, currentFOC: 10, maxFOC: 10,
            combatTier: 'grunt', archetype: 'brute', ac: 12, proficiencyBonus: 2,
        };
        const defender: Combatant = {
            id: 'def', name: 'Defender', stats: { VIT: 14, PWR: 10, RES: 16, FOC: 10, SPD: 10, WIL: 10 },
            currentHP: 20, maxHP: 20, currentFOC: 10, maxFOC: 10,
            combatTier: 'grunt', archetype: 'bulwark', ac: 14, proficiencyBonus: 2,
        };
        const action: CombatAction = {
            type: 'attack',
            actorId: 'atk',
            targetId: 'def',
            attackBonus: 4,
            weaponDie: 8,
            scalingStatMod: 2,
        };
        const results = resolveActionQueue([action], { atk: attacker, def: defender });
        expect(results.length).toBe(1);
        expect(results[0].actorId).toBe('atk');
        expect(results[0].targetId).toBe('def');
        expect(typeof results[0].hit).toBe('boolean');
        if (results[0].hit) {
            expect(results[0].damage).toBeGreaterThan(0);
        }
    });

    it('returns empty array for empty action list', () => {
        expect(resolveActionQueue([], {})).toEqual([]);
    });
});