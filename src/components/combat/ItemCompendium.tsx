import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { uid } from '../../utils/uid';
import { Plus, Trash2, Edit2, Save, Undo2, AlertTriangle, Shield, Sword } from 'lucide-react';
import type { ItemDef } from '../../types';

export function ItemCompendium() {
    const items = useAppStore(s => s.items || []);
    const addItemDef = useAppStore(s => s.addItemDef);
    const updateItemDef = useAppStore(s => s.updateItemDef);
    const removeItemDef = useAppStore(s => s.removeItemDef);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [damageDice, setDamageDice] = useState<number>(6);
    const [scalingStat, setScalingStat] = useState<'PWR' | 'SPD' | 'WIL'>('PWR');
    const [bonus, setBonus] = useState<number>(0);
    const [range, setRange] = useState<'Close' | 'Reach' | 'Ranged'>('Close');
    const [rarity, setRarity] = useState<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'>('common');
    const [properties, setProperties] = useState<string[]>([]);
    const [customProp, setCustomProp] = useState('');

    const resetForm = () => {
        setName('');
        setDescription('');
        setDamageDice(6);
        setScalingStat('PWR');
        setBonus(0);
        setRange('Close');
        setRarity('common');
        setProperties([]);
        setCustomProp('');
    };

    const handleCreate = () => {
        const newItem: ItemDef = {
            id: 'item_' + uid(),
            name: name.trim() || 'New Item',
            description: description.trim(),
            damageDice,
            scalingStat,
            bonus,
            properties,
            range,
            rarity,
        };
        addItemDef(newItem);
        setIsCreating(false);
        resetForm();
    };

    const handleEditStart = (item: ItemDef) => {
        setEditingId(item.id);
        setName(item.name);
        setDescription(item.description);
        setDamageDice(item.damageDice);
        setScalingStat(item.scalingStat);
        setBonus(item.bonus);
        setRange(item.range);
        setRarity(item.rarity);
        setProperties(item.properties);
        setCustomProp('');
    };

    const handleSaveEdit = (id: string) => {
        updateItemDef(id, {
            name: name.trim() || 'Unnamed Item',
            description: description.trim(),
            damageDice,
            scalingStat,
            bonus,
            properties,
            range,
            rarity,
        });
        setEditingId(null);
        resetForm();
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsCreating(false);
        resetForm();
    };

    const toggleProperty = (prop: string) => {
        if (properties.includes(prop)) {
            setProperties(properties.filter(p => p !== prop));
        } else {
            setProperties([...properties, prop]);
        }
    };

    const addCustomProperty = () => {
        const clean = customProp.trim().toLowerCase();
        if (clean && !properties.includes(clean)) {
            setProperties([...properties, clean]);
            setCustomProp('');
        }
    };

    const removeProperty = (prop: string) => {
        setProperties(properties.filter(p => p !== prop));
    };

    // Budget helper
    const getBudgetLimits = (rarityVal: typeof rarity) => {
        switch (rarityVal) {
            case 'common': return { maxDie: 6, maxBonus: 0, hint: '1d4 or 1d6 (Max die: 6, Max bonus: 0)' };
            case 'uncommon': return { maxDie: 8, maxBonus: 0, hint: '1d8 (Max die: 8, Max bonus: 0)' };
            case 'rare': return { maxDie: 10, maxBonus: 1, hint: '1d10 + 1 (Max die: 10, Max bonus: +1)' };
            case 'epic': return { maxDie: 12, maxBonus: 2, hint: '1d12 + 2 (Max die: 12, Max bonus: +2)' };
            case 'legendary': return { maxDie: 20, maxBonus: 3, hint: '2d10 + 3 or 1d20 + 3 (Max die: 20, Max bonus: +3)' };
        }
    };

    const budget = getBudgetLimits(rarity);
    const isOverBudget = damageDice > budget.maxDie || bonus > budget.maxBonus;

    const RARITY_COLORS = {
        common: 'text-text-dim border-border bg-void-lighter',
        uncommon: 'text-emerald-400 border-emerald-900/30 bg-emerald-950/10',
        rare: 'text-blue-400 border-blue-900/30 bg-blue-950/10',
        epic: 'text-purple-400 border-purple-900/30 bg-purple-950/10',
        legendary: 'text-amber-400 border-amber-900/30 bg-amber-950/10'
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs text-text-dim font-bold uppercase tracking-wider">Item Compendium ({items.length})</span>
                {!isCreating && editingId === null && (
                    <button
                        onClick={() => { resetForm(); setIsCreating(true); }}
                        className="flex items-center gap-1 bg-terminal text-void text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 hover:brightness-110 transition-all rounded"
                    >
                        <Plus size={12} /> Add Item
                    </button>
                )}
            </div>

            {(isCreating || editingId !== null) ? (
                <div className="bg-void-lighter border border-border p-4 rounded space-y-3">
                    <div className="text-[11px] text-terminal font-bold uppercase tracking-wider">
                        {isCreating ? 'Create New Item Def' : 'Edit Item Def'}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Item Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Damascus Greatsword"
                                className="w-full bg-void border border-border px-3 py-2 text-[14px] md:text-sm text-text-primary rounded focus:border-terminal outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Flavour text or mechanical description..."
                                rows={2}
                                className="w-full bg-void border border-border px-3 py-2 text-[14px] md:text-sm text-text-primary rounded focus:border-terminal outline-none resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Rarity</label>
                                <select
                                    value={rarity}
                                    onChange={e => setRarity(e.target.value as typeof rarity)}
                                    className="w-full bg-void border border-border px-2 py-2 text-xs text-text-primary rounded outline-none focus:border-terminal"
                                >
                                    <option value="common">Common</option>
                                    <option value="uncommon">Uncommon</option>
                                    <option value="rare">Rare</option>
                                    <option value="epic">Epic</option>
                                    <option value="legendary">Legendary</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Scaling Stat</label>
                                <select
                                    value={scalingStat}
                                    onChange={e => setScalingStat(e.target.value as typeof scalingStat)}
                                    className="w-full bg-void border border-border px-2 py-2 text-xs text-text-primary rounded outline-none focus:border-terminal"
                                >
                                    <option value="PWR">PWR (Strength)</option>
                                    <option value="SPD">SPD (Finesse/Dex)</option>
                                    <option value="WIL">WIL (Mind/Magic)</option>
                                </select>
                            </div>
                        </div>

                        {/* Budget Hint & Warning */}
                        <div className="bg-void p-3 border border-border rounded text-xs space-y-1.5">
                            <div className="text-text-dim flex justify-between">
                                <span>Budget Hint ({rarity}):</span>
                                <span className="font-mono text-text-primary">{budget.hint}</span>
                            </div>
                            {isOverBudget && (
                                <div className="text-danger flex items-center gap-1 text-[10px] uppercase font-bold">
                                    <AlertTriangle size={12} />
                                    Warning: Item exceeds rarity budget limits!
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Damage Die</label>
                                <select
                                    value={damageDice}
                                    onChange={e => setDamageDice(parseInt(e.target.value) || 4)}
                                    className="w-full bg-void border border-border px-2 py-2 text-xs text-text-primary rounded outline-none focus:border-terminal"
                                >
                                    <option value={4}>d4</option>
                                    <option value={6}>d6</option>
                                    <option value={8}>d8</option>
                                    <option value={10}>d10</option>
                                    <option value={12}>d12</option>
                                    <option value={20}>d20 (Dangerous override)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Bonus (+0 to +3)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={5}
                                    value={bonus}
                                    onChange={e => setBonus(parseInt(e.target.value) || 0)}
                                    className="w-full bg-void border border-border px-3 py-2 text-[14px] md:text-sm text-text-primary rounded focus:border-terminal outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Range</label>
                                <select
                                    value={range}
                                    onChange={e => setRange(e.target.value as typeof range)}
                                    className="w-full bg-void border border-border px-2 py-2 text-xs text-text-primary rounded outline-none focus:border-terminal"
                                >
                                    <option value="Close">Close (Engaged)</option>
                                    <option value="Reach">Reach (Close/Apart)</option>
                                    <option value="Ranged">Ranged (Apart only)</option>
                                </select>
                            </div>
                            <div />
                        </div>

                        {/* Standard Properties Checkboxes */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] text-text-dim uppercase tracking-wider">Properties</label>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={properties.includes('armor')}
                                        onChange={() => toggleProperty('armor')}
                                        className="accent-terminal"
                                    />
                                    <span>Armor (AC Bonus)</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={properties.includes('finesse')}
                                        onChange={() => toggleProperty('finesse')}
                                        className="accent-terminal"
                                    />
                                    <span>Finesse</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={properties.includes('two-handed')}
                                        onChange={() => toggleProperty('two-handed')}
                                        className="accent-terminal"
                                    />
                                    <span>Two-handed</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={properties.includes('versatile')}
                                        onChange={() => toggleProperty('versatile')}
                                        className="accent-terminal"
                                    />
                                    <span>Versatile</span>
                                </label>
                            </div>
                        </div>

                        {/* Custom Properties Tags */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] text-text-dim uppercase tracking-wider">Custom Properties</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customProp}
                                    onChange={e => setCustomProp(e.target.value)}
                                    placeholder="e.g. heavy, fire, cursed"
                                    className="flex-1 bg-void border border-border px-2 py-1 text-xs text-text-primary rounded focus:border-terminal outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={addCustomProperty}
                                    className="bg-terminal text-void text-[10px] uppercase font-bold tracking-wider px-3 rounded hover:brightness-110"
                                >
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {properties.map(prop => (
                                    <span key={prop} className="flex items-center gap-1 bg-surface border border-border px-2 py-0.5 rounded text-[10px] text-text-secondary uppercase">
                                        {prop}
                                        <button
                                            type="button"
                                            onClick={() => removeProperty(prop)}
                                            className="text-danger font-bold hover:brightness-110 ml-0.5"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-border mt-3">
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-1 bg-void border border-border text-text-dim text-[10px] font-bold uppercase tracking-wider px-4 py-2 hover:text-text-primary rounded transition-all"
                        >
                            <Undo2 size={12} /> Cancel
                        </button>
                        <button
                            onClick={() => isCreating ? handleCreate() : handleSaveEdit(editingId!)}
                            className="flex items-center gap-1 bg-terminal text-void text-[10px] font-bold uppercase tracking-wider px-5 py-2 hover:brightness-110 rounded transition-all"
                        >
                            <Save size={12} /> Save Def
                        </button>
                    </div>
                </div>
            ) : null}

            {/* Item list */}
            <div className="space-y-2">
                {items.length === 0 ? (
                    <div className="text-center text-xs text-text-dim/40 italic py-6 bg-void-lighter rounded border border-border border-dashed">
                        No custom items authored yet. Add items to equip onto NPCs.
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="bg-surface border border-border rounded p-3 hover:border-terminal/40 transition-colors space-y-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        {item.properties.includes('armor') ? (
                                            <Shield size={14} className="text-terminal shrink-0" />
                                        ) : (
                                            <Sword size={14} className="text-terminal shrink-0" />
                                        )}
                                        <span className="text-xs font-bold text-text-primary">{item.name}</span>
                                    </div>
                                    <span className={`inline-block border text-[8px] uppercase font-bold tracking-widest px-1 rounded mt-1 ${RARITY_COLORS[item.rarity] || 'text-text-dim border-border'}`}>
                                        {item.rarity}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEditStart(item)}
                                        className="text-text-dim hover:text-terminal p-1 transition-colors"
                                        title="Edit Definition"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                    <button
                                        onClick={() => removeItemDef(item.id)}
                                        className="text-text-dim hover:text-danger p-1 transition-colors"
                                        title="Delete Definition"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>

                            {item.description && (
                                <p className="text-[11px] text-text-dim leading-relaxed">{item.description}</p>
                            )}

                            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono text-text-secondary bg-void border border-border/40 p-1.5 rounded">
                                <div>
                                    <span className="text-text-dim">DMG:</span> 1d{item.damageDice}{item.bonus > 0 ? `+${item.bonus}` : ''}
                                </div>
                                <div>
                                    <span className="text-text-dim">STAT:</span> {item.scalingStat}
                                </div>
                                <div>
                                    <span className="text-text-dim">RNG:</span> {item.range}
                                </div>
                            </div>

                            {item.properties.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {item.properties.map(p => (
                                        <span key={p} className="bg-void border border-border/30 px-1.5 py-0.5 rounded text-[8px] text-text-dim uppercase tracking-wider">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
