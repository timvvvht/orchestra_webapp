import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import type { Json, Tables, TablesInsert, TablesUpdate } from '@/types/supabase'; // Path to your generated Supabase types
import { AgentConfigTS, AiConfigObjectTS, AgentObjectTS, ToolGroupTS, NewAgentConfigServicePayload, UpdateAgentConfigServicePayload } from '@/types/agentTypes';

// DB types from Supabase
type AgentConfig = Tables<'agent_configs'>;
type InsertAgentConfig = TablesInsert<'agent_configs'>;
type UpdateAgentConfig = TablesUpdate<'agent_configs'>;

/**
 * Maps a Supabase AgentConfig to the frontend AgentConfigTS type
 * @param dbConfig The Supabase AgentConfig to map
 * @returns The mapped AgentConfigTS
 */
const mapToAgentConfigTS = (dbConfig: AgentConfig): AgentConfigTS => {
    return {
        id: dbConfig.id,
        version: dbConfig.version,
        ai_config: dbConfig.ai_config as unknown as AiConfigObjectTS,
        agent: dbConfig.agent_details as unknown as AgentObjectTS,
        tool_groups: (dbConfig.tool_groups as unknown as ToolGroupTS[]) || [],
        created_at: dbConfig.created_at,
        updated_at: dbConfig.updated_at,
        user_id: dbConfig.user_id,
        is_public: dbConfig.is_public,
        publisher: dbConfig.publisher,
        publisher_id: dbConfig.publisher_id
    };
};

/**
 * Maps a frontend AgentConfigTS to a Supabase InsertAgentConfig
 * @param configData The frontend AgentConfigTS to map
 * @returns The mapped InsertAgentConfig
 */
const mapToInsertAgentConfig = (configData: Omit<AgentConfigTS, 'id' | 'created_at' | 'updated_at'>): InsertAgentConfig => {
    return {
        id: uuidv4(), // Generate a new UUID
        version: configData.version || '1.0',
        ai_config: configData.ai_config as unknown as Json,
        agent_details: configData.agent as unknown as Json,
        tool_groups: configData.tool_groups && configData.tool_groups.length > 0 ? configData.tool_groups as unknown as Json : null,
        user_id: configData.user_id || null,
        is_public: configData.is_public,
        publisher: configData.publisher || null,
        publisher_id: configData.publisher_id || null
    };
};

/**
 * Maps a frontend AgentConfigTS to a Supabase UpdateAgentConfig
 * @param configData The frontend AgentConfigTS to map
 * @returns The mapped UpdateAgentConfig
 */
const mapToUpdateAgentConfig = (configData: Partial<Omit<AgentConfigTS, 'id' | 'created_at' | 'updated_at'>>): UpdateAgentConfig => {
    const updateData: UpdateAgentConfig = {};

    if (configData.version) updateData.version = configData.version;
    if (configData.ai_config) updateData.ai_config = configData.ai_config as unknown as Json;
    if (configData.agent) updateData.agent_details = configData.agent as unknown as Json;
    if (configData.tool_groups) updateData.tool_groups = configData.tool_groups.length > 0 ? configData.tool_groups as unknown as Json : null;
    if (configData.user_id !== undefined) updateData.user_id = configData.user_id;
    if (configData.is_public !== undefined) updateData.is_public = configData.is_public;
    if (configData.publisher !== undefined) updateData.publisher = configData.publisher;
    if (configData.publisher_id !== undefined) updateData.publisher_id = configData.publisher_id;

    return updateData;
};

/**
 * Creates a new agent configuration in Supabase
 * @param configData The agent configuration data to create
 * @returns The created agent configuration
 */
export const createAgentConfig = async (configData: Omit<AgentConfigTS, 'id' | 'created_at' | 'updated_at'>): Promise<AgentConfigTS> => {
    try {
        const insertData = mapToInsertAgentConfig(configData);

        const { data, error } = await supabase.from('agent_configs').insert(insertData).select().single();

        if (error) throw error;
        if (!data) throw new Error('Failed to create agent configuration');

        console.log('[agentConfigService] Created agent config:', data);
        return mapToAgentConfigTS(data);
    } catch (error) {
        console.error('[agentConfigService] Error creating agent config:', error);
        throw error;
    }
};

/**
 * Gets a public agent configuration by ID from Supabase
 * @param id The ID of the agent configuration to get
 * @returns The agent configuration or null if not found or not public
 */
export const getAgentConfig = async (id: string): Promise<AgentConfigTS | null> => {
    try {
        const { data, error } = await supabase
            .from('agent_configs')
            .select()
            .eq('id', id)
            .eq('is_public', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No rows returned
            throw error;
        }
        if (!data) return null;

        console.log(`[agentConfigService] Fetched public agent config for ID ${id}:`, data);
        return mapToAgentConfigTS(data);
    } catch (error) {
        console.error(`[agentConfigService] Error fetching public agent config for ID ${id}:`, error);
        throw error;
    }
};

/**
 * Gets all public agent configurations from Supabase
 * @returns An array of public agent configurations
 */
export const getAllAgentConfigs = async (): Promise<AgentConfigTS[]> => {
    try {
        const { data, error } = await supabase
            .from('agent_configs')
            .select()
            .eq('is_public', true)
            .order('updated_at', { ascending: false });

        console.log('✅ [agentConfigService] Fetched public agent configs:', data);
        if (error) throw error;
        if (!data) return [];

        return data.map(mapToAgentConfigTS);
    } catch (error) {
        console.error('[agentConfigService] Error fetching public agent configs:', error);
        throw error;
    }
};

/**
 * Gets public agent configurations by publisher from Supabase
 * @param publisherId The ID of the publisher
 * @returns An array of public agent configurations by the publisher
 */
export const getAgentConfigsByPublisher = async (publisherId: string): Promise<AgentConfigTS[]> => {
    try {
        const { data, error } = await supabase
            .from('agent_configs')
            .select()
            .eq('is_public', true)
            .eq('publisher_id', publisherId)
            .order('updated_at', { ascending: false });

        console.log(`✅ [agentConfigService] Fetched public agent configs by publisher ${publisherId}:`, data);
        if (error) throw error;
        if (!data) return [];

        return data.map(mapToAgentConfigTS);
    } catch (error) {
        console.error(`[agentConfigService] Error fetching public agent configs by publisher ${publisherId}:`, error);
        throw error;
    }
};

/**
 * Updates an agent configuration in Supabase
 * @param id The ID of the agent configuration to update
 * @param updates The updates to apply to the agent configuration
 * @returns The updated agent configuration
 */
export const updateAgentConfig = async (id: string, updates: Partial<Omit<AgentConfigTS, 'id' | 'created_at' | 'updated_at'>>): Promise<AgentConfigTS> => {
    try {
        const updateData = mapToUpdateAgentConfig(updates);

        const { data, error } = await supabase.from('agent_configs').update(updateData).eq('id', id).select().single();

        if (error) throw error;
        if (!data) throw new Error(`Failed to update agent configuration with ID ${id}`);

        console.log(`[agentConfigService] Updated agent config for ID ${id}:`, data);
        return mapToAgentConfigTS(data);
    } catch (error) {
        console.error(`[agentConfigService] Error updating agent config for ID ${id}:`, error);
        throw error;
    }
};

/**
 * Deletes an agent configuration from Supabase
 * @param id The ID of the agent configuration to delete
 */
export const deleteAgentConfig = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase.from('agent_configs').delete().eq('id', id);

        if (error) throw error;

        console.log(`[agentConfigService] Deleted agent config with ID: ${id}`);
    } catch (error) {
        console.error(`[agentConfigService] Error deleting agent config with ID ${id}:`, error);
        throw error;
    }
};
