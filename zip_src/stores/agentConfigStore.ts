// /Users/tim/Code/orchestra/src/stores/agentConfigStore.ts
import { create } from 'zustand';
import * as AgentConfigService from '@/services/supabase/agentConfigService';
import type {
    AgentConfigTS,
    ToolGroupTS,
    ToolDefinitionTS,
    AvailableToolDefinitionTS,
    AgentObjectTS,
    AiConfigObjectTS,
    StoreNewAgentConfigData,
    StoreUpdateAgentConfigData,
    UsageLimitsTS
} from '@/types/agentTypes';

/**
 * Gets default usage limits based on model ID
 * @param modelId The AI model identifier
 * @returns UsageLimitsTS or undefined for unlimited models
 */
const getDefaultUsageLimits = (modelId: string): UsageLimitsTS | undefined => {
    const modelLower = modelId.toLowerCase();
    
    // Claude 4 Opus - 5 messages per 4 hours
    if (modelLower.includes('claude') && modelLower.includes('opus')) {
        return {
            max_messages_per_window: 5,
            time_window_hours: 4
        };
    }
    
    // Claude 4 Sonnet - 15-20 messages per 4 hours
    if (modelLower.includes('claude') && modelLower.includes('sonnet')) {
        return {
            max_messages_per_window: 15,
            time_window_hours: 4
        };
    }
    
    // Gemini 2.5 and other models - unlimited
    return undefined;
};

interface AgentConfigState {
    agentConfigs: Record<string, AgentConfigTS>;
    availableTools: AvailableToolDefinitionTS[];
    isLoading: boolean;
    error: string | null;
    currentEditingConfigId: string | null;
    currentEditingConfigData: AgentConfigTS | null;

    fetchAgentConfigs: () => Promise<void>;
    fetchAvailableTools: () => Promise<void>;
    getAgentConfigById: (id: string) => AgentConfigTS | undefined;
    getAgentConfigByName: (name: string) => AgentConfigTS | undefined;
    setCurrentEditingConfigId: (id: string | null) => Promise<void>;
    clearCurrentEditingConfig: () => void;
    replaceCurrentEditingConfig: (newConfig: AgentConfigTS) => void;
    updateCurrentEditingConfigField: <K extends keyof AgentConfigTS>(field: K, value: AgentConfigTS[K]) => void;
    updateCurrentEditingNestedField: (path: string, value: any) => void;
    createNewAgentConfig: (configData: Omit<AgentConfigTS, 'id'>) => Promise<string | undefined>;
    saveAgentConfig: () => Promise<void>;

    addToolGroup: () => void;
    removeToolGroup: (groupIndex: number) => void;
    updateToolGroupField: <K extends keyof ToolGroupTS>(groupIndex: number, field: K, value: ToolGroupTS[K]) => void;
    addToolToGroup: (groupIndex: number, toolName: string) => void;
    removeToolFromGroup: (groupIndex: number, toolIndex: number) => void;
    updateToolInGroupField: <K extends keyof ToolDefinitionTS>(groupIndex: number, toolIndex: number, field: K, value: ToolDefinitionTS[K]) => void;
    addInitArgToGroup: (groupIndex: number, key: string, value: string) => void;
    updateInitArgInGroup: (groupIndex: number, oldKey: string, newKey: string, newValue: string) => void;
    removeInitArgFromGroup: (groupIndex: number, key: string) => void;
    updateUsageLimitsForModel: (modelId: string) => void;
}

export const useAgentConfigStore = create<AgentConfigState>((set, get) => ({
    agentConfigs: {},
    availableTools: [],
    isLoading: false,
    error: null,
    currentEditingConfigId: null,
    currentEditingConfigData: null,

    fetchAgentConfigs: async () => {
        set({ isLoading: true, error: null });
        try {
            const configsArray = await AgentConfigService.getAllAgentConfigs();
            const configsMap: Record<string, AgentConfigTS> = {};
            configsArray.forEach(config => {
                if (config.id) {
                    configsMap[config.id] = config;
                }
            });
            set({ agentConfigs: configsMap, isLoading: false });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            set({ error: errorMessage, isLoading: false });
            console.error('Failed to fetch agent configs in store:', errorMessage);
        }
    },

    fetchAvailableTools: async () => {
        set({ isLoading: true, error: null });
        try {
            // TODO: Replace with actual API call when available
            // For now, using mock data
            const tools: AvailableToolDefinitionTS[] = [
                {
                    name: 'file_reader',
                    description: 'Reads content from specified local files.',
                    input_schema: {},
                    group: null
                },
                {
                    name: 'web_search',
                    description: 'Performs a web search using a search engine.',
                    input_schema: {},
                    group: null
                },
                {
                    name: 'code_interpreter',
                    description: 'Executes Python code in a sandboxed environment.',
                    input_schema: {},
                    group: null
                },
                {
                    name: 'database_query',
                    description: 'Queries a connected SQL database.',
                    input_schema: {},
                    group: null
                }
            ];
            set({ availableTools: tools, isLoading: false });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            set({ error: errorMessage, isLoading: false });
            console.error('Failed to fetch available tools in store:', errorMessage);
        }
    },

    getAgentConfigById: (id: string) => {
        return get().agentConfigs[id];
    },

    getAgentConfigByName: (name: string) => {
        const configs = get().agentConfigs;
        return Object.values(configs).find(config => config.agent.name === name);
    },

    setCurrentEditingConfigId: async (id: string | null) => {
        if (id === null) {
            const newConfigTemplate: AgentConfigTS = {
                id: '',
                version: '1.0',
                agent: { name: '', description: '', system_prompt: '', avatar: null },
                ai_config: { model_id: '', provider_name: '', temperature: 0.7, max_tokens: 2048 },
                tool_groups: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_public: false,
                publisher: null,
                publisher_id: null,
                user_id: null
            };
            set({
                currentEditingConfigId: null,
                currentEditingConfigData: newConfigTemplate,
                isLoading: false,
                error: null
            });
        } else {
            set({ isLoading: true, error: null, currentEditingConfigId: id, currentEditingConfigData: null });
            try {
                const config = await AgentConfigService.getAgentConfig(id);
                if (config) {
                    set({ currentEditingConfigData: { ...config }, isLoading: false });
                } else {
                    throw new Error(`Config with ID ${id} not found.`);
                }
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                set({ error: errorMessage, isLoading: false, currentEditingConfigId: null });
            }
        }
    },

    clearCurrentEditingConfig: () => {
        set({ currentEditingConfigId: null, currentEditingConfigData: null, isLoading: false });
    },

    replaceCurrentEditingConfig: newConfig => {
        set(state => {
            if (newConfig && typeof newConfig === 'object' && newConfig.hasOwnProperty('agent') && newConfig.hasOwnProperty('ai_config')) {
                return { currentEditingConfigData: { ...newConfig } };
            }
            console.warn('[agentConfigStore] replaceCurrentEditingConfig received invalid data:', newConfig);
            return {};
        });
    },

    updateCurrentEditingConfigField: <K extends keyof AgentConfigTS>(field: K, value: AgentConfigTS[K]) => {
        set(state => {
            if (!state.currentEditingConfigData) return {};
            return {
                currentEditingConfigData: {
                    ...state.currentEditingConfigData,
                    [field]: value
                }
            };
        });
    },

    updateCurrentEditingNestedField: (path: string, value: any) => {
        set(state => {
            if (!state.currentEditingConfigData) return {};
            const keys = path.split('.');
            let tempConfig = { ...state.currentEditingConfigData };
            let currentLevel: any = tempConfig;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentLevel[keys[i]]) currentLevel[keys[i]] = {};
                currentLevel = currentLevel[keys[i]];
            }
            currentLevel[keys[keys.length - 1]] = value;
            return { currentEditingConfigData: tempConfig };
        });
    },

    createNewAgentConfig: async (configData: Omit<AgentConfigTS, 'id'>) => {
        set({ isLoading: true, error: null });
        try {
            // configData is Omit<AgentConfigTS, 'id'>. The service expects Omit<AgentConfigTS, 'id' | 'createdAt' | 'updatedAt'>.
            // AgentConfigTS from @/types/agentConfig likely doesn't include createdAt/updatedAt in its base for this purpose.
            // The service handles mapping internal `agent` to `agent_details` for DB.
            const newConfig = await AgentConfigService.createAgentConfig(configData);
            await get().fetchAgentConfigs();
            await get().setCurrentEditingConfigId(newConfig.id);
            return newConfig.id;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            set({ error: errorMessage, isLoading: false });
            console.error('Failed to create agent config in store (createNewAgentConfig):', errorMessage);
            return undefined;
        }
    },

    saveAgentConfig: async () => {
        const currentConfig = get().currentEditingConfigData;
        if (!currentConfig) {
            set({ error: 'No configuration data to save.', isLoading: false });
            return;
        }

        set({ isLoading: true, error: null });
        try {
            if (get().currentEditingConfigId && currentConfig.id && get().currentEditingConfigId === currentConfig.id) {
                const payloadForUpdate: Partial<AgentConfigTS> = {
                    version: currentConfig.version,
                    agent: currentConfig.agent, // Service maps this to agent_details
                    ai_config: currentConfig.ai_config,
                    tool_groups: currentConfig.tool_groups
                };
                await AgentConfigService.updateAgentConfig(currentConfig.id, payloadForUpdate);
                await get().fetchAgentConfigs();
                set({ isLoading: false });
            } else {
                // currentConfig is AgentConfigTS. Service expects Omit<AgentConfigTS, 'id' | 'created_at' | 'updated_at'>
                const dataToCreate: Omit<AgentConfigTS, 'id' | 'created_at' | 'updated_at'> = {
                    version: currentConfig.version,
                    agent: currentConfig.agent, // Service maps this to agent_details
                    ai_config: currentConfig.ai_config,
                    tool_groups: currentConfig.tool_groups,
                    user_id: currentConfig.user_id,
                    is_public: currentConfig.is_public,
                    publisher: currentConfig.publisher,
                    publisher_id: currentConfig.publisher_id
                };
                const newConfig = await AgentConfigService.createAgentConfig(dataToCreate);
                await get().fetchAgentConfigs();
                await get().setCurrentEditingConfigId(newConfig.id);
                return;
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            set({ error: errorMessage, isLoading: false });
            console.error('Failed to save agent config in store (saveAgentConfig):', errorMessage);
        }
    },

    // ... (rest of the functions like addToolGroup, removeToolGroup, etc. remain unchanged)
    addToolGroup: () => {
        set(state => {
            if (!state.currentEditingConfigData) return {};
            const newGroup: ToolGroupTS = {
                name: `NewGroup${(state.currentEditingConfigData.tool_groups?.length || 0) + 1}`,
                group_type: 'CUSTOM',
                init_args: {},
                tools: []
            };
            return {
                currentEditingConfigData: {
                    ...state.currentEditingConfigData,
                    tool_groups: [...(state.currentEditingConfigData.tool_groups || []), newGroup]
                }
            };
        });
    },

    removeToolGroup: (groupIndex: number) => {
        set(state => {
            if (!state.currentEditingConfigData || !state.currentEditingConfigData.tool_groups) return {};
            return {
                currentEditingConfigData: {
                    ...state.currentEditingConfigData,
                    tool_groups: state.currentEditingConfigData.tool_groups.filter((_, idx) => idx !== groupIndex)
                }
            };
        });
    },

    updateToolGroupField: <K extends keyof ToolGroupTS>(groupIndex: number, field: K, value: ToolGroupTS[K]) => {
        set(state => {
            if (!state.currentEditingConfigData || !state.currentEditingConfigData.tool_groups) return {};
            const newToolGroups = [...state.currentEditingConfigData.tool_groups];
            if (newToolGroups[groupIndex]) {
                newToolGroups[groupIndex] = { ...newToolGroups[groupIndex], [field]: value };
            }
            return {
                currentEditingConfigData: { ...state.currentEditingConfigData, tool_groups: newToolGroups }
            };
        });
    },

    addToolToGroup: (groupIndex: number, toolName: string) => {
        set(state => {
            if (!state.currentEditingConfigData || !state.currentEditingConfigData.tool_groups) return {};
            const availableTool = state.availableTools.find(t => t.name === toolName);
            if (!availableTool) {
                console.warn(`Tool ${toolName} not found in available tools.`);
                return {};
            }

            const newTool: ToolDefinitionTS = {
                name: availableTool.name,
                requires_human_approval_to_execute: false
            };

            const newToolGroups = [...state.currentEditingConfigData.tool_groups];
            if (newToolGroups[groupIndex]) {
                if (newToolGroups[groupIndex].tools.find(t => t.name === newTool.name)) {
                    console.warn(`Tool ${newTool.name} already exists in group ${newToolGroups[groupIndex].name}`);
                    return {};
                }
                newToolGroups[groupIndex] = {
                    ...newToolGroups[groupIndex],
                    tools: [...newToolGroups[groupIndex].tools, newTool]
                };
            }
            return {
                currentEditingConfigData: { ...state.currentEditingConfigData, tool_groups: newToolGroups }
            };
        });
    },

    removeToolFromGroup: (groupIndex: number, toolIndex: number) => {
        set(state => {
            if (!state.currentEditingConfigData || !state.currentEditingConfigData.tool_groups) return {};
            const newToolGroups = [...state.currentEditingConfigData.tool_groups];
            if (newToolGroups[groupIndex] && newToolGroups[groupIndex].tools) {
                newToolGroups[groupIndex] = {
                    ...newToolGroups[groupIndex],
                    tools: newToolGroups[groupIndex].tools.filter((_, idx) => idx !== toolIndex)
                };
            }
            return {
                currentEditingConfigData: { ...state.currentEditingConfigData, tool_groups: newToolGroups }
            };
        });
    },

    updateToolInGroupField: <K extends keyof ToolDefinitionTS>(groupIndex: number, toolIndex: number, field: K, value: ToolDefinitionTS[K]) => {
        set(state => {
            if (!state.currentEditingConfigData || !state.currentEditingConfigData.tool_groups) return {};
            const newToolGroups = [...state.currentEditingConfigData.tool_groups];
            if (newToolGroups[groupIndex] && newToolGroups[groupIndex].tools && newToolGroups[groupIndex].tools[toolIndex]) {
                const newTools = [...newToolGroups[groupIndex].tools];
                newTools[toolIndex] = { ...newTools[toolIndex], [field]: value };
                newToolGroups[groupIndex] = { ...newToolGroups[groupIndex], tools: newTools };
            }
            return {
                currentEditingConfigData: { ...state.currentEditingConfigData, tool_groups: newToolGroups }
            };
        });
    },

    addInitArgToGroup: (groupIndex: number, key: string, value: string) => {
        set(state => {
            if (!state.currentEditingConfigData || !state.currentEditingConfigData.tool_groups) return {};
            const newToolGroups = [...state.currentEditingConfigData.tool_groups];
            if (newToolGroups[groupIndex]) {
                const currentArgs = newToolGroups[groupIndex].init_args || {};
                if (key in currentArgs && key !== '') {
                    console.warn(`Init arg key "${key}" already exists for group ${newToolGroups[groupIndex].name}.`);
                    return {};
                }
                newToolGroups[groupIndex] = {
                    ...newToolGroups[groupIndex],
                    init_args: { ...currentArgs, [key]: value }
                };
            }
            return { currentEditingConfigData: { ...state.currentEditingConfigData, tool_groups: newToolGroups } };
        });
    },

    updateInitArgInGroup: (groupIndex: number, oldKey: string, newKey: string, newValue: string) => {
        set(state => {
            if (!state.currentEditingConfigData || !state.currentEditingConfigData.tool_groups) return {};
            const newToolGroups = [...state.currentEditingConfigData.tool_groups];
            if (newToolGroups[groupIndex] && newToolGroups[groupIndex].init_args) {
                const currentArgs = { ...newToolGroups[groupIndex].init_args! };
                if (oldKey !== newKey && newKey in currentArgs) {
                    console.warn(`New init arg key "${newKey}" already exists.`);
                    return {};
                }
                delete currentArgs[oldKey];
                currentArgs[newKey] = newValue;
                newToolGroups[groupIndex] = { ...newToolGroups[groupIndex], init_args: currentArgs };
            }
            return { currentEditingConfigData: { ...state.currentEditingConfigData, tool_groups: newToolGroups } };
        });
    },

    removeInitArgFromGroup: (groupIndex: number, key: string) => {
        set(state => {
            if (!state.currentEditingConfigData || !state.currentEditingConfigData.tool_groups) return {};
            const newToolGroups = [...state.currentEditingConfigData.tool_groups];
            if (newToolGroups[groupIndex] && newToolGroups[groupIndex].init_args) {
                const currentArgs = { ...newToolGroups[groupIndex].init_args! };
                delete currentArgs[key];
                newToolGroups[groupIndex] = {
                    ...newToolGroups[groupIndex],
                    init_args: Object.keys(currentArgs).length > 0 ? currentArgs : null
                };
            }
            return { currentEditingConfigData: { ...state.currentEditingConfigData, tool_groups: newToolGroups } };
        });
    },

    updateUsageLimitsForModel: (modelId: string) => {
        set(state => {
            if (!state.currentEditingConfigData) return {};
            
            const defaultLimits = getDefaultUsageLimits(modelId);
            
            return {
                currentEditingConfigData: {
                    ...state.currentEditingConfigData,
                    ai_config: {
                        ...state.currentEditingConfigData.ai_config,
                        usage_limits: defaultLimits
                    }
                }
            };
        });
    }
}));
