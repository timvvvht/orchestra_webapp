// ACS Agent Config Types
// These types define how agent configs are handled in the ACS system

// ACS Agent Config Summary (from list endpoint)
export interface ACSAgentConfigSummary {
  name: string;
  display_name: string;
  description: string;
  category: string;
  model_id: string;
  provider_name: string;
  featured: boolean;
  public: boolean;
}

// ACS Agent Config Detail (from detail endpoint)
export interface ACSAgentConfigDetail {
  name: string;
  display_name: string;
  description: string;
  category: string;
  ai_config: {
    model_id: string;
    provider_name: string;
    temperature?: number;
    max_tokens?: number;
  };
  tool_groups_count: number;
  featured: boolean;
  public: boolean;
  metadata?: {
    source?: string;
    id?: string;
    publisher?: string;
    created_at?: string;
    updated_at?: string;
  };
}

// ACS Agent Config List Response
export interface ACSAgentConfigListResponse {
  agents: ACSAgentConfigSummary[];
  total: number;
  featured_count: number;
}

// Legacy ACS Agent Config (for backward compatibility)
export interface ACSAgentConfig {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  system_prompt?: string;
  model_id?: string;
  provider_name?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: string[];
  metadata?: {
    tags?: string[];
    capabilities?: string[];
    version?: string;
  };
  created_at?: string;
  updated_at?: string;
  is_public?: boolean;
  user_id?: string;
}

// ACS Agent Config Create Request
export interface ACSCreateAgentConfigRequest {
  name: string;
  description: string;
  system_prompt: string;
  model_id?: string;
  provider_name?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: string[];
  metadata?: {
    tags?: string[];
    capabilities?: string[];
  };
  is_public?: boolean;
}

// ACS Agent Config Update Request
export type ACSUpdateAgentConfigRequest = Partial<ACSCreateAgentConfigRequest>;

// Mapping between Orchestra AgentConfigTS and ACS AgentConfig
export interface AgentConfigMapping {
  orchestraId: string;
  acsId: string;
  acsName: string;
  lastSynced: string;
}

// Agent Config Sync Status
export interface AgentConfigSyncStatus {
  orchestraConfigs: number;
  acsConfigs: number;
  mappedConfigs: number;
  unmappedConfigs: number;
  lastSync: string | null;
}
