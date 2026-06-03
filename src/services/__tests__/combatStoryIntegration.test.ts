import { describe, it, expect, vi } from 'vitest';

// handleCombatAction dynamically imports llmCall for the adjudicator — mock it so the
// freeform-round call-budget assertions are deterministic and offline.
const { mockLlmCall } = vi.hoisted(() => ({ mockLlmCall: vi.fn() }));
vi.mock('../../utils/llmCall', () => ({ llmCall: mockLlmCall }));

import { buildPayload, buildCombatStateBlock } from '../payload/payloadBuilder';
import { fitHistory } from '../payload/payloadHistoryFitting';
import {
    buildCombatNarrationPrompt,
    buildCombatNarrationPayload,
    handleCombatAction,
    type CombatActionSource,
} from '../turn/turnOrchestrator';
import {
    computeAC,
    computeMaxHP,
    computeMaxFOC,
    proficiencyBonusForTier,
    abilityMod,
    type Combatant,
    type ActionResolution,
} from '../engine/combatEngine';
import { defaultContext } from '../../store/slices/campaignSlice';
import { defaultSettings } from '../../store/settingsMigration';
import type { AppSettings, ChatMessage, CombatState, GameContext, LoreChunk, LLMProvider } from '../../types';

function makeCombatant(overrides: Partial<Combatant> & { id: string }): Combatant {
    const tier = overrides.combatTier ?? 'grunt';
    const stats = overrides.stats ?? { VIT: 14, PWR: 14, RES: 12, FOC: 10, SPD: 12, WIL: 10 };
    const maxHP = overrides.maxHP ?? computeMaxHP(tier, stats.VIT);
    const maxFOC = overrides.maxFOC ?? computeMaxFOC(tier, stats.WIL);
    return {
        name: overrides.id,
        archetype: 'brute',
        ac: computeAC(stats.RES, 0),
        proficiencyBonus: proficiencyBonusForTier(tier),
        currentHP: overrides.currentHP ?? maxHP,
        currentFOC: overrides.currentFOC ?? maxFOC,
        ...overrides,
        stats,
        maxHP,
        maxFOC,
        combatTier: tier,
    };
}

function makeCombatState(): CombatState {
    const hero = makeCombatant({ id: 'hero', name: 'Sasuke', isPC: true, currentHP: 24, maxHP: 30, currentFOC: 8, maxFOC: 12 });
    const foe = makeCombatant({ id: 'foe', name: 'Hooligan', currentHP: 12, maxHP: 30, position: 'cover' });
    return {
        active: true,
        round: 3,
        turnOrder: ['hero', 'foe'],
        activeTurnIndex: 0,
        combatants: { hero, foe },
        rangeRelations: {
            hero: { foe: 'Engaged' },
            foe: { hero: 'Engaged' },
        },
    };
}

function makeSettings(): AppSettings {
    return { ...defaultSettings, contextLimit: 8192 };
}

function makeContext(overrides: Partial<GameContext> = {}): GameContext {
    return {
        ...defaultContext,
        starterActive: true,
        starter: 'SYSTEM: You are the Game Master narrating a dark fantasy saga.',
        combatModeActive: true,
        ...overrides,
    };
}

const ALWAYS_LORE: LoreChunk = {
    id: 'lore-ironwall',
    header: 'faction -- Ironwall',
    content: 'The Ironwall order guards the northern pass with grim discipline.',
    tokens: 18,
    alwaysInclude: true,
    triggerKeywords: ['ironwall'],
    scanDepth: 2,
    category: 'faction',
    linkedEntities: [],
    priority: 5,
};

function lastUserContent(messages: { role: string; content: unknown }[]): string {
    const last = [...messages].reverse().find(m => m.role === 'user');
    return typeof last?.content === 'string' ? last.content : '';
}

describe('Phase C — combat story integration', () => {

    describe('buildCombatStateBlock', () => {
        it('renders round, living combatants with HP/FOC, PC marker, status tags, and engaged pairs', () => {
            const block = buildCombatStateBlock(makeCombatState());
            expect(block).toContain('[COMBAT STATE: VOLATILE]');
            expect(block).toContain('Round 3');
            expect(block).toContain('Sasuke (PC): HP 24/30 · FOC 8/12');
            expect(block).toContain('Hooligan: HP 12/30 · FOC');
            expect(block).toContain('[cover]');
            expect(block).toContain('Engaged (melee range): Sasuke⇔Hooligan');
        });

        it('omits dead combatants', () => {
            const state = makeCombatState();
            state.combatants.foe.currentHP = 0;
            const block = buildCombatStateBlock(state);
            expect(block).not.toContain('Hooligan');
        });

        it('honors a custom FOC stat label', () => {
            const block = buildCombatStateBlock(makeCombatState(), { FOC: 'Chakra' });
            expect(block).toContain('Chakra 8/12');
        });
    });

    describe('volatile injection in buildPayload', () => {
        it('injects [COMBAT STATE: VOLATILE] when combatModeActive + live combatState', () => {
            const { messages } = buildPayload({
                settings: makeSettings(),
                context: makeContext(),
                history: [],
                userMessage: 'I press the attack.',
                combatState: makeCombatState(),
            });
            const userContent = lastUserContent(messages);
            expect(userContent).toContain('[COMBAT STATE: VOLATILE]');
            // defaultContext.statLabelMap maps FOC → "Focus" — the block honors the campaign label.
            expect(userContent).toContain('Sasuke (PC): HP 24/30 · Focus 8/12');
        });

        it('does NOT inject the combat block on non-combat turns', () => {
            const { messages } = buildPayload({
                settings: makeSettings(),
                context: makeContext({ combatModeActive: false }),
                history: [],
                userMessage: 'I walk into the tavern.',
                combatState: makeCombatState(),
            });
            expect(lastUserContent(messages)).not.toContain('[COMBAT STATE: VOLATILE]');
        });

        it('does NOT inject when combat mode is on but no live fight exists', () => {
            const { messages } = buildPayload({
                settings: makeSettings(),
                context: makeContext(),
                history: [],
                userMessage: 'I scan the horizon.',
                combatState: null,
            });
            expect(lastUserContent(messages)).not.toContain('[COMBAT STATE: VOLATILE]');
        });
    });

    describe('ledger retention in fitHistory', () => {
        const ledger = (line: string): ChatMessage => ({
            id: line, role: 'assistant', content: `⚔️ ${line}`, timestamp: 1, name: 'combat-ledger',
        });

        it('retains combat-ledger lines in fitted history (not dropped)', () => {
            const history: ChatMessage[] = [
                { id: 'u1', role: 'user', content: 'I strike!', timestamp: 1 },
                ledger('Round 1 · Sasuke 30/30 · Hooligan 18/30'),
                { id: 'a1', role: 'assistant', content: 'Steel rings out.', timestamp: 2 },
            ];
            const { fitted } = fitHistory(history, undefined, 'next move', 0, 8192);
            const ledgerLines = fitted.filter(m => typeof m.content === 'string' && m.content.startsWith('⚔️'));
            expect(ledgerLines.length).toBe(1);
            expect(ledgerLines[0].content).toContain('Round 1');
        });

        it('caps retained ledger lines to the most recent rounds', () => {
            const history: ChatMessage[] = [];
            for (let r = 1; r <= 10; r++) history.push(ledger(`Round ${r}`));
            const { fitted } = fitHistory(history, undefined, 'continue', 0, 8192);
            const ledgerLines = fitted.filter(m => typeof m.content === 'string' && m.content.startsWith('⚔️'));
            expect(ledgerLines.length).toBe(6);
            // newest kept, oldest dropped
            expect(fitted.some(m => m.content === '⚔️ Round 10')).toBe(true);
            expect(fitted.some(m => m.content === '⚔️ Round 1')).toBe(false);
        });
    });

    describe('buildCombatNarrationPayload — full-context narration', () => {
        it('produces system prompt + a lore/NPC section + the engine-result block LAST', () => {
            const messages = buildCombatNarrationPayload({
                settings: makeSettings(),
                context: makeContext(),
                messages: [],
                npcLedger: [],
                loreChunks: [ALWAYS_LORE],
                combatState: makeCombatState(),
                ledgerLine: 'Round 3 · Sasuke 24/30 · Hooligan 12/30',
                resolutions: [{ actorId: 'hero', targetId: 'foe', type: 'attack', hit: true, damage: 6, naturalRoll: 15, total: 19 }],
                playerDescription: 'I lunge at the hooligan.',
            });

            // system prompt present
            expect(messages[0].role).toBe('system');
            expect(typeof messages[0].content === 'string' && messages[0].content).toContain('Game Master');

            const userContent = lastUserContent(messages);
            // lore section + live combat state both present
            expect(userContent).toContain('[WORLD LORE');
            expect(userContent).toContain('[COMBAT STATE: VOLATILE]');
            // engine result block present and LAST
            expect(userContent).toContain('[COMBAT ENGINE RESULT');
            expect(userContent.indexOf('[COMBAT ENGINE RESULT')).toBeGreaterThan(userContent.indexOf('[WORLD LORE'));
            expect(userContent.indexOf('[COMBAT ENGINE RESULT')).toBeGreaterThan(userContent.indexOf('[COMBAT STATE: VOLATILE]'));
        });
    });

    describe('buildCombatNarrationPrompt — resolution rendering (Phase B carryover)', () => {
        const state = makeCombatState();

        it('renders a heal as FOC SPENT, never as FOC gained', () => {
            const res: ActionResolution[] = [{ actorId: 'hero', targetId: 'hero', type: 'heal', healed: 7, focSpent: 3 }];
            const out = buildCombatNarrationPrompt('Round 3', res, state);
            expect(out).toContain('healed 7 HP');
            expect(out).toContain('spent 3 FOC');
            expect(out).not.toMatch(/\+\d+ FOC/); // no "+3 FOC" brace-style gain wording
        });

        it('renders mental resolutions with damage and resist/affect outcome', () => {
            const res: ActionResolution[] = [{ actorId: 'hero', targetId: 'foe', type: 'mental', saved: false, damage: 5, naturalRoll: 12, total: 16 }];
            const out = buildCombatNarrationPrompt('Round 3', res, state);
            expect(out).toContain('AFFECTED');
            expect(out).toContain('5 damage');
        });

        it('uses combatant names, not raw ids', () => {
            const res: ActionResolution[] = [{ actorId: 'hero', targetId: 'foe', type: 'attack', hit: true, damage: 6, naturalRoll: 15, total: 19 }];
            const out = buildCombatNarrationPrompt('Round 3', res, state);
            expect(out).toContain('Sasuke → Hooligan');
        });
    });

    describe('per-round LLM call budget', () => {
        const baseCallbacks = (narrateSpy: () => void, aux?: LLMProvider) => ({
            addMessage: vi.fn(),
            updateContext: vi.fn(),
            setCombatState: vi.fn(),
            terminateCombat: vi.fn(),
            getAuxiliaryProvider: () => aux,
            getStoryProvider: () => ({ endpoint: 'x', modelName: 'm' } as LLMProvider),
            narrateCombatOutcome: async () => { narrateSpy(); },
            items: [],
            skills: [],
        });

        const attackAction = (): import('../engine/combatEngine').CombatAction => ({
            type: 'attack', actorId: 'hero', targetId: 'foe',
            attackBonus: abilityMod(14) + 2, weaponDie: 8, scalingStatMod: abilityMod(14), weaponRange: 'Close',
        });
        const buttonAttack = (): CombatActionSource => ({ kind: 'button', action: attackAction() });

        it('button round = 1 narrate call, 0 adjudicate calls', async () => {
            mockLlmCall.mockReset();
            const narrate = vi.fn();
            await handleCombatAction(buttonAttack(), makeCombatState(), baseCallbacks(narrate));
            expect(mockLlmCall).not.toHaveBeenCalled();
            expect(narrate).toHaveBeenCalledTimes(1);
        });

        it('freeform round = 1 adjudicate + 1 narrate (2 calls total)', async () => {
            mockLlmCall.mockReset();
            mockLlmCall.mockResolvedValue('{"stat":"PWR","advantage":"normal","positionTag":"none","momentumToken":0,"riskOnFail":"none"}');
            const narrate = vi.fn();
            const aux = { endpoint: 'aux', modelName: 'aux-model' } as LLMProvider;
            const source: CombatActionSource = {
                kind: 'freeform',
                freeformText: 'I vault off the wall and slash downward.',
                baseAction: attackAction(),
            };
            await handleCombatAction(source, makeCombatState(), baseCallbacks(narrate, aux));
            expect(mockLlmCall).toHaveBeenCalledTimes(1); // adjudicate
            expect(narrate).toHaveBeenCalledTimes(1);      // narrate
        });
    });
});
