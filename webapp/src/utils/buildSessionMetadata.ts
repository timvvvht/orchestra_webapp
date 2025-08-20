/**
 * Utility for building complete session metadata to prevent incomplete sessions.
 * This ensures every session has all required fields for proper operation.
 */

import { SessionMetadata } from "@/types/chatTypes";

/**
 * Input parameters for building session metadata.
 * All fields are optional and will be filled with defaults if not provided.
 */
export interface SessionMetadataInput {
  model: string;
  tools: string[];
  specialty: string;
  avatar: string;
  systemPrompt: string;
  temperature: number;
  [key: string]: any; // Allow additional metadata fields
}

/**
 * Builds complete session metadata by merging input with defaults.
 * This ensures no session is created with incomplete metadata.
 *
 * @param input - Partial metadata input (all fields optional)
 * @returns Complete session metadata with all required fields
 */
export function buildSessionMetadata(
  input: SessionMetadataInput
): SessionMetadata {
  // Start with default configuration
  const metadata: SessionMetadata = {
    model: input.model ?? "general",
    tools: input.tools ?? [], // Clone array to avoid mutations
    specialty: input.specialty,
    avatar: input.avatar,
    system_prompt: input.systemPrompt,
    temperature: input.temperature,
  };

  // Add any additional fields from input (excluding the ones we already handled)
  const handledFields = new Set([
    "model",
    "tools",
    "specialty",
    "avatar",
    "systemPrompt",
    "temperature",
  ]);

  for (const [key, value] of Object.entries(input)) {
    if (!handledFields.has(key) && value !== undefined) {
      metadata[key] = value;
    }
  }

  return metadata;
}

/**
 * Validates that session metadata contains all required fields.
 * Used for checking existing sessions and ensuring completeness.
 *
 * @param metadata - Metadata to validate
 * @returns true if metadata is complete, false otherwise
 */
export function isSessionMetadataComplete(
  metadata: any
): metadata is SessionMetadata {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }

  const requiredFields = [
    "model",
    "tools",
    "specialty",
    "avatar",
    "system_prompt",
    "temperature",
  ];

  return requiredFields.every((field) => {
    const value = metadata[field];

    switch (field) {
      case "model":
      case "specialty":
      case "avatar":
      case "system_prompt":
        return typeof value === "string" && value.length > 0;
      case "tools":
        return Array.isArray(value);
      case "temperature":
        return typeof value === "number" && value >= 0 && value <= 2;
      default:
        return value !== undefined && value !== null;
    }
  });
}

/**
 * Repairs incomplete session metadata by filling missing fields with defaults.
 * Used for fixing existing sessions that may have incomplete metadata.
 *
 * @param metadata - Potentially incomplete metadata
 * @returns Complete session metadata
 */
export function repairSessionMetadata(metadata: any): SessionMetadata {
  if (isSessionMetadataComplete(metadata)) {
    return metadata;
  }

  // If metadata is completely missing or invalid, start fresh
  if (!metadata || typeof metadata !== "object") {
    return buildSessionMetadata({});
  }

  // Repair by merging with defaults
  return buildSessionMetadata(metadata);
}
