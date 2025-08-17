/**
 * Shared helper for sending chat messages across the application
 * Extracted from ChatMainCanonicalLegacy to eliminate code duplication
 */

import { toast } from "sonner";
import { useSessionStatusStore } from "@/stores/sessionStatusStore";
import { useEventStore } from "@/stores/eventStores";
import { useBYOKStore } from "@/stores/byokStore";
import { createACSTemplateVariables } from "@/utils/templateVariables";
import { registerToolsByNames } from "@/utils/toolSpecRegistry";

import { httpApi } from "@/api/httpApi";

import {
  ChatRole,
  type ChatMessage as ChatMessageType,
} from "@/types/chatTypes";

/**
 * The 4 specific ACS roles that support model overrides
 */
export type ACSRoles = "explore" | "plan" | "execute" | "debug";

/**
 * Role-specific model overrides with strict typing for the 4 ACS roles
 * Each role can optionally specify a model ID to override the default
 */
export interface RoleModelOverrides {
  explore?: string;
  plan?: string;
  execute?: string;
  debug?: string;
}

/**
 * Available model options for each ACS role based on user specifications
 */
export const EXPLORE_MODELS = ["gpt-4.1", "z-ai/glm-4.5"] as const;
export const DEBUG_MODELS = ["o3"] as const;
export const PLAN_MODELS = ["o3"] as const;
export const EXECUTE_MODELS = ["claude-4-sonnet", "z-ai/glm-4.5"] as const;

/**
 * Type for available models per role
 */
export type ExploreModels = (typeof EXPLORE_MODELS)[number];
export type DebugModels = (typeof DEBUG_MODELS)[number];
export type PlanModels = (typeof PLAN_MODELS)[number];
export type ExecuteModels = (typeof EXECUTE_MODELS)[number];

/**
 * Utility function to get available models for a specific role
 * @param role - The ACS role to get models for
 * @returns Array of available model IDs for the role
 */
export function getModelsForRole(role: ACSRoles): readonly string[] {
  switch (role) {
    case "explore":
      return EXPLORE_MODELS;
    case "debug":
      return DEBUG_MODELS;
    case "plan":
      return PLAN_MODELS;
    case "execute":
      return EXECUTE_MODELS;
    default:
      // TypeScript should prevent this, but fallback for runtime safety
      const _exhaustiveCheck: never = role;
      return [];
  }
}

export interface SendChatMessageParams {
  sessionId: string;
  message: string;
  userId: string;
  agentConfigName: string;
  acsClient: any; // ACS client instance
  acsOverrides?: {
    agent_cwd_override?: string; // 🎯 CRITICAL: Working directory override for agent execution
    [key: string]: any; // Other overrides (model selection, etc.)
  };
  // Optional: Session data for fallback agent_cwd lookup
  sessionData?: {
    agent_cwd?: string;
    [key: string]: any;
  };
  // Optional: Enable role-based auto mode for agent configuration selection (defaults to false)
  // Flows via camelCase autoMode key in options to ACSCoreService.sendMessage
  autoMode?: boolean;
  // Optional: Enable role-based auto mode for AI model selection (defaults to false)
  // Flows via camelCase modelAutoMode key in options to ACSCoreService.sendMessage
  modelAutoMode?: boolean;
  // Optional: Model API keys to use for this request (overrides stored keys)
  modelApiKeys?: { [provider: string]: string };
  // Optional: Whether to use stored API keys (defaults to true)
  useStoredKeys?: boolean;
  // Optional: Agent configuration overrides for model selection, tools, etc.
  overrides?: {
    model_id?: string;
    provider_name?: string;
    system_prompt?: string;
    enabled_tool_groups?: string[];
    enabled_tools?: string[];
    disabled_tools?: string[];
  };
  // Optional: Template variables for prompt substitution
  templateVariables?: { [key: string]: string };
  // Optional: Explicit model ID to use (overrides auto mode and role overrides)
  // Flows via camelCase explicitModelId key in options to ACSCoreService.sendMessage
  explicitModelId?: string;
  // Optional: Role-specific model overrides for auto mode (restricted to 4 ACS roles)
  // Flows via camelCase roleModelOverrides key in options to ACSCoreService.sendMessage
  roleModelOverrides?: RoleModelOverrides;
  // Optional: Whether this is a background session (no SSE events, no Supabase updates)
  isBackgroundSession?: boolean;
  // Optional: Tools to register before sending the message (defaults to core tools if not specified)
  tools?: string[];
}

export interface SendChatMessageResult {
  success: boolean;
  userMessageId?: string;
  error?: string;
}

// Type alias for backward compatibility and easier importing
export type SendChatMessageOptions = SendChatMessageParams;

// Valid keys for AgentConfigOverrides
export const VALID_OVERRIDE_KEYS = [
  "model_id",
  "provider_name",
  "system_prompt",
  "enabled_tool_groups",
  "enabled_tools",
  "disabled_tools",
  "agent_cwd_override",
] as const;

/**
 * Type guard to validate that overrides object only contains valid keys
 * @param overrides - The overrides object to validate
 * @returns boolean - True if all keys are valid, false otherwise
 */
export function isValidAgentConfigOverrides(
  overrides: Record<string, any>
): boolean {
  if (!overrides || typeof overrides !== "object") {
    return false;
  }

  const overrideKeys = Object.keys(overrides);
  return overrideKeys.every((key) => VALID_OVERRIDE_KEYS.includes(key as any));
}

type ConverseResponse = {
  session_id: string;
  response_messages: any[];
  final_text_response: string | null;
  current_agent_cwd?: string;
  conversation_suspended: boolean;
};

/**
 * Canonical message sending function that handles:
 * - Session status updates (mark as awaiting)
 * - Optimistic message creation and event store updates
 * - Template variables and API key preferences
 * - ACS overrides (model selection, etc.)
 * - Actual message transmission via ACS
 * - Error handling with user feedback
 */
export async function sendChatMessage(
  params: SendChatMessageParams
): Promise<SendChatMessageResult> {
  const {
    sessionId,
    message,
    userId,
    agentConfigName,
    acsOverrides,
    sessionData,
    autoMode = false, // Default to false unless explicitly set
    modelAutoMode = false, // Default to false unless explicitly set
    overrides = {}, // Default to empty object
  } = params;

  console.log("📤 [sendChatMessage] Received params:", params);

  if (!message) return { success: false, error: "Message is empty" };

  const trimmedMessage = message.trim();
  if (!trimmedMessage) return { success: false, error: "Message is empty" };

  if (!sessionId || !userId) {
    toast.error("Please sign in to send messages");
    return { success: false, error: "Missing session or user ID" };
  }

  // Register tools (defaults to core tools if not specified)
  const toolsToRegister = params.tools || [
    "search_files",
    "cat",
    "str_replace_editor",
  ];

  console.log("🔧 [sendChatMessage] Registering tools:", toolsToRegister);
  try {
    await registerToolsByNames(sessionId, toolsToRegister);
    console.log("✅ [sendChatMessage] Tools registered successfully");
  } catch (error) {
    console.error("❌ [sendChatMessage] Failed to register tools:", error);
    // Don't throw - tool registration failure shouldn't break message sending
    toast.error("Some tools may not be available", {
      description: "Continuing with message send",
    });
  }

  // Mark session as awaiting when user sends a new message
  useSessionStatusStore.getState().markAwaiting(sessionId);

  try {
    // 1) Optimistic event insert for UI responsiveness
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      sessionId,
      role: ChatRole.User,
      content: [{ type: "text", text: trimmedMessage }],
      createdAt: Date.now(),
      isStreaming: false,
    };
    useEventStore.getState().addEvent({
      id: userMessage.id,
      kind: "message",
      role: "user",
      content: userMessage.content,
      createdAt: new Date(userMessage.createdAt).toISOString(),
      sessionId,
      partial: false,
      source: "sse" as const, // could be 'local' if you want to distinguish
    });
    console.log(
      "✅ [sendChatMessage] Added optimistic user message to event store"
    );

    // 2) Resolve working directory fallback
    const agentCwdOverride = acsOverrides?.agent_cwd_override;
    let effectiveAgentCwd = agentCwdOverride;
    if (!effectiveAgentCwd && sessionData?.agent_cwd) {
      effectiveAgentCwd = sessionData.agent_cwd;
      console.log(
        "📁 [sendChatMessage] Using fallback agent_cwd from session data:",
        effectiveAgentCwd
      );
    }
    if (!effectiveAgentCwd) {
      console.warn("⚠️ [sendChatMessage] No agent_cwd_override provided", {
        sessionId: sessionId.slice(0, 8) + "...",
        hasAcsOverrides: !!acsOverrides,
        hasSessionData: !!sessionData,
      });
    }

    // 3) Resolve template variables and BYOK preference defaults
    const resolvedTemplateVars =
      params.templateVariables ||
      ((await createACSTemplateVariables()) as unknown as {
        [key: string]: string;
      });
    const resolvedUseStoredKeys =
      params.useStoredKeys ?? useBYOKStore.getState().useStoredKeysPreference;

    // 4) Build final ACS body for /acs/converse
    const body = buildConversePayload(
      {
        ...params,
        templateVariables: resolvedTemplateVars,
        useStoredKeys: resolvedUseStoredKeys,
      },
      effectiveAgentCwd
    );

    // 5) POST to ACS Converse using httpApi
    const ACS_BASE =
      import.meta.env.VITE_ACS_BASE_URL || "http://localhost:8000";
    const url = `${ACS_BASE}/acs/converse`;

    console.log(ACS_BASE);
    console.log(`URL:::::: ${url}`);

    // Optional: Attach Authorization header if you have a JWT; if so, remove user_id from body
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const hasJwt: boolean = false;

    if (hasJwt) {
      // add to header and remove user_id from body
    }

    console.log(
      "📡 [sendChatMessage] POST /acs/converse with redacted body:",
      JSON.stringify({ ...body, prompt: `len(${body.prompt.length})` }, null, 2)
    );

    // Use httpApi for the POST request
    const res = await httpApi.POST<ConverseResponse>(url, {
      headers,
      body,
    });

    if (!res || !res.ok) {
      const errText = res?.rawBody || res?.statusText || "";
      throw new Error(`ACS converse error ${res?.status ?? "?"}: ${errText}`);
    }

    const data = res.data;
    console.log("✅ [sendChatMessage] ACS accepted message", {
      session_id: data.session_id,
      suspended: data.conversation_suspended,
      cwd: data.current_agent_cwd,
    });

    // 6) Update status to reflect successful send to ACS
    useSessionStatusStore.getState().markAwaiting(sessionId);

    return {
      success: true,
      userMessageId: userMessage.id,
    };
  } catch (error) {
    console.error("❌ [sendChatMessage] Failed to send message:", error);
    toast.error("Failed to send message");
    useSessionStatusStore.getState().markError(sessionId);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * React hook version for components that need reactive access
 */
export function useSendChatMessage() {
  return {
    sendChatMessage,
  };
}

type ConverseRequest = {
  user_id?: string;
  agent_config_name: string;
  prompt: string;
  session_id?: string;
  messages_history_override?: any[];
  model_api_keys?: Record<string, string>;
  use_stored_keys?: boolean;
  overrides?: Partial<ConverseRequestOverride>;
  template_variables?: Record<string, string>;
  auto_mode?: boolean;
  model_auto_mode?: boolean;
  explicit_model_id?: string;
  role_model_overrides?: Record<string, string>;
  is_background_session?: boolean;
};

type ConverseRequestOverride = {
  model_id: string;
  provider_name?: string;
  system_prompt?: string;
  enabled_tool_groups?: string[];
  enabled_tools?: string[];
  disabled_tools?: string[];
  agent_cwd_override?: string;
};

function buildConversePayload(
  params: SendChatMessageParams,
  effectiveAgentCwd?: string
): ConverseRequest {
  const {
    sessionId,
    message,
    userId,
    agentConfigName,
    modelApiKeys,
    useStoredKeys,
    overrides,
    templateVariables,
    autoMode,
    modelAutoMode,
    explicitModelId,
    roleModelOverrides,
    isBackgroundSession,
  } = params;

  // Merge overrides with backward-compatible acsOverrides
  const mergedOverrides = {
    ...(params.acsOverrides || {}),
    ...(overrides || {}),
  };

  // Honor agent_cwd_override fallback
  if (effectiveAgentCwd && !mergedOverrides.agent_cwd_override) {
    mergedOverrides.agent_cwd_override = effectiveAgentCwd;
  }

  const payload: ConverseRequest = {
    agent_config_name: agentConfigName,
    prompt: message.trim(),
    session_id: sessionId,
    // If no Authorization header will be supplied, include user_id here:
    user_id: userId,
    model_api_keys:
      modelApiKeys && Object.keys(modelApiKeys).length
        ? modelApiKeys
        : undefined,
    use_stored_keys: useStoredKeys,
    overrides:
      mergedOverrides && Object.keys(mergedOverrides).length
        ? mergedOverrides
        : undefined,
    template_variables:
      templateVariables && Object.keys(templateVariables).length
        ? templateVariables
        : undefined,
    auto_mode: autoMode,
    model_auto_mode: modelAutoMode,
    explicit_model_id: explicitModelId,
    role_model_overrides:
      roleModelOverrides && Object.keys(roleModelOverrides).length
        ? Object.fromEntries(
            Object.entries(roleModelOverrides).filter(
              ([_, value]) => typeof value === "string"
            )
          )
        : undefined,
    is_background_session: isBackgroundSession,
  };

  return payload;
}
