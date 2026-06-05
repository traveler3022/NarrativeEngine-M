import type { DiceConfig, LoreChunk, NotebookNote, CombatTier, Archetype, OpenAITool, InventoryProposal, ItemDef } from '../../types';
import { searchLoreByQuery } from '../lore';
import { uid } from '../../utils/uid';
import { mapTier } from '../engine';

const MAX_NOTEBOOK_OPS = 5;
const MAX_NOTEBOOK_NOTES = 50;

export type ToolContext = {
    loreChunks: LoreChunk[];
    notebook: NotebookNote[];
};

export type LoreHandlerResult = {
    toolResult: string;
};

export type NotebookHandlerResult = {
    toolResult: string;
    updatedNotebook: NotebookNote[];
};

export type DiceHandlerResult = {
    toolResult: string;
};

export type AdjudicateHandlerResult = {
    toolResult: string;
};

export type InitiateCombatHandlerResult = {
    toolResult: string;
    foes: {
        name: string;
        count: number;
        combatTier: CombatTier;
        archetype: Archetype;
    }[];
};

export type ProposeInventoryHandlerResult = {
    toolResult: string;
    proposal: InventoryProposal;
};

const BASE_TOOLS = [
    {
        type: 'function' as const,
        function: {
            name: 'query_campaign_lore',
            description: 'Search the Game Master notes for specific lore, rules, characters, or locations. Do NOT call this sequentially or spam it. If no relevant lore is found, immediately proceed with the narrative response. IMPORTANT: You MUST use the standard JSON tool call format. NEVER output raw XML <|DSML|> tags in your response text.',
            parameters: {
                type: 'object' as const,
                properties: { query: { type: 'string' as const, description: 'The specific search query' } },
                required: ['query'],
            },
        },
    },
    {
        type: 'function' as const,
        function: {
            name: 'update_scene_notebook',
            description: 'Update the scene notebook for tracking temporary state — active spells, timers, NPC positions, environmental conditions, combat state. Actions: add (create note), remove (delete by text match), clear (wipe all). Max 50 notes, max 5 actions per call. Use sparingly — only for volatile scene state that changes within a scene.',
            parameters: {
                type: 'object' as const,
                properties: {
                    actions: {
                        type: 'array' as const,
                        items: {
                            type: 'object' as const,
                            properties: {
                                op: { type: 'string' as const, enum: ['add', 'remove', 'clear'] },
                                text: { type: 'string' as const, description: 'Note text (ignored for clear op)' },
                            },
                            required: ['op'],
                        },
                        description: 'Array of notebook actions to perform (max 5)',
                        maxItems: 5,
                    },
                },
                required: ['actions'],
            },
        },
    },
] as const;

const ROLL_DICE_TOOL = {
    type: 'function' as const,
    function: {
        name: 'roll_dice',
        description:
            "Roll dice when the player attempts an action with an uncertain outcome — combat hits, ability/skill checks, saves, contested actions. Do NOT call for descriptive moments, dialogue, or trivial actions. Call BEFORE narrating the outcome, then use the returned tier to shape the narrative.",
        parameters: {
            type: 'object' as const,
            properties: {
                dice:     { type: 'string' as const, description: "Dice expression: '1d20', '2d6', '1d100', optionally with '+N' or '-N' modifier" },
                reason:   { type: 'string' as const, description: "Short label, e.g. 'Stealth check vs guard' or 'Longsword attack'" },
                category: { type: 'string' as const, enum: ['Combat','Perception','Stealth','Social','Movement','Knowledge','Mundane'], description: 'Skill category for tier mapping (used for d20 only)' }
            },
            required: ['dice', 'reason']
        }
    }
} as const;

const ADJUDICATE_ACTION_TOOL = {
    type: 'function' as const,
    function: {
        name: 'adjudicate_action',
        description:
            "Translate a player's freeform combat maneuver into bounded mechanical labels. Use ONLY " +
            "when the player describes a creative action (e.g. a MOV:SETUP free-text stunt) that the " +
            "fixed combat buttons don't cover. You decide WHICH stat governs it, whether the fiction " +
            "earns advantage/disadvantage, what position it ends in, whether it grants a one-use " +
            "momentum token for the NEXT attack, and what goes wrong on failure. NEVER output damage, " +
            "HP, or dice — the engine owns all numbers. You only supply labels.",
        parameters: {
            type: 'object' as const,
            properties: {
                stat:        { type: 'string', enum: ['PWR','SPD','WIL','VIT','RES','FOC'], description: 'Which stat the maneuver is resolved against (PWR=force, SPD=agility/acrobatics, WIL=mental/magic, VIT=endurance, RES=bracing, FOC=technique fuel).' },
                advantage:   { type: 'string', enum: ['advantage','normal','disadvantage'], description: "advantage if the fiction is clever/favorable (high ground, clear opening); disadvantage if reckless/awkward; otherwise normal." },
                positionTag: { type: 'string', enum: ['cover','elevated','exposed','none'], description: 'Position the actor ends the maneuver in. elevated = high ground (benefits the actor); exposed = open/vulnerable; cover = shielded vs ranged; none = neutral.' },
                momentumToken: { type: 'integer', enum: [0,1], description: '1 if the setup clearly earns a one-use boon for the NEXT attack (consumed immediately); else 0. Never more than 1.' },
                riskOnFail:  { type: 'string', enum: ['none','prone','exposed','drop_weapon','self_stagger'], description: 'What befalls the actor if the maneuver fails its check.' },
            },
            required: ['stat','advantage','positionTag','momentumToken','riskOnFail'],
        },
    },
} as const;

const INITIATE_COMBAT_TOOL = {
    type: 'function' as const,
    function: {
        name: 'initiate_combat',
        description:
            "Signal that physical combat is beginning. Call this the moment a fight actually starts " +
            "(a strike is launched, an ambush triggers), NOT for threats or posturing. List the " +
            "hostile parties so the engine can build the encounter. The engine owns all stats and " +
            "resolution — you are only flagging that combat mode should open.",
        parameters: {
            type: 'object' as const,
            properties: {
                foes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name:       { type: 'string', description: 'Name or short label, e.g. "Drunk Pirate".' },
                            count:      { type: 'integer', description: 'How many of this foe (mooks). Default 1.' },
                            combatTier: { type: 'string', enum: ['minion','grunt','elite','boss','legendary'], description: "Threat level. Use 'minion' for basic/weak/fodder foes (e.g. 'basic golem', 'street thug'); reserve 'elite'+ for standout, named, or clearly-dangerous foes." },
                            archetype:  { type: 'string', enum: ['bulwark','assassin','caster','skirmisher','brute'], description: 'Fighting style.' },
                        },
                        required: ['name'],
                    },
                    description: 'The hostile combatants entering the fight.',
                },
            },
            required: ['foes'],
        },
    },
} as const;

const PROPOSE_INVENTORY_TOOL = {
    type: 'function' as const,
    function: {
        name: 'propose_inventory_change',
        description:
            "Propose adding, removing, or equipping an item in the player's inventory when the fiction materially changes their gear (loot found, a weapon gifted/bought/broken, armor donned). This only *proposes* — the player must confirm before anything changes. Supply bounded labels ONLY; the engine sets all numbers (damage dice, bonus, AC). NEVER output damageDice, bonus, hp, or AC. Do NOT call for flavor mentions the player won't use mechanically. Default quality to 'common'; reserve 'rare'+ for clearly special, story-significant items.",
        parameters: {
            type: 'object' as const,
            properties: {
                name:        { type: 'string', description: 'Item name.' },
                op:          { type: 'string', enum: ['grant','remove','equip'], description: "Operation. Default 'grant'." },
                kind:        { type: 'string', enum: ['weapon','armor','consumable','misc'], description: "Item kind. Default 'misc'." },
                quality:     { type: 'string', enum: ['common','uncommon','rare','epic','legendary'], description: "Rarity/quality tier. Default 'common'." },
                scalingStat: { type: 'string', enum: ['PWR','SPD','WIL'], description: "Scaling stat for weapons. Default 'PWR'." },
                range:       { type: 'string', enum: ['Close','Reach','Ranged'], description: "Weapon range. Default 'Close'." },
                properties:  { type: 'array', items: { type: 'string' }, description: 'Flavor tags, e.g. ["fire","heavy"].' },
                equip:       { type: 'boolean', description: 'Equip on confirm (weapons/armor). Default false.' },
                description: { type: 'string', description: 'Short flavor text.' },
            },
            required: ['name'],
        },
    },
} as const;

export function getToolDefinitions(opts: { allowDiceTool: boolean; combatModeActive?: boolean }) {
    const base = [...BASE_TOOLS as unknown as OpenAITool[], ...(opts.allowDiceTool ? [ROLL_DICE_TOOL] as unknown as OpenAITool[] : [])];
    if (opts.combatModeActive) {
        return [...base, ADJUDICATE_ACTION_TOOL, INITIATE_COMBAT_TOOL, PROPOSE_INVENTORY_TOOL] as unknown as OpenAITool[];
    }
    return base;
}

export const TOOL_DEFINITIONS = BASE_TOOLS;

export function handleLoreTool(
    toolArguments: string,
    ctx: ToolContext
): LoreHandlerResult {
    let query = '';
    try { query = JSON.parse(toolArguments).query || ''; } catch { /* ignore */ }

    let toolResult = 'No relevant lore found.';
    if (query) {
        const found = searchLoreByQuery(ctx.loreChunks, query);
        if (found.length > 0) {
            toolResult = found.map(c => `### ${c.header}\n${c.content}`).join('\n\n');
        }
    }

    return { toolResult };
}

export function handleNotebookTool(
    toolArguments: string,
    ctx: ToolContext
): NotebookHandlerResult {
    let notebookActions: { op: string; text?: string }[] = [];
    try { notebookActions = JSON.parse(toolArguments).actions || []; } catch { /* ignore */ }

    const currentNotebook = [...(ctx.notebook ?? [])];
    let opsCount = 0;

    for (const action of notebookActions) {
        if (opsCount >= MAX_NOTEBOOK_OPS) break;
        if (action.op === 'add' && action.text && currentNotebook.length < MAX_NOTEBOOK_NOTES) {
            currentNotebook.push({ id: uid(), text: action.text.trim(), timestamp: Date.now() });
        } else if (action.op === 'remove' && action.text) {
            const searchLower = action.text.toLowerCase().trim();
            const idx = currentNotebook.findIndex(n => n.text.toLowerCase().includes(searchLower));
            if (idx !== -1) currentNotebook.splice(idx, 1);
        } else if (action.op === 'clear') {
            currentNotebook.length = 0;
        }
        opsCount++;
    }

    const toolResult = `Notebook updated. ${currentNotebook.length} notes active.`;
    console.log(`[Notebook] Updated: ${currentNotebook.length} notes active (${opsCount} ops)`);

    return { toolResult, updatedNotebook: currentNotebook };
}

const VALID_ADJUDICATE_STATS = new Set(['PWR', 'SPD', 'WIL', 'VIT', 'RES', 'FOC']);
const VALID_ADVANTAGES = new Set(['advantage', 'normal', 'disadvantage']);
const VALID_POSITION_TAGS = new Set(['cover', 'elevated', 'exposed', 'none']);
const VALID_RISKS = new Set(['none', 'prone', 'exposed', 'drop_weapon', 'self_stagger']);
const FORBIDDEN_KEYS = new Set(['damage', 'hp', 'dice']);

export function handleAdjudicateTool(
    toolArguments: string
): AdjudicateHandlerResult {
    let args: Record<string, unknown> = {};
    try { args = JSON.parse(toolArguments); } catch { /* ignore */ }

    let stat = typeof args.stat === 'string' ? args.stat : '';
    if (!VALID_ADJUDICATE_STATS.has(stat)) stat = 'PWR';

    let advantage = typeof args.advantage === 'string' ? args.advantage : '';
    if (!VALID_ADVANTAGES.has(advantage)) advantage = 'normal';

    let positionTag = typeof args.positionTag === 'string' ? args.positionTag : '';
    if (!VALID_POSITION_TAGS.has(positionTag)) positionTag = 'none';

    let momentumToken: number;
    if (typeof args.momentumToken === 'number' && isFinite(args.momentumToken)) {
        momentumToken = Math.round(args.momentumToken);
        if (momentumToken > 1) momentumToken = 1;
        if (momentumToken < 0) momentumToken = 0;
    } else if (args.momentumToken) {
        momentumToken = 1;
    } else {
        momentumToken = 0;
    }

    let riskOnFail = typeof args.riskOnFail === 'string' ? args.riskOnFail : '';
    if (!VALID_RISKS.has(riskOnFail)) riskOnFail = 'none';

    const result: Record<string, unknown> = { stat, advantage, positionTag, momentumToken, riskOnFail };

    for (const key of Object.keys(args)) {
        if (FORBIDDEN_KEYS.has(key)) {
            delete result[key];
        }
    }

    return { toolResult: JSON.stringify(result) };
}

const VALID_COMBAT_TIERS = new Set<string>(['minion', 'grunt', 'elite', 'boss', 'legendary']);
const VALID_ARCHETYPES = new Set<string>(['bulwark', 'assassin', 'caster', 'skirmisher', 'brute']);

export function handleInitiateCombatTool(
    toolArguments: string
): InitiateCombatHandlerResult {
    let args: Record<string, unknown> = {};
    try { args = JSON.parse(toolArguments); } catch { /* ignore */ }

    const rawFoes = Array.isArray(args.foes) ? args.foes : [];

    const foes = rawFoes.map((foe: Record<string, unknown>) => {
        const name = typeof foe.name === 'string' && foe.name.trim() ? foe.name.trim() : 'Unknown Foe';
        const rawCount = typeof foe.count === 'number' ? foe.count : 1;
        const count = rawCount >= 1 ? Math.round(rawCount) : 1;
        const rawTier = typeof foe.combatTier === 'string' ? foe.combatTier : '';
        const combatTier: CombatTier = VALID_COMBAT_TIERS.has(rawTier) ? (rawTier as CombatTier) : 'grunt';
        const rawArchetype = typeof foe.archetype === 'string' ? foe.archetype : '';
        const archetype: Archetype = VALID_ARCHETYPES.has(rawArchetype) ? (rawArchetype as Archetype) : 'skirmisher';
        return { name, count, combatTier, archetype };
    });

    if (foes.length === 0) {
        foes.push({ name: 'Unknown Foe', count: 1, combatTier: 'grunt' as CombatTier, archetype: 'skirmisher' as Archetype });
    }

    return { toolResult: JSON.stringify({ foes }), foes };
}

const VALID_OPS = new Set<string>(['grant', 'remove', 'equip']);
const VALID_KINDS = new Set<string>(['weapon', 'armor', 'consumable', 'misc']);
const VALID_QUALITIES = new Set<string>(['common', 'uncommon', 'rare', 'epic', 'legendary']);
const VALID_SCALING_STATS = new Set<string>(['PWR', 'SPD', 'WIL']);
const VALID_RANGES = new Set<string>(['Close', 'Reach', 'Ranged']);
const FORBIDDEN_NUMERIC_KEYS = new Set(['damageDice', 'bonus', 'hp', 'dice', 'ac', 'armorBonus']);

export function handleProposeInventoryTool(
    toolArguments: string
): ProposeInventoryHandlerResult {
    let args: Record<string, unknown> = {};
    try { args = JSON.parse(toolArguments); } catch { /* ignore */ }

    const name = typeof args.name === 'string' && args.name.trim() ? args.name.trim() : 'Unknown Item';

    const rawOp = typeof args.op === 'string' ? args.op : '';
    const op: InventoryProposal['op'] = VALID_OPS.has(rawOp) ? (rawOp as InventoryProposal['op']) : 'grant';

    const rawKind = typeof args.kind === 'string' ? args.kind : '';
    const kind: InventoryProposal['kind'] = VALID_KINDS.has(rawKind) ? (rawKind as InventoryProposal['kind']) : 'misc';

    const rawQuality = typeof args.quality === 'string' ? args.quality : '';
    const quality: ItemDef['rarity'] = VALID_QUALITIES.has(rawQuality) ? (rawQuality as ItemDef['rarity']) : 'common';

    const rawScalingStat = typeof args.scalingStat === 'string' ? args.scalingStat : '';
    const scalingStat: InventoryProposal['scalingStat'] = VALID_SCALING_STATS.has(rawScalingStat) ? (rawScalingStat as InventoryProposal['scalingStat']) : 'PWR';

    const rawRange = typeof args.range === 'string' ? args.range : '';
    const range: InventoryProposal['range'] = VALID_RANGES.has(rawRange) ? (rawRange as InventoryProposal['range']) : 'Close';

    let properties: string[] = [];
    if (Array.isArray(args.properties)) {
        properties = args.properties.filter((p: unknown) => typeof p === 'string').map((p: string) => p.trim()).filter(Boolean);
    }

    const equip = typeof args.equip === 'boolean' ? args.equip : false;
    const description = typeof args.description === 'string' ? args.description : '';

    for (const key of Object.keys(args)) {
        if (FORBIDDEN_NUMERIC_KEYS.has(key)) {
            delete args[key];
        }
    }

    const proposal: InventoryProposal = {
        name,
        op,
        kind,
        quality,
        scalingStat,
        range,
        properties,
        equip,
        description,
    };

    return {
        toolResult: JSON.stringify({ status: 'staged', name, op, kind, quality }),
        proposal,
    };
}

function parseAndRoll(expr: string): { total: number; breakdown: string; isD20: boolean } {
    const match = expr.trim().toLowerCase().match(/^(\d+)d(\d+)([+-]\d+)?$/);
    if (!match) {
        const single = Math.floor(Math.random() * 20) + 1;
        return { total: single, breakdown: `${single}`, isD20: true };
    }
    const count = Math.min(parseInt(match[1], 10), 100);
    const sides = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) rolls.push(Math.floor(Math.random() * sides) + 1);
    const sum = rolls.reduce((a, b) => a + b, 0);
    const total = sum + modifier;
    const breakdown = modifier !== 0 ? `[${rolls.join('+')}]${modifier > 0 ? '+' : ''}${modifier} = ${total}` : `[${rolls.join('+')}] = ${total}`;
    return { total, breakdown, isD20: sides === 20 && count === 1 };
}

export function handleDiceTool(
    toolArguments: string,
    ctx: { diceConfig?: DiceConfig }
): DiceHandlerResult {
    let args: { dice?: string; reason?: string; category?: string } = {};
    try { args = JSON.parse(toolArguments); } catch { /* ignore */ }

    const { total, breakdown, isD20 } = parseAndRoll(args.dice ?? '1d20');
    const tier = isD20 ? mapTier(total, ctx.diceConfig) : null;

    const payload: Record<string, unknown> = {
        dice: args.dice ?? '1d20',
        reason: args.reason ?? '',
        result: total,
        breakdown
    };
    if (tier) payload.tier = tier;

    return { toolResult: JSON.stringify(payload) };
}
