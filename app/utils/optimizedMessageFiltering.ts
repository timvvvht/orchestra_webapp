/**
 * Optimized Message Filtering Utilities
 *
 * Provides high-performance, memoized versions of expensive message filtering operations
 * to eliminate O(n²) complexity and reduce re-computation overhead.
 */

import { ChatRole, type ChatMessage } from "@/types/chatTypes";
import {
  getFileOperationsForResponse,
  getToolCallsForResponse,
} from "@/utils/conversationBoundaries";

// Cache for memoized results
interface MessageFilterCache {
  messagesHash: string;
  messageIndices: Map<string, number>;
  finalMessageFlags: Map<string, boolean>;
  visibleMessages: ChatMessage[];
}

let cache: MessageFilterCache | null = null;

/**
 * Creates a hash of the messages array to detect changes
 * Uses message IDs and roles for a lightweight hash
 */
function createMessagesHash(messages: ChatMessage[]): string {
  return messages.map((m) => `${m.id}:${m.role}`).join("|");
}

/**
 * Pre-computes message indices for O(1) lookups
 */
function createMessageIndices(messages: ChatMessage[]): Map<string, number> {
  const indices = new Map<string, number>();
  messages.forEach((message, index) => {
    indices.set(message.id, index);
  });
  return indices;
}

/**
 * Optimized version of isFinalAssistantMessage that uses pre-computed indices
 * and processes all messages in a single pass
 */
function computeFinalMessageFlags(
  messages: ChatMessage[],
  messageIndices: Map<string, number>
): Map<string, boolean> {
  const finalFlags = new Map<string, boolean>();

  // Process messages in reverse order for efficiency
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];

    // Only process assistant messages
    if (message.role !== "assistant" && message.role !== ChatRole.Assistant) {
      finalFlags.set(message.id, false);
      continue;
    }

    // Check if this is the final assistant message
    let isFinal = true;

    // Look ahead for next real user message
    for (let j = i + 1; j < messages.length; j++) {
      const nextMessage = messages[j];

      // If we find another assistant message, current message is not final
      if (
        nextMessage.role === "assistant" ||
        nextMessage.role === ChatRole.Assistant
      ) {
        isFinal = false;
        break;
      }

      // If we find a user message, check if it's a real user message
      if (nextMessage.role === "user" || nextMessage.role === ChatRole.User) {
        const isToolResultOnly =
          Array.isArray(nextMessage.content) &&
          nextMessage.content.every((part) => part.type === "tool_result");

        if (!isToolResultOnly) {
          // Found a real user message, so current assistant message is final
          isFinal = true;
          break;
        }
        // Continue looking if it's just tool results
      }
    }

    finalFlags.set(message.id, isFinal);
  }

  return finalFlags;
}

/**
 * High-performance, memoized version of getVisibleMessages
 *
 * Optimizations:
 * - Caches results based on messages hash
 * - Pre-computes message indices for O(1) lookups
 * - Processes all messages in single pass instead of per-message operations
 * - Eliminates O(n²) complexity
 */
export function getOptimizedVisibleMessages(
  messages: ChatMessage[]
): ChatMessage[] {
  const messagesHash = createMessagesHash(messages);

  // Return cached result if messages haven't changed
  if (cache && cache.messagesHash === messagesHash) {
    // console.log('🚀 [PERF] getOptimizedVisibleMessages: Cache hit, returning cached result');
    return cache.visibleMessages;
  }

  // console.log('🚀 [PERF] getOptimizedVisibleMessages: Cache miss, recomputing...');
  const startTime = performance.now();

  // Pre-compute message indices for O(1) lookups
  const messageIndices = createMessageIndices(messages);

  // Compute final message flags in single pass
  const finalMessageFlags = computeFinalMessageFlags(messages, messageIndices);

  // Filter visible messages
  const visibleMessages = messages.filter((message) => {
    if (message.role === "user" || message.role === ChatRole.User) {
      return true;
    }

    // For assistant messages, only show final ones
    return finalMessageFlags.get(message.id) || false;
  });

  // Update cache
  cache = {
    messagesHash,
    messageIndices,
    finalMessageFlags,
    visibleMessages,
  };

  const endTime = performance.now();
  // console.log(`🚀 [PERF] getOptimizedVisibleMessages: Computed ${visibleMessages.length}/${messages.length} visible messages in ${(endTime - startTime).toFixed(2)}ms`);

  return visibleMessages;
}

/**
 * Optimized version of isFinalAssistantMessage that uses the cache
 */
export function isOptimizedFinalAssistantMessage(
  message: ChatMessage,
  allMessages: ChatMessage[]
): boolean {
  // Ensure cache is up to date
  getOptimizedVisibleMessages(allMessages);

  // Return cached result
  return cache?.finalMessageFlags.get(message.id) || false;
}

/**
 * Clears the optimization cache (useful for testing or manual cache invalidation)
 */
export function clearMessageFilterCache(): void {
  cache = null;
  console.log("🚀 [PERF] Message filter cache cleared");
}

/**
 * Cache for expensive per-message operations
 */
interface MessageOperationsCache {
  messagesHash: string;
  fileOperations: Map<string, any[]>;
  toolCalls: Map<string, any[]>;
}

let operationsCache: MessageOperationsCache | null = null;

/**
 * Optimized version of getFileOperationsForResponse with caching
 */
export function getOptimizedFileOperationsForResponse(
  messages: ChatMessage[],
  finalMessageId: string
): any[] {
  const messagesHash = createMessagesHash(messages);

  // Initialize operations cache if needed
  if (!operationsCache || operationsCache.messagesHash !== messagesHash) {
    operationsCache = {
      messagesHash,
      fileOperations: new Map(),
      toolCalls: new Map(),
    };
  }

  // Return cached result if available
  if (operationsCache.fileOperations.has(finalMessageId)) {
    return operationsCache.fileOperations.get(finalMessageId) || [];
  }

  // Use the imported function
  const result = getFileOperationsForResponse(messages, finalMessageId);

  // Cache the result
  operationsCache.fileOperations.set(finalMessageId, result);

  return result;
}

/**
 * Optimized version of getToolCallsForResponse with caching
 */
export function getOptimizedToolCallsForResponse(
  messages: ChatMessage[],
  finalMessageId: string
): any[] {
  const messagesHash = createMessagesHash(messages);

  // Initialize operations cache if needed
  if (!operationsCache || operationsCache.messagesHash !== messagesHash) {
    operationsCache = {
      messagesHash,
      fileOperations: new Map(),
      toolCalls: new Map(),
    };
  }

  // Return cached result if available
  if (operationsCache.toolCalls.has(finalMessageId)) {
    return operationsCache.toolCalls.get(finalMessageId) || [];
  }

  // Use the imported function
  const result = getToolCallsForResponse(messages, finalMessageId);

  // Cache the result
  operationsCache.toolCalls.set(finalMessageId, result);

  return result;
}

/**
 * Clears the operations cache
 */
export function clearMessageOperationsCache(): void {
  operationsCache = null;
  console.log("🚀 [PERF] Message operations cache cleared");
}

/**
 * Gets cache statistics for debugging
 */
export function getMessageFilterCacheStats(): {
  isCached: boolean;
  messagesCount: number;
  visibleCount: number;
  cacheSize: number;
  operationsCacheSize: number;
} {
  if (!cache) {
    return {
      isCached: false,
      messagesCount: 0,
      visibleCount: 0,
      cacheSize: 0,
      operationsCacheSize: 0,
    };
  }

  return {
    isCached: true,
    messagesCount: cache.messageIndices.size,
    visibleCount: cache.visibleMessages.length,
    cacheSize: cache.finalMessageFlags.size,
    operationsCacheSize: operationsCache
      ? operationsCache.fileOperations.size + operationsCache.toolCalls.size
      : 0,
  };
}
