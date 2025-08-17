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
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
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

  console.log(`🚀 [sendChatMessage] [${messageId}] Starting message send process`);
  console.log(`📤 [sendChatMessage] [${messageId}] Session ID: ${sessionId}`);
  console.log(`📤 [sendChatMessage] [${messageId}] User ID: ${userId}`);
  console.log(`📤 [sendChatMessage] [${messageId}] Agent Config: ${agentConfigName}`);
  console.log(`📤 [sendChatMessage] [${messageId}] Message length: ${message?.length || 0}`);
  console.log(`📤 [sendChatMessage] [${messageId}] Full params:`, params);

  if (!message) {
    console.error(`❌ [sendChatMessage] [${messageId}] Message is empty`);
    return { success: false, error: "Message is empty" };
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    console.error(`❌ [sendChatMessage] [${messageId}] Message is empty after trim`);
    return { success: false, error: "Message is empty" };
  }

  if (!sessionId || !userId) {
    console.error(`❌ [sendChatMessage] [${messageId}] Missing required IDs:`, { sessionId: !!sessionId, userId: !!userId });
    toast.error("Please sign in to send messages");
    return { success: false, error: "Missing session or user ID" };
  }

  console.log(`✅ [sendChatMessage] [${messageId}] Validation passed`);

  // Register tools (defaults to core tools if not specified)
  const toolsToRegister = params.tools || [
    "search_files",
    "cat",
    "str_replace_editor",
  ];

  console.log(`🔧 [sendChatMessage] [${messageId}] Registering tools:`, toolsToRegister);
  try {
    const toolRegStartTime = Date.now();
    await registerToolsByNames(sessionId, toolsToRegister);
    const toolRegDuration = Date.now() - toolRegStartTime;
    console.log(`✅ [sendChatMessage] [${messageId}] Tools registered successfully in ${toolRegDuration}ms`);
  } catch (error) {
    console.error(`❌ [sendChatMessage] [${messageId}] Failed to register tools:`, error);
    // Don't throw - tool registration failure shouldn't break message sending
    toast.error("Some tools may not be available", {
      description: "Continuing with message send",
    });
  }

  // Mark session as awaiting when user sends a new message
  console.log(`🔄 [sendChatMessage] [${messageId}] Marking session as awaiting`);
  useSessionStatusStore.getState().markAwaiting(sessionId);

  try {
    // 1) Optimistic event insert for UI responsiveness
    console.log(`📝 [sendChatMessage] [${messageId}] Creating optimistic user message`);
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      sessionId,
      role: ChatRole.User,
      content: [{ type: "text", text: trimmedMessage }],
      createdAt: Date.now(),
      isStreaming: false,
    };
    
    console.log(`📝 [sendChatMessage] [${messageId}] User message created:`, {
      id: userMessage.id,
      sessionId: userMessage.sessionId,
      contentLength: userMessage.content[0].text.length
    });
    
    console.log(`📝 [sendChatMessage] [${messageId}] Adding to event store...`);
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
    console.log(`✅ [sendChatMessage] [${messageId}] Optimistic user message added to event store`);

    // 2) Resolve working directory fallback
    console.log(`📁 [sendChatMessage] [${messageId}] Resolving working directory...`);
    const agentCwdOverride = acsOverrides?.agent_cwd_override;
    let effectiveAgentCwd = agentCwdOverride;
    
    console.log(`📁 [sendChatMessage] [${messageId}] Agent CWD override:`, agentCwdOverride);
    
    if (!effectiveAgentCwd && sessionData?.agent_cwd) {
      effectiveAgentCwd = sessionData.agent_cwd;
      console.log(`📁 [sendChatMessage] [${messageId}] Using fallback agent_cwd from session data:`, effectiveAgentCwd);
    }
    
    if (!effectiveAgentCwd) {
      console.warn(`⚠️ [sendChatMessage] [${messageId}] No agent_cwd_override provided`, {
        sessionId: sessionId.slice(0, 8) + "...",
        hasAcsOverrides: !!acsOverrides,
        hasSessionData: !!sessionData,
      });
    } else {
      console.log(`✅ [sendChatMessage] [${messageId}] Effective agent CWD:`, effectiveAgentCwd);
    }

    // 3) Resolve template variables and BYOK preference defaults
    console.log(`🔧 [sendChatMessage] [${messageId}] Resolving template variables and BYOK preferences...`);
    
    const resolvedTemplateVars =
      params.templateVariables ||
      ((await createACSTemplateVariables()) as unknown as {
        [key: string]: string;
      });
    
    console.log(`🔧 [sendChatMessage] [${messageId}] Template variables resolved:`, {
      provided: !!params.templateVariables,
      count: Object.keys(resolvedTemplateVars).length
    });
    
    const resolvedUseStoredKeys =
      params.useStoredKeys ?? useBYOKStore.getState().useStoredKeysPreference;
    
    console.log(`🔧 [sendChatMessage] [${messageId}] BYOK preference:`, resolvedUseStoredKeys);

    // 4) Build final ACS body for /acs/converse
    console.log(`🔨 [sendChatMessage] [${messageId}] Building ACS converse payload...`);
    const body = buildConversePayload(
      {
        ...params,
        templateVariables: resolvedTemplateVars,
        useStoredKeys: resolvedUseStoredKeys,
      },
      effectiveAgentCwd
    );
    
    console.log(`🔨 [sendChatMessage] [${messageId}] Payload built:`, {
      agent_config_name: body.agent_config_name,
      session_id: body.session_id,
      user_id: body.user_id,
      prompt_length: body.prompt?.length || 0,
      has_overrides: !!body.overrides,
      auto_mode: body.auto_mode,
      model_auto_mode: body.model_auto_mode
    });

    // 5) POST to ACS Converse using httpApi
    const ACS_BASE =
      import.meta.env.VITE_ACS_BASE_URL || "http://localhost:8000";
    const url = `${ACS_BASE}/acs/converse`;

    console.log(`🌐 [sendChatMessage] [${messageId}] ACS Base URL: ${ACS_BASE}`);
    console.log(`🌐 [sendChatMessage] [${messageId}] Full URL: ${url}`);

    // Optional: Attach Authorization header if you have a JWT; if so, remove user_id from body
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const hasJwt: boolean = false;
    console.log(`🔐 [sendChatMessage] [${messageId}] JWT authentication: ${hasJwt}`);

    if (hasJwt) {
      // add to header and remove user_id from body
      console.log(`🔐 [sendChatMessage] [${messageId}] Would add JWT to headers`);
    }

    console.log(`📡 [sendChatMessage] [${messageId}] Preparing POST request to ACS`);
    console.log(`📡 [sendChatMessage] [${messageId}] Headers:`, headers);
    console.log(`📡 [sendChatMessage] [${messageId}] Body (redacted):`, 
      JSON.stringify({ ...body, prompt: `[${body.prompt.length} chars]` }, null, 2)
    );

    console.log(`🚀 [sendChatMessage] [${messageId}] Sending POST request to ACS...`);
    const requestStartTime = Date.now();
    
    // Use httpApi for the POST request
    const res = await httpApi.POST<ConverseResponse>(url, {
      headers,
      body,
    });
    
    const requestDuration = Date.now() - requestStartTime;
    console.log(`📥 [sendChatMessage] [${messageId}] ACS request completed in ${requestDuration}ms`);

    console.log(`🔍 [sendChatMessage] [${messageId}] Checking ACS response...`);
    console.log(`🔍 [sendChatMessage] [${messageId}] Response status:`, res?.status);
    console.log(`🔍 [sendChatMessage] [${messageId}] Response ok:`, res?.ok);
    
    if (!res || !res.ok) {
      const errText = res?.rawBody || res?.statusText || "";
      console.error(`❌ [sendChatMessage] [${messageId}] ACS request failed:`, {
        status: res?.status,
        statusText: res?.statusText,
        rawBody: res?.rawBody,
        error: errText
      });
      throw new Error(`ACS converse error ${res?.status ?? "?"}: ${errText}`);
    }

    const data = res.data;
    console.log(`✅ [sendChatMessage] [${messageId}] ACS accepted message successfully!`);
    console.log(`✅ [sendChatMessage] [${messageId}] ACS response data:`, {
      session_id: data.session_id,
      suspended: data.conversation_suspended,
      cwd: data.current_agent_cwd,
      response_messages_count: data.response_messages?.length || 0,
      final_text_response: data.final_text_response ? '[present]' : '[null]'
    });

    // 6) Update status to reflect successful send to ACS
    console.log(`🔄 [sendChatMessage] [${messageId}] Updating session status to awaiting`);
    useSessionStatusStore.getState().markAwaiting(sessionId);

    console.log(`✅ [sendChatMessage] [${messageId}] Message send process completed successfully!`);
    return {
      success: true,
      userMessageId: userMessage.id,
    };
  } catch (error) {
    console.error(`💥 [sendChatMessage] [${messageId}] Failed to send message:`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    toast.error("Failed to send message");
    console.log(`🔄 [sendChatMessage] [${messageId}] Marking session as error`);
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
