/**
 * Utility for generating and managing tool IDs across different LLM providers
 * 
 * Some providers (like Gemini) don't provide tool call IDs, while others do.
 * This utility ensures consistent ID handling across all providers.
 */

// Use Web Crypto API for browser compatibility
const crypto = globalThis.crypto || (globalThis as any).msCrypto;

/**
 * Simple synchronous hash function for browser compatibility
 * Creates a deterministic hash from a string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to base36 and ensure it's always positive
  return Math.abs(hash).toString(36);
}

/**
 * Generate a deterministic tool ID based on tool name and input
 * This ensures the same tool call always gets the same ID
 */
export function generateDeterministicToolId(
  toolName: string,
  toolInput: any,
  messageId: string,
  index: number
): string {
  // Create a deterministic hash based on the tool call's content
  const content = JSON.stringify({
    messageId,
    index, // Position in the message
    toolName,
    toolInput: typeof toolInput === 'string' ? toolInput : JSON.stringify(toolInput)
  });
  
  const hash = simpleHash(content);
  // Use the hash and index to create a unique ID
  return `tool_${hash}_${index}`;
}

/**
 * Generate a unique tool ID for providers that don't supply one
 * Falls back to timestamp-based ID if deterministic generation fails
 */
export function generateToolId(
  providerId?: string,
  toolName?: string,
  toolInput?: any,
  messageId?: string,
  index: number = 0
): string {
  // If provider gave us an ID, use it
  if (providerId && providerId.trim() !== '') {
    return providerId;
  }
  
  // Try to generate deterministic ID if we have enough info
  if (toolName && messageId) {
    try {
      return generateDeterministicToolId(toolName, toolInput, messageId, index);
    } catch (error) {
      console.warn('[toolIdGenerator] Failed to generate deterministic ID:', error);
    }
  }
  
  // Fallback: generate a unique ID with timestamp and random component
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `tool_${timestamp}_${random}`;
}

/**
 * Normalize tool IDs in a message to ensure consistency
 * This is used when processing events from the backend
 */
export function normalizeToolIds(
  toolCalls: Array<{ id?: string; name: string; arguments?: any }>,
  messageId: string
): Array<{ id: string; name: string; arguments?: any }> {
  return toolCalls.map((toolCall, index) => ({
    ...toolCall,
    id: generateToolId(toolCall.id, toolCall.name, toolCall.arguments, messageId, index)
  }));
}

/**
 * Match a tool result to its corresponding tool call
 * Handles both exact ID matches and fallback matching strategies
 */
export function matchToolResultToCall(
  toolResultId: string | undefined,
  toolCalls: Array<{ id: string; name: string }>,
  resultIndex: number = 0
): string | null {
  // If we have a non-empty result ID, try exact match first
  if (toolResultId && toolResultId.trim() !== '') {
    const exactMatch = toolCalls.find(call => call.id === toolResultId);
    if (exactMatch) {
      return exactMatch.id;
    }
  }
  
  // Fallback: Sequential matching for providers without IDs
  // This assumes tool results come in the same order as tool calls
  if (resultIndex < toolCalls.length) {
    return toolCalls[resultIndex].id;
  }
  
  // No match found
  return null;
}

/**
 * Provider-specific ID handling configuration
 */
export const PROVIDER_ID_SUPPORT = {
  anthropic: true,
  openai: true,
  openrouter: true,
  groq: true,
  gemini: false,
  vertex: false,
  // Add more providers as needed
} as const;

/**
 * Check if a provider supports tool IDs
 */
export function providerSupportsToolIds(provider: string): boolean {
  return PROVIDER_ID_SUPPORT[provider.toLowerCase() as keyof typeof PROVIDER_ID_SUPPORT] ?? true;
}