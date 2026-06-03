import { describe, it, expect } from 'vitest';
import {
    resolveWeapon,
    resolveSkill,
    resolveArmorBonus,
    applyGearToAttack,
    applyGearToSkillUse,
} from '../engine/gearResolver';
import { computeAC, checkRangeLegality, runCombatRound } from '../engine/combatEngine';
import type { ItemDef, SkillDef, NPCEntry } from '../../types';
import type { Combatant, CombatAction } from '../engine/combatEngine';

const IRON_SWORD: ItemDef = {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: 'A plain iron sword.',
    damageDice: 6,
    scalingStat: 'PWR',
    bonus: 0,
    properties: [],
    range: 'Close',
    rarity: 'common',
};

const GREATAXE: ItemDef = {
    id: 'greataxe',
    name: 'Greataxe',
    description: 'A heavy two-handed axe.',
    damageDice: 12,
    scalingStat: 'PWR',
    bonus: 2,
    properties: ['heavy', 'two-handed'],
    range: 'Close',
    rarity: 'uncommon',
};

const LONGBOW: ItemDef = {
    id: 'longbow',
    name: 'Longbow',
    description: 'A standard longbow.',
    damageDice: 8,
    scalingStat: 'SPD',
    bonus: 0,
    properties: ['ammunition'],
    range: 'Ranged',
    rarity: 'common',
};

const CHAIN_MAIL: ItemDef = {
    id: 'chain_mail',
    name: 'Chain Mail',
    description: 'Standard chain armor.',
    damageDice: 4,
    scalingStat: 'PWR',
    bonus: 2,
    properties: ['armor'],
    range: 'Close',
    rarity: 'common',
};

const PLATE_ARMOR: ItemDef = {
    id: 'plate_armor',
    name: 'Plate Armor',
    description: 'Heavy plate armor.',
    damageDice: 4,
    scalingStat: 'PWR',
    bonus: 5,
    properties: ['armor', 'heavy'],
    range: 'Close',
    rarity: 'rare',
};

const EXCALIBUR: ItemDef = {
    id: 'excalibur',
    name: 'Excalibur',
    description: 'A legendary blade.',
    damageDice: 10,
    scalingStat: 'PWR',
    bonus: 3,
    properties: ['versatile', 'light'],
    range: 'Reach',
    rarity: 'legendary',
};

const LEATHER_ARMOR: ItemDef = {
    id: 'leather_armor',
    name: 'Leather Armor',
    description: 'Basic leather armor.',
    damageDice: 4,
    scalingStat: 'PWR',
    bonus: 1,
    properties: ['armor'],
    range: 'Close',
    rarity: 'common',
};

const FIREBALL: SkillDef = {
    id: 'fireball',
    name: 'Fireball',
    description: 'Explosive fire.',
    focCost: 5,
    type: 'attack',
    damageDice: 8,
    scaling: 'WIL',
    properties: ['fire', 'aoe'],
    range: 'Ranged',
};

const HEALING_LIGHT: SkillDef = {
    id: 'healing_light',
    name: 'Healing Light',
    description: 'Heals an ally.',
    focCost: 2,
    type: 'heal',
    healDice: 8,
    scaling: 'WIL',
    properties: ['holy', 'heal'],
    range: 'Close',
};

const itemsMap: Record<string, ItemDef> = {
    iron_sword: IRON_SWORD,
    greataxe: GREATAXE,
    longbow: LONGBOW,
    chain_mail: CHAIN_MAIL,
    plate_armor: PLATE_ARMOR,
    excalibur: EXCALIBUR,
    leather_armor: LEATHER_ARMOR,
};

const skillsMap: Record<string, SkillDef> = {
    fireball: FIREBALL,
    healing_light: HEALING_LIGHT,
};

const baseCombatant: Combatant = {
    id: 'hero',
    name: 'Hero',
    stats: { VIT: 14, PWR: 14, RES: 12, FOC: 10, SPD: 12, WIL: 10 },
    currentHP: 20,
    maxHP: 20,
    currentFOC: 10,
    maxFOC: 10,
    combatTier: 'grunt',
    archetype: 'skirmisher',
    ac: 11,
    proficiencyBonus: 2,
};

describe('resolveWeapon', () => {
    it('resolves a known weapon by ID', () => {
        const result = resolveWeapon('iron_sword', itemsMap);
        expect(result.dice).toBe(6);
        expect(result.bonus).toBe(0);
        expect(result.scalingStat).toBe('PWR');
        expect(result.range).toBe('Close');
        expect(result.properties).toEqual([]);
    });

    it('resolves Excalibur with bonus and Reach', () => {
        const result = resolveWeapon('excalibur', itemsMap);
        expect(result.dice).toBe(10);
        expect(result.bonus).toBe(3);
        expect(result.range).toBe('Reach');
        expect(result.properties).toContain('versatile');
    });

    it('resolves a Ranged weapon', () => {
        const result = resolveWeapon('longbow', itemsMap);
        expect(result.dice).toBe(8);
        expect(result.scalingStat).toBe('SPD');
        expect(result.range).toBe('Ranged');
    });

    it('returns UNARMED_WEAPON for undefined weaponId', () => {
        const result = resolveWeapon(undefined, itemsMap);
        expect(result.dice).toBe(4);
        expect(result.bonus).toBe(0);
        expect(result.scalingStat).toBe('PWR');
        expect(result.range).toBe('Close');
    });

    it('returns UNARMED_WEAPON for unknown weaponId', () => {
        const result = resolveWeapon('unknown_weapon', itemsMap);
        expect(result.dice).toBe(4);
        expect(result.range).toBe('Close');
    });

    it('returns UNARMED_WEAPON for empty items map', () => {
        const result = resolveWeapon('iron_sword', {});
        expect(result.dice).toBe(4);
    });

    it('distinct weapons produce distinct dice/bonus', () => {
        const iron = resolveWeapon('iron_sword', itemsMap);
        const excal = resolveWeapon('excalibur', itemsMap);
        expect(iron.dice).not.toBe(excal.dice);
        expect(iron.bonus).toBeLessThan(excal.bonus);
    });
});

describe('resolveSkill', () => {
    it('resolves a known skill by ID', () => {
        const result = resolveSkill('fireball', skillsMap);
        expect(result).not.toBeNull();
        expect(result!.focCost).toBe(5);
        expect(result!.damageDice).toBe(8);
        expect(result!.scaling).toBe('WIL');
        expect(result!.type).toBe('attack');
        expect(result!.range).toBe('Ranged');
    });

    it('resolves a heal skill', () => {
        const result = resolveSkill('healing_light', skillsMap);
        expect(result).not.toBeNull();
        expect(result!.healDice).toBe(8);
        expect(result!.type).toBe('heal');
    });

    it('returns null for unknown skill id', () => {
        expect(resolveSkill('unknown_skill', skillsMap)).toBeNull();
    });

    it('returns null for empty skills map', () => {
        expect(resolveSkill('fireball', {})).toBeNull();
    });
});

describe('resolveArmorBonus', () => {
    it('returns 0 for NPC with no equipped or inventory', () => {
        const npc: NPCEntry = { id: 'x', name: '', aliases: '', appearance: '', faction: '', storyRelevance: '', disposition: '', status: '', goals: '', voice: '', personality: '', exampleOutput: '', affinity: 0 };
        expect(resolveArmorBonus(npc, itemsMap)).toBe(0);
    });

    it('returns 0 when no items have armor property', () => {
        const npc: NPCEntry = { id: 'x', name: '', aliases: '', appearance: '', faction: '', storyRelevance: '', disposition: '', status: '', goals: '', voice: '', personality: '', exampleOutput: '', affinity: 0, equippedWeapon: 'iron_sword' };
        expect(resolveArmorBonus(npc, itemsMap)).toBe(0);
    });

    it('sums armor bonus from inventory items with armor property', () => {
        const npc: NPCEntry = { id: 'x', name: '', aliases: '', appearance: '', faction: '', storyRelevance: '', disposition: '', status: '', goals: '', voice: '', personality: '', exampleOutput: '', affinity: 0, inventory: ['chain_mail'] };
        expect(resolveArmorBonus(npc, itemsMap)).toBe(2);
    });

    it('picks the highest armor bonus from multiple armor items', () => {
        const npc: NPCEntry = { id: 'x', name: '', aliases: '', appearance: '', faction: '', storyRelevance: '', disposition: '', status: '', goals: '', voice: '', personality: '', exampleOutput: '', affinity: 0, inventory: ['chain_mail', 'plate_armor'] };
        expect(resolveArmorBonus(npc, itemsMap)).toBe(5);
    });

    it('ignores non-armor items', () => {
        const npc: NPCEntry = { id: 'x', name: '', aliases: '', appearance: '', faction: '', storyRelevance: '', disposition: '', status: '', goals: '', voice: '', personality: '', exampleOutput: '', affinity: 0, inventory: ['iron_sword', 'longbow'] };
        expect(resolveArmorBonus(npc, itemsMap)).toBe(0);
    });

    it('returns 0 for NPC without armor property items', () => {
        const npc: NPCEntry = { id: 'x', name: '', aliases: '', appearance: '', faction: '', storyRelevance: '', disposition: '', status: '', goals: '', voice: '', personality: '', exampleOutput: '', affinity: 0, equippedWeapon: 'excalibur' };
        expect(resolveArmorBonus(npc, itemsMap)).toBe(0);
    });
});

describe('applyGearToAttack', () => {
    it('resolves weapon dice, bonus, scaling, and range from weaponId', () => {
        const action: CombatAction = {
            type: 'attack',
            actorId: 'hero',
            targetId: 'goblin',
            weaponId: 'excalibur',
        };
        const result = applyGearToAttack(action, baseCombatant, itemsMap);
        expect(result.weaponDie).toBe(10);
        expect(result.attackBonus).toBe(7); // abilityMod(PWR 14)=+2 + prof(2) + weapon bonus(3)
        expect(result.scalingStatMod).toBe(5); // abilityMod(PWR 14)=+2 + weapon bonus(3)
        expect(result.weaponRange).toBe('Reach');
    });

    it('uses weapon scaling stat for attackBonus when SPD scaling', () => {
        const action: CombatAction = {
            type: 'attack',
            actorId: 'hero',
            targetId: 'goblin',
            weaponId: 'longbow',
        };
        const result = applyGearToAttack(action, baseCombatant, itemsMap);
        expect(result.scalingStatMod).toBe(1); // abilityMod(SPD 12) = +1
        expect(result.attackBonus).toBe(1 + 2); // SPD mod + proficiency (longbow is Ranged, not Close)
    });

    it('falls back to weaponDie and PWR when no weaponId', () => {
        const action: CombatAction = {
            type: 'attack',
            actorId: 'hero',
            targetId: 'goblin',
            weaponDie: 8,
            scalingStatMod: 3,
            attackBonus: 6,
        };
        const result = applyGearToAttack(action, baseCombatant, itemsMap);
        expect(result.weaponDie).toBe(8);
        expect(result.attackBonus).toBe(6);
        expect(result.scalingStatMod).toBe(3);
    });

    it('falls back to unarmed when weaponId is unknown', () => {
        const action: CombatAction = {
            type: 'attack',
            actorId: 'hero',
            targetId: 'goblin',
            weaponId: 'nonexistent',
        };
        const result = applyGearToAttack(action, baseCombatant, itemsMap);
        expect(result.weaponDie).toBe(4);
    });
});

describe('applyGearToSkillUse — FOC deduction and skill dice', () => {
    it('deducts focCost from currentFOC', () => {
        const actor = { ...baseCombatant, currentFOC: 10 };
        const action: CombatAction = {
            type: 'mental',
            actorId: 'hero',
            targetId: 'goblin',
            skillId: 'fireball',
            attackerWIL: 10,
            attackerProficiency: 2,
        };
        const result = applyGearToSkillUse(action, actor, skillsMap);
        expect(result.rejected).toBe(false);
        expect(result.updatedFOC).toBe(5); // 10 - 5
    });

    it('rejects skill use with insufficient FOC', () => {
        const actor = { ...baseCombatant, currentFOC: 3 };
        const action: CombatAction = {
            type: 'mental',
            actorId: 'hero',
            targetId: 'goblin',
            skillId: 'fireball', // focCost: 5
            attackerWIL: 10,
            attackerProficiency: 2,
        };
        const result = applyGearToSkillUse(action, actor, skillsMap);
        expect(result.rejected).toBe(true);
        expect(result.rejectionReason).toBe('insufficient_FOC');
    });

    it('FOC floors at 0 but does not go negative', () => {
        const actor = { ...baseCombatant, currentFOC: 2 };
        const action: CombatAction = {
            type: 'mental',
            actorId: 'hero',
            targetId: 'goblin',
            skillId: 'healing_light', // focCost: 2
            attackerWIL: 10,
            attackerProficiency: 2,
        };
        const result = applyGearToSkillUse(action, actor, skillsMap);
        expect(result.rejected).toBe(false);
        expect(result.updatedFOC).toBe(0);
    });

    it('rejects unknown skill ID', () => {
        const actor = { ...baseCombatant, currentFOC: 10 };
        const action: CombatAction = {
            type: 'mental',
            actorId: 'hero',
            targetId: 'goblin',
            skillId: 'nonexistent_skill',
            attackerWIL: 10,
            attackerProficiency: 2,
        };
        const result = applyGearToSkillUse(action, actor, skillsMap);
        expect(result.rejected).toBe(true);
        expect(result.rejectionReason).toBe('unknown_skill');
    });

    it('resolves skill dice and scaling stat for attack skill', () => {
        const actor = { ...baseCombatant, currentFOC: 10, stats: { ...baseCombatant.stats, WIL: 16 } };
        const action: CombatAction = {
            type: 'mental',
            actorId: 'hero',
            targetId: 'goblin',
            skillId: 'fireball',
        };
        const result = applyGearToSkillUse(action, actor, skillsMap);
        expect(result.rejected).toBe(false);
        expect(result.resolvedDamageDice).toBe(8);
        expect(result.resolvedScalingStat).toBe('WIL');
        expect(result.resolvedRange).toBe('Ranged');
        expect(result.resolvedType).toBe('attack');
        expect(result.updatedFOC).toBe(5);
    });

    it('resolves heal skill', () => {
        const actor = { ...baseCombatant, currentFOC: 10 };
        const action: CombatAction = {
            type: 'mental',
            actorId: 'hero',
            targetId: 'ally',
            skillId: 'healing_light',
        };
        const result = applyGearToSkillUse(action, actor, skillsMap);
        expect(result.rejected).toBe(false);
        expect(result.resolvedType).toBe('heal');
        expect(result.resolvedHealDice).toBe(8);
        expect(result.updatedFOC).toBe(8);
    });

    it('falls back gracefully when skillId missing', () => {
        const actor = { ...baseCombatant, currentFOC: 10 };
        const action: CombatAction = {
            type: 'mental',
            actorId: 'hero',
            targetId: 'goblin',
            attackerWIL: 10,
            attackerProficiency: 2,
        };
        const result = applyGearToSkillUse(action, actor, skillsMap);
        // No skillId → no FOC deduction, pass through as-is
        expect(result.rejected).toBe(false);
        expect(result.updatedFOC).toBe(10);
    });
});

describe('Gear integration — distinct loadouts produce different numbers', () => {
    it('iron sword vs greataxe produce different damage ranges', () => {
        const iron = resolveWeapon('iron_sword', itemsMap);
        const axe = resolveWeapon('greataxe', itemsMap);
        expect(iron.dice).toBe(6);
        expect(axe.dice).toBe(12);
        expect(iron.bonus).toBe(0);
        expect(axe.bonus).toBe(2);
    });

    it('armor bonus raises AC; no armor → 10 + RES', () => {
        const noArmorNpc: NPCEntry = { id: 'x', name: '', aliases: '', appearance: '', faction: '', storyRelevance: '', disposition: '', status: '', goals: '', voice: '', personality: '', exampleOutput: '', affinity: 0 };
        const heavyArmorNpc: NPCEntry = { id: 'y', name: '', aliases: '', appearance: '', faction: '', storyRelevance: '', disposition: '', status: '', goals: '', voice: '', personality: '', exampleOutput: '', affinity: 0, inventory: ['plate_armor'] };

        const noAc = computeAC(12, resolveArmorBonus(noArmorNpc, itemsMap));
        const heavyAc = computeAC(12, resolveArmorBonus(heavyArmorNpc, itemsMap));
        expect(noAc).toBe(11); // 10 + abilityMod(12)=+1 → 11
        expect(heavyAc).toBe(16); // 10 + 1 + 5 = 16
        expect(heavyAc).toBeGreaterThan(noAc);
    });

    it('range gate intact: Close weapon at Apart is illegal', () => {
        const iron = resolveWeapon('iron_sword', itemsMap);
        const result = checkRangeLegality({
            weaponRange: iron.range,
            rangeRelation: 'Apart',
            actionType: 'attack',
        });
        expect(result.legal).toBe(false);
    });

    it('Ranged weapon at Apart is legal', () => {
        const bow = resolveWeapon('longbow', itemsMap);
        const result = checkRangeLegality({
            weaponRange: bow.range,
            rangeRelation: 'Apart',
            actionType: 'attack',
        });
        expect(result.legal).toBe(true);
    });

    it('Reach weapon at Apart is legal', () => {
        const excal = resolveWeapon('excalibur', itemsMap);
        const result = checkRangeLegality({
            weaponRange: excal.range,
            rangeRelation: 'Apart',
            actionType: 'attack',
        });
        expect(result.legal).toBe(true);
    });
});

describe('Heal skill resolution', () => {
    it('heal action carries healed amount and type=heal', () => {
        const healer: Combatant = {
            id: 'healer', name: 'Healer',
            stats: { VIT: 10, PWR: 10, RES: 10, FOC: 10, SPD: 10, WIL: 16 },
            currentHP: 20, maxHP: 20, currentFOC: 10, maxFOC: 10,
            combatTier: 'grunt', archetype: 'caster', ac: 10, proficiencyBonus: 2,
        };
        const ally: Combatant = {
            id: 'ally', name: 'Ally',
            stats: { VIT: 10, PWR: 10, RES: 10, FOC: 10, SPD: 10, WIL: 10 },
            currentHP: 5, maxHP: 20, currentFOC: 10, maxFOC: 10,
            combatTier: 'grunt', archetype: 'skirmisher', ac: 10, proficiencyBonus: 2,
        };
        const state = {
            active: true, round: 1, turnOrder: ['healer', 'ally'], activeTurnIndex: 0,
            combatants: { healer, ally },
            rangeRelations: { healer: { ally: 'Engaged' }, ally: { healer: 'Engaged' } },
        };
        const skillsMapLocal = { healing_light: HEALING_LIGHT };
        const action: CombatAction = {
            type: 'heal',
            actorId: 'healer',
            targetId: 'ally',
            skillId: 'healing_light',
        };
        const result = runCombatRound(state as any, [action], undefined, skillsMapLocal);
        const healRes = result.resolutions.find(r => r.type === 'heal');
        expect(healRes).toBeDefined();
        expect(healRes!.healed).toBeGreaterThan(0);
        expect(result.updatedCombatants.ally.currentHP).toBeGreaterThan(5);
    });

    it('skill-less mental action deals zero damage (pure save)', () => {
        const caster: Combatant = {
            id: 'caster', name: 'Caster',
            stats: { VIT: 10, PWR: 10, RES: 10, FOC: 10, SPD: 10, WIL: 16 },
            currentHP: 20, maxHP: 20, currentFOC: 10, maxFOC: 10,
            combatTier: 'grunt', archetype: 'caster', ac: 10, proficiencyBonus: 2,
        };
        const target: Combatant = {
            id: 'target', name: 'Target',
            stats: { VIT: 10, PWR: 10, RES: 10, FOC: 10, SPD: 10, WIL: 10 },
            currentHP: 20, maxHP: 20, currentFOC: 10, maxFOC: 10,
            combatTier: 'grunt', archetype: 'skirmisher', ac: 10, proficiencyBonus: 2,
        };
        const state = {
            active: true, round: 1, turnOrder: ['caster', 'target'], activeTurnIndex: 0,
            combatants: { caster, target },
            rangeRelations: { caster: { target: 'Engaged' }, target: { caster: 'Engaged' } },
        };
        const action: CombatAction = {
            type: 'mental',
            actorId: 'caster',
            targetId: 'target',
            attackerWIL: 16,
            attackerProficiency: 2,
        };
        const result = runCombatRound(state as any, [action]);
        const mentalRes = result.resolutions.find(r => r.type === 'mental');
        expect(mentalRes).toBeDefined();
        expect(mentalRes!.damage).toBeUndefined();
        expect(result.updatedCombatants.target.currentHP).toBe(20);
    });

    it('weapon bonus applies to both attack bonus and damage', () => {
        const bonusWeapon: ItemDef = {
            id: 'bonus_sword', name: 'Bonus Sword', description: 'A +3 sword.',
            damageDice: 6, scalingStat: 'PWR', bonus: 3, properties: [], range: 'Close', rarity: 'rare',
        };
        const itemsWithBonus = { ...itemsMap, bonus_sword: bonusWeapon };
        const action: CombatAction = {
            type: 'attack',
            actorId: 'hero',
            targetId: 'goblin',
            weaponId: 'bonus_sword',
        };
        const result = applyGearToAttack(action, baseCombatant, itemsWithBonus);
        expect(result.attackBonus).toBe(2 + 2 + 3); // stat mod(14)=+2 + prof(2) + weapon bonus(3)
        expect(result.scalingStatMod).toBe(2 + 3);    // stat mod(14)=+2 + weapon bonus(3)
        expect(result.weaponDie).toBe(6);
    });
});