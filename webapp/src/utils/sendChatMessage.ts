/**
 * Shared helper for sending chat messages across the application
 * Extracted from ChatMainCanonicalLegacy to eliminate code duplication
 */

import { toast } from "sonner";
import { useSessionStatusStore } from "@/stores/sessionStatusStore";
import { useEventStore } from "@/stores/eventStore";
import { useBYOKStore } from "@/stores/byokStore";
import { createACSTemplateVariables } from "@/utils/templateVariables";
import { registerToolsByNames } from "@/utils/toolSpecRegistry";
import {
  createSessionFast,
  CreateSessionOptions,
} from "@/hooks/useCreateSessionFast";

import { httpApi } from "@/api/httpApi";
import { supabase } from "@/auth/SupabaseClient";

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
  sessionId?: string; // Made optional - will create session if not provided
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

  // Web-origin repo context: triggers /acs/converse/web flow when provided
  repoContextWeb?: {
    repo_id: number;
    repo_full_name: string;
    branch: string;
  };
  // Explicit endpoint selector (default: 'generic')
  endpoint?: "web" | "generic";
  images?: string[];

  // Session creation options (used when sessionId is not provided)
  sessionCreationOptions?: {
    sessionName?: string;
    agentConfigId?: string;
    workspacePath?: string;
    metadata?: Record<string, any>;
    repoContext?: {
      repo_id: number;
      repo_full_name: string;
      branch: string;
    };
    existingSessionId?: string; // Added for existing session check
  };
}

export interface SendChatMessageResult {
  success: boolean;
  userMessageId?: string;
  sessionId?: string; // Include the session ID (created or existing)
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
  if (!params.images) params.images = [];

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
    images = [], // default empty
    repoContextWeb,
    endpoint = "web",
  } = params;

  console.log(
    `🚀 [sendChatMessage] [${messageId}] Starting message send process`
  );
  console.log(`📤 [sendChatMessage] [${messageId}] Session ID: ${sessionId}`);
  console.log(`📤 [sendChatMessage] [${messageId}] User ID: ${userId}`);
  console.log(
    `📤 [sendChatMessage] [${messageId}] Agent Config: ${agentConfigName}`
  );
  // amazonq-ignore-next-line

  // amazonq-ignore-next-line
  console.log(
    `📤 [sendChatMessage] [${messageId}] Message length: ${message?.length || 0}`
  );
  console.log(
    `📤 [sendChatMessage] [${messageId}] Images count: ${images.length}`
  );
  // amazonq-ignore-next-line
  console.log(`📤 [sendChatMessage] [${messageId}] Full params:`, params);

  if (!message) {
    console.error(`❌ [sendChatMessage] [${messageId}] Message is empty`);
    return { success: false, error: "Message is empty" };
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    console.error(
      `❌ [sendChatMessage] [${messageId}] Message is empty after trim`
    );
    return { success: false, error: "Message is empty" };
  }

  if (!userId) {
    console.error(`❌ [sendChatMessage] [${messageId}] Missing user ID`);
    toast.error("Please sign in to send messages");
    return { success: false, error: "Missing user ID" };
  }

  // Handle session creation - always create session to ensure it's in the database
  let effectiveSessionId = sessionId;
  console.log(
    `🆕 [sendChatMessage] [${messageId}] Ensuring session exists in database...`
  );

  try {
    const sessionCreationOptions = params.sessionCreationOptions || {};

    // Use repoContextWeb if available for session creation
    if (params.repoContextWeb) {
      sessionCreationOptions.repoContext = params.repoContextWeb;
    }

    // Use agent_cwd_override as workspacePath if available
    if (params.acsOverrides?.agent_cwd_override) {
      sessionCreationOptions.workspacePath =
        params.acsOverrides.agent_cwd_override;
    }

    // Set default session name if not provided
    if (!sessionCreationOptions.sessionName) {
      sessionCreationOptions.sessionName = `Chat: ${trimmedMessage.slice(0, 50)}${trimmedMessage.length > 50 ? "..." : ""}`;
    }

    // Set default agent config if not provided
    if (!sessionCreationOptions.agentConfigId) {
      sessionCreationOptions.agentConfigId = agentConfigName;
    }

    // If we have an existing sessionId, use it for the session creation
    if (effectiveSessionId) {
      sessionCreationOptions.sessionName = `Chat: ${trimmedMessage.slice(0, 50)}${trimmedMessage.length > 50 ? "..." : ""}`;
      // Pass the existing session ID to check if it exists before creating
      sessionCreationOptions.existingSessionId = effectiveSessionId;
    }

    console.log(
      `🆕 [sendChatMessage] [${messageId}] Creating/ensuring session with options:`,
      sessionCreationOptions
    );

    const sessionResult = await createSessionFast(sessionCreationOptions);

    if (!sessionResult.success || !sessionResult.sessionId) {
      console.error(
        `❌ [sendChatMessage] [${messageId}] Failed to create/ensure session:`,
        sessionResult.error
      );
      toast.error("Failed to create chat session", {
        description: sessionResult.error || "Unknown error occurred",
      });
      return {
        success: false,
        error: `Failed to create session: ${sessionResult.error}`,
      };
    }

    // Use the session ID from the result (either newly created or existing)
    effectiveSessionId = sessionResult.sessionId;
    console.log(
      `✅ [sendChatMessage] [${messageId}] Session ensured in database: ${effectiveSessionId}`
    );
  } catch (error) {
    console.error(
      `❌ [sendChatMessage] [${messageId}] Exception during session creation:`,
      error
    );
    toast.error("Failed to create chat session", {
      description:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
    return {
      success: false,
      error: `Session creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  console.log(
    `✅ [sendChatMessage] [${messageId}] Validation passed, using session ID: ${effectiveSessionId}`
  );

  // Register tools (defaults to core tools if not specified)
  const toolsToRegister = params.tools || [
    "search_files",
    "cat",
    "str_replace_editor",
  ];

  console.log(
    `🔧 [sendChatMessage] [${messageId}] Registering tools:`,
    toolsToRegister
  );
  try {
    const toolRegStartTime = Date.now();
    await registerToolsByNames(effectiveSessionId, toolsToRegister);
    const toolRegDuration = Date.now() - toolRegStartTime;
    console.log(
      `✅ [sendChatMessage] [${messageId}] Tools registered successfully in ${toolRegDuration}ms`
    );
  } catch (error) {
    console.error(
      `❌ [sendChatMessage] [${messageId}] Failed to register tools:`,
      error
    );
    // Don't throw - tool registration failure shouldn't break message sending
    toast.error("Some tools may not be available", {
      description: "Continuing with message send",
    });
  }

  // Mark session as awaiting when user sends a new message
  console.log(
    `🔄 [sendChatMessage] [${messageId}] Marking session as awaiting`
  );
  useSessionStatusStore.getState().markAwaiting(effectiveSessionId);

  try {
    // 1) Optimistic event insert for UI responsiveness
    console.log(
      `📝 [sendChatMessage] [${messageId}] Creating optimistic user message`
    );
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      sessionId: effectiveSessionId,
      role: ChatRole.User,
      content: [{ type: "text", text: trimmedMessage }],
      createdAt: Date.now(),
      isStreaming: false,
      images,
    };

    console.log(`📝 [sendChatMessage] [${messageId}] User message created:`, {
      id: userMessage.id,
      sessionId: userMessage.sessionId,
      contentLength:
        userMessage.content[0]?.type === "text"
          ? userMessage.content[0].text?.length || 0
          : 0,
      imagesCount: userMessage.images?.length || 0,
    });
    console.log(
      `🖼️ [sendChatMessage] [${messageId}] User message images:`,
      userMessage.images
    );

    console.log(`📝 [sendChatMessage] [${messageId}] Adding to event store...`);
    useEventStore.getState().addEvent({
      id: userMessage.id,
      kind: "message",
      role: "user",
      content: userMessage.content,
      createdAt: new Date(userMessage.createdAt).toISOString(),
      sessionId: effectiveSessionId,
      partial: false,
      source: "sse" as const, // could be 'local' if you want to distinguish
      //images: images,
    });
    console.log(
      `✅ [sendChatMessage] [${messageId}] Optimistic user message added to event store`
    );

    // 2) Resolve working directory fallback
    console.log(
      `📁 [sendChatMessage] [${messageId}] Resolving working directory...`
    );
    const agentCwdOverride = acsOverrides?.agent_cwd_override;
    let effectiveAgentCwd = agentCwdOverride;

    console.log(
      `📁 [sendChatMessage] [${messageId}] Agent CWD override:`,
      agentCwdOverride
    );

    if (!effectiveAgentCwd && sessionData?.agent_cwd) {
      effectiveAgentCwd = sessionData.agent_cwd;
      // amazonq-ignore-next-line
      console.log(
        `📁 [sendChatMessage] [${messageId}] Using fallback agent_cwd from session data:`,
        effectiveAgentCwd
      );
    }

    if (!effectiveAgentCwd) {
      console.warn(
        `⚠️ [sendChatMessage] [${messageId}] No agent_cwd_override provided`,
        {
          sessionId: effectiveSessionId.slice(0, 8) + "...",
          hasAcsOverrides: !!acsOverrides,
          hasSessionData: !!sessionData,
        }
      );
    } else {
      // amazonq-ignore-next-line
      console.log(
        `✅ [sendChatMessage] [${messageId}] Effective agent CWD:`,
        effectiveAgentCwd
      );
    }

    // 3) Resolve template variables and BYOK preference defaults
    console.log(
      `🔧 [sendChatMessage] [${messageId}] Resolving template variables and BYOK preferences...`
    );

    const resolvedTemplateVars =
      params.templateVariables ||
      ((await createACSTemplateVariables()) as unknown as {
        [key: string]: string;
      });

    console.log(
      `🔧 [sendChatMessage] [${messageId}] Template variables resolved:`,
      {
        provided: !!params.templateVariables,
        count: Object.keys(resolvedTemplateVars).length,
      }
    );

    const resolvedUseStoredKeys =
      params.useStoredKeys ?? useBYOKStore.getState().useStoredKeysPreference;

    console.log(
      `🔧 [sendChatMessage] [${messageId}] BYOK preference:`,
      resolvedUseStoredKeys
    );

    // 4) Decide endpoint and build payload
    const isWebOrigin = endpoint === "web" || !!repoContextWeb;
    console.log(
      `🌐 [sendChatMessage] [${messageId}] Origin:`,
      isWebOrigin ? "web" : "generic"
    );
    console.log(
      `🌐 [sendChatMessage] [${messageId}] Endpoint selected:`,
      isWebOrigin ? "/acs/converse/web" : "/acs/converse"
    );
    console.log(
      `🌐 [sendChatMessage] [${messageId}] repoContextWeb:`,
      repoContextWeb
    );

    let body: any;
    if (isWebOrigin) {
      if (
        !repoContextWeb?.repo_id ||
        !repoContextWeb?.repo_full_name ||
        !repoContextWeb?.branch
      ) {
        console.error(
          `❌ [sendChatMessage] [${messageId}] Missing repoContextWeb fields for web-origin:`,
          repoContextWeb
        );
        return {
          success: false,
          error: "Missing repo context for web conversation",
        };
      }
      body = buildWebConversePayload(
        {
          ...params,
          sessionId: effectiveSessionId, // Use the effective session ID
          templateVariables: resolvedTemplateVars,
          useStoredKeys: resolvedUseStoredKeys,
        },
        effectiveAgentCwd
      );
    } else {
      console.log(
        `🔨 [sendChatMessage] [${messageId}] Building ACS generic converse payload...`
      );
      try {
        body = buildConversePayload(
          {
            ...params,
            sessionId: effectiveSessionId, // Use the effective session ID
            templateVariables: resolvedTemplateVars,
            useStoredKeys: resolvedUseStoredKeys,
          },
          effectiveAgentCwd
        );
      } catch (error) {
        console.error(
          `❌ [sendChatMessage] [${messageId}] Failed to build payload:`,
          error
        );
        throw error;
      }
    }

    console.log(`🔨 [sendChatMessage] [${messageId}] Payload built:`, {
      agent_config_name: body.agent_config_name,
      session_id: body.session_id,
      user_id: body.user_id,
      prompt_length: body.prompt?.length || 0,
      has_overrides: !!body.overrides,
      auto_mode: body.auto_mode,
      model_auto_mode: body.model_auto_mode,
      images_count: body.images?.length || 0,
    });
    console.log(
      `🖼️ [sendChatMessage] [${messageId}] Images in payload:`,
      body.images
    );

    // 5) POST to ACS Converse using httpApi
    const ACS_BASE =
      import.meta.env.VITE_ACS_BASE_URL || "http://localhost:8001";
    const url = `${ACS_BASE}${isWebOrigin ? "/acs/converse/web" : "/acs/converse"}`;
    console.log(
      `🌐 [sendChatMessage] [${messageId}] ACS Base URL: ${ACS_BASE}`
    );
    console.log(`🌐 [sendChatMessage] [${messageId}] Full URL: ${url}`);

    // Optional: Attach Authorization header if you have a JWT; if so, remove user_id from body
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(isWebOrigin ? { "X-Orchestra-Web-Origin": "true" } : {}),
    };
    // Attach Supabase Authorization only for web-origin calls
    if (isWebOrigin) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
          console.log(
            `🔐 [sendChatMessage] [${messageId}] Attached Supabase JWT for web-origin`
          );
        } else {
          console.warn(
            `⚠️ [sendChatMessage] [${messageId}] No Supabase session available for web-origin Authorization`
          );
        }
      } catch (e) {
        console.error(
          `❌ [sendChatMessage] [${messageId}] Failed to fetch Supabase session:`,
          {
            error: e instanceof Error ? e.message : e,
            stack: e instanceof Error ? e.stack : undefined,
          }
        );
      }
    }

    console.log(
      `📡 [sendChatMessage] [${messageId}] Preparing POST request to ACS`
    );
    console.log(`📡 [sendChatMessage] [${messageId}] Headers:`, headers);
    console.log(
      `📡 [sendChatMessage] [${messageId}] Body (redacted):`,
      JSON.stringify(
        { ...body, prompt: `[${body.prompt.length} chars]` },
        null,
        2
      )
    );
    console.log(
      `🖼️ [sendChatMessage] [${messageId}] IMAGES IN REQUEST BODY:`,
      body.images
    );

    console.log(
      `🚀 [sendChatMessage] [${messageId}] Sending POST request to ACS...`
    );
    const requestStartTime = Date.now();

    // Use httpApi for the POST request
    console.log(`📡 [sendChatMessage] [${messageId}] Posting to: ${url}`);
    const res = await httpApi.POST<ConverseResponse>(url, {
      headers,
      body,
    });

    const requestDuration = Date.now() - requestStartTime;
    console.log(
      `📥 [sendChatMessage] [${messageId}] ACS request completed in ${requestDuration}ms`
    );

    console.log(`🔍 [sendChatMessage] [${messageId}] Checking ACS response...`);
    console.log(
      `🔍 [sendChatMessage] [${messageId}] Response status:`,
      res?.status
    );
    console.log(`🔍 [sendChatMessage] [${messageId}] Response ok:`, res?.ok);

    if (!res || !res.ok) {
      const errText = res?.rawBody || res?.statusText || "Unknown error";
      const errorDetails = {
        status: res?.status,
        statusText: res?.statusText,
        rawBody: res?.rawBody,
        url,
        headers: Object.keys(headers),
        timestamp: new Date().toISOString(),
      };
      console.error(
        `❌ [sendChatMessage] [${messageId}] ACS request failed:`,
        errorDetails
      );
      throw new Error(
        `ACS converse error ${res?.status ?? "unknown"}: ${errText}`
      );
    }

    const data = res.data;
    console.log(
      `✅ [sendChatMessage] [${messageId}] ACS accepted message successfully!`
    );
    console.log(`✅ [sendChatMessage] [${messageId}] ACS response data:`, {
      session_id: data.session_id,
      suspended: data.conversation_suspended,
      cwd: data.current_agent_cwd,
      response_messages_count: data.response_messages?.length || 0,
      final_text_response: data.final_text_response ? "[present]" : "[null]",
    });

    // 6) Update status to reflect successful send to ACS
    console.log(
      `🔄 [sendChatMessage] [${messageId}] Updating session status to awaiting`
    );
    useSessionStatusStore.getState().markAwaiting(effectiveSessionId);

    // switch the currentSession in the mission store to this one

    console.log(
      `✅ [sendChatMessage] [${messageId}] Message send process completed successfully!`
    );
    return {
      success: true,
      userMessageId: userMessage.id,
      sessionId: effectiveSessionId,
    };
  } catch (error) {
    const errorDetails = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      sessionId: effectiveSessionId.slice(0, 8) + "...",
      userId: userId.slice(0, 8) + "...",
      timestamp: new Date().toISOString(),
    };
    console.error(
      `💥 [sendChatMessage] [${messageId}] Failed to send message:`,
      errorDetails
    );
    const sanitizedErrorMessage =
      error instanceof Error
        ? error.message.replace(/[\r\n\t]/g, " ").substring(0, 200)
        : "Unknown error";
    toast.error("Failed to send message", {
      description: sanitizedErrorMessage,
    });
    console.log(`🔄 [sendChatMessage] [${messageId}] Marking session as error`);
    useSessionStatusStore.getState().markError(effectiveSessionId);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      sessionId: effectiveSessionId, // Include session ID even on error if it was created
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
  images?: string[];
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
    images,
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
    images: images || [],
  };

  return payload;
}

type WebConverseRequest = {
  // ACSWebConverseRequest superset
  user_id?: string;
  agent_config_name: string;
  prompt: string;
  session_id?: string;
  repo_id: number;
  repo_full_name: string;
  branch: string;
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
  images?: string[];
};

function buildWebConversePayload(
  params: SendChatMessageParams,
  effectiveAgentCwd?: string
): WebConverseRequest {
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
    repoContextWeb,
    images,
  } = params;

  const mergedOverrides = {
    ...(params.acsOverrides || {}),
    ...(overrides || {}),
  };
  if (effectiveAgentCwd && !mergedOverrides.agent_cwd_override) {
    mergedOverrides.agent_cwd_override = effectiveAgentCwd;
  }

  return {
    agent_config_name: agentConfigName,
    prompt: message.trim(),
    session_id: sessionId,
    user_id: userId,
    repo_id: repoContextWeb!.repo_id,
    repo_full_name: repoContextWeb!.repo_full_name,
    branch: repoContextWeb!.branch,
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
    images: images || [],
  };
}
