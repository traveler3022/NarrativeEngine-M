import type { StateCreator } from 'zustand';
import type { SkillDef } from '../../types';
import { toast } from '../../components/Toast';

let skillTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSaveSkillCompendium(campaignId: string | null, skills: SkillDef[]) {
    if (!campaignId) return;
    if (skillTimer) clearTimeout(skillTimer);
    skillTimer = setTimeout(async () => {
        try {
            const { saveSkillCompendium } = await import('../../store/campaignStore');
            await saveSkillCompendium(campaignId, skills);
        } catch (e) {
            console.error(e);
            toast.error('Failed to save skill compendium');
        }
    }, 500);
}

export const CANON_SKILL_DEFS: SkillDef[] = [
    {
        id: 'fireball',
        name: 'Fireball',
        description: 'Launches a sphere of flame dealing fiery explosive damage.',
        focCost: 5,
        type: 'attack',
        damageDice: 8,
        scaling: 'WIL',
        properties: ['fire', 'aoe'],
        range: 'Ranged',
    },
    {
        id: 'healing_light',
        name: 'Healing Light',
        description: 'Restores vitality to a wounded ally.',
        focCost: 2,
        type: 'heal',
        healDice: 8,
        scaling: 'WIL',
        properties: ['holy', 'heal'],
        range: 'Close',
    },
    {
        id: 'deflect',
        name: 'Deflect',
        description: 'A swift physical technique to brace against physical attacks.',
        focCost: 0,
        type: 'utility',
        scaling: 'SPD',
        properties: ['physical', 'guard'],
        range: 'Close',
    }
];

export type SkillSlice = {
    skills: SkillDef[];
    setSkillCompendium: (skills: SkillDef[]) => void;
    addSkillDef: (skill: SkillDef) => void;
    updateSkillDef: (id: string, patch: Partial<SkillDef>) => void;
    removeSkillDef: (id: string) => void;
};

type SkillDeps = SkillSlice & {
    activeCampaignId: string | null;
};

export const createSkillSlice: StateCreator<SkillDeps, [], [], SkillSlice> = (set) => ({
    skills: [],
    setSkillCompendium: (skills) => set((s) => {
        debouncedSaveSkillCompendium(s.activeCampaignId, skills);
        return { skills };
    }),
    addSkillDef: (skill) => set((s) => {
        const next = [...s.skills, skill];
        debouncedSaveSkillCompendium(s.activeCampaignId, next);
        return { skills: next };
    }),
    updateSkillDef: (id, patch) => set((s) => {
        const next = s.skills.map(s => s.id === id ? { ...s, ...patch } : s);
        debouncedSaveSkillCompendium(s.activeCampaignId, next);
        return { skills: next };
    }),
    removeSkillDef: (id) => set((s) => {
        const next = s.skills.filter(s => s.id !== id);
        debouncedSaveSkillCompendium(s.activeCampaignId, next);
        return { skills: next };
    }),
});
