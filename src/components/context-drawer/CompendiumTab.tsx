import { useState } from 'react';
import { ItemCompendium } from '../combat/ItemCompendium';
import { SkillCompendium } from '../combat/SkillCompendium';
import { Sword, BookOpen } from 'lucide-react';

export function CompendiumTab() {
    const [subTab, setSubTab] = useState<'items' | 'skills'>('items');

    return (
        <div className="px-4 py-4 space-y-4">
            <p className="text-[9px] text-text-dim/50 uppercase tracking-widest font-bold">
                Campaign Mechanics Compendium
            </p>

            <div className="flex border-b border-border text-xs">
                <button
                    onClick={() => setSubTab('items')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-b-2 font-bold uppercase tracking-wider transition-colors outline-none
                        ${subTab === 'items'
                            ? 'text-terminal border-terminal bg-terminal/5 font-black'
                            : 'text-text-dim border-transparent hover:text-text-primary'
                        }`}
                >
                    <Sword size={12} /> Items
                </button>
                <button
                    onClick={() => setSubTab('skills')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 border-b-2 font-bold uppercase tracking-wider transition-colors outline-none
                        ${subTab === 'skills'
                            ? 'text-terminal border-terminal bg-terminal/5 font-black'
                            : 'text-text-dim border-transparent hover:text-text-primary'
                        }`}
                >
                    <BookOpen size={12} /> Skills
                </button>
            </div>

            <div className="mt-2">
                {subTab === 'items' && <ItemCompendium />}
                {subTab === 'skills' && <SkillCompendium />}
            </div>
        </div>
    );
}
