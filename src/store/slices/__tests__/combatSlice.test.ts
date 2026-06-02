import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../useAppStore';
import { backfillNPCCombatStats } from '../../settingsMigration';
import type { NPCEntry, SkillDef, ItemDef } from '../../../types';

describe('Combat Mode Phase 1 Store & Lifecycle', () => {
    beforeEach(() => {
        // Reset Zustand store state before each test
        const state = useAppStore.getState();
        state.setCombatState(null);
        state.setItemCompendium([]);
        state.setSkillCompendium([]);
        state.setNPCLedger([]);
    });

    it('manages items compendium CRUD correctly', () => {
        const state = useAppStore.getState();
        expect(state.items).toEqual([]);

        const sword: ItemDef = {
            id: 'iron_sword',
            name: 'Iron Sword',
            description: 'A simple iron sword.',
            damageDice: 6,
            scalingStat: 'PWR',
            bonus: 0,
            properties: ['finesse'],
            range: 'Close',
            rarity: 'common',
        };

        state.addItemDef(sword);
        expect(useAppStore.getState().items).toEqual([sword]);

        state.updateItemDef('iron_sword', { bonus: 1 });
        expect(useAppStore.getState().items[0].bonus).toBe(1);

        state.removeItemDef('iron_sword');
        expect(useAppStore.getState().items).toEqual([]);
    });

    it('manages skills compendium CRUD correctly', () => {
        const state = useAppStore.getState();
        expect(state.skills).toEqual([]);

        const heal: SkillDef = {
            id: 'minor_heal',
            name: 'Minor Heal',
            description: 'Heals a small amount.',
            focCost: 2,
            type: 'heal',
            healDice: 4,
            scaling: 'WIL',
            properties: ['heal'],
            range: 'Close',
        };

        state.addSkillDef(heal);
        expect(useAppStore.getState().skills).toEqual([heal]);

        state.updateSkillDef('minor_heal', { focCost: 1 });
        expect(useAppStore.getState().skills[0].focCost).toBe(1);

        state.removeSkillDef('minor_heal');
        expect(useAppStore.getState().skills).toEqual([]);
    });

    it('backfills legacy NPCs with default combat stats', () => {
        const legacyNPC: Partial<NPCEntry> = {
            id: 'michiko',
            name: 'Michiko',
            faction: 'Shadow Clan',
        };

        const result = backfillNPCCombatStats([legacyNPC as NPCEntry]);
        expect(result.length).toBe(1);
        const backfilled = result[0];
        expect(backfilled.isPC).toBe(false);
        expect(backfilled.combatTier).toBe('grunt');
        expect(backfilled.archetype).toBe('skirmisher');
        expect(backfilled.stats).toEqual({
            VIT: 10,
            PWR: 10,
            RES: 10,
            FOC: 10,
            SPD: 10,
            WIL: 10,
        });
        expect(backfilled.equippedWeapon).toBe('');
        expect(backfilled.knownSkills).toEqual([]);
        expect(backfilled.inventory).toEqual([]);
        expect(backfilled.condition).toBe('healthy');
        expect(backfilled.lastCondition).toBe('healthy');
        expect(backfilled.overrides).toEqual([]);
    });

    it('runs combat initiation and rolls initiative correctly', () => {
        const state = useAppStore.getState();
        const npc: NPCEntry = {
            id: 'sasuke',
            name: 'Sasuke',
            aliases: '',
            appearance: '',
            faction: '',
            storyRelevance: '',
            disposition: '',
            status: '',
            goals: '',
            voice: '',
            personality: '',
            exampleOutput: '',
            affinity: 10,
            isPC: true,
            combatTier: 'elite',
            archetype: 'assassin',
            stats: { VIT: 12, PWR: 14, RES: 12, FOC: 12, SPD: 16, WIL: 10 },
        };

        state.setNPCLedger([npc]);

        // Initiate combat with Sasuke and 2 bulwark grunts
        state.initiateCombat(
            ['sasuke'],
            [{ combatTier: 'grunt', archetype: 'bulwark', count: 2 }]
        );

        const liveState = useAppStore.getState().combatState;
        expect(liveState).not.toBeNull();
        if (liveState) {
            expect(liveState.active).toBe(true);
            expect(liveState.round).toBe(1);
            expect(liveState.activeTurnIndex).toBe(0);

            // Expect Sasuke + 2 mooks = 3 combatants
            const combatants = Object.values(liveState.combatants);
            expect(combatants.length).toBe(3);

            // Turn order should correspond to rolled initiative order
            expect(liveState.turnOrder.length).toBe(3);
            expect(liveState.turnOrder).toContain('sasuke');

            // Verify rangeRelations are Apart by default
            expect(liveState.rangeRelations['sasuke']).toBeDefined();
            const otherId = liveState.turnOrder.find(id => id !== 'sasuke')!;
            expect(liveState.rangeRelations['sasuke'][otherId]).toBe('Apart');
        }
    });

    it('runs combat termination and writes back named NPC condition/death', () => {
        const state = useAppStore.getState();
        const npc: NPCEntry = {
            id: 'michiko',
            name: 'Michiko',
            aliases: '',
            appearance: '',
            faction: '',
            storyRelevance: '',
            disposition: '',
            status: '',
            goals: '',
            voice: '',
            personality: '',
            exampleOutput: '',
            affinity: 10,
            isPC: false,
            combatTier: 'grunt',
            archetype: 'caster',
            stats: { VIT: 8, PWR: 8, RES: 10, FOC: 16, SPD: 10, WIL: 18 },
        };

        state.setNPCLedger([npc]);

        state.initiateCombat(['michiko'], []);

        const liveState = useAppStore.getState().combatState;
        expect(liveState).not.toBeNull();
        if (liveState) {
            // Simulate Michiko taking fatal damage
            liveState.combatants['michiko'].currentHP = 0;
            state.setCombatState(liveState);

            state.terminateCombat({ writeBack: true });

            // Ephemeral combat state should be cleared
            expect(useAppStore.getState().combatState).toBeNull();

            // Michiko's ledger entry should reflect Death condition
            const updatedNpc = useAppStore.getState().npcLedger.find(n => n.id === 'michiko')!;
            expect(updatedNpc.condition).toBe('dead');
            expect(updatedNpc.lastCondition).toBe('dead');
            expect(updatedNpc.lastSeenTimestamp).toBeGreaterThan(0);
        }
    });

    it('writes back critical condition for named NPC at ~20% HP', () => {
        const state = useAppStore.getState();
        const npc: NPCEntry = {
            id: 'kael',
            name: 'Kael',
            aliases: '',
            appearance: '',
            faction: '',
            storyRelevance: '',
            disposition: '',
            status: '',
            goals: '',
            voice: '',
            personality: '',
            exampleOutput: '',
            affinity: 10,
            isPC: false,
            combatTier: 'elite',
            archetype: 'skirmisher',
            stats: { VIT: 12, PWR: 10, RES: 12, FOC: 10, SPD: 12, WIL: 10 },
        };

        state.setNPCLedger([npc]);

        state.initiateCombat(['kael'], []);

        const liveState = useAppStore.getState().combatState;
        expect(liveState).not.toBeNull();
        if (liveState) {
            const kael = liveState.combatants['kael'];
            const targetHP = Math.max(1, Math.floor(kael.maxHP * 0.2));
            liveState.combatants['kael'].currentHP = targetHP;
            state.setCombatState(liveState);

            state.terminateCombat({ writeBack: true });

            const updatedNpc = useAppStore.getState().npcLedger.find(n => n.id === 'kael')!;
            expect(updatedNpc.condition).toBe('critical');
            expect(updatedNpc.lastCondition).toBe('critical');
        }
    });
});
