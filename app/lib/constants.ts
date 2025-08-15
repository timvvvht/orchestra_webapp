/**
 * Service key identifiers used for API key management with the backend.
 */
export const API_KEYS = {
    OPENAI: 'llm.openai',
    TAVILY: 'search.tavily',
    FIRECRAWL: 'tools.firecrawl'
} as const;

/**
 * Type helper to get the union of possible API key service identifiers.
 */
export type ApiKeyService = (typeof API_KEYS)[keyof typeof API_KEYS];
