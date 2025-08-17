// /Users/tim/Code/orchestra/src/config/approvalTools.ts
// -----------------------------------------------------------------------------
// Sensitive Tool Registry & Approval Utilities (Local-Only V1)
// -----------------------------------------------------------------------------
// This file defines which local tools are considered "sensitive" and therefore
// require explicit user approval before execution. It also exports the
// `requiresApproval` type-guard function used throughout the approval workflow.
//
// NOTE:  This list is *hard-coded* for the minimal browser-only MVP.  When the
//        list grows or becomes dynamic, migrate to a server-driven or config
//        driven solution.
// -----------------------------------------------------------------------------

// Add *only* local tools that can modify state in destructive ways.
export const SENSITIVE_TOOLS = [
  // File manipulation
  'str_replace_editor',
  'cp',
  'mv',
  // Shell / execution
  'execute_in_runner_session',
] as const;

export type SensitiveTool = typeof SENSITIVE_TOOLS[number];

// Type-guard utility used in orchestrator & UI
export function requiresApproval(toolName: string): toolName is SensitiveTool {
  return (SENSITIVE_TOOLS as readonly string[]).includes(toolName);
}
