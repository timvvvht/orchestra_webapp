// ACS Agent Config Service
// Provides agent configuration management via ACS endpoints
// CANONICAL I THINK

import { ACSClient } from '../client';
import type { AgentConfigTS } from '@/types/agentTypes';

export interface ACSAgentConfig {
    id: string;
    name: string;
    description: string;
    system_prompt: string;
    model_id: string;
    provider_name: string;
    temperature: number;
    max_tokens: number;
    tools: string[];
    created_at: string;
    updated_at: string;
    is_public: boolean;
    user_id?: string;
}

export interface ACSAgentConfigListResponse {
    agent_configs: ACSAgentConfig[];
    total: number;
    page: number;
    limit: number;
}

export class ACSAgentConfigService {
    constructor(private client: ACSClient) {}

    /**
     * Get all agent configurations for the current user
     */
    async getAllAgentConfigs(): Promise<ACSAgentConfig[]> {
        try {
            const response = await this.client.get<ACSAgentConfigListResponse>('/agent-configs');
            return response.agent_configs || [];
        } catch (error) {
            console.error('[ACSAgentConfigService] Failed to fetch agent configs:', error);
            throw error;
        }
    }

    /**
     * Get a specific agent configuration by ID
     */
    async getAgentConfig(id: string): Promise<ACSAgentConfig | null> {
        try {
            const response = await this.client.get<ACSAgentConfig>(`/agent-configs/${id}`);
            return response;
        } catch (error) {
            console.error(`[ACSAgentConfigService] Failed to fetch agent config ${id}:`, error);
            return null;
        }
    }

    /**
     * Create a new agent configuration
     */
    async createAgentConfig(config: Omit<ACSAgentConfig, 'id' | 'created_at' | 'updated_at'>): Promise<ACSAgentConfig> {
        try {
            const response = await this.client.post<ACSAgentConfig>('/agent-configs', config);
            return response;
        } catch (error) {
            console.error('[ACSAgentConfigService] Failed to create agent config:', error);
            throw error;
        }
    }

    /**
     * Update an existing agent configuration
     */
    async updateAgentConfig(id: string, updates: Partial<ACSAgentConfig>): Promise<ACSAgentConfig> {
        try {
            const response = await this.client.put<ACSAgentConfig>(`/agent-configs/${id}`, updates);
            return response;
        } catch (error) {
            console.error(`[ACSAgentConfigService] Failed to update agent config ${id}:`, error);
            throw error;
        }
    }

    /**
     * Delete an agent configuration
     */
    async deleteAgentConfig(id: string): Promise<void> {
        try {
            await this.client.delete(`/agent-configs/${id}`);
        } catch (error) {
            console.error(`[ACSAgentConfigService] Failed to delete agent config ${id}:`, error);
            throw error;
        }
    }

    /**
     * Get available tools that can be added to agent configs
     */
    async getAvailableTools(): Promise<string[]> {
        try {
            const response = await this.client.get<{ tools: string[] }>('/tools/available');
            return response.tools || [];
        } catch (error) {
            console.error('[ACSAgentConfigService] Failed to fetch available tools:', error);
            return [];
        }
    }
}

/**
 * Convert ACS agent config to Orchestra AgentConfigTS format
 */
export function convertACSToOrchestra(acsConfig: ACSAgentConfig): AgentConfigTS {
    return {
        id: acsConfig.id,
        user_id: acsConfig.user_id || null,
        version: '1.0',
        agent: {
            name: acsConfig.name,
            description: acsConfig.description,
            system_prompt: acsConfig.system_prompt,
            avatar: null,
            metadata: {
                tags: [],
                skills: acsConfig.tools,
                capabilities: [],
                tips: []
            }
        },
        ai_config: {
            model_id: acsConfig.model_id,
            provider_name: acsConfig.provider_name,
            temperature: acsConfig.temperature,
            max_tokens: acsConfig.max_tokens,
            usage_limits: undefined // ACS doesn't have usage limits yet
        },
        tool_groups:
            acsConfig.tools.length > 0
                ? [
                      {
                          name: 'ACS Tools',
                          group_type: 'CUSTOM' as const,
                          init_args: {},
                          tools: acsConfig.tools.map(toolName => ({
                              name: toolName,
                              description: `ACS tool: ${toolName}`,
                              input_schema: {},
                              requires_human_approval_to_execute: false
                          }))
                      }
                  ]
                : [],
        created_at: acsConfig.created_at,
        updated_at: acsConfig.updated_at,
        is_public: acsConfig.is_public,
        publisher: null,
        publisher_id: null
    };
}

/**
 * Convert Orchestra AgentConfigTS to ACS format
 */
export function convertOrchestraToACS(orchestraConfig: AgentConfigTS): Omit<ACSAgentConfig, 'id' | 'created_at' | 'updated_at'> {
    // Extract tools from tool_groups
    const tools: string[] = [];
    if (orchestraConfig.tool_groups) {
        for (const group of orchestraConfig.tool_groups) {
            for (const tool of group.tools) {
                tools.push(tool.name);
            }
        }
    }

    return {
        name: orchestraConfig.agent.name,
        description: orchestraConfig.agent.description,
        system_prompt: orchestraConfig.agent.system_prompt,
        model_id: orchestraConfig.ai_config.model_id || 'gpt-4o-mini',
        provider_name: orchestraConfig.ai_config.provider_name || 'openai',
        temperature: orchestraConfig.ai_config.temperature || 0.7,
        max_tokens: orchestraConfig.ai_config.max_tokens || 2048,
        tools,
        is_public: orchestraConfig.is_public,
        user_id: orchestraConfig.user_id || undefined
    };
}
