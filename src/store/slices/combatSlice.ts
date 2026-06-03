import type { StateCreator } from 'zustand';
import type { CombatState, Combatant, NPCEntry, CombatTier, Archetype } from '../../types';
import { toast } from '../../components/Toast';
import { rollInitiative, materializeCombatant, computeMaxHP, computeMaxFOC, computeAC, proficiencyBonusForTier } from '../../services/engine/combatEngine';
import { resolveArmorBonus } from '../../services/engine/gearResolver';

let combatTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSaveCombatState(campaignId: string | null, state: CombatState | null) {
    if (!campaignId) return;
    if (combatTimer) clearTimeout(combatTimer);
    combatTimer = setTimeout(async () => {
        try {
            const { saveCombatState } = await import('../../store/campaignStore');
            await saveCombatState(campaignId, state);
        } catch (e) {
            console.error(e);
            toast.error('Failed to save combat state');
        }
    }, 500);
}

export type CombatSlice = {
    combatState: CombatState | null;
    setCombatState: (state: CombatState | null) => void;
    initiateCombat: (namedNpcIds: string[], mookSpecs: { combatTier: CombatTier; archetype: Archetype; count: number }[]) => void;
    terminateCombat: (options?: { writeBack?: boolean }) => void;
};

type CombatDeps = CombatSlice & {
    activeCampaignId: string | null;
    npcLedger: NPCEntry[];
    updateNPC: (id: string, patch: Partial<NPCEntry>) => void;
    items: import('../../types').ItemDef[];
};

export const createCombatSlice: StateCreator<CombatDeps, [], [], CombatSlice> = (set) => ({
    combatState: null,
    setCombatState: (state) => set((s) => {
        debouncedSaveCombatState(s.activeCampaignId, state);
        return { combatState: state };
    }),
    initiateCombat: (namedNpcIds, mookSpecs) => set((s) => {
        const combatants: Record<string, Combatant> = {};

        // 1. Process named NPCs / PCs
        for (const npcId of namedNpcIds) {
            const npc = s.npcLedger.find(n => n.id === npcId);
            if (npc) {
                const stats = npc.stats || { VIT: 10, PWR: 10, RES: 10, FOC: 10, SPD: 10, WIL: 10 };
                const tier = npc.combatTier || 'grunt';
                const archetype = npc.archetype || 'skirmisher';
                const maxHP = computeMaxHP(tier, stats.VIT);
                const maxFOC = computeMaxFOC(tier, stats.WIL);
                const itemsMap = Object.fromEntries(s.items.map(i => [i.id, i]));
                const armorBonus = resolveArmorBonus(npc, itemsMap);
                const ac = computeAC(stats.RES, armorBonus);

                const c: Combatant = {
                    id: npc.id,
                    name: npc.name,
                    stats,
                    currentHP: maxHP,
                    maxHP,
                    currentFOC: maxFOC,
                    maxFOC,
                    combatTier: tier,
                    archetype,
                    ac,
                    proficiencyBonus: proficiencyBonusForTier(tier),
                    isPC: npc.isPC ?? false,
                    position: undefined,
                    statusEffects: [],
                    overrides: npc.overrides ?? [],
                };
                combatants[npc.id] = c;
            }
        }

        // 2. Process/Materialize mooks
        let mookCounter = 1;
        for (const spec of mookSpecs) {
            for (let i = 0; i < spec.count; i++) {
                const id = `mook_${spec.archetype}_${spec.combatTier}_${mookCounter++}_${Date.now()}`;
                const m = materializeCombatant({
                    combatTier: spec.combatTier,
                    archetype: spec.archetype,
                    id,
                    name: `${spec.archetype.charAt(0).toUpperCase() + spec.archetype.slice(1)} Mook ${i + 1}`,
                });
                combatants[m.id] = m;
            }
        }

        // Hard guard: combat needs a player character. Legacy campaigns may have no NPC
        // flagged isPC — abort rather than dropping the player into a PC-less, unusable HUD.
        if (!Object.values(combatants).some(c => c.isPC)) {
            toast.error('Set a player character (mark an NPC as PC) before starting combat');
            return {};
        }

        // 3. Roll Initiative for all combatants
        const initiativeRolls = Object.values(combatants).map(c => {
            const roll = rollInitiative(c.id, c.stats.SPD);
            return { id: c.id, total: roll.total };
        });

        // Sort by initiative descending
        initiativeRolls.sort((a, b) => b.total - a.total);
        const sortedIds = initiativeRolls.map(r => r.id);

        // 4. Set up range relations (binary: all 'Apart' by default initially)
        const rangeRelations: Record<string, Record<string, 'Engaged' | 'Apart'>> = {};
        const cIds = Object.keys(combatants);
        for (const idA of cIds) {
            rangeRelations[idA] = {};
            for (const idB of cIds) {
                if (idA !== idB) {
                    rangeRelations[idA][idB] = 'Apart';
                }
            }
        }

        const nextState: CombatState = {
            active: true,
            round: 1,
            turnOrder: sortedIds,
            activeTurnIndex: 0,
            combatants,
            rangeRelations,
        };

        debouncedSaveCombatState(s.activeCampaignId, nextState);
        return { combatState: nextState };
    }),

    terminateCombat: (options = {}) => set((s) => {
        if (!s.combatState) return {};

        const { writeBack = true } = options;

        if (writeBack) {
            // Write back HP/FOC/condition changes to NPC ledger
            for (const c of Object.values(s.combatState.combatants)) {
                // If it is in the ledger, write back condition
                const inLedger = s.npcLedger.some(n => n.id === c.id);
                if (inLedger) {
                    const ratio = c.maxHP > 0 ? c.currentHP / c.maxHP : 0;
                    const condition: NPCEntry['condition'] =
                        c.currentHP <= 0 ? 'dead' :
                        ratio <= 0.25    ? 'critical' :
                        ratio < 0.75     ? 'wounded' : 'healthy';
                    s.updateNPC(c.id, {
                        condition,
                        lastCondition: condition,
                        lastSeenTimestamp: Date.now(),
                    });
                }
            }
        }

        debouncedSaveCombatState(s.activeCampaignId, null);
        return { combatState: null };
    }),
});
