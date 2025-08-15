/**
 * Shared types for local tool execution
 */

// import type { SensitiveTool } from '@/config/approvalTools';

/**
 * Job Instruction for local tool execution (legacy)
 */
export interface JobInstruction {
    job_id: string;
    tool_name: string;
    tool_input: Record<string, any>;
    cwd: string;
    session_id: string;
    schema_version: string;
    requested_at?: string;
}

/**
 * Access control policy forwarded to TES.
 * Must match shared_contracts.tes_api_models.AccessPolicy exactly.
 */
export interface AccessPolicy {
  whitelist?: string[];
  blacklist?: string[];
  shell_forbidden_patterns?: string[];
}

/** 
 * JobInstruction payload - MUST match shared_contracts.tes_api_models.JobInstructionV1 exactly
 * for 100% compatibility with local TES server
 */
export interface JobInstructionV1 {
  schema_version: "1.0.0";                    // Required literal - matches Python Literal["1.0.0"]
  tool_use_id: string;                        // Required - matches Python str
  job_id: string;                             // Required - matches Python str  
  session_id?: string;                        // Optional - matches Python Optional[str]
  cwd: string;                                // Required - matches Python str
  tool_name: string;                          // Required - matches Python str
  tool_input: Record<string, unknown>;        // Required - matches Python Dict[str, Any]
  access_policy?: AccessPolicy;               // Optional - matches Python Optional[AccessPolicy]
  
  // Legacy/compatibility fields for ACS events (not sent to TES)
  tool_call_id?: string;                      // Legacy alias for tool_use_id
  args?: Record<string, unknown>;             // Legacy alias for tool_input
}

/** Wrapper we store in Zustand for later resumption */
export interface QueuedJobPayload {
  session_id: string;
  ji: JobInstructionV1;
}

/**
 * Job Outcome from local tool execution
 */
export interface JobOutcome {
    job_id: string;
    status: 'success' | 'error';
    result_payload: any;
    error_message?: string;
    schema_version?: string;
    session_id?: string;
}

/** 
 * Job outcome format - MUST match shared_contracts.tes_api_models.JobOutcomeV1 exactly
 * for 100% compatibility with local TES server
 */
export interface JobOutcomeV1 {
  schema_version: "1.0.0";                    // Required literal - matches Python Literal["1.0.0"]
  job_id: string;                             // Required - matches Python str
  tool_use_id?: string;                       // Optional - matches Python Optional[str]
  session_id?: string;                        // Optional - matches Python Optional[str]
  status: string;                             // Required - matches Python str (not limited to success/error)
  result_payload?: Record<string, unknown>;   // Optional - matches Python Optional[Dict[str, Any]]
  error_message?: string;                     // Optional - matches Python Optional[str]
}