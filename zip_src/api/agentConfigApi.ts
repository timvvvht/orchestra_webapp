// /Users/tim/Code/orchestra/src/api/agentConfigApi.ts
import { invoke } from '@tauri-apps/api/core';
import type { AgentConfigTS, AvailableToolDefinitionTS } from '@/types/agentConfig';

export async function getAllAgentConfigs(): Promise<AgentConfigTS[]> {
    try {
        const configs = await invoke<AgentConfigTS[]>('get_all_agent_configs');
        console.log('[agentConfigApi] Fetched all agent configs:', configs);
        return configs;
    } catch (error) {
        console.error('[agentConfigApi] Error fetching all agent configs:', error);
        throw error;
    }
}

export async function getAgentConfig(id: string): Promise<AgentConfigTS | null> {
    try {
        const config = await invoke<AgentConfigTS | null>('get_agent_config', { id });
        console.log(`[agentConfigApi] Fetched agent config for ID ${id}:`, config);
        return config;
    } catch (error) {
        console.error(`[agentConfigApi] Error fetching agent config for ID ${id}:`, error);
        throw error;
    }
}

export async function getAllAvailableTools(): Promise<AvailableToolDefinitionTS[]> {
    try {
        const tools = await invoke<AvailableToolDefinitionTS[]>('get_all_available_tool_definitions');
        console.log('[agentConfigApi] Fetched all available tools:', tools);
        return tools;
    } catch (error) {
        console.error('[agentConfigApi] Error fetching all available tools:', error);
        throw error;
    }
}

// For creating, the frontend will send the full AgentConfigTS object.
// The backend will decide on the ID (use provided if valid & unique, else generate).
export async function createAgentConfig(configData: AgentConfigTS): Promise<string> {
    try {
        // Ensure essential fields like version are present, similar to backend logic if needed,
        // but Rust side now handles ID logic and default versioning if empty.
        const payloadForRust: AgentConfigTS = {
            ...configData,
            version: configData.version || '1.0', // Frontend can ensure version
            // id will be handled by backend (use if provided and valid, else generate)
        };
        const newId = await invoke<string>('create_agent_config', { configPayload: payloadForRust });
        console.log('[agentConfigApi] Create agent config responded with ID:', newId);
        return newId;
    } catch (error) {
        console.error('[agentConfigApi] Error creating agent config:', error);
        throw error;
    }
}

export async function updateAgentConfig(id: string, configData: AgentConfigTS): Promise<void> {
    try {
        // The Rust command `update_agent_config` expects { id: String, config_payload: AgentConfig }
        // Tauri maps JS camelCase `configPayload` to Rust snake_case `config_payload`.
        await invoke<void>('update_agent_config', { id, configPayload: configData });
        console.log(`[agentConfigApi] Updated agent config for ID ${id}`);
    } catch (error) {
        console.error(`[agentConfigApi] Error updating agent config for ID ${id}:`, error);
        throw error;
    }
}

export async function deleteAgentConfig(id: string): Promise<void> {
    try {
        await invoke<void>('delete_agent_config', { id });
        console.log(`[agentConfigApi] Deleted agent config with ID: ${id}`);
    } catch (error) {
        console.error(`[agentConfigApi] Error deleting agent config with ID ${id}:`, error);
        throw error;
    }
}
