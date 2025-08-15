/**
 * Represents the definition of a tool that can be assigned to an agent.
 * This is the structure used within AgentConfigBE.
 */
export interface ToolDefinitionBE {
  name: string;
  // description?: string; // Often, the full description comes from AvailableToolDefinitionBE
  requires_human_approval_to_execute?: boolean;
  // Any other tool-specific configuration parameters can go here
  // e.g., specific_tool_param?: string;
}

/**
 * Represents a group of tools.
 */
export interface ToolGroupBE {
  name: string; // e.g., "custom_enabled_tools", "image_generation_tools"
  group_type: "CUSTOM" | "PRESET"; // Or other relevant types
  init_args: Record<string, any>; // Added this field
  tools: ToolDefinitionBE[];
  // group_description?: string;
}

/**
 * Represents the AI configuration for an agent.
 */
export interface AIConfigBE {
  model_id: string;
  provider_name: string; // e.g., "OpenAI", "Anthropic", "LocalLLM"
  base_url?: string | null;
  api_key_env_var?: string | null; // Environment variable name for the API key
  temperature?: number | null;
  max_tokens?: number | null;
  // Other model-specific parameters:
  // top_p?: number | null;
  // frequency_penalty?: number | null;
  // presence_penalty?: number | null;
}

/**
 * Represents the core agent identity and metadata.
 */
export interface AgentBE {
  id: string; // Agent's unique identifier
  name: string;
  description: string;
  system_prompt: string;
  avatar?: string | null; // URL or path to avatar image
  // version?: number; // For managing updates to agent definitions
  // created_at?: string; // ISO date string
  // updated_at?: string; // ISO date string
}

/**
 * The comprehensive configuration for an agent, as stored in the backend.
 */
export interface AgentConfigBE {
  agent: AgentBE;
  ai_config: AIConfigBE;
  tool_groups: ToolGroupBE[];
  version: string; // Added this field
  // user_id?: string; // If agents are user-specific
  // is_public?: boolean; // If agents can be shared
  // last_edited_by?: string;
}

/**
 * Represents an available tool definition fetched from the backend.
 * This is used to populate the list of tools a user can select from.
 */
export interface AvailableToolDefinitionBE {
  name: string;
  description: string;
  // input_schema?: Record<string, any>; // JSON schema for tool inputs
  // output_schema?: Record<string, any>; // JSON schema for tool outputs
  default_requires_human_approval?: boolean; // Default setting for new assignments
  // category?: string; // e.g., "Data Analysis", "Communication"
}
