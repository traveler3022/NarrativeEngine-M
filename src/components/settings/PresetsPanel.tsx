import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { testConnection } from '../../services/chatEngine';
import type { AIPreset, LLMProvider, ApiFormat, SamplingConfig } from '../../types';
import { detectFormatFromEndpoint } from '../../utils/llmApiHelper';
import { toast } from '../Toast';
import { uid } from '../../utils/uid';
import { SamplingPanel } from '../SamplingPanel';
import { ProviderConfigSection } from './ProviderConfigSection';

type ProviderSection = 'storyAI' | 'summarizerAI' | 'utilityAI' | 'auxiliaryAI';

export function PresetsPanel() {
    const settings = useAppStore(s => s.settings);
    const addPreset = useAppStore(s => s.addPreset);
    const updatePreset = useAppStore(s => s.updatePreset);
    const removePreset = useAppStore(s => s.removePreset);

    const [activeTab, setActiveTab] = useState(settings.presets[0]?.id || '');
    const [testingSection, setTestingSection] = useState<ProviderSection | null>(null);
    const [testResults, setTestResults] = useState<Record<string, { ok: boolean; detail: string } | null>>({});
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        storyAI: true,
        summarizerAI: false,
        utilityAI: false,
        auxiliaryAI: false,
    });

    const toggleSection = (key: string) =>
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

    const activePreset = settings.presets.find((p) => p.id === activeTab) || settings.presets[0];

    const handleTest = async (section: ProviderSection) => {
        if (!activePreset) return;
        const config = activePreset[section];
        if (!config || !config.endpoint) return;

        setTestingSection(section);
        setTestResults(prev => ({ ...prev, [section]: null }));
        const result = await testConnection(config);
        setTestResults(prev => ({ ...prev, [section]: result }));
        setTestingSection(null);
        if (result.ok) {
            toast.success(`${section} connection successful`);
        } else {
            toast.error(`${section} connection failed: ${result.detail}`);
        }
    };

    const handleAddPreset = () => {
        const newPreset: AIPreset = {
            id: uid(),
            name: `Preset ${settings.presets.length + 1}`,
            storyAI: { endpoint: 'http://localhost:11434/v1', apiKey: '', modelName: 'llama3', apiFormat: 'openai' },
            summarizerAI: { endpoint: 'http://localhost:11434/v1', apiKey: '', modelName: 'llama3', apiFormat: 'openai' },
            utilityAI: { endpoint: '', apiKey: '', modelName: '' },
        };
        addPreset(newPreset);
        setActiveTab(newPreset.id);
        setTestResults({});
    };

    const handleRemovePreset = (id: string) => {
        if (settings.presets.length <= 1) return;
        removePreset(id);
        setActiveTab(settings.presets[0]?.id || '');
        setTestResults({});
    };

    const handleUpdatePresetName = (name: string) => {
        if (!activePreset) return;
        updatePreset(activePreset.id, { name });
    };

    const handleUpdateEndpoint = (section: ProviderSection, field: keyof LLMProvider, value: string | boolean | undefined) => {
        if (!activePreset) return;
        const updatedConfig = { ...activePreset[section], [field]: value };
        updatePreset(activePreset.id, { [section]: updatedConfig });
    };

    const handleApiFormatChange = (section: ProviderSection, newFormat: ApiFormat) => {
        if (!activePreset) return;
        const config = activePreset[section] ?? { endpoint: '', apiKey: '', modelName: '' };
        let endpoint = (config.endpoint || '').replace(/\/+$/, '');
        if (newFormat === 'ollama') {
            endpoint = endpoint.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
        } else if (newFormat === 'openai' || newFormat === 'claude') {
            if (endpoint && !endpoint.endsWith('/v1') && /localhost:11434|127\.0\.0\.1:11434/.test(endpoint)) {
                endpoint = endpoint + '/v1';
            }
        }
        const updatedConfig = { ...config, apiFormat: newFormat, endpoint };
        updatePreset(activePreset.id, { [section]: updatedConfig });
    };

    const handleEndpointBlur = (section: ProviderSection, endpoint: string) => {
        if (!activePreset || !endpoint) return;
        const detected = detectFormatFromEndpoint(endpoint);
        if (!detected) return;
        const config = activePreset[section] ?? { endpoint: '', apiKey: '', modelName: '' };
        const currentFormat = config.apiFormat || 'openai';
        if (currentFormat === detected) return;
        let normalizedEndpoint = endpoint.replace(/\/+$/, '');
        if (detected === 'ollama') {
            normalizedEndpoint = normalizedEndpoint.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
        }
        updatePreset(activePreset.id, { [section]: { ...config, apiFormat: detected, endpoint: normalizedEndpoint } });
    };

    return (
        <div className="flex flex-col">
            <div className="flex flex-col mb-8">
                <label className="text-text-dim text-xs uppercase tracking-widest mb-3 font-bold">AI Presets</label>
                <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px">
                    {settings.presets.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => { setActiveTab(p.id); setTestResults({}); }}
                            className={`px-4 py-3 md:py-2 text-xs md:text-[11px] uppercase tracking-wider whitespace-nowrap transition-all border-b-2 -mb-px ${activeTab === p.id
                                ? 'text-terminal border-terminal bg-terminal/5 font-bold'
                                : 'text-text-dim border-transparent hover:text-text-primary'
                            }`}
                        >
                            {p.name}
                        </button>
                    ))}
                    <button
                        onClick={handleAddPreset}
                        className="px-4 py-3 md:py-2 text-text-dim hover:text-terminal transition-colors touch-btn"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {activePreset && (
                <div className="mb-8">
                    <div className="flex gap-2 items-end mb-8">
                        <div className="flex-1">
                            <label className="block text-[10px] text-text-dim uppercase tracking-wider mb-1">Preset Name</label>
                            <input
                                type="text"
                                value={activePreset.name}
                                onChange={(e) => handleUpdatePresetName(e.target.value)}
                                className="w-full bg-void border border-border px-3 py-3 md:py-2 text-[16px] md:text-sm text-text-primary font-bold focus:border-terminal focus:outline-none"
                            />
                        </div>
                        {settings.presets.length > 1 && (
                            <button
                                onClick={() => handleRemovePreset(activePreset.id)}
                                className="bg-void border border-danger/40 text-danger touch-btn hover:bg-danger/10"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>

                    <ProviderConfigSection
                        section="storyAI"
                        title="Story & Logic AI"
                        activePreset={activePreset}
                        isExpanded={expandedSections.storyAI}
                        isTesting={testingSection === 'storyAI'}
                        testResult={testResults.storyAI || null}
                        onToggle={() => toggleSection('storyAI')}
                        onUpdateEndpoint={handleUpdateEndpoint}
                        onApiFormatChange={handleApiFormatChange}
                        onEndpointBlur={handleEndpointBlur}
                        onTest={handleTest}
                    />
                    <ProviderConfigSection
                        section="summarizerAI"
                        title="Summarizer & Context AI"
                        activePreset={activePreset}
                        isExpanded={expandedSections.summarizerAI}
                        isTesting={testingSection === 'summarizerAI'}
                        testResult={testResults.summarizerAI || null}
                        onToggle={() => toggleSection('summarizerAI')}
                        onUpdateEndpoint={handleUpdateEndpoint}
                        onApiFormatChange={handleApiFormatChange}
                        onEndpointBlur={handleEndpointBlur}
                        onTest={handleTest}
                    />
                    <ProviderConfigSection
                        section="utilityAI"
                        title="Utility AI (Context Recommender)"
                        activePreset={activePreset}
                        isExpanded={expandedSections.utilityAI}
                        isTesting={testingSection === 'utilityAI'}
                        testResult={testResults.utilityAI || null}
                        onToggle={() => toggleSection('utilityAI')}
                        onUpdateEndpoint={handleUpdateEndpoint}
                        onApiFormatChange={handleApiFormatChange}
                        onEndpointBlur={handleEndpointBlur}
                        onTest={handleTest}
                    />
                    <ProviderConfigSection
                        section="auxiliaryAI"
                        title="Auxiliary AI (NPC Validator — use Haiku/Flash)"
                        activePreset={activePreset}
                        isExpanded={expandedSections.auxiliaryAI}
                        isTesting={testingSection === 'auxiliaryAI'}
                        testResult={testResults.auxiliaryAI || null}
                        onToggle={() => toggleSection('auxiliaryAI')}
                        onUpdateEndpoint={handleUpdateEndpoint}
                        onApiFormatChange={handleApiFormatChange}
                        onEndpointBlur={handleEndpointBlur}
                        onTest={handleTest}
                    />

                    <SamplingPanel
                        preset={activePreset}
                        onUpdate={(sampling: SamplingConfig) => updatePreset(activePreset.id, { sampling })}
                    />
                </div>
            )}
        </div>
    );
}