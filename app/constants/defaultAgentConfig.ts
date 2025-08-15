/**
 * Default agent configuration constants
 * Provides fallback values for agent configuration when not specified
 */

export interface DefaultAgentConfig {
  model: string;
  tools: string[];
  specialty: string;
  avatar: string;
  systemPrompt: string;
  temperature: number;
}

export const DEFAULT_AGENT_CONFIG: DefaultAgentConfig = {
  model: 'gpt-4o-mini',
  tools: [
    'cat',
    'tree', 
    'search_files',
    'str_replace_editor',
    'read_files',
    'search_notes'
  ],
  specialty: 'General Assistant',
  avatar: 'assets/robots/robot1.png',
  systemPrompt: 'You are a helpful assistant with access to various tools to help users with their tasks.',
  temperature: 0.7
};