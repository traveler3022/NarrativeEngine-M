import { describe, it, expect } from 'vitest';

import {
    selectEnemyAction,
    selectEnemyTarget,
    buildEnemyAction,
    weightedPick,
    triggerMatches,
    parseTrigger,
    computeAC,
    computeMaxHP,
    computeMaxFOC,
    proficiencyBonusForTier,
    type Combatant,
    type CombatState,
    type BehaviorEntry,
} from '../engine/combatEngine';
import { runCombatTurn } from '../turn/turnOrchestrator';

// ── helpers ────────────────────────────────────────────────────────────────

function makeCombatant(o: Partial<Combatant> & { id: string }): Combatant {
    const tier = o.combatTier ?? 'grunt';
    const stats = o.stats ?? { VIT: 14, PWR: 12, RES: 12, FOC: 10, SPD: 12, WIL: 10 };
    const maxHP = o.maxHP ?? computeMaxHP(tier, stats.VIT);
    const maxFOC = o.maxFOC ?? computeMaxFOC(tier, stats.WIL);
    return {
        name: o.name ?? o.id,
        archetype: o.archetype ?? 'brute',
        ac: o.ac ?? computeAC(stats.RES, 0),
        proficiencyBonus: o.proficiencyBonus ?? proficiencyBonusForTier(tier),
        currentHP: o.currentHP ?? maxHP,
        currentFOC: o.currentFOC ?? maxFOC,
        isPC: o.isPC,
        position: o.position,
        statusEffects: o.statusEffects,
        overrides: o.overrides,
        ...o,
        id: o.id,
        stats,
        maxHP,
        maxFOC,
        combatTier: tier,
    };
}

function makeState(combatants: Combatant[], opts?: { round?: number; relation?: 'Engaged' | 'Apart' }): CombatState {
    const ids = combatants.map(c => c.id);
    const relation = opts?.relation ?? 'Apart';
    const rangeRelations: Record<string, Record<string, 'Engaged' | 'Apart'>> = {};
    for (const a of ids) {
        rangeRelations[a] = {};
        for (const b of ids) if (a !== b) rangeRelations[a][b] = relation;
    }
    const map: Record<string, Combatant> = {};
    combatants.forEach(c => { map[c.id] = c; });
    return { active: true, round: opts?.round ?? 1, turnOrder: ids, activeTurnIndex: 0, combatants: map, rangeRelations };
}

function setRelation(state: CombatState, a: string, b: string, rel: 'Engaged' | 'Apart') {
    state.rangeRelations[a] = state.rangeRelations[a] ?? {};
    state.rangeRelations[b] = state.rangeRelations[b] ?? {};
    state.rangeRelations[a][b] = rel;
    state.rangeRelations[b][a] = rel;
}

/** Deterministic rng that returns queued values, clamping to the last on overflow. */
function seqRng(values: number[]): () => number {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
}

// ── parseTrigger ─────────────────────────────────────────────────────────────

describe('parseTrigger', () => {
    it('parses paren and colon arg forms', () => {
        expect(parseTrigger('onSelfBelow(30)')).toEqual({ kind: 'onSelfBelow', arg: 30 });
        expect(parseTrigger('onAllyBelow:25')).toEqual({ kind: 'onAllyBelow', arg: 25 });
        expect(parseTrigger('onRound(2)')).toEqual({ kind: 'onRound', arg: 2 });
    });
    it('treats argless and non-numeric-arg triggers as no arg', () => {
        expect(parseTrigger('onAllyFatal')).toEqual({ kind: 'onAllyFatal', arg: undefined });
        expect(parseTrigger('onAllyFatal(Chie)')).toEqual({ kind: 'onAllyFatal', arg: undefined });
    });
});

// ── triggerMatches ───────────────────────────────────────────────────────────

describe('triggerMatches', () => {
    it('onSelfBelow fires only below the threshold', () => {
        const actor = makeCombatant({ id: 'a', maxHP: 100, currentHP: 40 });
        const state = makeState([actor, makeCombatant({ id: 'pc', isPC: true })]);
        expect(triggerMatches('onSelfBelow(50)', state.combatants.a, state)).toBe(true);
        const healthy = makeCombatant({ id: 'a', maxHP: 100, currentHP: 60 });
        const state2 = makeState([healthy, makeCombatant({ id: 'pc', isPC: true })]);
        expect(triggerMatches('onSelfBelow(50)', state2.combatants.a, state2)).toBe(false);
    });
    it('onAllyBelow fires when a living ally is hurt', () => {
        const actor = makeCombatant({ id: 'a' });
        const ally = makeCombatant({ id: 'b', maxHP: 100, currentHP: 20 });
        const state = makeState([actor, ally, makeCombatant({ id: 'pc', isPC: true })]);
        expect(triggerMatches('onAllyBelow(30)', state.combatants.a, state)).toBe(true);
    });
    it('onAllyFatal fires when an ally is down', () => {
        const actor = makeCombatant({ id: 'a' });
        const ally = makeCombatant({ id: 'b', currentHP: 0 });
        const state = makeState([actor, ally, makeCombatant({ id: 'pc', isPC: true })]);
        expect(triggerMatches('onAllyFatal', state.combatants.a, state)).toBe(true);
    });
    it('onRound matches the exact round', () => {
        const actor = makeCombatant({ id: 'a' });
        const state = makeState([actor, makeCombatant({ id: 'pc', isPC: true })], { round: 2 });
        expect(triggerMatches('onRound(2)', state.combatants.a, state)).toBe(true);
        expect(triggerMatches('onRound(3)', state.combatants.a, state)).toBe(false);
    });
});

// ── weightedPick ─────────────────────────────────────────────────────────────

describe('weightedPick', () => {
    const table: BehaviorEntry[] = [{ action: 'x', weight: 0.4 }, { action: 'y', weight: 0.6 }];

    it('is deterministic per rng value and respects weight bands', () => {
        expect(weightedPick(table, () => 0)).toBe('x');
        expect(weightedPick(table, () => 0.39)).toBe('x');
        expect(weightedPick(table, () => 0.41)).toBe('y');
        expect(weightedPick(table, () => 0.99)).toBe('y');
    });

    it('matches the weight distribution over many samples', () => {
        let x = 0;
        const N = 8000;
        for (let i = 0; i < N; i++) if (weightedPick(table, Math.random) === 'x') x++;
        expect(x / N).toBeGreaterThan(0.36);
        expect(x / N).toBeLessThan(0.44);
    });
});

// ── selectEnemyTarget ────────────────────────────────────────────────────────

describe('selectEnemyTarget', () => {
    // rng first value >= TARGET_RANDOM_CHANCE (0.15) skips the random-pick branch.
    const skipRandom = seqRng([0.9]);

    it('assassin targets the lowest-HP enemy', () => {
        const actor = makeCombatant({ id: 'a', archetype: 'assassin' });
        const pc1 = makeCombatant({ id: 'pc1', isPC: true, maxHP: 100, currentHP: 30 });
        const pc2 = makeCombatant({ id: 'pc2', isPC: true, maxHP: 100, currentHP: 10 });
        const state = makeState([actor, pc1, pc2]);
        expect(selectEnemyTarget(state.combatants.a, state, skipRandom)).toBe('pc2');
    });

    it('never targets a downed enemy', () => {
        const actor = makeCombatant({ id: 'a', archetype: 'assassin' });
        const pc1 = makeCombatant({ id: 'pc1', isPC: true, currentHP: 25 });
        const pc2 = makeCombatant({ id: 'pc2', isPC: true, currentHP: 0 });
        const state = makeState([actor, pc1, pc2]);
        expect(selectEnemyTarget(state.combatants.a, state, seqRng([0.9]))).toBe('pc1');
    });

    it('brute targets the highest-PWR enemy', () => {
        const actor = makeCombatant({ id: 'a', archetype: 'brute' });
        const pc1 = makeCombatant({ id: 'pc1', isPC: true, stats: { VIT: 12, PWR: 10, RES: 10, FOC: 10, SPD: 10, WIL: 10 } });
        const pc2 = makeCombatant({ id: 'pc2', isPC: true, stats: { VIT: 12, PWR: 18, RES: 10, FOC: 10, SPD: 10, WIL: 10 } });
        const state = makeState([actor, pc1, pc2]);
        expect(selectEnemyTarget(state.combatants.a, state, seqRng([0.9]))).toBe('pc2');
    });

    it('caster prefers a backline (Apart) enemy over a closer, weaker one', () => {
        const actor = makeCombatant({ id: 'a', archetype: 'caster' });
        const pc1 = makeCombatant({ id: 'pc1', isPC: true, maxHP: 100, currentHP: 10 });
        const pc2 = makeCombatant({ id: 'pc2', isPC: true, maxHP: 100, currentHP: 30 });
        const state = makeState([actor, pc1, pc2]);
        setRelation(state, 'a', 'pc1', 'Engaged'); // weaker but in melee
        setRelation(state, 'a', 'pc2', 'Apart');    // backline
        expect(selectEnemyTarget(state.combatants.a, state, seqRng([0.9]))).toBe('pc2');
    });
});

// ── selectEnemyAction cascade ────────────────────────────────────────────────

describe('selectEnemyAction cascade', () => {
    it('override (tier 1) wins over the archetype weighted roll', () => {
        const actor = makeCombatant({ id: 'a', archetype: 'brute' });
        const state = makeState([actor, makeCombatant({ id: 'pc', isPC: true })], { round: 1, relation: 'Engaged' });
        const action = selectEnemyAction(
            state.combatants.a,
            state,
            [{ trigger: 'onRound(1)', action: 'defend' }],
            seqRng([0.0]), // a brute would otherwise attack
        );
        expect(action.type).toBe('defend');
    });

    it('bulwark conditional (tier 2) protects when an ally is critical', () => {
        const actor = makeCombatant({ id: 'a', archetype: 'bulwark' });
        const ally = makeCombatant({ id: 'b', maxHP: 100, currentHP: 20 });
        const state = makeState([actor, ally, makeCombatant({ id: 'pc', isPC: true })], { relation: 'Engaged' });
        const action = selectEnemyAction(state.combatants.a, state, [], seqRng([0.9]));
        expect(action.type).toBe('defend'); // guard degrades to brace in v1
    });

    it('brute conditional berserks (attacks) when cornered below 30% HP', () => {
        const actor = makeCombatant({ id: 'a', archetype: 'brute', maxHP: 100, currentHP: 20 });
        const state = makeState([actor, makeCombatant({ id: 'pc', isPC: true })], { relation: 'Engaged' });
        const action = selectEnemyAction(state.combatants.a, state, [], seqRng([0.9]));
        expect(action.type).toBe('attack');
        expect(action.targetId).toBe('pc');
    });

    it('is fully deterministic under a fixed rng seed', () => {
        const build = () => {
            const actor = makeCombatant({ id: 'a', archetype: 'skirmisher' });
            const state = makeState(
                [actor, makeCombatant({ id: 'pc1', isPC: true }), makeCombatant({ id: 'pc2', isPC: true })],
                { relation: 'Engaged' },
            );
            return selectEnemyAction(state.combatants.a, state, [], seqRng([0.05, 0.3, 0.7, 0.2]));
        };
        expect(build()).toEqual(build());
    });
});

// ── buildEnemyAction range handling ──────────────────────────────────────────

describe('buildEnemyAction range legality', () => {
    it('converts a melee attack on an Apart target into a close-the-gap move', () => {
        const actor = makeCombatant({ id: 'a', archetype: 'brute' });
        const state = makeState([actor, makeCombatant({ id: 'pc', isPC: true })], { relation: 'Apart' });
        const action = buildEnemyAction('attack', state.combatants.a, state, seqRng([0.9]));
        expect(action.type).toBe('move');
        expect(action.moveToTarget).toBe(true);
        expect(action.targetId).toBe('pc');
    });

    it('keeps an attack when the target is Engaged', () => {
        const actor = makeCombatant({ id: 'a', archetype: 'brute' });
        const state = makeState([actor, makeCombatant({ id: 'pc', isPC: true })], { relation: 'Engaged' });
        const action = buildEnemyAction('attack', state.combatants.a, state, seqRng([0.9]));
        expect(action.type).toBe('attack');
        expect(action.weaponRange).toBe('Close');
    });

    it('lets a caster cast (mental) at any range — not gated', () => {
        const actor = makeCombatant({ id: 'a', archetype: 'caster' });
        const state = makeState([actor, makeCombatant({ id: 'pc', isPC: true })], { relation: 'Apart' });
        const action = buildEnemyAction('cast', state.combatants.a, state, seqRng([0.9]));
        expect(action.type).toBe('mental');
        expect(action.targetId).toBe('pc');
    });
});

// ── runCombatTurn integration ────────────────────────────────────────────────

describe('runCombatTurn enemy auto-actions', () => {
    it('never auto-generates an action for a PC', () => {
        const pc = makeCombatant({ id: 'pc', isPC: true });
        const e1 = makeCombatant({ id: 'e1' });
        const e2 = makeCombatant({ id: 'e2' });
        const state = makeState([pc, e1, e2], { relation: 'Engaged' });
        const result = runCombatTurn({ combatState: state, actions: [] }); // PC submits nothing
        const actorIds = result.resolutions.map(r => r.actorId);
        expect(actorIds).not.toContain('pc');
        expect(new Set(actorIds)).toEqual(new Set(['e1', 'e2']));
    });

    it('resolves a full two-sided round: 1 PC + 3 enemies all act once', () => {
        const pc = makeCombatant({ id: 'pc', isPC: true, stats: { VIT: 16, PWR: 14, RES: 12, FOC: 10, SPD: 18, WIL: 10 } });
        const e1 = makeCombatant({ id: 'e1', archetype: 'brute' });
        const e2 = makeCombatant({ id: 'e2', archetype: 'assassin' });
        const e3 = makeCombatant({ id: 'e3', archetype: 'caster' });
        const state = makeState([pc, e1, e2, e3], { relation: 'Engaged' });
        const pcAction = { type: 'attack' as const, actorId: 'pc', targetId: 'e1', weaponRange: 'Close' as const };
        const result = runCombatTurn({ combatState: state, actions: [pcAction] });
        const actorIds = new Set(result.resolutions.map(r => r.actorId));
        expect(actorIds).toEqual(new Set(['pc', 'e1', 'e2', 'e3']));
    });
});
