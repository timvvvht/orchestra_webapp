import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import type { AgentConfigTS, ToolGroupTS, ToolDefinitionTS } from '@/types/agentConfig';
import { 
    PlusCircle, 
    Trash2, 
    X, 
    Save, 
    Cog, 
    Settings, 
    Wrench, 
    Edit3, 
    FileJson,
    Bot,
    Brain,
    Sparkles,
    Package,
    ChevronLeft,
    Code2,
    Zap,
    Shield,
    Palette,
    MessageSquare,
    Loader2,
    Check,
    AlertCircle,
    Plus,
    Minus,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AgentConfigFormProps {
    configId: string | null;
    onSaveSuccess: () => void;
    onCancel: () => void;
}

const AgentConfigForm: React.FC<AgentConfigFormProps> = ({ configId, onSaveSuccess, onCancel }) => {
    const {
        currentEditingConfigData: config,
        setCurrentEditingConfigId,
        updateCurrentEditingNestedField,
        saveAgentConfig,
        isLoading,
        error: storeError,
        availableTools,
        addToolGroup,
        removeToolGroup,
        updateToolGroupField,
        addToolToGroup,
        removeToolFromGroup,
        updateToolInGroupField,
        addInitArgToGroup,
        updateInitArgInGroup,
        removeInitArgFromGroup,
        replaceCurrentEditingConfig,
    } = useAgentConfigStore();

    const [isRawJsonMode, setIsRawJsonMode] = useState(false);
    const [rawJsonString, setRawJsonString] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState(true);

    const [newInitArgKey, setNewInitArgKey] = useState<Record<number, string>>({});
    const [newInitArgValue, setNewInitArgValue] = useState<Record<number, string>>({});

    useEffect(() => {
        // Defer the config loading to next tick to allow UI to render first
        const timer = setTimeout(() => {
            setCurrentEditingConfigId(configId);
            setIsInitializing(false);
        }, 0);
        
        return () => clearTimeout(timer);
    }, [configId, setCurrentEditingConfigId]);

    // This useEffect synchronizes the `config` from the store TO `rawJsonString`
    // when in raw JSON mode. It runs if `config` changes or if `isRawJsonMode` changes.
    // It should NOT run when `rawJsonString` itself changes due to user input.
    useEffect(() => {
        if (isRawJsonMode && !isInitializing) {
            // Defer JSON operations to prevent blocking
            const timer = setTimeout(() => {
                if (config) {
                    // If config (from store) exists, reflect it in rawJsonString.
                    // Avoids unnecessary updates if the string is already identical (e.g. after a successful parseAndStoreJson).
                    const newJson = JSON.stringify(config, null, 2);
                    if (rawJsonString !== newJson) { // Only update if different to prevent cursor jumps
                        setRawJsonString(newJson);
                    }
                } else {
                    // In raw JSON mode, if config is null (e.g. creating new), set a default template.
                    // This is also set by toggleRawJsonMode, but this ensures it if mode is entered with null config.
                    const defaultStructure = {
                        id: '',
                        version: '1.0',
                        agent: { name: 'New Agent', description: '', system_prompt: '', avatar: '' },
                        ai_config: { model_id: 'gpt-4', provider_name: 'openai', temperature: 0.7, max_tokens: 2048 },
                        tool_groups: []
                    };
                    setRawJsonString(JSON.stringify(defaultStructure, null, 2));
                }
            }, 0);
            
            return () => clearTimeout(timer);
        }
    }, [config, isRawJsonMode, isInitializing]); // CRITICAL: rawJsonString is NOT in dependencies here.

    const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let parsedValue: string | number | null | boolean = value;
        if (type === 'number') parsedValue = value === '' ? null : parseFloat(value);
        else if (type === 'checkbox') parsedValue = (e.target as HTMLInputElement).checked;
        updateCurrentEditingNestedField(name, parsedValue);
    };

    const parseAndStoreJson = useCallback(() => {
        try {
            const parsedConfig = JSON.parse(rawJsonString) as AgentConfigTS;
            if (typeof parsedConfig === 'object' && parsedConfig !== null && 'agent' in parsedConfig && 'ai_config' in parsedConfig) {
                replaceCurrentEditingConfig(parsedConfig);
                setJsonError(null);
                return true;
            } else {
                setJsonError('Invalid AgentConfig structure. Missing \'agent\' or \'ai_config\'.');
                return false;
            }
        } catch (err) {
            setJsonError('Invalid JSON: ' + (err instanceof Error ? err.message : String(err)));
            return false;
        }
    }, [rawJsonString, replaceCurrentEditingConfig]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRawJsonMode) {
            if (!parseAndStoreJson()) {
                console.error("Cannot save, JSON is invalid:", jsonError);
                return;
            }
        }
        const currentConfigInStore = useAgentConfigStore.getState().currentEditingConfigData;
        if (!currentConfigInStore) {
            console.error("No configuration data found to save.");
            return;
        }
        await saveAgentConfig();
        if (!useAgentConfigStore.getState().error) {
            onSaveSuccess();
        }
    };

    useEffect(() => {
        if (configId && !config && !isLoading && !storeError) {
            console.warn(`AgentConfigForm: configId ${configId} provided, but no data loaded.`);
        }
    }, [configId, config, isLoading, storeError]);

    if (isLoading && !config && !isRawJsonMode) {
        return <div className="p-8 ...">Loading...</div>; // Simplified for brevity
    }

    if (!config && !isRawJsonMode) {
        return <div className="p-8 ...">No config data or error...</div>; // Simplified
    }

    const handleAddInitArg = (groupIndex: number) => {
        const key = (newInitArgKey[groupIndex] || '').trim();
        const value = (newInitArgValue[groupIndex] || '').trim();
        if (key) {
            addInitArgToGroup(groupIndex, key, value);
            setNewInitArgKey(prev => ({ ...prev, [groupIndex]: '' }));
            setNewInitArgValue(prev => ({ ...prev, [groupIndex]: '' }));
        }
    };

    const toggleRawJsonMode = () => {
        if (isRawJsonMode) { // Switching from JSON to Form
            if (parseAndStoreJson()) {
                setIsRawJsonMode(false);
            } else {
                alert("JSON is invalid. Please correct it before switching to form view.\nError: " + jsonError);
            }
        } else { // Switching from Form to JSON
            setIsRawJsonMode(true);
            // Defer JSON stringification to prevent UI blocking
            setTimeout(() => {
                if (config) {
                    setRawJsonString(JSON.stringify(config, null, 2));
                } else {
                const defaultStructure = {
                    id: '',
                    version: '1.0',
                    agent: { name: 'New Agent', description: '', system_prompt: '', avatar: '' },
                    ai_config: { model_id: 'gpt-4', provider_name: 'openai', temperature: 0.7, max_tokens: 2048 },
                    tool_groups: []
                };
                    setRawJsonString(JSON.stringify(defaultStructure, null, 2));
                }
                setJsonError(null);
            }, 0);
        }
    };

    const handleRawJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setRawJsonString(e.target.value); // Update local state for textarea immediately
        // Optionally, attempt to parse here for live error feedback, but be mindful of performance
        try {
            JSON.parse(e.target.value);
            setJsonError(null); // Clear error if currently valid
        } catch (err) {
            // Don't necessarily setJsonError here on every keystroke, 
            // as it might be annoying. parseAndStoreJson on blur/save is more critical.
        }
    };

    const handleRawJsonBlur = () => {
        parseAndStoreJson(); // This updates the Zustand store if JSON is valid
    };

    const effectiveError = storeError || jsonError;

    // Show loading skeleton during initialization
    if (isInitializing) {
        return (
            <div className="min-h-screen bg-black">
                {/* Static gradient background */}
                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
                    <div className="absolute top-1/3 -left-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/3 -right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
                </div>

                {/* Loading skeleton */}
                <div className="relative z-10 px-6 md:px-12 py-8">
                    <div className="max-w-5xl mx-auto">
                        {/* Header skeleton */}
                        <div className="mb-8">
                            <div className="w-32 h-6 bg-white/5 rounded-lg mb-6 animate-pulse" />
                            <div className="w-64 h-12 bg-white/5 rounded-lg mb-2 animate-pulse" />
                            <div className="w-96 h-6 bg-white/5 rounded-lg animate-pulse" />
                        </div>

                        {/* Form sections skeleton */}
                        <div className="space-y-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/10 p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse" />
                                        <div>
                                            <div className="w-32 h-6 bg-white/5 rounded-lg mb-2 animate-pulse" />
                                            <div className="w-48 h-4 bg-white/5 rounded-lg animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="w-full h-12 bg-white/5 rounded-xl animate-pulse" />
                                        <div className="w-full h-12 bg-white/5 rounded-xl animate-pulse" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black">
            {/* Static gradient background */}
            <div className="fixed inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
                <div className="absolute top-1/3 -left-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/3 -right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            {/* Main form container */}
            <div className="relative z-10 px-6 md:px-12 py-8">
                <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="group flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="font-light">Back to Agents</span>
                        </button>

                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extralight tracking-tight text-white mb-2">
                                    {(config?.id && configId) || (isRawJsonMode && JSON.parse(rawJsonString || '{}').id) ? 'Edit' : 'Create'} Agent
                                </h1>
                                <p className="text-white/50 font-light">
                                    Design your AI assistant's personality and capabilities
                                </p>
                            </div>

                            {/* Mode toggle */}
                            <button
                                type="button"
                                onClick={toggleRawJsonMode}
                                className={cn(
                                    "group relative px-4 py-2 rounded-xl font-light transition-all",
                                    "border backdrop-blur-sm",
                                    isRawJsonMode 
                                        ? "bg-green-500/10 border-green-500/30 text-green-400"
                                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    {isRawJsonMode ? (
                                        <>
                                            <Edit3 className="w-4 h-4" />
                                            <span>Form View</span>
                                        </>
                                    ) : (
                                        <>
                                            <Code2 className="w-4 h-4" />
                                            <span>JSON View</span>
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Error display */}
                        {effectiveError && (
                            <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                <p className="text-sm text-red-300">{effectiveError}</p>
                            </div>
                        )}
                    </div>

                    {/* Content based on mode */}
                    {isRawJsonMode ? (
                        <div className="relative">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-3xl blur opacity-30" />
                            <div className="relative bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/10 p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center">
                                        <FileJson className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-normal text-white">JSON Configuration</h3>
                                        <p className="text-sm text-white/50">Direct editing for advanced users</p>
                                    </div>
                                </div>
                                
                                <textarea
                                    value={rawJsonString}
                                    onChange={handleRawJsonChange}
                                    onBlur={handleRawJsonBlur}
                                    rows={30}
                                    className={cn(
                                        "w-full bg-black/50 text-white font-mono text-sm p-6 rounded-2xl",
                                        "border transition-all duration-300",
                                        "focus:outline-none focus:ring-2",
                                        jsonError 
                                            ? "border-red-500/50 focus:ring-red-500/50" 
                                            : "border-white/10 focus:border-white/20 focus:ring-white/20"
                                    )}
                                    placeholder="Enter agent configuration in JSON format..."
                                    spellCheck={false}
                                />
                                
                                {jsonError && (
                                    <div className="mt-4 flex items-start gap-2 text-sm text-red-400">
                                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>{jsonError}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : config ? (
                        <div className="space-y-6">
                            {/* Agent Identity Section */}
                            <div className="relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur opacity-20" />
                                <div className="relative bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/10 p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                                            <Bot className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-normal text-white">Agent Identity</h3>
                                            <p className="text-sm text-white/50">Define your assistant's personality</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label htmlFor="agent-name" className="block text-sm font-light text-white/70">
                                                    Name <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    id="agent-name"
                                                    type="text"
                                                    name="agent.name"
                                                    value={config.agent?.name || ''}
                                                    onChange={handleSimpleChange}
                                                    required
                                                    className={cn(
                                                        "w-full px-4 py-3 bg-black/30 rounded-xl",
                                                        "border border-white/10 focus:border-white/30",
                                                        "text-white placeholder-white/30",
                                                        "focus:outline-none focus:ring-2 focus:ring-white/20",
                                                        "transition-all duration-300"
                                                    )}
                                                    placeholder="e.g., Aria, Atlas, Echo"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label htmlFor="agent-avatar" className="block text-sm font-light text-white/70">
                                                    Avatar URL
                                                </label>
                                                <input
                                                    id="agent-avatar"
                                                    type="text"
                                                    name="agent.avatar"
                                                    value={config.agent?.avatar || ''}
                                                    onChange={handleSimpleChange}
                                                    className={cn(
                                                        "w-full px-4 py-3 bg-black/30 rounded-xl",
                                                        "border border-white/10 focus:border-white/30",
                                                        "text-white placeholder-white/30",
                                                        "focus:outline-none focus:ring-2 focus:ring-white/20",
                                                        "transition-all duration-300"
                                                    )}
                                                    placeholder="/avatars/agent.png"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="agent-description" className="block text-sm font-light text-white/70">
                                                Description
                                            </label>
                                            <input
                                                id="agent-description"
                                                type="text"
                                                name="agent.description"
                                                value={config.agent?.description || ''}
                                                onChange={handleSimpleChange}
                                                className={cn(
                                                    "w-full px-4 py-3 bg-black/30 rounded-xl",
                                                    "border border-white/10 focus:border-white/30",
                                                    "text-white placeholder-white/30",
                                                    "focus:outline-none focus:ring-2 focus:ring-white/20",
                                                    "transition-all duration-300"
                                                )}
                                                placeholder="A helpful AI assistant specialized in..."
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="agent-system-prompt" className="block text-sm font-light text-white/70">
                                                System Prompt
                                            </label>
                                            <div className="relative">
                                                <textarea
                                                    id="agent-system-prompt"
                                                    name="agent.system_prompt"
                                                    value={config.agent?.system_prompt || ''}
                                                    onChange={handleSimpleChange}
                                                    rows={6}
                                                    className={cn(
                                                        "w-full px-4 py-3 bg-black/30 rounded-xl",
                                                        "border border-white/10 focus:border-white/30",
                                                        "text-white placeholder-white/30",
                                                        "focus:outline-none focus:ring-2 focus:ring-white/20",
                                                        "transition-all duration-300",
                                                        "resize-none"
                                                    )}
                                                    placeholder="You are a helpful AI assistant. Your role is to..."
                                                />
                                                <div className="absolute bottom-3 right-3 text-xs text-white/30">
                                                    {config.agent?.system_prompt?.length || 0} characters
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* AI Configuration Section */}
                            <div className="relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur opacity-20" />
                                <div className="relative bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/10 p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                                            <Brain className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-normal text-white">AI Configuration</h3>
                                            <p className="text-sm text-white/50">Model and inference settings</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label htmlFor="ai_config.model_id" className="block text-sm font-light text-white/70">
                                                    Model ID <span className="text-red-400">*</span>
                                                </label>
                                                <select
                                                    name="ai_config.model_id"
                                                    id="ai_config.model_id"
                                                    value={config.ai_config?.model_id || ''}
                                                    onChange={handleSimpleChange}
                                                    required
                                                    className={cn(
                                                        "w-full px-4 py-3 bg-black/30 rounded-xl",
                                                        "border border-white/10 focus:border-white/30",
                                                        "text-white",
                                                        "focus:outline-none focus:ring-2 focus:ring-white/20",
                                                        "transition-all duration-300"
                                                    )}
                                                >
                                                    <option value="">Select a model</option>
                                                    <option value="gpt-4">GPT-4</option>
                                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                                    <option value="claude-3-opus">Claude 3 Opus</option>
                                                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                                                    <option value="claude-3-haiku">Claude 3 Haiku</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <label htmlFor="ai_config.provider_name" className="block text-sm font-light text-white/70">
                                                    Provider <span className="text-red-400">*</span>
                                                </label>
                                                <select
                                                    name="ai_config.provider_name"
                                                    id="ai_config.provider_name"
                                                    value={config.ai_config?.provider_name || ''}
                                                    onChange={handleSimpleChange}
                                                    required
                                                    className={cn(
                                                        "w-full px-4 py-3 bg-black/30 rounded-xl",
                                                        "border border-white/10 focus:border-white/30",
                                                        "text-white",
                                                        "focus:outline-none focus:ring-2 focus:ring-white/20",
                                                        "transition-all duration-300"
                                                    )}
                                                >
                                                    <option value="">Select a provider</option>
                                                    <option value="openai">OpenAI</option>
                                                    <option value="anthropic">Anthropic</option>
                                                    <option value="custom">Custom</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label htmlFor="ai_config.base_url" className="block text-sm font-light text-white/70">
                                                Base URL <span className="text-xs text-white/40">(Optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="ai_config.base_url"
                                                id="ai_config.base_url"
                                                value={config.ai_config?.base_url || ''}
                                                onChange={handleSimpleChange}
                                                className={cn(
                                                    "w-full px-4 py-3 bg-black/30 rounded-xl",
                                                    "border border-white/10 focus:border-white/30",
                                                    "text-white placeholder-white/30",
                                                    "focus:outline-none focus:ring-2 focus:ring-white/20",
                                                    "transition-all duration-300"
                                                )}
                                                placeholder="https://api.openai.com/v1"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label htmlFor="ai_config.temperature" className="block text-sm font-light text-white/70">
                                                    Temperature <span className="text-xs text-white/40">(0-2)</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        name="ai_config.temperature"
                                                        id="ai_config.temperature"
                                                        value={config.ai_config?.temperature ?? ''}
                                                        onChange={handleSimpleChange}
                                                        step="0.1"
                                                        min="0"
                                                        max="2"
                                                        className={cn(
                                                            "w-full px-4 py-3 bg-black/30 rounded-xl",
                                                            "border border-white/10 focus:border-white/30",
                                                            "text-white placeholder-white/30",
                                                            "focus:outline-none focus:ring-2 focus:ring-white/20",
                                                            "transition-all duration-300"
                                                        )}
                                                        placeholder="0.7"
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30">
                                                        {config.ai_config?.temperature ? (
                                                            config.ai_config.temperature < 0.5 ? 'Focused' :
                                                            config.ai_config.temperature < 1.0 ? 'Balanced' : 'Creative'
                                                        ) : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label htmlFor="ai_config.max_tokens" className="block text-sm font-light text-white/70">
                                                    Max Tokens
                                                </label>
                                                <input
                                                    type="number"
                                                    name="ai_config.max_tokens"
                                                    id="ai_config.max_tokens"
                                                    value={config.ai_config?.max_tokens ?? ''}
                                                    onChange={handleSimpleChange}
                                                    step="1"
                                                    min="1"
                                                    className={cn(
                                                        "w-full px-4 py-3 bg-black/30 rounded-xl",
                                                        "border border-white/10 focus:border-white/30",
                                                        "text-white placeholder-white/30",
                                                        "focus:outline-none focus:ring-2 focus:ring-white/20",
                                                        "transition-all duration-300"
                                                    )}
                                                    placeholder="2048"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Tool Groups Section */}
                            <div className="relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur opacity-20" />
                                <div className="relative bg-white/[0.02] backdrop-blur-md rounded-3xl border border-white/10 p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                                                <Package className="w-5 h-5 text-green-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-normal text-white">Tool Groups</h3>
                                                <p className="text-sm text-white/50">Configure agent capabilities</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addToolGroup}
                                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all border border-white/10 hover:border-white/20"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span className="font-light">Add Group</span>
                                        </button>
                                    </div>

                                    {(config.tool_groups || []).length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center">
                                                <Package className="w-8 h-8 text-green-400/60" />
                                            </div>
                                            <p className="text-white/50 mb-4">No tool groups configured</p>
                                            <button
                                                type="button"
                                                onClick={addToolGroup}
                                                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white font-light transition-all"
                                            >
                                                Add First Tool Group
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {(config.tool_groups || []).map((group, groupIndex) => (
                                                <div
                                                    key={`group-${groupIndex}`}
                                                    className="relative group"
                                                >
                                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                    <div className="relative bg-black/30 rounded-2xl border border-white/10 p-6">
                                                        {/* Group Header */}
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex-1">
                                                                <input
                                                                    type="text"
                                                                    name={`tool_groups.${groupIndex}.name`}
                                                                    value={group.name || ''}
                                                                    onChange={handleSimpleChange}
                                                                    placeholder={`Tool Group ${groupIndex + 1}`}
                                                                    className="text-lg font-normal text-white bg-transparent border-b border-white/10 focus:border-white/30 outline-none pb-1 transition-colors"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    name={`tool_groups.${groupIndex}.group_type`}
                                                                    value={group.group_type || ''}
                                                                    onChange={handleSimpleChange}
                                                                    placeholder="Group type (optional)"
                                                                    className="text-sm text-white/50 bg-transparent border-none outline-none mt-1"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeToolGroup(groupIndex)}
                                                                className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        {/* Init Args */}
                                                        {(Object.keys(group.init_args || {}).length > 0 || true) && (
                                                            <div className="mb-4">
                                                                <h5 className="text-sm font-light text-white/70 mb-3">Initialization Arguments</h5>
                                                                <div className="space-y-2">
                                                                    {Object.entries(group.init_args || {}).map(([key, value]) => (
                                                                        <div key={`group-${groupIndex}-initarg-${key}`} className="flex items-center gap-2 p-2 bg-black/20 rounded-lg">
                                                                            <input
                                                                                type="text"
                                                                                defaultValue={key}
                                                                                onBlur={(e) => {
                                                                                    const newKey = e.target.value.trim();
                                                                                    if (newKey && newKey !== key) {
                                                                                        updateInitArgInGroup(groupIndex, key, newKey, value as string);
                                                                                    } else if (!newKey && key) {
                                                                                        e.target.value = key;
                                                                                    }
                                                                                }}
                                                                                className="flex-1 px-3 py-1.5 bg-black/30 rounded-lg border border-white/10 text-white text-sm focus:outline-none focus:border-white/20"
                                                                                placeholder="Key"
                                                                            />
                                                                            <span className="text-white/30">:</span>
                                                                            <input
                                                                                type="text"
                                                                                value={value as string}
                                                                                onChange={(e) => updateInitArgInGroup(groupIndex, key, key, e.target.value)}
                                                                                className="flex-1 px-3 py-1.5 bg-black/30 rounded-lg border border-white/10 text-white text-sm focus:outline-none focus:border-white/20"
                                                                                placeholder="Value"
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeInitArgFromGroup(groupIndex, key)}
                                                                                className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                                            >
                                                                                <X className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <div className="flex gap-2 mt-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="New key"
                                                                            value={newInitArgKey[groupIndex] || ''}
                                                                            onChange={(e) => setNewInitArgKey(prev => ({ ...prev, [groupIndex]: e.target.value }))}
                                                                            className="flex-1 px-3 py-1.5 bg-black/30 rounded-lg border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/20"
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="New value"
                                                                            value={newInitArgValue[groupIndex] || ''}
                                                                            onChange={(e) => setNewInitArgValue(prev => ({ ...prev, [groupIndex]: e.target.value }))}
                                                                            className="flex-1 px-3 py-1.5 bg-black/30 rounded-lg border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/20"
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleAddInitArg(groupIndex)}
                                                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white text-sm transition-all border border-white/10 hover:border-white/20"
                                                                        >
                                                                            Add
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Tools in Group */}
                                                        <div>
                                                            <h5 className="text-sm font-light text-white/70 mb-3">Tools</h5>
                                                            {(group.tools || []).length === 0 ? (
                                                                <div className="text-center py-6 bg-black/20 rounded-lg border border-white/5">
                                                                    <p className="text-white/40 text-sm">No tools added yet</p>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2 mb-3">
                                                                    {(group.tools || []).map((tool, toolIndex) => (
                                                                        <div key={`group-${groupIndex}-tool-${toolIndex}`} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center">
                                                                                    <Wrench className="w-4 h-4 text-green-400/60" />
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-white text-sm">{tool.name}</span>
                                                                                    <label className="flex items-center gap-2 mt-1">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            name={`tool_groups.${groupIndex}.tools.${toolIndex}.requires_human_approval_to_execute`}
                                                                                            checked={!!tool.requires_human_approval_to_execute}
                                                                                            onChange={handleSimpleChange}
                                                                                            className="w-3 h-3 rounded border-white/20 bg-black/30 text-green-400 focus:ring-green-400/20"
                                                                                        />
                                                                                        <span className="text-xs text-white/40">Requires approval</span>
                                                                                    </label>
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeToolFromGroup(groupIndex, toolIndex)}
                                                                                className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                                            >
                                                                                <X className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Add tool dropdown */}
                                                            <div className="relative group">
                                                                <select
                                                                    onChange={(e) => {
                                                                        if (e.target.value) {
                                                                            addToolToGroup(groupIndex, e.target.value);
                                                                            e.target.value = "";
                                                                        }
                                                                    }}
                                                                    value=""
                                                                    className="w-full px-4 py-3 bg-gradient-to-r from-white/[0.02] to-white/[0.04] rounded-xl border border-white/10 text-white text-sm focus:outline-none focus:border-green-400/50 focus:bg-white/[0.05] cursor-pointer transition-all appearance-none pr-10 hover:border-white/20 hover:bg-white/[0.06]"
                                                                >
                                                                    <option value="" disabled className="bg-gray-900 text-white/60">
                                                                        {availableTools.filter(at => !(group.tools || []).find(t => t.name === at.name)).length > 0 
                                                                            ? "Add a tool to this group..." 
                                                                            : "No more tools available"}
                                                                    </option>
                                                                    {availableTools
                                                                        .filter(at => !(group.tools || []).find(t => t.name === at.name))
                                                                        .map(at => (
                                                                            <option key={at.name} value={at.name} className="bg-gray-900 text-white py-2">
                                                                                {at.name}
                                                                            </option>
                                                                        ))
                                                                    }
                                                                </select>
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                    <Plus className="w-4 h-4 text-white/40 group-hover:text-green-400/60 transition-colors" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Add another group button at the bottom */}
                                    {(config.tool_groups || []).length > 0 && (
                                        <div className="mt-6 text-center">
                                            <button
                                                type="button"
                                                onClick={addToolGroup}
                                                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-white/[0.02] hover:bg-white/[0.05] text-white/50 hover:text-white/70 rounded-lg transition-all border border-white/5 hover:border-white/10"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>Add Another Group</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Action Buttons */}
                    <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isLoading}
                            className="px-6 py-3 text-white/70 hover:text-white font-light transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isLoading || (isRawJsonMode && !!jsonError)}
                            className={cn(
                                "relative group px-8 py-3 rounded-2xl font-light transition-all",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                isLoading || (isRawJsonMode && !!jsonError)
                                    ? "bg-white/5 text-white/50"
                                    : "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                            )}
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Saving...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Save className="w-5 h-5" />
                                    <span>Save Configuration</span>
                                </div>
                            )}
                            
                            {/* Glow effect on hover */}
                            {!isLoading && !jsonError && (
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgentConfigForm;
