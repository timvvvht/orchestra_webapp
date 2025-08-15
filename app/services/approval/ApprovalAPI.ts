/**
 * Approval API
 * 
 * REST API endpoints for the approval service.
 * Provides endpoints for requesting approvals, making decisions, and querying status.
 */

import { getApprovalService } from './ApprovalService';
import { ApprovalRequest, ApprovalDecision, ApprovalConfig } from './types';

export class ApprovalAPI {
  private approvalService = getApprovalService();

  /**
   * POST /api/approval/request
   * Request approval for a tool execution
   */
  async requestApproval(request: ApprovalRequest): Promise<{ success: boolean; message?: string }> {
    try {
      await this.approvalService.requestApproval(request);
      return { success: true };
    } catch (error) {
      console.error('[ApprovalAPI] Error requesting approval:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * POST /api/approval/decide
   * Make an approval decision
   */
  async makeDecision(decision: ApprovalDecision): Promise<{ success: boolean; message?: string }> {
    try {
      const processed = await this.approvalService.processDecision(decision);
      if (!processed) {
        return { 
          success: false, 
          message: 'Invalid approval request or already processed' 
        };
      }
      return { success: true };
    } catch (error) {
      console.error('[ApprovalAPI] Error processing decision:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * GET /api/approval/invocation/:tool_use_id
   * Get invocation details by tool_use_id
   */
  async getInvocation(tool_use_id: string) {
    try {
      const invocation = this.approvalService.getInvocation(tool_use_id);
      if (!invocation) {
        return { success: false, message: 'Invocation not found' };
      }
      return { success: true, data: invocation };
    } catch (error) {
      console.error('[ApprovalAPI] Error getting invocation:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * GET /api/approval/invocation/byJob/:job_id
   * Get invocation details by job_id
   */
  async getInvocationByJobId(job_id: string) {
    try {
      const invocation = this.approvalService.getInvocationByJobId(job_id);
      if (!invocation) {
        return { success: false, message: 'Invocation not found' };
      }
      return { success: true, data: invocation };
    } catch (error) {
      console.error('[ApprovalAPI] Error getting invocation by job ID:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * GET /api/approval/pending/:session_id
   * Get pending approvals for a session
   */
  async getPendingApprovals(session_id: string) {
    try {
      const pending = this.approvalService.getPendingApprovals(session_id);
      return { success: true, data: pending };
    } catch (error) {
      console.error('[ApprovalAPI] Error getting pending approvals:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * GET /api/approval/config
   * Get current approval configuration
   */
  async getConfig() {
    try {
      const config = this.approvalService.getConfig();
      return { success: true, data: config };
    } catch (error) {
      console.error('[ApprovalAPI] Error getting config:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * PUT /api/approval/config
   * Update approval configuration
   */
  async updateConfig(config: Partial<ApprovalConfig>): Promise<{ success: boolean; message?: string }> {
    try {
      this.approvalService.updateConfig(config);
      return { success: true };
    } catch (error) {
      console.error('[ApprovalAPI] Error updating config:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check if a tool requires approval
   */
  requiresApproval(toolName: string): boolean {
    return this.approvalService.requiresApproval(toolName);
  }

  /**
   * Get the approval service instance for event listening
   */
  getService() {
    return this.approvalService;
  }
}

// Singleton instance
let approvalAPIInstance: ApprovalAPI | null = null;

export function getApprovalAPI(): ApprovalAPI {
  if (!approvalAPIInstance) {
    approvalAPIInstance = new ApprovalAPI();
  }
  return approvalAPIInstance;
}