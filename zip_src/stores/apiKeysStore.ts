import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getApiKey, setApiKey } from '@/api/settingsApi';

/**
 * API key categories
 */
export type ApiKeyCategory = 'llm' | 'search' | 'tools';

/**
 * LLM provider types
 */
export type LlmProvider = 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama' | 'groq';

/**
 * Search provider types
 */
export type SearchProvider = 'tavily' | 'serper' | 'serpapi';

/**
 * Tool provider types
 */
export type ToolProvider = 'github' | 'zapier' | 'browserless' | 'firecrawl';

/**
 * API key status
 */
export type ApiKeyStatus = 'unknown' | 'valid' | 'invalid' | 'expired';

/**
 * API key entry with metadata
 */
export interface ApiKeyEntry {
    /**
     * The API key value (masked in UI)
     */
    key: string;

    /**
     * Whether the key is currently being loaded
     */
    isLoading: boolean;

    /**
     * Error message if loading or validation failed
     */
    error: string | null;

    /**
     * Status of the API key
     */
    status: ApiKeyStatus;

    /**
     * When the key was last validated
     */
    lastValidated: string | null;
}

/**
 * API keys state interface
 */
interface ApiKeysState {
    // LLM providers
    llm: Record<LlmProvider, ApiKeyEntry | null>;

    // Search providers
    search: Record<SearchProvider, ApiKeyEntry | null>;

    // Tool providers
    tools: Record<ToolProvider, ApiKeyEntry | null>;

    // Loading state for the entire store
    isLoading: boolean;

    // Global error state
    error: string | null;

    // Actions
    loadApiKey: (category: ApiKeyCategory, provider: string) => Promise<void>;
    saveApiKey: (category: ApiKeyCategory, provider: string, key: string) => Promise<void>;
    clearApiKey: (category: ApiKeyCategory, provider: string) => Promise<void>;
    clearAllApiKeys: () => Promise<void>;
    validateApiKey: (category: ApiKeyCategory, provider: string) => Promise<boolean>;

    // Initialization
    initApiKeys: () => Promise<void>;
}

/**
 * Create empty API key entry
 */
const createEmptyApiKeyEntry = (): ApiKeyEntry => ({
    key: '',
    isLoading: false,
    error: null,
    status: 'unknown',
    lastValidated: null
});

/**
 * Default state for API keys
 */
const defaultApiKeysState = {
    llm: {
        openai: null,
        anthropic: null,
        google: null,
        mistral: null,
        ollama: null,
        groq: null
    },
    search: {
        tavily: null,
        serper: null,
        serpapi: null
    },
    tools: {
        github: null,
        zapier: null,
        browserless: null,
        firecrawl: null
    },
    isLoading: false,
    error: null
};

/**
 * API keys store
 */
export const useApiKeysStore = create<ApiKeysState>()(
    persist(
        (set, get) => ({
            ...defaultApiKeysState,

            /**
             * Load an API key from the backend
             */
            loadApiKey: async (category: ApiKeyCategory, provider: string) => {
                // Set loading state for the specific provider
                set(state => {
                    const newState = { ...state };
                    // Handle type safety with a dynamic access approach
                    if (category === 'llm' && provider in newState.llm) {
                        if (!newState.llm[provider as LlmProvider]) {
                            newState.llm[provider as LlmProvider] = createEmptyApiKeyEntry();
                        }
                        newState.llm[provider as LlmProvider]!.isLoading = true;
                        newState.llm[provider as LlmProvider]!.error = null;
                    } else if (category === 'search' && provider in newState.search) {
                        if (!newState.search[provider as SearchProvider]) {
                            newState.search[provider as SearchProvider] = createEmptyApiKeyEntry();
                        }
                        newState.search[provider as SearchProvider]!.isLoading = true;
                        newState.search[provider as SearchProvider]!.error = null;
                    } else if (category === 'tools' && provider in newState.tools) {
                        if (!newState.tools[provider as ToolProvider]) {
                            newState.tools[provider as ToolProvider] = createEmptyApiKeyEntry();
                        }
                        newState.tools[provider as ToolProvider]!.isLoading = true;
                        newState.tools[provider as ToolProvider]!.error = null;
                    }
                    return newState;
                });

                try {
                    // Load the API key from the backend using the centralized SecretsManager
                    // The key format is now standardized to match our backend format (category.provider)
                    const apiKey = await getApiKey(`${category}.${provider}`);

                    // Update the state with the loaded API key
                    set(state => {
                        const newState = { ...state };
                        const newEntry: ApiKeyEntry = {
                            key: apiKey || '',
                            isLoading: false,
                            error: null,
                            status: 'unknown', // We don't validate on load for performance reasons
                            lastValidated: null
                        };

                        // Handle type safety with a dynamic access approach
                        if (category === 'llm' && provider in newState.llm) {
                            newState.llm[provider as LlmProvider] = newEntry;
                        } else if (category === 'search' && provider in newState.search) {
                            newState.search[provider as SearchProvider] = newEntry;
                        } else if (category === 'tools' && provider in newState.tools) {
                            newState.tools[provider as ToolProvider] = newEntry;
                        }

                        return newState;
                    });
                } catch (error) {
                    // Update the state with the error
                    set(state => {
                        const newState = { ...state };
                        const errorEntry: ApiKeyEntry = {
                            key: '',
                            isLoading: false,
                            error: `Failed to load API key: ${error}`,
                            status: 'unknown',
                            lastValidated: null
                        };

                        // Handle type safety with a dynamic access approach
                        if (category === 'llm' && provider in newState.llm) {
                            newState.llm[provider as LlmProvider] = errorEntry;
                        } else if (category === 'search' && provider in newState.search) {
                            newState.search[provider as SearchProvider] = errorEntry;
                        } else if (category === 'tools' && provider in newState.tools) {
                            newState.tools[provider as ToolProvider] = errorEntry;
                        }

                        return newState;
                    });
                }
            },

            /**
             * Save an API key to the backend
             */
            saveApiKey: async (category: ApiKeyCategory, provider: string, key: string) => {
                // Store previous state for rollback on error
                const previousState = get();

                // Set loading state for the specific provider
                set(state => {
                    const newState = { ...state };
                    // Handle type safety with a dynamic access approach
                    if (category === 'llm' && provider in newState.llm) {
                        if (!newState.llm[provider as LlmProvider]) {
                            newState.llm[provider as LlmProvider] = createEmptyApiKeyEntry();
                        }
                        newState.llm[provider as LlmProvider]!.isLoading = true;
                        newState.llm[provider as LlmProvider]!.error = null;
                    } else if (category === 'search' && provider in newState.search) {
                        if (!newState.search[provider as SearchProvider]) {
                            newState.search[provider as SearchProvider] = createEmptyApiKeyEntry();
                        }
                        newState.search[provider as SearchProvider]!.isLoading = true;
                        newState.search[provider as SearchProvider]!.error = null;
                    } else if (category === 'tools' && provider in newState.tools) {
                        if (!newState.tools[provider as ToolProvider]) {
                            newState.tools[provider as ToolProvider] = createEmptyApiKeyEntry();
                        }
                        newState.tools[provider as ToolProvider]!.isLoading = true;
                        newState.tools[provider as ToolProvider]!.error = null;
                    }
                    return newState;
                });

                try {
                    // Save the API key to the backend using our centralized SecretsManager
                    // We use the consistent format of "category.provider" for the service name
                    await setApiKey(`${category}.${provider}`, key);

                    // Update the state with the saved API key
                    set(state => {
                        const newState = { ...state };
                        const newEntry: ApiKeyEntry = {
                            key,
                            isLoading: false,
                            error: null,
                            status: 'unknown', // We don't validate on save for performance reasons
                            lastValidated: null
                        };

                        // Handle type safety with a dynamic access approach
                        if (category === 'llm' && provider in newState.llm) {
                            newState.llm[provider as LlmProvider] = newEntry;
                        } else if (category === 'search' && provider in newState.search) {
                            newState.search[provider as SearchProvider] = newEntry;
                        } else if (category === 'tools' && provider in newState.tools) {
                            newState.tools[provider as ToolProvider] = newEntry;
                        }

                        return newState;
                    });

                    // Optionally validate the API key
                    // await get().validateApiKey(category, provider);
                } catch (error) {
                    // Rollback to previous state on error
                    set(previousState);
                }
            },

            /**
             * Clear an API key from the backend and state
             */
            clearApiKey: async (category: ApiKeyCategory, provider: string) => {
                // Store previous state for rollback on error
                const previousState = get();

                // Set loading state for the specific provider
                set(state => {
                    const newState = { ...state };
                    // Handle type safety with a dynamic access approach
                    if (category === 'llm' && provider in newState.llm) {
                        if (!newState.llm[provider as LlmProvider]) {
                            newState.llm[provider as LlmProvider] = createEmptyApiKeyEntry();
                        }
                        newState.llm[provider as LlmProvider]!.isLoading = true;
                        newState.llm[provider as LlmProvider]!.error = null;
                    } else if (category === 'search' && provider in newState.search) {
                        if (!newState.search[provider as SearchProvider]) {
                            newState.search[provider as SearchProvider] = createEmptyApiKeyEntry();
                        }
                        newState.search[provider as SearchProvider]!.isLoading = true;
                        newState.search[provider as SearchProvider]!.error = null;
                    } else if (category === 'tools' && provider in newState.tools) {
                        if (!newState.tools[provider as ToolProvider]) {
                            newState.tools[provider as ToolProvider] = createEmptyApiKeyEntry();
                        }
                        newState.tools[provider as ToolProvider]!.isLoading = true;
                        newState.tools[provider as ToolProvider]!.error = null;
                    }
                    return newState;
                });

                try {
                    // Clear the API key from the backend by setting it to an empty string
                    // This is safer than trying to delete it, as it ensures the key exists but is empty
                    await setApiKey(`${category}.${provider}`, '');

                    // Update the state
                    set(state => {
                        const newState = { ...state };
                        const emptyEntry: ApiKeyEntry = {
                            key: '',
                            isLoading: false,
                            error: null,
                            status: 'unknown',
                            lastValidated: null
                        };

                        // Handle type safety with a dynamic access approach
                        if (category === 'llm' && provider in newState.llm) {
                            newState.llm[provider as LlmProvider] = emptyEntry;
                        } else if (category === 'search' && provider in newState.search) {
                            newState.search[provider as SearchProvider] = emptyEntry;
                        } else if (category === 'tools' && provider in newState.tools) {
                            newState.tools[provider as ToolProvider] = emptyEntry;
                        }

                        return newState;
                    });
                } catch (error) {
                    // Rollback to previous state on error
                    set(previousState);
                }
            },

            /**
             * Clear all API keys
             */
            clearAllApiKeys: async () => {
                // Store previous state for rollback on error
                const previousState = get();

                // Set global loading state
                set({ isLoading: true, error: null });

                try {
                    // Clear all API keys for each category and provider in parallel
                    const clearPromises: Promise<void>[] = [];
                    const { llm, search, tools } = get();

                    // Clear LLM API keys
                    for (const provider in llm) {
                        if (llm[provider as LlmProvider]) {
                            clearPromises.push(get().clearApiKey('llm', provider));
                        }
                    }

                    // Clear search API keys
                    for (const provider in search) {
                        if (search[provider as SearchProvider]) {
                            clearPromises.push(get().clearApiKey('search', provider));
                        }
                    }

                    // Clear tools API keys
                    for (const provider in tools) {
                        if (tools[provider as ToolProvider]) {
                            clearPromises.push(get().clearApiKey('tools', provider));
                        }
                    }

                    await Promise.all(clearPromises);

                    // Reset to default state
                    set({
                        ...defaultApiKeysState,
                        isLoading: false
                    });
                } catch (error) {
                    // Rollback to previous state on error
                    set({
                        ...previousState,
                        isLoading: false,
                        error: `Failed to clear all API keys: ${error}`
                    });
                }
            },

            /**
             * Validate an API key
             * Note: This is a placeholder. In a real implementation, you would call
             * the provider's API to validate the key.
             */
            validateApiKey: async (category: ApiKeyCategory, provider: string) => {
                // Store previous state for rollback on error
                const previousState = get();

                // Set loading state for the specific provider
                set(state => {
                    const newState = { ...state };

                    // Handle type safety with a dynamic access approach
                    let providerExists = false;
                    if (category === 'llm' && provider in newState.llm) {
                        if (!newState.llm[provider as LlmProvider]) {
                            return state; // Nothing to validate
                        }
                        newState.llm[provider as LlmProvider]!.isLoading = true;
                        newState.llm[provider as LlmProvider]!.error = null;
                        providerExists = true;
                    } else if (category === 'search' && provider in newState.search) {
                        if (!newState.search[provider as SearchProvider]) {
                            return state; // Nothing to validate
                        }
                        newState.search[provider as SearchProvider]!.isLoading = true;
                        newState.search[provider as SearchProvider]!.error = null;
                        providerExists = true;
                    } else if (category === 'tools' && provider in newState.tools) {
                        if (!newState.tools[provider as ToolProvider]) {
                            return state; // Nothing to validate
                        }
                        newState.tools[provider as ToolProvider]!.isLoading = true;
                        newState.tools[provider as ToolProvider]!.error = null;
                        providerExists = true;
                    }

                    if (!providerExists) {
                        return state; // Provider doesn't exist
                    }

                    return newState;
                });

                try {
                    // Get the current API key - need to handle each category separately for type safety
                    let currentEntry: ApiKeyEntry | null = null;
                    if (category === 'llm' && provider in get().llm) {
                        currentEntry = get().llm[provider as LlmProvider];
                    } else if (category === 'search' && provider in get().search) {
                        currentEntry = get().search[provider as SearchProvider];
                    } else if (category === 'tools' && provider in get().tools) {
                        currentEntry = get().tools[provider as ToolProvider];
                    }

                    if (!currentEntry || !currentEntry.key) {
                        // No API key to validate
                        set(state => {
                            const newState = { ...state };
                            if (category === 'llm' && provider in newState.llm && newState.llm[provider as LlmProvider]) {
                                newState.llm[provider as LlmProvider]!.isLoading = false;
                                newState.llm[provider as LlmProvider]!.status = 'unknown';
                            } else if (category === 'search' && provider in newState.search && newState.search[provider as SearchProvider]) {
                                newState.search[provider as SearchProvider]!.isLoading = false;
                                newState.search[provider as SearchProvider]!.status = 'unknown';
                            } else if (category === 'tools' && provider in newState.tools && newState.tools[provider as ToolProvider]) {
                                newState.tools[provider as ToolProvider]!.isLoading = false;
                                newState.tools[provider as ToolProvider]!.status = 'unknown';
                            }
                            return newState;
                        });
                        return false;
                    }

                    // TODO: Implement actual validation logic here
                    // For now, we'll just simulate a successful validation
                    const isValid = true;
                    const now = new Date().toISOString();

                    // Update the state with the validation result
                    set(state => {
                        const newState = { ...state };
                        if (category === 'llm' && provider in newState.llm && newState.llm[provider as LlmProvider]) {
                            newState.llm[provider as LlmProvider] = {
                                ...newState.llm[provider as LlmProvider]!,
                                isLoading: false,
                                error: null,
                                status: isValid ? 'valid' : 'invalid',
                                lastValidated: now
                            };
                        } else if (category === 'search' && provider in newState.search && newState.search[provider as SearchProvider]) {
                            newState.search[provider as SearchProvider] = {
                                ...newState.search[provider as SearchProvider]!,
                                isLoading: false,
                                error: null,
                                status: isValid ? 'valid' : 'invalid',
                                lastValidated: now
                            };
                        } else if (category === 'tools' && provider in newState.tools && newState.tools[provider as ToolProvider]) {
                            newState.tools[provider as ToolProvider] = {
                                ...newState.tools[provider as ToolProvider]!,
                                isLoading: false,
                                error: null,
                                status: isValid ? 'valid' : 'invalid',
                                lastValidated: now
                            };
                        }
                        return newState;
                    });

                    return isValid;
                } catch (error) {
                    // Rollback to previous state on error
                    set(previousState);
                    return false;
                }
            },

            /**
             * Initialize API keys
             */
            initApiKeys: async () => {
                // Set global loading state
                set({ isLoading: true, error: null });

                try {
                    // Load all API keys for each category and provider
                    const categories: ApiKeyCategory[] = ['llm', 'search', 'tools'];

                    // Use Promise.all for parallel loading to improve performance
                    const loadPromises: Promise<void>[] = [];

                    for (const category of categories) {
                        // Get providers for each category with proper typing
                        let providers: string[] = [];
                        if (category === 'llm') {
                            providers = Object.keys(get().llm);
                        } else if (category === 'search') {
                            providers = Object.keys(get().search);
                        } else if (category === 'tools') {
                            providers = Object.keys(get().tools);
                        }

                        for (const provider of providers) {
                            loadPromises.push(get().loadApiKey(category, provider));
                        }
                    }

                    await Promise.all(loadPromises);
                    set({ isLoading: false });
                } catch (error) {
                    // Update the state with the error
                    set({
                        isLoading: false,
                        error: `Failed to initialize API keys: ${error}`
                    });
                }
            }
        }),
        {
            name: 'api-keys-storage',
            // Only persist the API keys, not the loading state or error
            partialize: state => ({
                llm: state.llm,
                search: state.search,
                tools: state.tools
            })
        }
    )
);
