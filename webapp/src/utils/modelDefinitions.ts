/**
 * Model definitions and utilities for mapping system model IDs to user-friendly names
 */

export interface ModelDefinition {
  id: string;
  name: string;
  shortName: string;
  provider: string;
  description: string;
}

/**
 * Available models with actual system IDs mapped to user-friendly names
 */
export const AVAILABLE_MODELS: ModelDefinition[] = [
  // Anthropic Models
  { 
    id: 'claude-sonnet-4-20250514', 
    name: 'Claude 4 Sonnet', 
    provider: 'Anthropic', 
    description: 'Latest Claude model with enhanced reasoning',
    shortName: 'Claude 4 Sonnet'
  },
  { 
    id: 'claude-opus-4-20250514', 
    name: 'Claude 4 Opus', 
    provider: 'Anthropic', 
    description: 'Most capable Claude model',
    shortName: 'Claude 4 Opus'
  },
  
  // OpenAI Models
  { 
    id: 'o3', 
    name: 'OpenAI O3', 
    provider: 'OpenAI', 
    description: 'Advanced reasoning model',
    shortName: 'O3'
  },
  { 
    id: 'gpt-4.1', 
    name: 'GPT-4.1', 
    provider: 'OpenAI', 
    description: 'Enhanced GPT-4 with improved capabilities',
    shortName: 'GPT-4.1'
  },
  { 
    id: 'o4-mini', 
    name: 'o4-mini', 
    provider: 'OpenAI', 
    description: 'Compact and efficient model',
    shortName: 'o4-mini'
  },
  
  // Google Models
  { 
    id: 'gemini-2.5-pro-preview-05-06', 
    name: 'Gemini 2.5 Pro', 
    provider: 'Google', 
    description: 'Advanced multimodal reasoning',
    shortName: 'Gemini 2.5 Pro'
  },
  { 
    id: 'gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    provider: 'Google', 
    description: 'Fast and efficient responses',
    shortName: 'Gemini 2.5 Flash'
  },

  // Groq Models
  { 
    id: 'moonshotai/kimi-k2-instruct', 
    name: 'Kimi K2', 
    provider: 'Groq', 
    description: 'Advanced reasoning model via Groq infrastructure',
    shortName: 'Kimi K2'
  },
];

/**
 * Get model display information by ID
 */
export const getModelDisplayInfo = (modelId: string | null): ModelDefinition => {
  if (!modelId) {
    return {
      id: 'no-model',
      name: 'No Model Set',
      shortName: 'No Model',
      provider: 'System',
      description: 'No model configured'
    };
  }

  const knownModel = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (knownModel) {
    return knownModel;
  }

  // Handle unknown/custom model IDs gracefully
  return {
    id: modelId,
    name: modelId,
    shortName: modelId,
    provider: 'Custom',
    description: 'Custom model'
  };
};

/**
 * Get user-friendly name for a model ID
 */
export const getModelDisplayName = (modelId: string | null): string => {
  return getModelDisplayInfo(modelId).name;
};

/**
 * Get short display name for a model ID (for compact UI)
 */
export const getModelShortName = (modelId: string | null): string => {
  return getModelDisplayInfo(modelId).shortName;
};

/**
 * Check if a model ID is in our supported list
 */
export const isKnownModel = (modelId: string): boolean => {
  return AVAILABLE_MODELS.some(m => m.id === modelId);
};

/**
 * Get all available model IDs
 */
export const getAvailableModelIds = (): string[] => {
  return AVAILABLE_MODELS.map(m => m.id);
};

/**
 * Get models by provider
 */
export const getModelsByProvider = (provider: string): ModelDefinition[] => {
  return AVAILABLE_MODELS.filter(m => m.provider === provider);
};