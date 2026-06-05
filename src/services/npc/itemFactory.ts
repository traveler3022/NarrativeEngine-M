import type { ItemDef, InventoryProposal } from '../../types';
import { uid } from '../../utils/uid';

export const RARITY_ITEM_BUDGET: Record<ItemDef['rarity'], { weaponDice: number; weaponBonus: number; armorBonus: number }> = {
    common:    { weaponDice: 6,  weaponBonus: 0, armorBonus: 1 },
    uncommon:  { weaponDice: 8,  weaponBonus: 1, armorBonus: 2 },
    rare:      { weaponDice: 10, weaponBonus: 2, armorBonus: 3 },
    epic:      { weaponDice: 12, weaponBonus: 3, armorBonus: 4 },
    legendary: { weaponDice: 12, weaponBonus: 4, armorBonus: 5 },
};

export function createItemDefFromProposal(
    proposal: InventoryProposal,
    existingItems: ItemDef[],
): ItemDef {
    const existing = existingItems.find(i => i.name.toLowerCase() === proposal.name.toLowerCase());
    if (existing) return existing;

    const budget = RARITY_ITEM_BUDGET[proposal.quality];

    if (proposal.kind === 'weapon') {
        const props = proposal.properties.filter(p => p.toLowerCase() !== 'armor');
        return {
            id: uid(),
            name: proposal.name,
            description: proposal.description || `A ${proposal.quality} weapon.`,
            damageDice: budget.weaponDice,
            bonus: budget.weaponBonus,
            scalingStat: proposal.scalingStat,
            range: proposal.range,
            properties: props,
            rarity: proposal.quality,
        };
    }

    if (proposal.kind === 'armor') {
        const props = [...proposal.properties];
        if (!props.some(p => p.toLowerCase() === 'armor')) {
            props.push('armor');
        }
        const deduped = [...new Set(props.map(p => p.toLowerCase()))].map(
            lower => props.find(p => p.toLowerCase() === lower)!
        );
        return {
            id: uid(),
            name: proposal.name,
            description: proposal.description || `A ${proposal.quality} armor.`,
            damageDice: 0,
            bonus: budget.armorBonus,
            scalingStat: 'PWR',
            range: 'Close',
            properties: deduped,
            rarity: proposal.quality,
        };
    }

    return {
        id: uid(),
        name: proposal.name,
        description: proposal.description || `A ${proposal.quality} ${proposal.kind}.`,
        damageDice: 0,
        bonus: 0,
        scalingStat: 'PWR',
        range: 'Close',
        properties: proposal.properties,
        rarity: proposal.quality,
    };
}
