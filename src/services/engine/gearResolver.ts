import type { ItemDef, SkillDef, NPCEntry } from '../../types';
import type { Combatant, CombatAction } from './combatEngine';
import { abilityMod } from './combatEngine';

export type ResolvedWeapon = {
    dice: number;
    bonus: number;
    scalingStat: 'PWR' | 'SPD' | 'WIL';
    properties: string[];
    range: 'Close' | 'Reach' | 'Ranged';
};

export type ResolvedSkill = {
    id: string;
    name: string;
    focCost: number;
    type: 'attack' | 'heal' | 'utility';
    damageDice?: number;
    healDice?: number;
    scaling: 'PWR' | 'SPD' | 'WIL';
    properties: string[];
    range: 'Close' | 'Reach' | 'Ranged';
};

export const UNARMED_WEAPON: ResolvedWeapon = {
    dice: 4,
    bonus: 0,
    scalingStat: 'PWR',
    properties: [],
    range: 'Close',
};

const ARMOR_PROPERTY = 'armor';

export function resolveWeapon(
    weaponId: string | undefined,
    items: Record<string, ItemDef>,
): ResolvedWeapon {
    if (!weaponId) return UNARMED_WEAPON;
    const def = items[weaponId];
    if (!def) return UNARMED_WEAPON;
    return {
        dice: def.damageDice,
        bonus: def.bonus,
        scalingStat: def.scalingStat,
        properties: [...def.properties],
        range: def.range,
    };
}

export function resolveSkill(
    skillId: string | undefined,
    skills: Record<string, SkillDef>,
): ResolvedSkill | null {
    if (!skillId) return null;
    const def = skills[skillId];
    if (!def) return null;
    return {
        id: def.id,
        name: def.name,
        focCost: def.focCost,
        type: def.type,
        damageDice: def.damageDice,
        healDice: def.healDice,
        scaling: def.scaling,
        properties: [...def.properties],
        range: def.range,
    };
}

export function resolveArmorBonus(
    npc: NPCEntry,
    items: Record<string, ItemDef>,
): number {
    const allItemIds: string[] = [];
    if (npc.equippedWeapon) allItemIds.push(npc.equippedWeapon);
    if (npc.inventory) allItemIds.push(...npc.inventory);

    let maxArmor = 0;
    for (const itemId of allItemIds) {
        const def = items[itemId];
        if (!def) continue;
        if (def.properties.includes(ARMOR_PROPERTY)) {
            if (def.bonus > maxArmor) {
                maxArmor = def.bonus;
            }
        }
    }
    return maxArmor;
}

export type GearResolvedAttack = CombatAction & {
    weaponDie: number;
    attackBonus: number;
    scalingStatMod: number;
    weaponRange: 'Close' | 'Reach' | 'Ranged';
};

export function applyGearToAttack(
    action: CombatAction,
    actor: Combatant,
    items: Record<string, ItemDef>,
): GearResolvedAttack {
    if (action.weaponId) {
        const weapon = resolveWeapon(action.weaponId, items);
        const scalingScore = actor.stats[weapon.scalingStat];
        const statMod = abilityMod(scalingScore);
        const prof = actor.proficiencyBonus;
        return {
            ...action,
            weaponDie: weapon.dice,
            attackBonus: action.attackBonus ?? (statMod + prof + weapon.bonus),
            scalingStatMod: action.scalingStatMod ?? (statMod + weapon.bonus),
            weaponRange: action.weaponRange ?? weapon.range,
        };
    }
    const fallbackDie = action.weaponDie ?? UNARMED_WEAPON.dice;
    const fallbackRange = action.weaponRange ?? UNARMED_WEAPON.range;
    return {
        ...action,
        weaponDie: fallbackDie,
        attackBonus: action.attackBonus ?? (abilityMod(actor.stats.PWR) + actor.proficiencyBonus),
        scalingStatMod: action.scalingStatMod ?? abilityMod(actor.stats.PWR),
        weaponRange: fallbackRange,
    };
}

export type SkillUseResult = {
    rejected: boolean;
    rejectionReason?: string;
    updatedFOC: number;
    resolvedDamageDice?: number;
    resolvedHealDice?: number;
    resolvedScalingStat?: 'PWR' | 'SPD' | 'WIL';
    resolvedType?: 'attack' | 'heal' | 'utility';
    resolvedRange?: 'Close' | 'Reach' | 'Ranged';
    focCost?: number;
};

export function applyGearToSkillUse(
    action: CombatAction,
    actor: Combatant,
    skills: Record<string, SkillDef>,
): SkillUseResult {
    if (!action.skillId) {
        return {
            rejected: false,
            updatedFOC: actor.currentFOC,
        };
    }

    const skill = resolveSkill(action.skillId, skills);
    if (!skill) {
        return {
            rejected: true,
            rejectionReason: 'unknown_skill',
            updatedFOC: actor.currentFOC,
        };
    }

    if (actor.currentFOC < skill.focCost) {
        return {
            rejected: true,
            rejectionReason: 'insufficient_FOC',
            updatedFOC: actor.currentFOC,
            focCost: skill.focCost,
        };
    }

    const newFOC = Math.max(0, actor.currentFOC - skill.focCost);

    return {
        rejected: false,
        updatedFOC: newFOC,
        resolvedDamageDice: skill.damageDice,
        resolvedHealDice: skill.healDice,
        resolvedScalingStat: skill.scaling,
        resolvedType: skill.type,
        resolvedRange: skill.range,
        focCost: skill.focCost,
    };
}