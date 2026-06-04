import type { StateCreator } from 'zustand';
import type { CombatState, Combatant, NPCEntry, CombatTier, Archetype } from '../../types';
import { toast } from '../../components/Toast';
import { rollInitiative, materializeCombatant, computeMaxHP, computeMaxFOC, computeAC, proficiencyBonusForTier, applyRecoveryBand, lastConditionToRecoveryBand } from '../../services/engine/combatEngine';
import { resolveArmorBonus } from '../../services/engine/gearResolver';
import { adjudicateRecoveryBand } from '../../services/engine/recoveryAdjudicator';

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
    initiateCombatWithRecovery: (namedNpcIds: string[], mookSpecs: { combatTier: CombatTier; archetype: Archetype; count: number }[], auxProvider?: import('../../types').LLMProvider, recentContext?: string) => Promise<void>;
    terminateCombat: (options?: { writeBack?: boolean }) => void;
};

type CombatDeps = CombatSlice & {
    activeCampaignId: string | null;
    npcLedger: NPCEntry[];
    updateNPC: (id: string, patch: Partial<NPCEntry>) => void;
    items: import('../../types').ItemDef[];
    context: import('../../types').GameContext;
};

export const createCombatSlice: StateCreator<CombatDeps, [], [], CombatSlice> = (set, get) => ({
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
                // Dead NPCs must never be materialized as live combatants
                if (npc.condition === 'dead') continue;

                const stats = npc.stats || { VIT: 10, PWR: 10, RES: 10, FOC: 10, SPD: 10, WIL: 10 };
                const tier = npc.combatTier || 'grunt';
                const archetype = npc.archetype || 'skirmisher';
                const maxHP = computeMaxHP(tier, stats.VIT);
                const maxFOC = computeMaxFOC(tier, stats.WIL);
                const itemsMap = Object.fromEntries(s.items.map(i => [i.id, i]));
                const armorBonus = resolveArmorBonus(npc, itemsMap);
                const ac = computeAC(stats.RES, armorBonus);

                // Apply recovery band for re-encounters
                let currentHP = maxHP;
                if (npc.lastCondition && npc.lastCondition !== 'healthy') {
                    const band = lastConditionToRecoveryBand(npc.lastCondition);
                    const recovery = applyRecoveryBand(maxHP, band);
                    currentHP = recovery.currentHP;
                }

                const c: Combatant = {
                    id: npc.id,
                    name: npc.name,
                    stats,
                    currentHP,
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

        // 2. Process/Materialize mooks — use config jitter range
        const jitterRange = s.context.combatConfig?.mookJitterRange ?? 0.10;
        let mookCounter = 1;
        for (const spec of mookSpecs) {
            for (let i = 0; i < spec.count; i++) {
                const id = `mook_${spec.archetype}_${spec.combatTier}_${mookCounter++}_${Date.now()}`;
                const m = materializeCombatant({
                    combatTier: spec.combatTier,
                    archetype: spec.archetype,
                    id,
                    name: `${spec.archetype.charAt(0).toUpperCase() + spec.archetype.slice(1)} Mook ${i + 1}`,
                }, jitterRange);
                combatants[m.id] = m;
            }
        }

        // Hard guard: combat needs a player character.
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

    initiateCombatWithRecovery: async (namedNpcIds, mookSpecs, auxProvider, recentContext) => {
        const s = get();
        const combatants: Record<string, Combatant> = {};

        // 1. Process named NPCs / PCs — with AI-adjudicated recovery bands
        for (const npcId of namedNpcIds) {
            const npc = s.npcLedger.find(n => n.id === npcId);
            if (npc) {
                // Dead NPCs must never be materialized as live combatants
                if (npc.condition === 'dead') continue;

                const stats = npc.stats || { VIT: 10, PWR: 10, RES: 10, FOC: 10, SPD: 10, WIL: 10 };
                const tier = npc.combatTier || 'grunt';
                const archetype = npc.archetype || 'skirmisher';
                const maxHP = computeMaxHP(tier, stats.VIT);
                const maxFOC = computeMaxFOC(tier, stats.WIL);
                const itemsMap = Object.fromEntries(s.items.map(i => [i.id, i]));
                const armorBonus = resolveArmorBonus(npc, itemsMap);
                const ac = computeAC(stats.RES, armorBonus);

                // Lazy recovery adjudication at re-encounter time
                let currentHP = maxHP;
                if (npc.lastCondition && npc.lastCondition !== 'healthy' && npc.lastSeenTimestamp) {
                    const band = await adjudicateRecoveryBand({
                        lastCondition: npc.lastCondition,
                        lastSeenTimestamp: npc.lastSeenTimestamp,
                        recoveryNote: npc.recoveryNote,
                        recentContext,
                        provider: auxProvider,
                    });
                    const recovery = applyRecoveryBand(maxHP, band);
                    currentHP = recovery.currentHP;
                } else if (npc.lastCondition && npc.lastCondition !== 'healthy') {
                    const band = lastConditionToRecoveryBand(npc.lastCondition);
                    const recovery = applyRecoveryBand(maxHP, band);
                    currentHP = recovery.currentHP;
                }

                const c: Combatant = {
                    id: npc.id,
                    name: npc.name,
                    stats,
                    currentHP,
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

        // 2. Process/Materialize mooks — use config jitter range
        const jitterRange = get().context.combatConfig?.mookJitterRange ?? 0.10;
        let mookCounter = 1;
        for (const spec of mookSpecs) {
            for (let i = 0; i < spec.count; i++) {
                const id = `mook_${spec.archetype}_${spec.combatTier}_${mookCounter++}_${Date.now()}`;
                const m = materializeCombatant({
                    combatTier: spec.combatTier,
                    archetype: spec.archetype,
                    id,
                    name: `${spec.archetype.charAt(0).toUpperCase() + spec.archetype.slice(1)} Mook ${i + 1}`,
                }, jitterRange);
                combatants[m.id] = m;
            }
        }

        // Hard guard: combat needs a player character.
        if (!Object.values(combatants).some(c => c.isPC)) {
            toast.error('Set a player character (mark an NPC as PC) before starting combat');
            return;
        }

        // 3. Roll Initiative for all combatants
        const initiativeRolls = Object.values(combatants).map(c => {
            const roll = rollInitiative(c.id, c.stats.SPD);
            return { id: c.id, total: roll.total };
        });

        initiativeRolls.sort((a, b) => b.total - a.total);
        const sortedIds = initiativeRolls.map(r => r.id);

        // 4. Set up range relations
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

        set({ combatState: nextState });
        debouncedSaveCombatState(s.activeCampaignId, nextState);
    },

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
