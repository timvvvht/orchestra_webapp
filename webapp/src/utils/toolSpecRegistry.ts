// In-memory ToolSpec registry

import type {
  ToolSpec,
  RegisterSessionToolsOptions,
} from "./registerSessionTools";
import {
  registerSessionTools as _registerSessionTools,
  createApplyPatchToolSpec,
  createCatToolSpec,
  createTreeToolSpec,
  createAgenticSearchBackgroundSpec,
  createSearchNotesSpec,
  createReadFilesToolSpec,
  createSearchFilesToolSpec,
  createStrReplaceEditorToolSpec,
  createLsToolSpec,
  createMyNewToolSpec,
  createPathSecurityToolSpec,
  createAwsToolsSpec,
  createInitiateRunnerSessionSpec,
  createExecuteInRunnerSessionSpec,
  createSetRunnerSessionCwdSpec,
  createSetRunnerSessionEnvVarSpec,
  createUnsetRunnerSessionEnvVarSpec,
  createGetRunnerSessionStateSpec,
  createTerminateRunnerSessionSpec,
  createStartBackgroundOsJobInSessionSpec,
  createGetBackgroundOsJobStatusSpec,
  createSendSignalToOsJobSpec,
} from "./registerSessionTools";
import {
  createFindSymbolSpec,
  createGetSymbolsOverviewSpec,
  createFindReferencingSymbolsSpec,
  createInsertAfterSymbolSpec,
  createInsertBeforeSymbolSpec,
  createReplaceSymbolBodySpec,
  createRestartLanguageServerSpec,
  createPingLanguageServerSpec,
} from "./lspToolSpecs";

export const TOOL_SPEC_REGISTRY: Record<string, () => ToolSpec> = {
  apply_patch: createApplyPatchToolSpec,
  cat: createCatToolSpec,
  tree: createTreeToolSpec,
  agentic_search_background: createAgenticSearchBackgroundSpec,
  search_notes: createSearchNotesSpec,
  read_files: createReadFilesToolSpec,
  search_files: createSearchFilesToolSpec,
  str_replace_editor: createStrReplaceEditorToolSpec,
  ls: createLsToolSpec,
  my_new_tool: createMyNewToolSpec,
  path_security: createPathSecurityToolSpec,
  aws_tools: createAwsToolsSpec,
  initiate_runner_session: createInitiateRunnerSessionSpec,
  execute_in_runner_session: createExecuteInRunnerSessionSpec,
  set_runner_session_cwd: createSetRunnerSessionCwdSpec,
  set_runner_session_env_var: createSetRunnerSessionEnvVarSpec,
  unset_runner_session_env_var: createUnsetRunnerSessionEnvVarSpec,
  get_runner_session_state: createGetRunnerSessionStateSpec,
  terminate_runner_session: createTerminateRunnerSessionSpec,
  start_background_os_job_in_session: createStartBackgroundOsJobInSessionSpec,
  get_background_os_job_status: createGetBackgroundOsJobStatusSpec,
  send_signal_to_os_job: createSendSignalToOsJobSpec,
  // LSP HTTP Tools
  find_symbol: createFindSymbolSpec,
  get_symbols_overview: createGetSymbolsOverviewSpec,
  find_referencing_symbols: createFindReferencingSymbolsSpec,
  insert_after_symbol: createInsertAfterSymbolSpec,
  insert_before_symbol: createInsertBeforeSymbolSpec,
  replace_symbol_body: createReplaceSymbolBodySpec,
  // Note: codebase_orientation is not implemented by the onefile LSP server
  restart_language_server: createRestartLanguageServerSpec,
  ping_language_server: createPingLanguageServerSpec,
};

/**
 * Get a ToolSpec by name from the registry
 * @param name - The tool name to look up
 * @returns ToolSpec if found, null otherwise
 */
export function getToolSpec(name: string): ToolSpec | null {
  const factory = TOOL_SPEC_REGISTRY[name];
  return factory ? factory() : null;
  // TODO: getToolSpec('does_not_exist') should return null
}

/**
 * Get multiple ToolSpecs by names, with deduplication
 * @param names - Array of tool names to look up
 * @returns Array of ToolSpecs for valid names (duplicates removed)
 */
export function getToolSpecs(names: string[]): ToolSpec[] {
  const seen = new Set<string>();
  return names
    .filter((n) => {
      if (seen.has(n)) return false; // dedupe
      seen.add(n);
      return true;
    })
    .map(getToolSpec)
    .filter(Boolean) as ToolSpec[];
}

/**
 * Ergonomic helper – register tools by names only
 * @param sessionId - The session ID to register tools for
 * @param names - Array of tool names to register
 * @param options - Additional options (baseUrl, authToken)
 */
export async function registerToolsByNames(
  sessionId: string,
  names: string[],
  options: Omit<RegisterSessionToolsOptions, "sessionId" | "tools"> = {}
): Promise<void> {
  const tools = getToolSpecs(names);

  if (tools.length === 0) {
    console.warn("[toolSpecRegistry] No valid tools found to register:", names);
    return;
  }

  await _registerSessionTools({ sessionId, tools, ...options });
}

/**
 * Get all tool names from the registry, sorted alphabetically
 * @returns Array of all registered tool names
 */
export function getAllToolNames(): string[] {
  return Object.keys(TOOL_SPEC_REGISTRY).sort();
}

/**
 * Get all ToolSpecs from the registry
 * @returns Array of all ToolSpecs
 */
export function getAllToolSpecs(): ToolSpec[] {
  return getAllToolNames()
    .map((n) => getToolSpec(n))
    .filter(Boolean) as ToolSpec[];
}

export default { registerToolsByNames, getToolSpec, getToolSpecs, getAllToolNames, getAllToolSpecs };
