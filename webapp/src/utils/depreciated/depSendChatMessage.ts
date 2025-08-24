// contains depreciated functions that were located in /orchestra_webapp/webapp/utils/sendChatMessage.ts

import { SendChatMessageParams } from "../sendChatMessage";
import { VALID_OVERRIDE_KEYS } from "../sendChatMessage";

/**
 * Build the *options* object expected by ACSCoreService.sendMessage.
 * This MUST use camelCase keys (autoMode, modelAutoMode, agentCwd, templateVariables …).
 */
function buildSendMessageOptions(
  params: SendChatMessageParams,
  effectiveAgentCwd?: string
): {
  modelApiKeys?: Record<string, string>;
  useStoredKeys?: boolean;
  overrides?: Record<string, any>;
  templateVariables: { [k: string]: string };
  agentCwd?: string;
  autoMode?: boolean;
  modelAutoMode?: boolean;
  explicitModelId?: string;
  roleModelOverrides?: Record<string, string>;
} {
  const {
    autoMode,
    modelAutoMode,
    modelApiKeys,
    useStoredKeys,
    overrides,
    templateVariables,
    explicitModelId,
    roleModelOverrides,
  } = params;

  const opts: any = {
    templateVariables,
  };
  if (modelApiKeys && Object.keys(modelApiKeys).length)
    opts.modelApiKeys = modelApiKeys;
  if (useStoredKeys !== undefined) opts.useStoredKeys = useStoredKeys;
  if (overrides && Object.keys(overrides).length) opts.overrides = overrides;
  if (autoMode !== undefined) opts.autoMode = autoMode;
  if (modelAutoMode !== undefined) opts.modelAutoMode = modelAutoMode;
  if (explicitModelId) opts.explicitModelId = explicitModelId;
  if (roleModelOverrides && Object.keys(roleModelOverrides).length)
    opts.roleModelOverrides = roleModelOverrides;
  if (effectiveAgentCwd) opts.agentCwd = effectiveAgentCwd;
  return opts;
}

/**
 * Builds the ACS payload by mapping client-side parameters to server-side field names
 * @deprecated Use buildSendMessageOptions instead for proper camelCase option keys
 * @param params - The sendChatMessage parameters
 * @param effectiveAgentCwd - The effective agent working directory
 * @returns Object - The properly formatted ACS payload
 */
function buildAcsPayload(
  params: SendChatMessageParams,
  effectiveAgentCwd?: string
): Record<string, any> {
  const {
    autoMode,
    modelAutoMode,
    useStoredKeys,
    overrides,
    templateVariables,
    explicitModelId,
    roleModelOverrides,
    isBackgroundSession,
  } = params;

  // Runtime assertion: Check for conflicting model selection
  if (explicitModelId && overrides?.model_id) {
    throw new Error(
      "Conflicting model selection: Cannot provide both explicitModelId and overrides.model_id. " +
        "Use explicitModelId for direct model override or overrides.model_id for agent config override."
    );
  }

  const payload: Record<string, any> = {};

  // Guard against deprecated root snake_case keys
  if ("auto_mode" in payload || "model_auto_mode" in payload) {
    console.warn(
      "[buildAcsPayload] Deprecated root snake_case keys detected – should not be used"
    );
  }

  // API key management
  if (params.modelApiKeys && Object.keys(params.modelApiKeys).length > 0) {
    payload.model_api_keys = params.modelApiKeys;
  }
  if (useStoredKeys !== undefined) {
    payload.use_stored_keys = useStoredKeys;
  }

  // Agent configuration overrides
  if (overrides && Object.keys(overrides).length > 0) {
    // Filter out invalid keys but keep valid ones
    const filteredOverrides: Record<string, any> = {};
    const invalidKeys: string[] = [];

    Object.keys(overrides).forEach((key) => {
      if (VALID_OVERRIDE_KEYS.includes(key as any)) {
        filteredOverrides[key as keyof typeof filteredOverrides] =
          overrides[key as keyof typeof overrides];
      } else {
        invalidKeys.push(key);
      }
    });

    if (Object.keys(filteredOverrides).length > 0) {
      payload.overrides = filteredOverrides;
    }

    if (invalidKeys.length > 0) {
      const invalidOverrides = Object.fromEntries(
        invalidKeys.map((key) => [
          key,
          overrides[key as keyof typeof overrides],
        ])
      );
      console.warn(
        "⚠️ [buildAcsPayload] Invalid overrides detected, skipping:",
        invalidOverrides
      );
    }
  }

  // Template variables
  if (templateVariables && Object.keys(templateVariables).length > 0) {
    payload.template_variables = templateVariables;
  }

  // Session management
  if (isBackgroundSession) {
    payload.is_background_session = isBackgroundSession;
  }

  // Agent working directory (from legacy logic) - deprecated, use buildSendMessageOptions instead
  if (effectiveAgentCwd) {
    payload.agent_cwd = effectiveAgentCwd;
  }

  return payload;
}
