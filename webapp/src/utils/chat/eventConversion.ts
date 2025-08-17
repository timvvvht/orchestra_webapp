/**
 * Event to message conversion utilities
 * Extracted from ChatMainCanonicalLegacy.tsx
 */

import type { ChatMessage, ChatRole } from "@/types/chatTypes";
import { formatCommitStats } from "@/utils/scmStats";

/**
 * Helper to convert canonical events to chat messages - OPTIMIZED
 * Handles the nested content structure properly and fixes "[object Object]" issues
 */
export function convertEventsToMessages(events: any[]): ChatMessage[] {
  // PERFORMANCE: Early exit for empty events
  if (!events || events.length === 0) {
    return [];
  }

  console.log(
    "[eventConversion][convertEventsToMessages] events:",
    JSON.stringify(events, null, 2)
  );

  const messages: ChatMessage[] = [];

  // PERFORMANCE: Pre-allocate array with known size
  messages.length = 0;

  for (const event of events) {
    let content: any[] = [];

    // Handle different event kinds
    if (event.kind === "message") {
      // Regular message with text content
      if (Array.isArray(event.content)) {
        // Direct array - this is what we expect from RowMapper after it processes the nested structure
        content = event.content.map((part: any) => {
          // Fix existing "[object Object]" issues
          if (part.type === "text" && part.text === "[object Object]") {
            // Try to extract from other fields in the part
            if (part.content) {
              const recoveredText =
                typeof part.content === "string"
                  ? part.content
                  : JSON.stringify(part.content);
              return { ...part, text: recoveredText };
            }

            // Check if there are other fields that might contain the text
            const possibleFields = [
              "message",
              "value",
              "data",
              "body",
              "original",
            ];
            for (const field of possibleFields) {
              if (part[field]) {
                const recoveredText =
                  typeof part[field] === "string"
                    ? part[field]
                    : JSON.stringify(part[field]);
                return { ...part, text: recoveredText };
              }
            }

            // Check if the whole event has better content
            if (event.originalContent) {
              return { ...part, text: event.originalContent };
            }

            // Try to look at the raw event data
            if (event.rawData && event.rawData.content) {
              if (typeof event.rawData.content === "string") {
                return { ...part, text: event.rawData.content };
              }
            }

            // Last resort - show a helpful message
            return {
              ...part,
              text: '[Content corrupted in database - the original text was incorrectly stored as "[object Object]"]',
            };
          }
          return part;
        });
      } else if (
        event.content &&
        typeof event.content === "object" &&
        event.content.content
      ) {
        // This shouldn't happen if RowMapper is working correctly, but handle it as fallback
        if (Array.isArray(event.content.content)) {
          content = event.content.content.map((part: any) => {
            // Fix existing "[object Object]" issues
            if (part.type === "text" && part.text === "[object Object]") {
              return {
                ...part,
                text: '[Content parsing error - click "🔄 Refresh Data" to fix]',
              };
            }
            return part;
          });
        } else {
          content = [{ type: "text", text: JSON.stringify(event.content) }];
        }
      } else if (typeof event.content === "string") {
        // String content
        content = [{ type: "text", text: event.content }];
      } else {
        // Fallback
        content = [{ type: "text", text: JSON.stringify(event.content) }];
      }

      // Check if this is a blank user message and skip it
      const isBlank =
        (typeof event.content === "string" &&
          event.content.trim().length === 0) ||
        (Array.isArray(content) &&
          content.length === 1 &&
          content[0].type === "text" &&
          !(content[0].text ?? "").trim());

      if (isBlank && event.role === "user") {
        continue; // Skip this empty user message
      }

      messages.push({
        id: event.id,
        content: content,
        role: event.role as ChatRole,
        createdAt: event.createdAt,
        isStreaming: event.partial || false,
        sessionId: event.sessionId || "unknown",
      } as ChatMessage);
    } else if (event.kind === "tool_call") {
      // Tool call event
      content = [
        {
          type: "tool_use",
          id: event.toolUseId || event.id,
          name: event.name || "unknown_tool",
          input: event.args || {},
        },
      ];

      messages.push({
        id: event.id,
        content: content,
        role: "assistant" as ChatRole,
        createdAt: event.createdAt,
        isStreaming: event.partial || false,
        sessionId: event.sessionId || "unknown",
      } as ChatMessage);
    } else if (event.kind === "tool_result") {
      // Tool result event
      content = [
        {
          type: "tool_result",
          tool_use_id: event.toolUseId || event.id,
          content: event.result || "No result",
          is_error: event.isError || false,
        },
      ];

      messages.push({
        id: event.id,
        content: content,
        role: "assistant" as ChatRole,
        createdAt: event.createdAt,
        isStreaming: false,
        sessionId: event.sessionId || "unknown",
      } as ChatMessage);
    } else if (event.kind === "checkpoint") {
      // Checkpoint event
      const checkpointData = event.data || {};
      const phase = checkpointData.phase;
      const stats = checkpointData.stats;
      const commitHash = checkpointData.commitHash;

      let text: string;
      if (phase === "start") {
        text = "Checkpoint created";
      } else {
        if (stats && stats.filesChanged > 0) {
          text = `Checkpoint created • ${formatCommitStats(stats)}`;
        } else {
          text = "Checkpoint created";
        }
      }

      content = [{ type: "text", text }];

      messages.push({
        id: event.id,
        content: content,
        role: "system" as ChatRole,
        type: "checkpoint",
        createdAt: event.createdAt,
        isStreaming: false,
        sessionId: event.sessionId || "unknown",
        meta: checkpointData, // Store full checkpoint data for UI
      } as ChatMessage);
    }
  }

  console.log(`✅ [EventConversion] Conversion completed:`, {
    inputEvents: events.length,
    outputMessages: messages.length,
    messageTypes: messages.map((m) => m.role),
    skippedEvents: events.length - messages.length,
  });

  return messages;
}

/**
 * PERFORMANCE OPTIMIZED: Async version of convertEventsToMessages
 * Processes events in batches to avoid blocking the UI thread
 */
export async function convertEventsToMessagesAsync(
  events: any[],
  batchSize: number = 50
): Promise<ChatMessage[]> {
  // PERFORMANCE: Early exit for empty events
  if (!events || events.length === 0) {
    return [];
  }

  const messages: ChatMessage[] = [];

  // Process events in batches to avoid blocking UI
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);

    // Process batch synchronously
    const batchMessages = convertEventsToMessages(batch);
    messages.push(...batchMessages);

    // Yield control back to the event loop after each batch
    if (i + batchSize < events.length) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return messages;
}
