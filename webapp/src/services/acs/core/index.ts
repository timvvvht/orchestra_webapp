import type { ACSClient } from "../shared/client";
import type {
  ACSConverseRequest,
  ACSConverseResponse,
  RequestOptions,
  APIResponse,
  AgentConfigOverrides,
} from "../shared/types";
import { ACS_ENDPOINTS } from "../shared/types";
import type { CoreTemplateVars } from "@/utils/templateVariables";

/**
 * Core chat/conversation functionality
 * Handles the main converse endpoint and related operations
 */
export class ACSCoreService {
  constructor(private client: ACSClient) {}

  /**
   * Internal: prune overrides to only include fields supported by ACSConverseRequest.overrides
   * Allowed: model_id, provider_name, enabled_tools, disabled_tools, agent_cwd_override
   */
  private pruneOverrides(
    overrides?: AgentConfigOverrides | Record<string, any>
  ): AgentConfigOverrides | undefined {
    if (!overrides || typeof overrides !== "object") return undefined;
    const out: Record<string, any> = {};
    if (typeof overrides.model_id === "string")
      out.model_id = overrides.model_id;
    if (typeof (overrides as any).provider_name === "string")
      out.provider_name = (overrides as any).provider_name;
    if (Array.isArray((overrides as any).enabled_tools))
      out.enabled_tools = (overrides as any).enabled_tools;
    if (Array.isArray((overrides as any).disabled_tools))
      out.disabled_tools = (overrides as any).disabled_tools;
    if (typeof (overrides as any).agent_cwd_override === "string")
      out.agent_cwd_override = (overrides as any).agent_cwd_override;
    return Object.keys(out).length ? (out as AgentConfigOverrides) : undefined;
  }

  /**
   * Internal: Build a compliant ACSConverseRequest with only supported fields.
   * Note: agentCwd is mapped into overrides.agent_cwd_override to match backend contract.
   */
  private buildConverseRequest(params: {
    userId?: string;
    sessionId?: string | null;
    message: string;
    agentConfigName: string;
    templateVariables?: CoreTemplateVars | Record<string, string>;
    modelApiKeys?: Record<string, string>;
    useStoredKeys?: boolean;
    overrides?: AgentConfigOverrides | Record<string, any>;
    agentCwd?: string;
    autoMode?: boolean;
    isBackgroundSession?: boolean;
  }): ACSConverseRequest {
    const {
      userId,
      sessionId,
      message,
      agentConfigName,
      templateVariables,
      modelApiKeys,
      useStoredKeys,
      overrides,
      agentCwd,
      autoMode,
      isBackgroundSession,
    } = params;

    // Ensure agent_cwd_override is placed under overrides, not top-level
    const mergedOverrides = {
      ...(overrides || {}),
      ...(agentCwd ? { agent_cwd_override: agentCwd } : {}),
    };

    const pruned = this.pruneOverrides(mergedOverrides);

    const request: ACSConverseRequest = {
      ...(userId ? { user_id: userId } : {}),
      session_id: sessionId || null,
      prompt: message,
      agent_config_name: agentConfigName,
      ...(typeof autoMode === "boolean" ? { auto_mode: autoMode } : {}),
      ...(pruned ? { overrides: pruned } : {}),
      ...(templateVariables
        ? { template_variables: templateVariables as any }
        : {}),
      ...(typeof useStoredKeys === "boolean"
        ? { use_stored_keys: useStoredKeys }
        : {}),
      ...(modelApiKeys && Object.keys(modelApiKeys).length
        ? { model_api_keys: modelApiKeys }
        : {}),
      ...(typeof isBackgroundSession === "boolean"
        ? { is_background_session: isBackgroundSession }
        : {}),
    };

    return request;
  }

  /**
   * Main conversation endpoint - send a message and get AI response
   * This is the primary interface for chat interactions
   */
  async converse(
    request: ACSConverseRequest,
    options?: RequestOptions
  ): Promise<APIResponse<ACSConverseResponse>> {
    // Force retries to 0 for converse endpoint to prevent serious errors from multiple attempts
    const converseOptions = { ...(options || {}), retries: 0 };
    return this.client.post<ACSConverseResponse>(
      ACS_ENDPOINTS.CONVERSE,
      request,
      converseOptions
    );
  }

  /**
   * Send a simple message to an existing session
   */
  async sendMessage(
    sessionId: string,
    message: string,
    userId: string,
    agentConfigName: string = "default",
    options: {
      modelApiKeys?: Record<string, string>;
      useStoredKeys?: boolean;
      overrides?: AgentConfigOverrides;
      templateVariables: CoreTemplateVars;
      agentCwd?: string; // 🎯 CRITICAL: Working directory override for agent execution
      autoMode?: boolean; // Enable role-based auto mode for agent configuration selection
      modelAutoMode?: boolean; // Enable role-based auto mode for AI model selection
    } & RequestOptions = {} as any
  ): Promise<APIResponse<ACSConverseResponse>> {
    // separate BYOK fields from other RequestOptions
    const {
      modelApiKeys,
      useStoredKeys,
      overrides,
      templateVariables,
      agentCwd,
      autoMode,
      modelAutoMode,
      ...requestOptions
    } = options || {};

    const request: ACSConverseRequest = {
      user_id: userId,
      agent_config_name: agentConfigName,
      prompt: message,
      session_id: sessionId,
      model_api_keys: modelApiKeys,
      use_stored_keys: useStoredKeys,
      overrides: overrides,
      template_variables: templateVariables,
      ...(agentCwd && { agent_cwd_override: agentCwd }), // 🎯 Pass agent_cwd_override to backend
      ...(autoMode !== undefined && { auto_mode: autoMode }), // 🎯 Pass auto_mode to backend when specified
      ...(modelAutoMode !== undefined && { model_auto_mode: modelAutoMode }), // 🎯 Pass model_auto_mode to backend when specified
    };

    // DEBUG: Log full ACSConverseRequest payload before sending
    console.log(
      "🎯 [ACSCoreService.sendMessage] MISSION_CONTROL_AUTO_MODE_DEBUG - Full payload:",
      JSON.stringify(request, null, 2)
    );

    return this.converse(request, requestOptions);
  }

  /**
   * Start a new conversation with the first message
   */
  async startConversation(
    message: string,
    userId: string,
    agentConfigName: string = "default",
    options?: {
      agentCwd?: string;
      modelApiKeys?: Record<string, string>;
      useStoredKeys?: boolean;
      sessionId?: string;
      overrides?: AgentConfigOverrides;
      templateVariables: CoreTemplateVars;
      autoMode?: boolean; // Enable role-based auto mode for agent configuration selection
      modelAutoMode?: boolean; // Enable role-based auto mode for AI model selection
    } & RequestOptions
  ): Promise<APIResponse<ACSConverseResponse>> {
    const {
      agentCwd,
      modelApiKeys,
      useStoredKeys,
      sessionId,
      overrides,
      templateVariables,
      autoMode,
      modelAutoMode,
      ...requestOptions
    } = options || {};

    // 🚨 CRITICAL: Validate sessionId to prevent string "undefined" reaching backend
    let validSessionId = sessionId;
    if (sessionId === "undefined" || sessionId === "null") {
      console.warn(
        '⚠️ [ACSCoreService] Detected string "undefined" or "null" as sessionId, converting to null'
      );
      validSessionId = null;
    }

    const request: ACSConverseRequest = {
      user_id: userId,
      agent_config_name: agentConfigName,
      prompt: message,
      session_id: validSessionId || null, // Use provided sessionId or let ACS create a new session
      agent_cwd_override: agentCwd,
      model_api_keys: modelApiKeys,
      use_stored_keys: useStoredKeys,
      overrides: overrides,
      template_variables: templateVariables,
      ...(autoMode !== undefined && { auto_mode: autoMode }), // 🎯 Pass auto_mode to backend when specified
      ...(modelAutoMode !== undefined && { model_auto_mode: modelAutoMode }), // 🎯 Pass model_auto_mode to backend when specified
    };

    console.log(
      "🚀 [ACSCoreService.startConversation] Final request payload:",
      {
        session_id: request.session_id,
        session_id_type: typeof request.session_id,
        original_sessionId: sessionId,
        original_sessionId_type: typeof sessionId,
        validSessionId,
        validSessionId_type: typeof validSessionId,
      }
    );

    return this.converse(request, requestOptions);
  }

  /**
   * Continue conversation with message history override
   * Useful for conversation forking or context injection
   */
  async converseWithHistory(
    message: string,
    userId: string,
    messageHistory: object[],
    agentConfigName: string = "default",
    sessionId?: string,
    options?: {
      templateVariables?: Record<string, string>;
    } & RequestOptions
  ): Promise<APIResponse<ACSConverseResponse>> {
    const { templateVariables, ...requestOptions } = options || {};

    const request: ACSConverseRequest = {
      user_id: userId,
      agent_config_name: agentConfigName,
      prompt: message,
      session_id: sessionId || null,
      messages_history_override: messageHistory,
      template_variables: templateVariables,
    };

    return this.converse(request, requestOptions);
  }

  /**
   * Send message with custom working directory
   * Useful for file operations or context-specific tasks
   */
  async converseWithCwd(
    message: string,
    userId: string,
    agentCwd: string,
    sessionId?: string,
    agentConfigName: string = "default",
    options?: {
      templateVariables?: Record<string, string>;
    } & RequestOptions
  ): Promise<APIResponse<ACSConverseResponse>> {
    const { templateVariables, ...requestOptions } = options || {};

    const request: ACSConverseRequest = {
      user_id: userId,
      agent_config_name: agentConfigName,
      prompt: message,
      session_id: sessionId || null,
      agent_cwd_override: agentCwd,
      template_variables: templateVariables,
    };

    return this.converse(request, requestOptions);
  }

  /**
   * Send message with custom model API keys
   * Useful for using specific models or user-provided keys
   */
  async converseWithKeys(
    message: string,
    userId: string,
    modelApiKeys: Record<string, string>,
    sessionId?: string,
    agentConfigName: string = "default",
    options?: {
      useStoredKeys?: boolean;
      templateVariables?: Record<string, string>;
    } & RequestOptions
  ): Promise<APIResponse<ACSConverseResponse>> {
    const { useStoredKeys, templateVariables, ...requestOptions } =
      options || {};

    const request: ACSConverseRequest = {
      user_id: userId,
      agent_config_name: agentConfigName,
      prompt: message,
      session_id: sessionId || null,
      model_api_keys: modelApiKeys,
      use_stored_keys: useStoredKeys,
      template_variables: templateVariables,
    };

    return this.converse(request, requestOptions);
  }

  /**
   * Test tool execution on user's TES instance
   */
  async testToolExecution(
    userId: string,
    toolName: string = "str_replace_editor",
    toolInput: object = { command: "view", path: "/workspace" },
    options?: RequestOptions
  ): Promise<APIResponse<any>> {
    return this.client.post(
      "/acs/test-tool-execution",
      {
        user_id: userId,
        tool_name: toolName,
        tool_input: toolInput,
      },
      options
    );
  }

  /**
   * Ping user's TES instance to check connectivity
   */
  async pingTES(
    userId?: string,
    options?: RequestOptions
  ): Promise<APIResponse<any>> {
    const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
    return this.client.get(`/acs/ping-tes${query}`, options);
  }

  /**
   * Get routing statistics for the hybrid executor
   */
  async getRoutingStats(options?: RequestOptions): Promise<APIResponse<any>> {
    return this.client.get("/acs/routing/stats", options);
  }

  /**
   * Test where a specific tool would be routed
   */
  async testToolRouting(
    toolName: string,
    options?: RequestOptions
  ): Promise<APIResponse<any>> {
    return this.client.get(
      `/acs/routing/test/${encodeURIComponent(toolName)}`,
      options
    );
  }

  /**
   * Reload the YAML routing configuration
   */
  async reloadRoutingConfig(
    options?: RequestOptions
  ): Promise<APIResponse<any>> {
    return this.client.post("/acs/routing/reload", undefined, options);
  }

  /**
   * Cancel an ongoing conversation
   * NOTE: The ACS Python expects { session_id } in POST body, not path param!
   */
  async cancelConversation(
    sessionId: string,
    options?: RequestOptions
  ): Promise<APIResponse<void>> {
    return this.client.post<void>(
      "/acs/converse/cancel",
      { session_id: sessionId },
      options
    );
  }
}

/**
 * Utility functions for working with converse responses
 */
export class ConverseResponseUtils {
  /**
   * Extract the final text response from a converse response
   */
  static getFinalText(response: ACSConverseResponse): string {
    return response.final_text_response || "";
  }

  /**
   * Get the session ID from a converse response
   */
  static getSessionId(response: ACSConverseResponse): string {
    return response.session_id;
  }

  /**
   * Get the current working directory from a converse response
   */
  static getCurrentCwd(response: ACSConverseResponse): string {
    return response.current_agent_cwd;
  }

  /**
   * Get all messages from a converse response
   */
  static getMessages(response: ACSConverseResponse): object[] {
    return response.response_messages || [];
  }

  /**
   * Get the last message from a converse response
   */
  static getLastMessage(response: ACSConverseResponse): object | null {
    const messages = response.response_messages || [];
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }

  /**
   * Check if the response contains tool calls
   */
  static hasToolCalls(response: ACSConverseResponse): boolean {
    const messages = response.response_messages || [];
    return messages.some(
      (msg: any) =>
        msg.content &&
        Array.isArray(msg.content) &&
        msg.content.some((part: any) => part.type === "tool_use")
    );
  }

  /**
   * Extract tool calls from the response
   */
  static getToolCalls(response: ACSConverseResponse): any[] {
    const messages = response.response_messages || [];
    const toolCalls: any[] = [];

    for (const msg of messages) {
      if (msg.content && Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "tool_use") {
            toolCalls.push(part);
          }
        }
      }
    }

    return toolCalls;
  }

  /**
   * Check if the conversation is complete (no pending tool calls)
   */
  static isComplete(response: ACSConverseResponse): boolean {
    const lastMessage = this.getLastMessage(response);
    if (!lastMessage || !lastMessage.content) return true;

    // Check if the last message has any pending tool calls
    if (Array.isArray(lastMessage.content)) {
      const hasPendingToolCall = lastMessage.content.some(
        (part: any) => part.type === "tool_use" && !part.result
      );
      return !hasPendingToolCall;
    }

    return true;
  }
}

export default ACSCoreService;
