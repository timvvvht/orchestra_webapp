/**
 * Approval Service
 *
 * Manages tool execution approvals by correlating UI tool calls with backend execution.
 * Provides a thin layer between LocalToolOrchestrator and the UI for human-in-the-loop control.
 */

import { EventEmitter } from "events";
import {
  ToolInvocation,
  ApprovalStatus,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalEvent,
  ApprovalConfig,
  PendingApproval,
} from "./types";

// In-memory storage for now - in production this would be backed by a database
interface ApprovalStore {
  invocations: Map<string, ToolInvocation>;
  pendingTimeouts: Map<string, NodeJS.Timeout>;
}

export class ApprovalService extends EventEmitter {
  private store: ApprovalStore;
  private config: ApprovalConfig;

  constructor(config: Partial<ApprovalConfig> = {}) {
    super();

    this.store = {
      invocations: new Map(),
      pendingTimeouts: new Map(),
    };

    this.config = {
      required_approval_tools: [],
      default_timeout_minutes: 10,
      fallback_auto_approve: true,
      approval_enabled: false,
      ...config,
    };

    console.log("[ApprovalService] Initialized with config:", this.config);
  }

  /**
   * Check if a tool requires approval based on configuration
   */
  requiresApproval(toolName: string): boolean {
    if (!this.config.approval_enabled) {
      return false;
    }

    return this.config.required_approval_tools.some((pattern) => {
      // Support both exact matches and regex patterns
      if (pattern.startsWith("/") && pattern.endsWith("/")) {
        const regex = new RegExp(pattern.slice(1, -1));
        return regex.test(toolName);
      }
      return toolName === pattern;
    });
  }

  /**
   * Create a new tool invocation record for ID correlation
   */
  createInvocation(data: {
    tool_use_id: string;
    tool_call_id?: string;
    session_id: string;
    tool_name: string;
    tool_input: Record<string, any>;
  }): ToolInvocation {
    const now = new Date();
    const invocation: ToolInvocation = {
      tool_use_id: data.tool_use_id,
      tool_call_id: data.tool_call_id,
      session_id: data.session_id,
      tool_name: data.tool_name,
      tool_input: data.tool_input,
      approval_status: ApprovalStatus.PENDING,
      created_at: now,
      updated_at: now,
    };

    this.store.invocations.set(data.tool_use_id, invocation);
    console.log(
      `[ApprovalService] Created invocation for tool_use_id: ${data.tool_use_id}`
    );

    return invocation;
  }

  /**
   * Request approval for a tool execution
   */
  async requestApproval(request: ApprovalRequest): Promise<void> {
    const {
      tool_use_id,
      job_id,
      tool_name,
      tool_input,
      session_id,
      timeout_minutes,
    } = request;

    // Get or create the invocation record
    let invocation = this.store.invocations.get(tool_use_id);
    if (!invocation) {
      invocation = this.createInvocation({
        tool_use_id,
        session_id,
        tool_name,
        tool_input,
      });
    }

    // Update with job_id for correlation
    invocation.job_id = job_id;
    invocation.approval_status = ApprovalStatus.PENDING;
    invocation.updated_at = new Date();

    // Set timeout
    const timeoutMs =
      (timeout_minutes || this.config.default_timeout_minutes) * 60 * 1000;
    invocation.timeout_at = new Date(Date.now() + timeoutMs);

    // Schedule timeout
    const timeoutId = setTimeout(() => {
      this.handleTimeout(tool_use_id);
    }, timeoutMs);

    this.store.pendingTimeouts.set(tool_use_id, timeoutId);

    // Emit approval requested event
    const event: ApprovalEvent = {
      type: "APPROVAL_REQUESTED",
      session_id,
      tool_use_id,
      data: {
        tool_name,
        tool_input,
        approval_status: ApprovalStatus.PENDING,
      },
    };

    this.emit("approval_event", event);
    console.log(
      `[ApprovalService] Requested approval for ${tool_name} (${tool_use_id})`
    );
  }

  /**
   * Process a user's approval decision
   */
  async processDecision(decision: ApprovalDecision): Promise<boolean> {
    const { tool_use_id, decision: userDecision, user_id } = decision;

    const invocation = this.store.invocations.get(tool_use_id);
    if (!invocation) {
      console.warn(
        `[ApprovalService] Decision received for unknown tool_use_id: ${tool_use_id}`
      );
      return false;
    }

    if (invocation.approval_status !== ApprovalStatus.PENDING) {
      console.warn(
        `[ApprovalService] Decision received for non-pending approval: ${tool_use_id} (status: ${invocation.approval_status})`
      );
      return false;
    }

    // Clear timeout
    const timeoutId = this.store.pendingTimeouts.get(tool_use_id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.store.pendingTimeouts.delete(tool_use_id);
    }

    // Update invocation
    invocation.approval_status =
      userDecision === "APPROVED"
        ? ApprovalStatus.APPROVED
        : ApprovalStatus.REJECTED;
    invocation.approved_by = user_id;
    invocation.updated_at = new Date();

    // Emit decision event
    const event: ApprovalEvent = {
      type: "APPROVAL_DECIDED",
      session_id: invocation.session_id,
      tool_use_id,
      data: {
        approval_status: invocation.approval_status,
        approved_by: user_id,
      },
    };

    this.emit("approval_event", event);
    console.log(
      `[ApprovalService] Processed ${userDecision} decision for ${tool_use_id} by ${user_id}`
    );

    return true;
  }

  /**
   * Handle approval timeout
   */
  private handleTimeout(tool_use_id: string): void {
    const invocation = this.store.invocations.get(tool_use_id);
    if (!invocation || invocation.approval_status !== ApprovalStatus.PENDING) {
      return;
    }

    invocation.approval_status = ApprovalStatus.TIMED_OUT;
    invocation.updated_at = new Date();

    // Clean up timeout reference
    this.store.pendingTimeouts.delete(tool_use_id);

    // Emit timeout event
    const event: ApprovalEvent = {
      type: "APPROVAL_TIMED_OUT",
      session_id: invocation.session_id,
      tool_use_id,
      data: {
        approval_status: ApprovalStatus.TIMED_OUT,
      },
    };

    this.emit("approval_event", event);
    console.log(`[ApprovalService] Approval timed out for ${tool_use_id}`);
  }

  /**
   * Get invocation by tool_use_id
   */
  getInvocation(tool_use_id: string): ToolInvocation | undefined {
    return this.store.invocations.get(tool_use_id);
  }

  /**
   * Get invocation by job_id
   */
  getInvocationByJobId(job_id: string): ToolInvocation | undefined {
    for (const invocation of this.store.invocations.values()) {
      if (invocation.job_id === job_id) {
        return invocation;
      }
    }
    return undefined;
  }

  /**
   * Get all pending approvals for a session
   */
  getPendingApprovals(session_id: string): PendingApproval[] {
    const pending: PendingApproval[] = [];

    for (const invocation of this.store.invocations.values()) {
      if (
        invocation.session_id === session_id &&
        invocation.approval_status === ApprovalStatus.PENDING
      ) {
        pending.push({
          tool_use_id: invocation.tool_use_id,
          tool_name: invocation.tool_name,
          tool_input: invocation.tool_input,
          session_id: invocation.session_id,
          created_at: invocation.created_at,
          timeout_at: invocation.timeout_at!,
        });
      }
    }

    return pending;
  }

  /**
   * Update invocation status (for execution tracking)
   */
  updateStatus(tool_use_id: string, status: ApprovalStatus): void {
    const invocation = this.store.invocations.get(tool_use_id);
    if (invocation) {
      invocation.approval_status = status;
      invocation.updated_at = new Date();
      console.log(
        `[ApprovalService] Updated status for ${tool_use_id}: ${status}`
      );
    }
  }

  /**
   * Wait for approval decision (used by LocalToolOrchestrator)
   */
  async waitForApproval(
    tool_use_id: string
  ): Promise<"APPROVED" | "REJECTED" | "TIMED_OUT"> {
    return new Promise((resolve) => {
      const checkStatus = () => {
        const invocation = this.store.invocations.get(tool_use_id);
        if (!invocation) {
          resolve("REJECTED");
          return;
        }

        switch (invocation.approval_status) {
          case ApprovalStatus.APPROVED:
            resolve("APPROVED");
            break;
          case ApprovalStatus.REJECTED:
            resolve("REJECTED");
            break;
          case ApprovalStatus.TIMED_OUT:
            resolve("TIMED_OUT");
            break;
          case ApprovalStatus.PENDING:
            // Continue waiting
            break;
          default:
            resolve("REJECTED");
            break;
        }
      };

      // Check immediately
      checkStatus();

      // Listen for status changes
      const listener = (event: ApprovalEvent) => {
        if (event.tool_use_id === tool_use_id) {
          checkStatus();
          if (event.data.approval_status !== ApprovalStatus.PENDING) {
            this.removeListener("approval_event", listener);
          }
        }
      };

      this.on("approval_event", listener);
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ApprovalConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("[ApprovalService] Updated config:", this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): ApprovalConfig {
    return { ...this.config };
  }

  /**
   * Clean up expired invocations (should be called periodically)
   */
  cleanup(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, invocation] of this.store.invocations.entries()) {
      // Remove invocations older than 24 hours
      const age = now.getTime() - invocation.created_at.getTime();
      if (age > 24 * 60 * 60 * 1000) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.store.invocations.delete(key);
      const timeoutId = this.store.pendingTimeouts.get(key);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.store.pendingTimeouts.delete(key);
      }
    }

    if (expiredKeys.length > 0) {
      console.log(
        `[ApprovalService] Cleaned up ${expiredKeys.length} expired invocations`
      );
    }
  }
}

// Singleton instance
let approvalServiceInstance: ApprovalService | null = null;

export function getApprovalService(
  config?: Partial<ApprovalConfig>
): ApprovalService {
  if (!approvalServiceInstance) {
    approvalServiceInstance = new ApprovalService(config);

    // Set up periodic cleanup
    setInterval(
      () => {
        approvalServiceInstance?.cleanup();
      },
      60 * 60 * 1000
    ); // Every hour
  }

  return approvalServiceInstance;
}
