/**
 * Approval Service Types
 * 
 * Defines the data structures for the tool approval system.
 * This service manages the correlation between UI tool calls and backend execution.
 */

export interface ToolInvocation {
  tool_use_id: string;      // Primary key - ID visible in chat UI
  tool_call_id?: string;    // Database tool_call row ID
  job_id?: string;          // Local execution job ID
  session_id: string;       // Chat session ID
  tool_name: string;        // Name of the tool being invoked
  tool_input: Record<string, any>; // Tool parameters
  approval_status: ApprovalStatus;
  approved_by?: string;     // User ID who approved/rejected
  created_at: Date;
  updated_at: Date;
  timeout_at?: Date;        // When this approval expires
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED', 
  REJECTED = 'REJECTED',
  TIMED_OUT = 'TIMED_OUT',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface ApprovalRequest {
  tool_use_id: string;
  job_id: string;
  tool_name: string;
  tool_input: Record<string, any>;
  session_id: string;
  timeout_minutes?: number; // Default 10 minutes
}

export interface ApprovalDecision {
  tool_use_id: string;
  decision: 'APPROVED' | 'REJECTED';
  user_id?: string;
}

export interface ApprovalEvent {
  type: 'APPROVAL_REQUESTED' | 'APPROVAL_DECIDED' | 'APPROVAL_TIMED_OUT';
  session_id: string;
  tool_use_id: string;
  data: {
    tool_name?: string;
    tool_input?: Record<string, any>;
    approval_status?: ApprovalStatus;
    approved_by?: string;
  };
}

export interface ApprovalConfig {
  // Tools that require approval (can be exact names or regex patterns)
  required_approval_tools: string[];
  // Default timeout in minutes
  default_timeout_minutes: number;
  // Whether to auto-approve when approval service is down
  fallback_auto_approve: boolean;
  // Whether approval is enabled globally
  approval_enabled: boolean;
}

export interface PendingApproval {
  tool_use_id: string;
  tool_name: string;
  tool_input: Record<string, any>;
  session_id: string;
  created_at: Date;
  timeout_at: Date;
}