import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { CANON_SKILL_DEFS } from '../../store/slices/skillSlice';
import { uid } from '../../utils/uid';
import { Plus, Trash2, Edit2, Save, Undo2, Database, Flame, Heart, Settings } from 'lucide-react';
import type { SkillDef } from '../../types';

export function SkillCompendium() {
    const skills = useAppStore(s => s.skills || []);
    const setSkillCompendium = useAppStore(s => s.setSkillCompendium);
    const addSkillDef = useAppStore(s => s.addSkillDef);
    const updateSkillDef = useAppStore(s => s.updateSkillDef);
    const removeSkillDef = useAppStore(s => s.removeSkillDef);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [focCost, setFocCost] = useState<number>(2);
    const [type, setType] = useState<'attack' | 'heal' | 'utility'>('attack');
    const [damageDice, setDamageDice] = useState<number | undefined>(6);
    const [healDice, setHealDice] = useState<number | undefined>(undefined);
    const [scaling, setScaling] = useState<'PWR' | 'SPD' | 'WIL'>('WIL');
    const [properties, setProperties] = useState<string[]>([]);
    const [customProp, setCustomProp] = useState('');
    const [range, setRange] = useState<'Close' | 'Reach' | 'Ranged'>('Close');

    const resetForm = () => {
        setName('');
        setDescription('');
        setFocCost(2);
        setType('attack');
        setDamageDice(6);
        setHealDice(undefined);
        setScaling('WIL');
        setProperties([]);
        setCustomProp('');
        setRange('Close');
    };

    const handleCreate = () => {
        const newSkill: SkillDef = {
            id: 'skill_' + uid(),
            name: name.trim() || 'New Skill',
            description: description.trim(),
            focCost,
            type,
            damageDice: type === 'attack' ? (damageDice || 6) : undefined,
            healDice: type === 'heal' ? (healDice || 6) : undefined,
            scaling,
            properties,
            range,
        };
        addSkillDef(newSkill);
        setIsCreating(false);
        resetForm();
    };

    const handleEditStart = (skill: SkillDef) => {
        setEditingId(skill.id);
        setName(skill.name);
        setDescription(skill.description);
        setFocCost(skill.focCost);
        setType(skill.type);
        setDamageDice(skill.damageDice);
        setHealDice(skill.healDice);
        setScaling(skill.scaling);
        setProperties(skill.properties);
        setRange(skill.range);
        setCustomProp('');
    };

    const handleSaveEdit = (id: string) => {
        updateSkillDef(id, {
            name: name.trim() || 'Unnamed Skill',
            description: description.trim(),
            focCost,
            type,
            damageDice: type === 'attack' ? (damageDice || 6) : undefined,
            healDice: type === 'heal' ? (healDice || 6) : undefined,
            scaling,
            properties,
            range,
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

    const handleSeedCanon = () => {
        setSkillCompendium(CANON_SKILL_DEFS);
    };

    const TYPE_ICONS = {
        attack: <Flame size={14} className="text-red-400 shrink-0" />,
        heal: <Heart size={14} className="text-emerald-400 shrink-0" />,
        utility: <Settings size={14} className="text-blue-400 shrink-0" />
    };

    const TYPE_LABELS = {
        attack: 'Attack Technique',
        heal: 'Healing Aid',
        utility: 'Utility / Support'
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs text-text-dim font-bold uppercase tracking-wider">Skill Compendium ({skills.length})</span>
                {!isCreating && editingId === null && (
                    <div className="flex gap-2">
                        {skills.length === 0 && (
                            <button
                                onClick={handleSeedCanon}
                                className="flex items-center gap-1 bg-void border border-border text-terminal text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 hover:border-terminal transition-all rounded animate-pulse"
                            >
                                <Database size={12} /> Seed Canon
                            </button>
                        )}
                        <button
                            onClick={() => { resetForm(); setIsCreating(true); }}
                            className="flex items-center gap-1 bg-terminal text-void text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 hover:brightness-110 transition-all rounded"
                        >
                            <Plus size={12} /> Add Skill
                        </button>
                    </div>
                )}
            </div>

            {(isCreating || editingId !== null) ? (
                <div className="bg-void-lighter border border-border p-4 rounded space-y-3">
                    <div className="text-[11px] text-terminal font-bold uppercase tracking-wider">
                        {isCreating ? 'Create New Skill Def' : 'Edit Skill Def'}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Skill Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Fireball"
                                className="w-full bg-void border border-border px-3 py-2 text-[14px] md:text-sm text-text-primary rounded focus:border-terminal outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Spell effects, conditions, or targets..."
                                rows={2}
                                className="w-full bg-void border border-border px-3 py-2 text-[14px] md:text-sm text-text-primary rounded focus:border-terminal outline-none resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Skill Type</label>
                                <select
                                    value={type}
                                    onChange={e => {
                                        const newType = e.target.value as typeof type;
                                        setType(newType);
                                        if (newType === 'attack') {
                                            setDamageDice(6);
                                            setHealDice(undefined);
                                        } else if (newType === 'heal') {
                                            setDamageDice(undefined);
                                            setHealDice(6);
                                        } else {
                                            setDamageDice(undefined);
                                            setHealDice(undefined);
                                        }
                                    }}
                                    className="w-full bg-void border border-border px-2 py-2 text-xs text-text-primary rounded outline-none focus:border-terminal"
                                >
                                    <option value="attack">Attack</option>
                                    <option value="heal">Heal</option>
                                    <option value="utility">Utility</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">FOC Cost</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={20}
                                    value={focCost}
                                    onChange={e => setFocCost(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full bg-void border border-border px-3 py-2 text-[14px] md:text-sm text-text-primary rounded focus:border-terminal outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Scaling Stat</label>
                                <select
                                    value={scaling}
                                    onChange={e => setScaling(e.target.value as typeof scaling)}
                                    className="w-full bg-void border border-border px-2 py-2 text-xs text-text-primary rounded outline-none focus:border-terminal"
                                >
                                    <option value="WIL">WIL (Mind/Magic)</option>
                                    <option value="PWR">PWR (Strength)</option>
                                    <option value="SPD">SPD (Dex/Agility)</option>
                                </select>
                            </div>

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
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {type === 'attack' && (
                                <div>
                                    <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Damage Die</label>
                                    <select
                                        value={damageDice || 6}
                                        onChange={e => setDamageDice(parseInt(e.target.value) || 6)}
                                        className="w-full bg-void border border-border px-2 py-2 text-xs text-text-primary rounded outline-none focus:border-terminal"
                                    >
                                        <option value={4}>d4</option>
                                        <option value={6}>d6</option>
                                        <option value={8}>d8</option>
                                        <option value={10}>d10</option>
                                        <option value={12}>d12</option>
                                    </select>
                                </div>
                            )}

                            {type === 'heal' && (
                                <div>
                                    <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Heal Die</label>
                                    <select
                                        value={healDice || 6}
                                        onChange={e => setHealDice(parseInt(e.target.value) || 6)}
                                        className="w-full bg-void border border-border px-2 py-2 text-xs text-text-primary rounded outline-none focus:border-terminal"
                                    >
                                        <option value={4}>d4</option>
                                        <option value={6}>d6</option>
                                        <option value={8}>d8</option>
                                        <option value={10}>d10</option>
                                        <option value={12}>d12</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Standard Properties Checkboxes */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] text-text-dim uppercase tracking-wider">Properties</label>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={properties.includes('aoe')}
                                        onChange={() => toggleProperty('aoe')}
                                        className="accent-terminal"
                                    />
                                    <span>AoE (Area)</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={properties.includes('physical')}
                                        onChange={() => toggleProperty('physical')}
                                        className="accent-terminal"
                                    />
                                    <span>Physical Tech</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={properties.includes('holy')}
                                        onChange={() => toggleProperty('holy')}
                                        className="accent-terminal"
                                    />
                                    <span>Holy / Restoration</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={properties.includes('fire')}
                                        onChange={() => toggleProperty('fire')}
                                        className="accent-terminal"
                                    />
                                    <span>Fire / Flame</span>
                                </label>
                            </div>
                        </div>

                        {/* Custom Properties Tags */}
                        <div className="space-y-1.5">
                            <label className="block text-[10px] text-text-dim uppercase tracking-wider">Custom tags</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customProp}
                                    onChange={e => setCustomProp(e.target.value)}
                                    placeholder="e.g. burn, shock, guard"
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

            {/* Skills list */}
            <div className="space-y-2">
                {skills.length === 0 ? (
                    <div className="text-center text-xs text-text-dim/40 italic py-6 bg-void-lighter rounded border border-border border-dashed space-y-3">
                        <p>No custom skills defined. Would you like to seed the canon skill definitions?</p>
                        <button
                            onClick={handleSeedCanon}
                            className="bg-terminal text-void text-[10px] font-bold uppercase tracking-wider px-4 py-2 hover:brightness-110 transition-all rounded"
                        >
                            Seed Canon Skills
                        </button>
                    </div>
                ) : (
                    skills.map(skill => (
                        <div key={skill.id} className="bg-surface border border-border rounded p-3 hover:border-terminal/40 transition-colors space-y-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        {TYPE_ICONS[skill.type] || <Settings size={14} className="text-terminal shrink-0" />}
                                        <span className="text-xs font-bold text-text-primary">{skill.name}</span>
                                    </div>
                                    <span className="inline-block border border-border text-text-dim bg-void-lighter text-[8px] uppercase font-bold tracking-widest px-1 rounded mt-1">
                                        {TYPE_LABELS[skill.type] || skill.type}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEditStart(skill)}
                                        className="text-text-dim hover:text-terminal p-1 transition-colors"
                                        title="Edit Definition"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                    <button
                                        onClick={() => removeSkillDef(skill.id)}
                                        className="text-text-dim hover:text-danger p-1 transition-colors"
                                        title="Delete Definition"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>

                            {skill.description && (
                                <p className="text-[11px] text-text-dim leading-relaxed">{skill.description}</p>
                            )}

                            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-text-secondary bg-void border border-border/40 p-1.5 rounded text-center">
                                <div>
                                    <span className="text-text-dim">FOC:</span> {skill.focCost}
                                </div>
                                <div>
                                    <span className="text-text-dim">STAT:</span> {skill.scaling}
                                </div>
                                <div>
                                    <span className="text-text-dim">RNG:</span> {skill.range}
                                </div>
                                <div>
                                    <span className="text-text-dim">EFFECT:</span> {
                                        skill.type === 'attack' ? `${skill.damageDice ? `1d${skill.damageDice}` : '—'} DMG` :
                                        skill.type === 'heal' ? `${skill.healDice ? `1d${skill.healDice}` : '—'} HEAL` : 'UTILITY'
                                    }
                                </div>
                            </div>

                            {skill.properties.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {skill.properties.map(p => (
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
