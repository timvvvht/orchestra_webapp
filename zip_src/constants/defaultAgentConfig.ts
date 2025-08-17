/**
 * Default agent configuration used for creating new sessions
 * and as fallback when session metadata is incomplete.
 */

export interface DefaultAgentConfig {
  model: string;
  tools: string[];
  specialty: string;
  avatar: string;
  systemPrompt: string;
  temperature: number;
}

/**
 * Default configuration for new chat sessions.
 * This ensures every session has complete metadata.
 */
export const DEFAULT_AGENT_CONFIG: DefaultAgentConfig = {
  model: 'gpt-4o-mini',
  tools: ['web_search', 'file_operations', 'code_execution'],
  specialty: 'General Assistant',
  avatar: 'assets/robots/robot1.png',
  systemPrompt: 'You are a helpful AI assistant. Be concise, accurate, and helpful in your responses.',
  temperature: 0.7
};

/**
 * Fallback configuration for when session metadata is missing or incomplete.
 * Used by the backend worker to ensure responses can always be generated.
 */
export const FALLBACK_AGENT_CONFIG: DefaultAgentConfig = {
  model: 'gpt-4o-mini',
  tools: [],
  specialty: 'Basic Assistant',
  avatar: 'assets/robots/robot1.png',
  systemPrompt: 'You are a helpful AI assistant.',
  temperature: 0.7
};