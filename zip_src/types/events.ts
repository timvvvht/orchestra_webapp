/**
 * Canonical Event System Types
 *
 * This provides the single source of truth for all chat events,
 * whether they come from Supabase history or real-time SSE streams.
 *
 * Phase 1: Playground implementation with Zod validation
 */

import { z } from "zod";

// Core type definitions
export type EventId = string;
export type ToolUseId = string;

// Enums for validation
export const RoleEnum = z.enum(["user", "assistant", "system"]);
export const KindEnum = z.enum([
  "message",
  "tool_call",
  "tool_result",
  "checkpoint",
]);
export const SourceEnum = z.enum(["supabase", "sse"]);

// Rich content node schema (simplified for Phase 1)
export const RichContentNode = z.object({
  type: z.enum(["text", "tool_use", "tool_result"]),
  text: z.string().optional(),
  tool_use_id: z.string().optional(),
  name: z.string().optional(),
  input: z.any().optional(),
  content: z.string().optional(),
  is_error: z.boolean().optional(),
});

// Base canonical event schema
export const CanonicalBase = z.object({
  id: z.string(),
  createdAt: z.string(), // ISO 8601 timestamp
  role: RoleEnum,
  partial: z.boolean(),
  source: SourceEnum,
  sessionId: z.string().optional(), // Session association
});

// Specific event type schemas
export const MessageEvent = CanonicalBase.extend({
  kind: z.literal("message"),
  content: z.array(RichContentNode),
  toolUseId: z.string().optional(),
});

export const ToolCallEvent = CanonicalBase.extend({
  kind: z.literal("tool_call"),
  toolUseId: z.string(),
  name: z.string(),
  args: z.any(), // JSON object
});

export const ToolResultEvent = CanonicalBase.extend({
  kind: z.literal("tool_result"),
  toolUseId: z.string(),
  result: z.any(), // JSON object
});

// Checkpoint event schema
export const CheckpointEvent = CanonicalBase.extend({
  kind: z.literal("checkpoint"),
  data: z.object({
    phase: z.enum(["start", "end"]),
    commitHash: z.string().nullable().optional(),
    stats: z
      .object({
        filesChanged: z.number(),
        linesAdded: z.number(),
        linesRemoved: z.number(),
        fileList: z.array(
          z.object({
            path: z.string(),
            linesAdded: z.number(),
            linesRemoved: z.number(),
          })
        ),
      })
      .optional(),
  }),
});

// Union type for all canonical events
export const CanonicalEvent = z.union([
  MessageEvent,
  ToolCallEvent,
  ToolResultEvent,
  CheckpointEvent,
]);

// TypeScript types inferred from Zod schemas
export type CanonicalBase = z.infer<typeof CanonicalBase>;
export type MessageEvent = z.infer<typeof MessageEvent>;
export type ToolCallEvent = z.infer<typeof ToolCallEvent>;
export type ToolResultEvent = z.infer<typeof ToolResultEvent>;
export type CheckpointEvent = z.infer<typeof CheckpointEvent>;
export type CanonicalEvent = z.infer<typeof CanonicalEvent>;
export type RichContentNode = z.infer<typeof RichContentNode>;

// Type guards for narrowing CanonicalEvent types
export const isMessageEvent = (event: CanonicalEvent): event is MessageEvent =>
  event.kind === "message";

export const isToolCallEvent = (
  event: CanonicalEvent
): event is ToolCallEvent => event.kind === "tool_call";

export const isToolResultEvent = (
  event: CanonicalEvent
): event is ToolResultEvent => event.kind === "tool_result";

export const isCheckpointEvent = (
  event: CanonicalEvent
): event is CheckpointEvent => event.kind === "checkpoint";

// Validation helpers
export const validateCanonicalEvent = (data: unknown): CanonicalEvent => {
  return CanonicalEvent.parse(data);
};

export const safeValidateCanonicalEvent = (
  data: unknown
): {
  success: boolean;
  data?: CanonicalEvent;
  error?: z.ZodError;
} => {
  const result = CanonicalEvent.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
};

// Legacy parsing utility for backward compatibility
export const safeParseLegacy = (legacyData: any): CanonicalEvent[] => {
  // This will be implemented in the adapters
  // For now, return empty array as placeholder
  return [];
};

// Patch type for SSE streaming updates
export const EventPatch = z.object({
  eventId: z.string(),
  operation: z.enum(["append", "complete", "error"]),
  data: z.any(),
});

export type EventPatch = z.infer<typeof EventPatch>;

// Export validation schemas for use in adapters
// Note: RoleEnum, KindEnum, SourceEnum, and CanonicalBase are already exported above
export {
  MessageEvent as MessageEventSchema,
  ToolCallEvent as ToolCallEventSchema,
  ToolResultEvent as ToolResultEventSchema,
  CheckpointEvent as CheckpointEventSchema,
  CanonicalEvent as CanonicalEventSchema,
  EventPatch as EventPatchSchema,
};
