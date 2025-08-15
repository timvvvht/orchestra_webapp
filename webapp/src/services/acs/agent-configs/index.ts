// ACS Agent Config Service
// Handles agent configuration management with ACS backend

import { ACSClient } from '../shared/client';
import type {
  ACSAgentConfig,
  ACSAgentConfigSummary,
  ACSAgentConfigDetail,
  ACSAgentConfigListResponse,
  ACSCreateAgentConfigRequest,
  ACSUpdateAgentConfigRequest,
  AgentConfigMapping,
  AgentConfigSyncStatus
} from './types';
import type { AgentConfigTS } from '@/types/agentTypes';

export class ACSAgentConfigService {
  constructor(private client: ACSClient) {}

  /**
   * Get available agent configs from ACS API
   * Uses the new /api/v1/agent-configs/ endpoint
   */
  async getAgentConfigs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
  }): Promise<ACSAgentConfig[]> {
    try {
      console.log('🤖 [ACSAgentConfigService] Fetching agent configs from API...');
      
      // Call the new ACS agent config API endpoint
      const response = await this.client.get<ACSAgentConfigListResponse>('/api/v1/agent-configs/');
      
      console.log('🤖 [ACSAgentConfigService] API response:', response.data);
      
      if (!response.data || !response.data.agents) {
        console.warn('🤖 [ACSAgentConfigService] Invalid API response, using fallback');
        return this.getFallbackConfigs();
      }
      
      // Convert ACS API format to legacy format for backward compatibility
      const legacyConfigs: ACSAgentConfig[] = response.data.agents.map((agent: ACSAgentConfigSummary) => ({
        id: agent.name,
        name: agent.name,
        display_name: agent.display_name,
        description: agent.description,
        model_id: agent.model_id,
        provider_name: agent.provider_name,
        system_prompt: '', // Not included in summary, would need detail call
        temperature: 0.7, // Default values
        max_tokens: 2048,
        tools: [],
        metadata: {
          tags: [agent.category],
          capabilities: []
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: agent.public
      }));
      
      // Apply search filtering if provided
      let filteredConfigs = legacyConfigs;
      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        filteredConfigs = legacyConfigs.filter(config => 
          config.name.toLowerCase().includes(searchLower) ||
          config.description.toLowerCase().includes(searchLower) ||
          (config.display_name && config.display_name.toLowerCase().includes(searchLower))
        );
      }
      
      console.log(`🤖 [ACSAgentConfigService] Loaded ${filteredConfigs.length} agent configs from API`);
      return filteredConfigs;
      
    } catch (error) {
      console.error('🤖 [ACSAgentConfigService] Failed to fetch from API, using fallback:', error);
      return this.getFallbackConfigs();
    }
  }

  /**
   * Get fallback agent configs when API is not available
   */
  private getFallbackConfigs(): ACSAgentConfig[] {
    console.log('🤖 [ACSAgentConfigService] Using fallback agent configurations');
    
    return [
      {
        id: 'general',
        name: 'general',
        display_name: 'General Assistant',
        description: 'Comprehensive AI assistant capable of handling any task',
        system_prompt: 'You are a helpful AI assistant.',
        model_id: 'gpt-4',
        provider_name: 'openai',
        temperature: 0.7,
        max_tokens: 2048,
        tools: [],
        metadata: {
          tags: ['general', 'default'],
          capabilities: ['conversation', 'analysis']
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: true
      }
    ];
  }

  /**
   * Get a specific agent config by ID/name
   * Uses the new /api/v1/agent-configs/{name} endpoint for detailed information
   */
  async getAgentConfig(id: string): Promise<ACSAgentConfig> {
    try {
      console.log(`🤖 [ACSAgentConfigService] Fetching agent config details for: ${id}`);
      
      // Call the new ACS agent config detail API endpoint
      const response = await this.client.get<ACSAgentConfigDetail>(`/api/v1/agent-configs/${id}`);
      
      console.log('🤖 [ACSAgentConfigService] Detail API response:', response.data);
      
      if (!response.data) {
        throw new Error(`Agent config '${id}' not found`);
      }
      
      // Convert detailed API format to legacy format
      const detailConfig: ACSAgentConfig = {
        id: response.data.name,
        name: response.data.name,
        display_name: response.data.display_name,
        description: response.data.description,
        model_id: response.data.ai_config.model_id,
        provider_name: response.data.ai_config.provider_name,
        temperature: response.data.ai_config.temperature || 0.7,
        max_tokens: response.data.ai_config.max_tokens || 2048,
        system_prompt: '', // Not exposed in API for security
        tools: [], // Would need to fetch tool details separately
        metadata: {
          tags: [response.data.category],
          capabilities: [],
          version: '1.0'
        },
        created_at: response.data.metadata?.created_at || new Date().toISOString(),
        updated_at: response.data.metadata?.updated_at || new Date().toISOString(),
        is_public: response.data.public
      };
      
      console.log(`🤖 [ACSAgentConfigService] Loaded detailed config for: ${id}`);
      return detailConfig;
      
    } catch (error) {
      console.error(`🤖 [ACSAgentConfigService] Failed to fetch config '${id}' from API:`, error);
      
      // Fallback to list endpoint
      const configs = await this.getAgentConfigs();
      const config = configs.find(c => c.id === id || c.name === id);
      if (!config) {
        throw new Error(`Agent config with ID '${id}' not found`);
      }
      return config;
    }
  }

  /**
   * Create a new agent config in ACS
   * NOTE: Not supported - ACS uses file-based agent configs
   */
  async createAgentConfig(config: ACSCreateAgentConfigRequest): Promise<ACSAgentConfig> {
    throw new Error('Creating agent configs is not supported. ACS uses file-based agent configurations. Please add YAML files to the ACS server\'s ./agent_configs directory.');
  }

  /**
   * Update an existing agent config in ACS  
   * NOTE: Not supported - ACS uses file-based agent configs
   */
  async updateAgentConfig(id: string, updates: ACSUpdateAgentConfigRequest): Promise<ACSAgentConfig> {
    throw new Error('Updating agent configs is not supported. ACS uses file-based agent configurations. Please modify YAML files in the ACS server\'s ./agent_configs directory.');
  }

  /**
   * Delete an agent config from ACS
   * NOTE: Not supported - ACS uses file-based agent configs
   */
  async deleteAgentConfig(id: string): Promise<void> {
    throw new Error('Deleting agent configs is not supported. ACS uses file-based agent configurations. Please remove YAML files from the ACS server\'s ./agent_configs directory.');
  }

  /**
   * Get featured agent configs
   * Uses the new /api/v1/agent-configs/featured/list endpoint
   */
  async getFeaturedAgentConfigs(): Promise<ACSAgentConfig[]> {
    try {
      console.log('🤖 [ACSAgentConfigService] Fetching featured agent configs...');
      
      const response = await this.client.get<ACSAgentConfigListResponse>('/api/v1/agent-configs/featured/list');
      
      if (!response.data || !response.data.agents) {
        console.warn('🤖 [ACSAgentConfigService] No featured agents found');
        return [];
      }
      
      // Convert to legacy format
      const featuredConfigs: ACSAgentConfig[] = response.data.agents.map((agent: ACSAgentConfigSummary) => ({
        id: agent.name,
        name: agent.name,
        display_name: agent.display_name,
        description: agent.description,
        model_id: agent.model_id,
        provider_name: agent.provider_name,
        system_prompt: '',
        temperature: 0.7,
        max_tokens: 2048,
        tools: [],
        metadata: {
          tags: [agent.category],
          capabilities: []
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: agent.public
      }));
      
      console.log(`🤖 [ACSAgentConfigService] Loaded ${featuredConfigs.length} featured configs`);
      return featuredConfigs;
      
    } catch (error) {
      console.error('🤖 [ACSAgentConfigService] Failed to fetch featured configs:', error);
      return [];
    }
  }

  /**
   * Get agent config categories
   * Uses the new /api/v1/agent-configs/categories/list endpoint
   */
  async getAgentConfigCategories(): Promise<string[]> {
    try {
      console.log('🤖 [ACSAgentConfigService] Fetching agent config categories...');
      
      const response = await this.client.get<{ categories: string[]; total: number }>('/api/v1/agent-configs/categories/list');
      
      if (!response.data || !response.data.categories) {
        console.warn('🤖 [ACSAgentConfigService] No categories found');
        return ['general'];
      }
      
      console.log(`🤖 [ACSAgentConfigService] Loaded ${response.data.categories.length} categories`);
      return response.data.categories;
      
    } catch (error) {
      console.error('🤖 [ACSAgentConfigService] Failed to fetch categories:', error);
      return ['general'];
    }
  }

  /**
   * Get the default agent config name for ACS
   * This is used when no specific agent is selected
   */
  async getDefaultAgentConfigName(): Promise<string> {
    try {
      const configs = await this.getAgentConfigs();
      if (configs.length > 0) {
        // Prefer 'general' if available, otherwise use first config
        const generalConfig = configs.find(c => c.name.toLowerCase() === 'general');
        return generalConfig ? generalConfig.name : configs[0].name;
      }
      return 'general';
    } catch (error) {
      console.warn('[ACSAgentConfigService] Failed to get default agent config, using fallback:', error);
      return 'general';
    }
  }

  /**
   * Map Orchestra AgentConfigTS to ACS format
   */
  mapOrchestraToACS(orchestraConfig: AgentConfigTS): ACSCreateAgentConfigRequest {
    return {
      name: orchestraConfig.agent.name,
      description: orchestraConfig.agent.description,
      system_prompt: orchestraConfig.agent.system_prompt,
      model_id: orchestraConfig.ai_config.model_id,
      provider_name: orchestraConfig.ai_config.provider_name,
      temperature: orchestraConfig.ai_config.temperature,
      max_tokens: orchestraConfig.ai_config.max_tokens,
      tools: this.extractToolNames(orchestraConfig),
      metadata: {
        tags: orchestraConfig.agent.metadata?.tags,
        capabilities: orchestraConfig.agent.metadata?.capabilities,
        version: orchestraConfig.version
      },
      is_public: orchestraConfig.is_public
    };
  }

  /**
   * Map ACS AgentConfig to Orchestra format
   */
  mapACSToOrchestra(acsConfig: ACSAgentConfig): Partial<AgentConfigTS> {
    return {
      id: acsConfig.id,
      version: acsConfig.metadata?.version || '1.0',
      agent: {
        name: acsConfig.name,
        description: acsConfig.description,
        system_prompt: acsConfig.system_prompt,
        avatar: null,
        metadata: {
          tags: acsConfig.metadata?.tags,
          capabilities: acsConfig.metadata?.capabilities
        }
      },
      ai_config: {
        model_id: acsConfig.model_id,
        provider_name: acsConfig.provider_name,
        temperature: acsConfig.temperature,
        max_tokens: acsConfig.max_tokens
      },
      tool_groups: this.mapToolsToGroups(acsConfig.tools),
      created_at: acsConfig.created_at,
      updated_at: acsConfig.updated_at,
      is_public: acsConfig.is_public,
      user_id: acsConfig.user_id
    };
  }

  /**
   * Extract tool names from Orchestra agent config
   */
  private extractToolNames(orchestraConfig: AgentConfigTS): string[] {
    if (!orchestraConfig.tool_groups) return [];
    
    const toolNames: string[] = [];
    for (const group of orchestraConfig.tool_groups) {
      for (const tool of group.tools) {
        toolNames.push(tool.name);
      }
    }
    return toolNames;
  }

  /**
   * Map ACS tool names to Orchestra tool groups
   */
  private mapToolsToGroups(tools?: string[]): any[] {
    if (!tools || tools.length === 0) return [];
    
    return [{
      name: 'ACS Tools',
      group_type: 'CUSTOM' as const,
      init_args: {},
      tools: tools.map(toolName => ({
        name: toolName,
        description: `Tool: ${toolName}`,
        requires_human_approval_to_execute: false
      }))
    }];
  }

  /**
   * Sync agent configs between Orchestra and ACS
   * This is a placeholder for future implementation
   */
  async syncAgentConfigs(): Promise<AgentConfigSyncStatus> {
    // TODO: Implement bidirectional sync between Orchestra and ACS
    // For now, return a placeholder status
    return {
      orchestraConfigs: 0,
      acsConfigs: 0,
      mappedConfigs: 0,
      unmappedConfigs: 0,
      lastSync: null
    };
  }
}

export * from './types';
