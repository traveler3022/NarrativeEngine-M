import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useAppStore, DEFAULT_SURPRISE_TYPES, DEFAULT_SURPRISE_TONES, DEFAULT_ENCOUNTER_TYPES, DEFAULT_ENCOUNTER_TONES, DEFAULT_WORLD_WHO, DEFAULT_WORLD_WHERE, DEFAULT_WORLD_WHY, DEFAULT_WORLD_WHAT } from '../../store/useAppStore';
import { populateEngineTags } from '../../services/chatEngine';
import { Toggle } from './Toggle';
import { NPCPressureInspector } from '../NPCPressureInspector';

export function EnginesTab() {
    const context = useAppStore((s) => s.context);
    const updateContext = useAppStore((s) => s.updateContext);
    const [populatingField, setPopulatingField] = useState<string | null>(null);

    const renderPopulateButton = (fieldKey: string, onPopulate: () => Promise<void>) => (
        <button
            onClick={async () => {
                setPopulatingField(fieldKey);
                await onPopulate();
                setPopulatingField(null);
            }}
            disabled={populatingField !== null}
            className="flex items-center gap-1 text-[12px] md:text-[9px] text-terminal hover:text-text-primary transition-colors disabled:opacity-30 min-h-[36px] md:min-h-0"
            title="AI-populate tags based on campaign lore"
        >
            {populatingField === fieldKey ? <Loader2 size={12} className="animate-spin md:w-[9px] md:h-[9px]" /> : <Sparkles size={12} className="md:w-[9px] md:h-[9px]" />}
            Populate
        </button>
    );

    const surpriseDefaults = { types: DEFAULT_SURPRISE_TYPES, tones: DEFAULT_SURPRISE_TONES, initialDC: 95, dcReduction: 3 };
    const encounterDefaults = { types: DEFAULT_ENCOUNTER_TYPES, tones: DEFAULT_ENCOUNTER_TONES, initialDC: 198, dcReduction: 2 };
    const worldDefaults = { initialDC: 498, dcReduction: 2, who: [] as string[], where: [] as string[], why: [] as string[], what: [] as string[] };

    return (
        <div className="px-4 py-4 space-y-4">
            <p className="text-[9px] text-text-dim/50">
                Configure thresholds and tags for the local narrative engines.
            </p>

            <div className="space-y-4">
                {/* Surprise Engine */}
                <div className="space-y-2">
                    <div className="text-[10px] text-terminal uppercase tracking-wider font-bold border-b border-terminal/20 pb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-terminal" />
                            Surprise Engine
                        </div>
                        <Toggle active={context.surpriseEngineActive ?? true} onChange={() => updateContext({ surpriseEngineActive: !(context.surpriseEngineActive ?? true) })} />
                    </div>
                    <div className="bg-void border border-border p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Initial DC (Default 95)</label>
                                <input
                                    type="number"
                                    value={context.surpriseConfig?.initialDC ?? 95}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateContext({ surpriseConfig: { ...(context.surpriseConfig || surpriseDefaults), initialDC: isNaN(val) ? 95 : val } });
                                    }}
                                    className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">DC Drop per turn (Def 3)</label>
                                <input
                                    type="number"
                                    value={context.surpriseConfig?.dcReduction ?? 3}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateContext({ surpriseConfig: { ...(context.surpriseConfig || surpriseDefaults), dcReduction: isNaN(val) ? 3 : val } });
                                    }}
                                    className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1 flex justify-between items-center">
                                <span>Event Types (Comma Separated)</span>
                                <span className="flex items-center gap-2">
                                    {renderPopulateButton('surpriseTypes', async () => {
                                        const provider = useAppStore.getState().getActiveStoryEndpoint();
                                        if (!provider) return;
                                        const lore = context.loreRaw || context.rulesRaw || '';
                                        const current = context.surpriseConfig?.types || DEFAULT_SURPRISE_TYPES;
                                        const result = await populateEngineTags(provider, lore, current, 'surpriseTypes');
                                        updateContext({ surpriseConfig: { ...(context.surpriseConfig || surpriseDefaults), types: result } });
                                    })}
                                    <span className={(context.surpriseConfig?.types?.length ?? 0) < 3 ? 'text-danger' : 'text-terminal'}>Min 3 tags</span>
                                </span>
                            </label>
                            <textarea
                                value={context.surpriseConfig?.types.join(', ') ?? DEFAULT_SURPRISE_TYPES.join(', ')}
                                onChange={(e) => {
                                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                    updateContext({ surpriseConfig: { ...(context.surpriseConfig || surpriseDefaults), types: tags } });
                                }}
                                placeholder="ENVIRONMENTAL_HAZARD, NPC_ACTION..."
                                rows={3}
                                className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors resize-y min-h-[80px] md:min-h-0"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1 flex justify-between items-center">
                                <span>Event Tones (Comma Separated)</span>
                                <span className="flex items-center gap-2">
                                    {renderPopulateButton('surpriseTones', async () => {
                                        const provider = useAppStore.getState().getActiveStoryEndpoint();
                                        if (!provider) return;
                                        const lore = context.loreRaw || context.rulesRaw || '';
                                        const current = context.surpriseConfig?.tones || DEFAULT_SURPRISE_TONES;
                                        const result = await populateEngineTags(provider, lore, current, 'surpriseTones');
                                        updateContext({ surpriseConfig: { ...(context.surpriseConfig || surpriseDefaults), tones: result } });
                                    })}
                                    <span className={(context.surpriseConfig?.tones?.length ?? 0) < 3 ? 'text-danger' : 'text-terminal'}>Min 3 tags</span>
                                </span>
                            </label>
                            <textarea
                                value={context.surpriseConfig?.tones.join(', ') ?? DEFAULT_SURPRISE_TONES.join(', ')}
                                onChange={(e) => {
                                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                    updateContext({ surpriseConfig: { ...(context.surpriseConfig || surpriseDefaults), tones: tags } });
                                }}
                                placeholder="GOOD, BAD, NEUTRAL..."
                                rows={2}
                                className="w-full bg-surface border border-border px-2 py-1.5 text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors resize-y"
                            />
                        </div>
                    </div>
                </div>

                {/* Encounter Engine */}
                <div className="space-y-2">
                    <div className="text-[10px] text-ember uppercase tracking-wider font-bold border-b border-ember/20 pb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-ember" />
                            Encounter Engine
                        </div>
                        <Toggle active={context.encounterEngineActive ?? true} onChange={() => updateContext({ encounterEngineActive: !(context.encounterEngineActive ?? true) })} />
                    </div>
                    <div className="bg-void border border-border p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Initial DC (Default 198)</label>
                                <input
                                    type="number"
                                    value={context.encounterConfig?.initialDC ?? 198}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateContext({ encounterConfig: { ...(context.encounterConfig || encounterDefaults), initialDC: isNaN(val) ? 198 : val } });
                                    }}
                                    className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">DC Drop per turn (Def 2)</label>
                                <input
                                    type="number"
                                    value={context.encounterConfig?.dcReduction ?? 2}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateContext({ encounterConfig: { ...(context.encounterConfig || encounterDefaults), dcReduction: isNaN(val) ? 2 : val } });
                                    }}
                                    className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1 flex justify-between items-center">
                                <span>Event Types (Comma Separated)</span>
                                <span className="flex items-center gap-2">
                                    {renderPopulateButton('encounterTypes', async () => {
                                        const provider = useAppStore.getState().getActiveStoryEndpoint();
                                        if (!provider) return;
                                        const lore = context.loreRaw || context.rulesRaw || '';
                                        const current = context.encounterConfig?.types || DEFAULT_ENCOUNTER_TYPES;
                                        const result = await populateEngineTags(provider, lore, current, 'encounterTypes');
                                        updateContext({ encounterConfig: { ...(context.encounterConfig || encounterDefaults), types: result } });
                                    })}
                                    <span className={(context.encounterConfig?.types?.length ?? 0) < 3 ? 'text-danger' : 'text-terminal'}>Min 3 tags</span>
                                </span>
                            </label>
                            <textarea
                                value={context.encounterConfig?.types.join(', ') ?? DEFAULT_ENCOUNTER_TYPES.join(', ')}
                                onChange={(e) => {
                                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                    updateContext({ encounterConfig: { ...(context.encounterConfig || encounterDefaults), types: tags } });
                                }}
                                placeholder="AMBUSH, RIVAL_APPEARANCE..."
                                rows={3}
                                className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors resize-y min-h-[80px] md:min-h-0"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1 flex justify-between items-center">
                                <span>Event Tones (Comma Separated)</span>
                                <span className="flex items-center gap-2">
                                    {renderPopulateButton('encounterTones', async () => {
                                        const provider = useAppStore.getState().getActiveStoryEndpoint();
                                        if (!provider) return;
                                        const lore = context.loreRaw || context.rulesRaw || '';
                                        const current = context.encounterConfig?.tones || DEFAULT_ENCOUNTER_TONES;
                                        const result = await populateEngineTags(provider, lore, current, 'encounterTones');
                                        updateContext({ encounterConfig: { ...(context.encounterConfig || encounterDefaults), tones: result } });
                                    })}
                                    <span className={(context.encounterConfig?.tones?.length ?? 0) < 3 ? 'text-danger' : 'text-terminal'}>Min 3 tags</span>
                                </span>
                            </label>
                            <textarea
                                value={context.encounterConfig?.tones.join(', ') ?? DEFAULT_ENCOUNTER_TONES.join(', ')}
                                onChange={(e) => {
                                    const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                    updateContext({ encounterConfig: { ...(context.encounterConfig || encounterDefaults), tones: tags } });
                                }}
                                placeholder="TENSE, DESPERATE, EPICK..."
                                rows={2}
                                className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors resize-y min-h-[80px] md:min-h-0"
                            />
                        </div>
                    </div>
                </div>

                {/* World Engine */}
                <div className="space-y-2">
                    <div className="text-[10px] text-terminal uppercase tracking-wider font-bold border-b border-terminal/20 pb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-terminal" />
                            World Engine
                        </div>
                        <Toggle active={context.worldEngineActive ?? true} onChange={() => updateContext({ worldEngineActive: !(context.worldEngineActive ?? true) })} />
                    </div>
                    <div className="bg-void border border-border p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Initial DC (Default 498)</label>
                                <input
                                    type="number"
                                    value={context.worldEventConfig?.initialDC ?? 498}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateContext({ worldEventConfig: { ...(context.worldEventConfig || worldDefaults), initialDC: isNaN(val) ? 498 : val } });
                                    }}
                                    className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">DC Drop per turn (Def 2)</label>
                                <input
                                    type="number"
                                    value={context.worldEventConfig?.dcReduction ?? 2}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateContext({ worldEventConfig: { ...(context.worldEventConfig || worldDefaults), dcReduction: isNaN(val) ? 2 : val } });
                                    }}
                                    className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                />
                            </div>
                        </div>
                        {(['who', 'where', 'why', 'what'] as const).map((field) => {
                            const defaults: Record<string, string[]> = { who: DEFAULT_WORLD_WHO, where: DEFAULT_WORLD_WHERE, why: DEFAULT_WORLD_WHY, what: DEFAULT_WORLD_WHAT };
                            const labels: Record<string, string> = { who: '"Who" Elements', where: '"Where" Elements', why: '"Why" Elements', what: '"What" Elements' };
                            const placeholders: Record<string, string> = {
                                who: 'a rogue splinter group, a powerful leader...',
                                where: 'in a neighboring city, deep underground...',
                                why: 'to seize power, for brutal vengeance...',
                                what: 'declared hostilities, discovered a relic...',
                            };
                            return (
                                <div key={field} className="flex flex-col mt-2">
                                    <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1 flex justify-between items-center">
                                        <span>{labels[field]} (Comma Separated)</span>
                                        <span className="flex items-center gap-2">
                                            {renderPopulateButton(`world${field.charAt(0).toUpperCase() + field.slice(1)}`, async () => {
                                                const provider = useAppStore.getState().getActiveStoryEndpoint();
                                                if (!provider) return;
                                                const lore = context.loreRaw || context.rulesRaw || '';
                                                const current = context.worldEventConfig?.[field] || defaults[field];
                                                const result = await populateEngineTags(provider, lore, current, `world${field.charAt(0).toUpperCase() + field.slice(1)}` as 'worldWho' | 'worldWhere' | 'worldWhy' | 'worldWhat');
                                                updateContext({ worldEventConfig: { ...(context.worldEventConfig || worldDefaults), [field]: result } });
                                            })}
                                            <span className={(context.worldEventConfig?.[field]?.length ?? 0) < 3 ? 'text-danger' : 'text-terminal'}>Min 3 tags</span>
                                        </span>
                                    </label>
                                    <textarea
                                        value={context.worldEventConfig?.[field]?.join(', ') ?? defaults[field].join(', ')}
                                        onChange={(e) => {
                                            const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                            updateContext({ worldEventConfig: { ...(context.worldEventConfig || worldDefaults), [field]: tags } });
                                        }}
                                        placeholder={placeholders[field]}
                                        rows={2}
                                        className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors resize-y min-h-[80px] md:min-h-0"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Dice Fairness Engine */}
                <div className="space-y-2">
                    <div className="text-[10px] text-ice uppercase tracking-wider font-bold border-b border-ice/20 pb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-ice" />
                            Dice Fairness Engine
                        </div>
                        <Toggle active={context.diceFairnessActive ?? true} onChange={() => updateContext({ diceFairnessActive: !(context.diceFairnessActive ?? true) })} />
                    </div>
                    <div className="bg-void border border-border p-3 space-y-2">
                        {[
                            { label: 'Catastrophe (<=)', key: 'catastrophe' as const, def: 2 },
                            { label: 'Failure (<=)', key: 'failure' as const, def: 6 },
                            { label: 'Success (<=)', key: 'success' as const, def: 15 },
                            { label: 'Triumph (<=)', key: 'triumph' as const, def: 19 },
                            { label: 'Critical (<=)', key: 'crit' as const, def: 20 },
                        ].map(({ label, key, def }) => (
                            <div key={key} className="flex flex-col">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1" title={`Default: ${def} (Min:1, Max:20)`}>
                                    {label}
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    placeholder={`Def: ${def} (Min:1, Max:20)`}
                                    title={`Default: ${def} (Min:1, Max:20)`}
                                    value={context.diceConfig?.[key] ?? ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateContext({
                                            diceConfig: {
                                                ...(context.diceConfig || { catastrophe: 2, failure: 6, success: 15, triumph: 19, crit: 20 }),
                                                [key]: isNaN(val) ? 0 : val
                                            }
                                        });
                                    }}
                                    className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Combat Mode Engine */}
                <div className="space-y-2">
                    <div className="text-[10px] text-red-400 uppercase tracking-wider font-bold border-b border-red-400/20 pb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Combat Mode
                        </div>
                        <Toggle active={context.combatModeActive ?? false} onChange={() => updateContext({ combatModeActive: !(context.combatModeActive ?? false) })} />
                    </div>
                    <div className="bg-void border border-border p-3 space-y-3">
                        <div className="flex flex-col">
                            <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Combat Assistant Model</label>
                            <select
                                value={(() => {
                                    const s = useAppStore.getState();
                                    const preset = s.getActivePreset();
                                    return preset?.auxiliaryAIProviderId || '';
                                })()}
                                onChange={(e) => {
                                    const store = useAppStore.getState();
                                    const preset = store.getActivePreset();
                                    if (preset) {
                                        store.updatePreset(preset.id, { auxiliaryAIProviderId: e.target.value });
                                    }
                                }}
                                className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                            >
                                <option value="">None (use initiate_combat backstop)</option>
                                {useAppStore.getState().settings.providers.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.label || p.modelName}
                                    </option>
                                ))}
                            </select>
                            <span className="text-[8px] text-text-dim/50 mt-0.5 uppercase tracking-widest">MUCH more accurate with a combatAssistant model</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Mook Jitter % (def 10)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={50}
                                    value={Math.round((context.combatConfig?.mookJitterRange ?? 0.10) * 100)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        const fraction = isNaN(val) ? 0.10 : Math.min(0.50, Math.max(0, val / 100));
                                        updateContext({ combatConfig: { ...(context.combatConfig || {}), mookJitterRange: fraction } });
                                    }}
                                    className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Default Weapon Die (def 6)</label>
                                <input
                                    type="number"
                                    min={4}
                                    max={12}
                                    value={context.combatConfig?.defaultWeaponDie ?? 6}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        updateContext({ combatConfig: { ...(context.combatConfig || {}), defaultWeaponDie: isNaN(val) ? 6 : val } });
                                    }}
                                    className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Stat Label Map (JSON, optional)</label>
                            <input
                                type="text"
                                value={context.statLabelMap ? JSON.stringify(context.statLabelMap) : ''}
                                onChange={(e) => {
                                    try {
                                        const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : undefined;
                                        updateContext({ statLabelMap: parsed });
                                    } catch { /* ignore parse errors */ }
                                }}
                                placeholder='{"FOC":"Mana","RES":"Armor"}'
                                className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary placeholder:text-text-dim/40 focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                            />
                        </div>
                        <div className="border-t border-border pt-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider">Auto-detect Combat Entry</label>
                                <Toggle active={context.combatConfig?.combatAutoDetect ?? false} onChange={() => updateContext({ combatConfig: { ...(context.combatConfig || {}), combatAutoDetect: !(context.combatConfig?.combatAutoDetect ?? false) } })} />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider">Confirm on Borderline</label>
                                <Toggle active={context.combatConfig?.confirmOnBorderline ?? true} onChange={() => updateContext({ combatConfig: { ...(context.combatConfig || {}), confirmOnBorderline: !(context.combatConfig?.confirmOnBorderline ?? true) } })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Auto-enter (def 0.75)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        value={context.combatConfig?.autoEnterThreshold ?? 0.75}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            updateContext({ combatConfig: { ...(context.combatConfig || {}), autoEnterThreshold: isNaN(val) ? 0.75 : Math.max(0, Math.min(1, val)) } });
                                        }}
                                        className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Ask threshold (def 0.45)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={1}
                                        step={0.05}
                                        value={context.combatConfig?.askThreshold ?? 0.45}
                                        onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            updateContext({ combatConfig: { ...(context.combatConfig || {}), askThreshold: isNaN(val) ? 0.45 : Math.max(0, Math.min(1, val)) } });
                                        }}
                                        className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-[10px] text-text-dim uppercase tracking-wider mb-1">Extra Combat Keywords (comma-separated)</label>
                                <input
                                    type="text"
                                    value={(context.combatConfig?.combatKeywords ?? []).join(', ')}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const keywords = val.split(',').map(k => k.trim()).filter(Boolean);
                                        updateContext({ combatConfig: { ...(context.combatConfig || {}), combatKeywords: keywords } });
                                    }}
                                    placeholder="draw sword, en garde, battle station..."
                                    className="w-full bg-surface border border-border px-2 py-1.5 text-[16px] md:text-[11px] font-mono text-text-primary placeholder:text-text-dim/40 focus:border-terminal outline-none transition-colors min-h-[44px] md:min-h-0"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <NPCPressureInspector />
        </div>
    );
}
