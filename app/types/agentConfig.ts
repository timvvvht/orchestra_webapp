// /Users/tim/Code/orchestra/src/types/agentConfig.ts

export interface AiConfigTS {
    model_id: string;
    provider_name: string;
    base_url?: string | null; // Reflect Option<String>
    temperature?: number | null;
    max_tokens?: number | null;
}

// Usage statistics for the agent
export interface AgentUsageStatsTS {
    total_tokens?: number;
    total_invocations?: number;
    average_response_time_ms?: number;
}

// Version history entry
export interface AgentVersionHistoryTS {
    version: string;
    changes: string;
    updated_at: string;
}

// Metadata containing additional agent information
export interface AgentMetadataTS {
    tags?: string[];
    skills?: string[];
    capabilities?: string[];
    tips?: string[];
    usage?: AgentUsageStatsTS;
    version_history?: AgentVersionHistoryTS[];
}

// Updated to match Supabase schema
export interface AgentDetailsTS {
    name: string;
    description: string;
    system_prompt: string;
    avatar?: string | null;
    metadata?: AgentMetadataTS; // New field matching Supabase
}

export interface ToolDefinitionTS { // Mirrors Rust's agent_config::ToolDefinition
    name: string;
    requires_human_approval_to_execute: boolean;
    // Description and schema are NOT part of this specific config structure,
    // they come from AvailableToolDefinitionTS
}

export interface ToolGroupTS { // Mirrors Rust's agent_config::ToolGroup
    name: string;
    group_type: string; // 'type' in YAML, 'group_type' in Rust
    init_args?: Record<string, string> | null; // Assuming string-to-string for UI.
                                                // If complex, use Record<string, any> or specific types.
    tools: ToolDefinitionTS[];
}

export interface AgentConfigTS { // Mirrors Rust's agent_config::AgentConfig
    id: string; // In Rust, id is Option<String> but populated. Frontend will always expect it.
    version: string;
    ai_config: AiConfigTS;
    agent: AgentDetailsTS; // Note: This is 'agent_details' in Supabase but 'agent' in our codebase
    tool_groups: ToolGroupTS[];
    // Additional fields from Supabase
    user_id?: string | null;
    created_at?: string; // ISO timestamp
    updated_at?: string; // ISO timestamp
    // display_name and file_path are Rust-side helpers, UI might not need them directly
    // or can derive display_name from agent.name.
}

// For available tools, mirrors Rust's AvailableToolDefinitionBE
export interface AvailableToolDefinitionTS {
    name: string;
    description: string;
    input_schema: any; // or a more specific type if you have one for JSON schema
    group?: string | null;
    // Note: Rust AvailableToolDefinitionBE had 'default_requires_human_approval'.
    // The UI might just use a default for this when adding a new tool.
    // Or, if this info comes from Rust's AvailableToolDefinitionBE, add it here.
    // For now, assuming the agent config's ToolDefinitionTS.requires_human_approval_to_execute
    // is the source of truth once a tool is added to an agent.
}
