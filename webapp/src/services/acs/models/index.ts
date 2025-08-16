import { ACSClient } from '../shared/client';
import type {
  StoreAPIKeyRequest,
  APIKeyResponse,
  APIKeyProviderResponse,
  RequestOptions,
  APIResponse
} from '../shared/types';
import { ACS_ENDPOINTS, MODEL_PROVIDERS } from '../shared/types';

/**
 * Model API key management service
 * Handles secure storage and management of AI model API keys
 */
export class ACSModelService {
  constructor(private client: ACSClient) {}

  /**
   * Store an API key for a model provider
   */
  async storeAPIKey(
    providerName: string,
    apiKey: string,
    keyAlias?: string,
    options?: RequestOptions
  ): Promise<APIResponse<APIKeyResponse>> {
    const request: StoreAPIKeyRequest = {
      provider_name: providerName,
      api_key: apiKey,
      key_alias: keyAlias
    };

    return this.client.post<APIKeyResponse>(
      ACS_ENDPOINTS.MODEL_KEYS_STORE,
      request,
      options
    );
  }

  /**
   * List all stored API key providers (without revealing actual keys)
   */
  async listAPIKeys(
    options?: RequestOptions
  ): Promise<APIResponse<APIKeyProviderResponse[]>> {
    return this.client.get<APIKeyProviderResponse[]>(
      ACS_ENDPOINTS.MODEL_KEYS_LIST,
      options
    );
  }

  /**
   * Delete an API key for a specific provider
   */
  async deleteAPIKey(
    providerName: string,
    options?: RequestOptions
  ): Promise<APIResponse<APIKeyResponse>> {
    const endpoint = ACSClient.replacePath(ACS_ENDPOINTS.MODEL_KEYS_DELETE, {
      provider_name: providerName
    });

    return this.client.delete<APIKeyResponse>(endpoint, options);
  }

  /**
   * Test if an API key exists for a provider
   */
  async testAPIKey(
    providerName: string,
    options?: RequestOptions
  ): Promise<APIResponse<any>> {
    const endpoint = ACSClient.replacePath(ACS_ENDPOINTS.MODEL_KEYS_TEST, {
      provider_name: providerName
    });

    return this.client.get(endpoint, options);
  }

  /**
   * Store OpenAI API key
   */
  async storeOpenAIKey(
    apiKey: string,
    keyAlias?: string,
    options?: RequestOptions
  ): Promise<APIResponse<APIKeyResponse>> {
    return this.storeAPIKey(MODEL_PROVIDERS.OPENAI, apiKey, keyAlias, options);
  }

  /**
   * Store Anthropic API key
   */
  async storeAnthropicKey(
    apiKey: string,
    keyAlias?: string,
    options?: RequestOptions
  ): Promise<APIResponse<APIKeyResponse>> {
    return this.storeAPIKey(MODEL_PROVIDERS.ANTHROPIC, apiKey, keyAlias, options);
  }

  /**
   * Store Google API key
   */
  async storeGoogleKey(
    apiKey: string,
    keyAlias?: string,
    options?: RequestOptions
  ): Promise<APIResponse<APIKeyResponse>> {
    return this.storeAPIKey(MODEL_PROVIDERS.GOOGLE, apiKey, keyAlias, options);
  }

  /**
   * Store OpenRouter API key
   */
  async storeOpenRouterKey(
    apiKey: string,
    keyAlias?: string,
    options?: RequestOptions
  ): Promise<APIResponse<APIKeyResponse>> {
    return this.storeAPIKey(MODEL_PROVIDERS.OPENROUTER, apiKey, keyAlias, options);
  }

  /**
   * Check if a specific provider has a stored key
   */
  async hasKey(
    providerName: string,
    options?: RequestOptions
  ): Promise<boolean> {
    try {
      const response = await this.listAPIKeys(options);
      return response.data.some(provider => 
        provider.provider_name === providerName && provider.has_key
      );
    } catch {
      return false;
    }
  }

  /**
   * Get provider information for a specific provider
   */
  async getProviderInfo(
    providerName: string,
    options?: RequestOptions
  ): Promise<APIKeyProviderResponse | null> {
    try {
      const response = await this.listAPIKeys(options);
      return response.data.find(provider => 
        provider.provider_name === providerName
      ) || null;
    } catch {
      return null;
    }
  }

  /**
   * Store multiple API keys at once
   */
  async storeMultipleKeys(
    keys: Array<{
      provider: string;
      apiKey: string;
      alias?: string;
    }>,
    options?: RequestOptions
  ): Promise<APIResponse<APIKeyResponse>[]> {
    const promises = keys.map(({ provider, apiKey, alias }) =>
      this.storeAPIKey(provider, apiKey, alias, options)
    );

    return Promise.all(promises);
  }

  /**
   * Delete all stored API keys
   */
  async deleteAllKeys(
    options?: RequestOptions
  ): Promise<APIResponse<APIKeyResponse>[]> {
    const response = await this.listAPIKeys(options);
    const providers = response.data.map(p => p.provider_name);
    
    const promises = providers.map(provider =>
      this.deleteAPIKey(provider, options)
    );

    return Promise.all(promises);
  }

  /**
   * Get usage statistics for stored keys
   */
  async getKeyUsageStats(
    options?: RequestOptions
  ): Promise<{
    total: number;
    byProvider: Record<string, {
      hasKey: boolean;
      lastUsed?: number;
      createdAt: number;
    }>;
  }> {
    const response = await this.listAPIKeys(options);
    const providers = response.data;
    
    const byProvider: Record<string, any> = {};
    
    for (const provider of providers) {
      byProvider[provider.provider_name] = {
        hasKey: provider.has_key,
        lastUsed: provider.last_used,
        createdAt: provider.created_at
      };
    }
    
    return {
      total: providers.length,
      byProvider
    };
  }
}

/**
 * Utilities for working with model API keys
 */
export class ModelKeyUtils {
  /**
   * Validate API key format for different providers
   */
  static validateAPIKey(provider: string, apiKey: string): {
    valid: boolean;
    error?: string;
  } {
    if (!apiKey || apiKey.trim().length === 0) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    switch (provider.toLowerCase()) {
      case MODEL_PROVIDERS.OPENAI:
        if (!apiKey.startsWith('sk-')) {
          return { valid: false, error: 'OpenAI API keys must start with "sk-"' };
        }
        if (apiKey.length < 20) {
          return { valid: false, error: 'OpenAI API key appears to be too short' };
        }
        break;

      case MODEL_PROVIDERS.ANTHROPIC:
        if (!apiKey.startsWith('sk-ant-')) {
          return { valid: false, error: 'Anthropic API keys must start with "sk-ant-"' };
        }
        break;

      case MODEL_PROVIDERS.GOOGLE:
        if (apiKey.length < 20) {
          return { valid: false, error: 'Google API key appears to be too short' };
        }
        break;

      case MODEL_PROVIDERS.OPENROUTER:
        if (!apiKey.startsWith('sk-or-')) {
          return { valid: false, error: 'OpenRouter API keys must start with "sk-or-"' };
        }
        break;

      default:
        // Generic validation for unknown providers
        if (apiKey.length < 10) {
          return { valid: false, error: 'API key appears to be too short' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Mask API key for display purposes
   */
  static maskAPIKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '*'.repeat(apiKey.length);
    }
    
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(Math.max(4, apiKey.length - 8));
    
    return `${start}${middle}${end}`;
  }

  /**
   * Get provider display name
   */
  static getProviderDisplayName(provider: string): string {
    const names: Record<string, string> = {
      [MODEL_PROVIDERS.OPENAI]: 'OpenAI',
      [MODEL_PROVIDERS.ANTHROPIC]: 'Anthropic',
      [MODEL_PROVIDERS.GOOGLE]: 'Google',
      [MODEL_PROVIDERS.OPENROUTER]: 'OpenRouter'
    };
    
    return names[provider.toLowerCase()] || provider;
  }

  /**
   * Get provider icon/color for UI
   */
  static getProviderMeta(provider: string): {
    color: string;
    icon: string;
    website: string;
  } {
    const meta: Record<string, any> = {
      [MODEL_PROVIDERS.OPENAI]: {
        color: '#00A67E',
        icon: '🤖',
        website: 'https://platform.openai.com'
      },
      [MODEL_PROVIDERS.ANTHROPIC]: {
        color: '#D97706',
        icon: '🧠',
        website: 'https://console.anthropic.com'
      },
      [MODEL_PROVIDERS.GOOGLE]: {
        color: '#4285F4',
        icon: '🔍',
        website: 'https://console.cloud.google.com'
      },
      [MODEL_PROVIDERS.OPENROUTER]: {
        color: '#7C3AED',
        icon: '🔀',
        website: 'https://openrouter.ai'
      },
      [MODEL_PROVIDERS.GROQ]: {
        color: '#FF6B35',
        icon: '⚡',
        website: 'https://console.groq.com'
      }
    };
    
    return meta[provider.toLowerCase()] || {
      color: '#6B7280',
      icon: '🔑',
      website: '#'
    };
  }

  /**
   * Format last used timestamp
   */
  static formatLastUsed(timestamp?: number | null): string {
    if (!timestamp) return 'Never used';
    
    const date = new Date(timestamp * 1000); // Convert from Unix timestamp
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  /**
   * Sort providers by priority/popularity
   */
  static sortProviders(providers: APIKeyProviderResponse[]): APIKeyProviderResponse[] {
    const priority = {
      [MODEL_PROVIDERS.OPENAI]: 1,
      [MODEL_PROVIDERS.ANTHROPIC]: 2,
      [MODEL_PROVIDERS.GOOGLE]: 3,
      [MODEL_PROVIDERS.OPENROUTER]: 4
    };
    
    return [...providers].sort((a, b) => {
      const aPriority = priority[a.provider_name.toLowerCase()] || 999;
      const bPriority = priority[b.provider_name.toLowerCase()] || 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority, sort by name
      return a.provider_name.localeCompare(b.provider_name);
    });
  }

  /**
   * Generate a default key alias
   */
  static generateKeyAlias(provider: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const displayName = this.getProviderDisplayName(provider);
    return `${displayName} Key (${timestamp})`;
  }

  /**
   * Check if provider is supported
   */
  static isSupportedProvider(provider: string): boolean {
    return Object.values(MODEL_PROVIDERS).includes(provider.toLowerCase() as any);
  }

  /**
   * Get all supported providers
   */
  static getSupportedProviders(): string[] {
    return Object.values(MODEL_PROVIDERS);
  }
}

export default ACSModelService;
