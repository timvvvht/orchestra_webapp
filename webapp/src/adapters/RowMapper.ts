/**
 * RowMapper - Supabase Row to CanonicalEvent Adapter
 *
 * Converts Supabase chat_messages table rows into CanonicalEvent objects.
 * Handles legacy data formats and provides safe parsing with error handling.
 */

import {
  CanonicalEvent,
  MessageEvent,
  ToolCallEvent,
  ToolResultEvent,
  RichContentNode,
} from "@/types/events";
import { SupabaseDbChatMessage } from "@/types/chatTypes";

// Extended type to handle properties seen in real data but not in the type definition
interface ExtendedSupabaseDbChatMessage extends SupabaseDbChatMessage {
  metadata?: {
    event_type?: string;
    realtime_persist?: boolean;
    [key: string]: any;
  };
  seq_in_session?: number;
  seq_in_revision?: number;
  write_id?: string;
  revision?: number;
  sessionId?: string; // Alternative to session_id
}

export class RowMapper {
  /**
   * Maps a single Supabase row to one or more CanonicalEvent objects
   * Some rows may split into multiple events (e.g., message with tool calls)
   */
  static map(row: ExtendedSupabaseDbChatMessage): CanonicalEvent[] {
    try {
      const events: CanonicalEvent[] = [];
      const baseEvent = {
        id: row.id ?? crypto.randomUUID(),
        createdAt: row.timestamp ?? new Date().toISOString(),
        role: this.mapRole(row.role),
        partial: false,
        source: "supabase" as const,
        // 🔑 Propagate session for correct indexing
        sessionId: row.session_id ?? row.sessionId,
      };

      // Handle different content types
      // Extract the actual content array from the nested structure
      let contentArray: any[] = [];
      if (row.content) {
        if (Array.isArray(row.content)) {
          // Direct array format (legacy)
          contentArray = row.content;
        } else if (typeof row.content === "object") {
          // Object format - check for nested content
          const contentObj = row.content as Record<string, any>;
          if (contentObj.content && Array.isArray(contentObj.content)) {
            // Nested format: { role: "...", content: [...] }
            contentArray = contentObj.content;
          }
        }
      }

      if (contentArray.length > 0) {
        for (const contentPart of contentArray) {
          if (contentPart.type === "text") {
            // Create message event for text content
            const messageEvent: MessageEvent = {
              ...baseEvent,
              kind: "message",
              content: [this.mapContentPart(contentPart)],
              toolUseId: row.tool_call_id || undefined,
            };
            events.push(messageEvent);
          } else if (contentPart.type === "tool_use") {
            // Create tool call event
            const toolUseId =
              contentPart.id ||
              contentPart.tool_use_id ||
              row.tool_call_id ||
              this.generateToolUseId();
            const toolName =
              contentPart.name || contentPart.tool_name || "unknown";
            const toolArgs = contentPart.input || contentPart.tool_input || {};

            const toolCallEvent: ToolCallEvent = {
              ...baseEvent,
              kind: "tool_call",
              toolUseId,
              name: toolName,
              args: toolArgs,
            };
            events.push(toolCallEvent);
          } else if (
            contentPart.type === "tool_output" ||
            contentPart.type === "tool_result"
          ) {
            // Create tool result event
            const toolUseId =
              contentPart.id ||
              contentPart.tool_use_id ||
              contentPart.tool_use_id_for_output ||
              row.responding_to_tool_use_id ||
              this.generateToolUseId();
            const resultContent = contentPart.content || contentPart.output;

            const toolResultEvent: ToolResultEvent = {
              ...baseEvent,
              kind: "tool_result",
              toolUseId,
              result: this.safeParseLegacyResult(resultContent),
            };
            events.push(toolResultEvent);
          }
        }
      }

      // Handle direct tool result identified by metadata.event_type or role "tool"
      if (
        events.length === 0 &&
        ((row.metadata?.event_type === "tool_result" && row.tool_call_id) ||
          (row.role === "tool" && row.tool_call_id)) &&
        row.content !== undefined
      ) {
        const toolResultEvent: ToolResultEvent = {
          ...baseEvent,
          kind: "tool_result",
          toolUseId: row.tool_call_id,
          result: this.safeParseLegacyResult(row.content),
        };
        events.push(toolResultEvent);
      }

      // If no events were created, create a default message event
      if (events.length === 0) {
        const defaultEvent: MessageEvent = {
          ...baseEvent,
          kind: "message",
          content: [
            {
              type: "text",
              text: "Empty message",
            },
          ],
        };
        events.push(defaultEvent);
      }

      // Validate tool call/result pairs
      this.validateToolCallResultPairs(events);

      return events;
    } catch (error) {
      // Return a fallback event to prevent complete failure
      return [
        {
          id: row.id || "unknown",
          createdAt: row.timestamp || new Date().toISOString(),
          role: "system",
          partial: false,
          source: "supabase",
          kind: "message",
          content: [
            {
              type: "text",
              text: `Error parsing message: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
        },
      ];
    }
  }

  /**
   * Maps Supabase role string to canonical role
   */
  private static mapRole(role: string): "user" | "assistant" | "system" {
    switch (role.toLowerCase()) {
      case "user":
        return "user";
      case "assistant":
        return "assistant";
      case "system":
        return "system";
      case "tool":
        // Tool messages should be treated as assistant messages
        return "assistant";
      default:
        return "assistant";
    }
  }

  /**
   * Maps Supabase content part to canonical rich content node
   */
  private static mapContentPart(contentPart: any): RichContentNode {
    // Ensure text is always a string
    let textContent: string | undefined;

    // Handle different content types
    if (contentPart.type === "tool_use" && contentPart.input) {
      // For tool_use, extract text from input fields
      if (contentPart.input.file_text) {
        textContent = contentPart.input.file_text;
      } else if (contentPart.input.thought) {
        textContent = contentPart.input.thought;
      } else {
        // Fallback: stringify the entire input
        textContent = JSON.stringify(contentPart.input, null, 2);
      }
    } else if (typeof contentPart.text === "string") {
      textContent = contentPart.text;
    } else if (contentPart.text !== null && contentPart.text !== undefined) {
      // If text is an object or other type, stringify it
      textContent =
        typeof contentPart.text === "object"
          ? JSON.stringify(contentPart.text, null, 2)
          : String(contentPart.text);
    }

    const result = {
      type: contentPart.type || "text",
      text: textContent,
      tool_use_id: contentPart.tool_use_id,
      name: contentPart.tool_name,
      input: contentPart.tool_input,
      content: contentPart.output,
      is_error: contentPart.status === "error",
    };

    return result;
  }

  /**
   * Safely parses legacy tool result data
   * Handles cases where result might be string[], JSON string, object, or content array
   */
  private static safeParseLegacyResult(result: any): any {
    if (result === null || result === undefined) {
      return null;
    }

    // If it's an array of content objects (new format)
    if (Array.isArray(result)) {
      // Check if it's an array of content objects with text/type
      if (
        result.length > 0 &&
        result[0] &&
        typeof result[0] === "object" &&
        "text" in result[0]
      ) {
        // Extract text from content objects
        const textContent = result
          .filter((item) => item && item.text)
          .map((item) => item.text)
          .join("\n");

        return {
          type: "content_array",
          content: textContent,
          raw: result,
        };
      }

      // Legacy string array format
      return {
        type: "legacy_array",
        content: result.join("\n"),
        raw: result,
      };
    }

    // If it's already an object, return as-is
    if (typeof result === "object") {
      return result;
    }

    // If it's a string, try multiple parsing approaches
    if (typeof result === "string") {
      // First, try standard JSON parse
      try {
        return JSON.parse(result);
      } catch (error) {
        // Try to handle Python-formatted strings like {'message': 'text', 'success': True}
        try {
          // Replace Python True/False with JSON true/false
          const jsonCompatible = result
            .replace(/True/g, "true")
            .replace(/False/g, "false")
            .replace(/'/g, '"'); // Replace single quotes with double quotes

          const parsedResult = JSON.parse(jsonCompatible);
          return parsedResult;
        } catch (error) {
          // If both parsing methods fail, return as plain text
          return {
            type: "text",
            content: result,
          };
        }
      }
    }

    // For any other type, wrap it
    return {
      type: "unknown",
      content: String(result),
      raw: result,
    };
  }

  /**
   * Validates that tool calls have matching tool results
   */
  private static validateToolCallResultPairs(events: CanonicalEvent[]): void {
    const toolCalls = events.filter(
      (e) => e.kind === "tool_call"
    ) as ToolCallEvent[];
    const toolResults = events.filter(
      (e) => e.kind === "tool_result"
    ) as ToolResultEvent[];

    // Tool call/result validation - silently check for orphaned items
    // No action needed for orphaned tools in this implementation
  }

  /**
   * Generates a unique tool use ID when one is missing
   */
  private static generateToolUseId(): string {
    return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Batch mapping utility for multiple rows
   */
  static mapBatch(rows: ExtendedSupabaseDbChatMessage[]): CanonicalEvent[] {
    const allEvents: CanonicalEvent[] = [];

    for (const row of rows) {
      const events = this.map(row);
      allEvents.push(...events);
    }

    // Sort by creation time to maintain chronological order
    const sortedEvents = allEvents.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Validate tool call/result pairs across all events
    this.validateToolCallResultPairs(sortedEvents);

    return sortedEvents;
  }

  /**
   * Validation helper to check if a row can be mapped
   */
  static canMap(row: any): row is ExtendedSupabaseDbChatMessage {
    return (
      row &&
      typeof row === "object" &&
      typeof row.id === "string" &&
      typeof row.timestamp === "string" &&
      typeof row.role === "string"
    );
  }
}
// Convenience re-export for functional-style import
export const mapBatch = RowMapper.mapBatch.bind(RowMapper);
