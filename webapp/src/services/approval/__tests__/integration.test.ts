/**
 * Approval System Integration Tests
 * 
 * End-to-end tests for the approval system integration with LocalToolOrchestrator.
 */

import { ApprovalService } from '../ApprovalService';
import { ApprovalAPI } from '../ApprovalAPI';
import { ApprovalStatus } from '../types';

// Mock LocalToolOrchestrator for testing
class MockLocalToolOrchestrator {
  private approvalAPI: ApprovalAPI;
  
  constructor(approvalAPI: ApprovalAPI) {
    this.approvalAPI = approvalAPI;
  }

  async executeJob(sessionId: string, jobInstruction: any): Promise<string> {
    const { job_id, tool_name, tool_input } = jobInstruction;
    
    // Check if tool requires approval
    if (this.approvalAPI.requiresApproval(tool_name)) {
      console.log(`[MockOrchestrator] Tool ${tool_name} requires approval`);
      
      // Create a mock tool_use_id for correlation
      const tool_use_id = `tool-${Date.now()}`;
      
      // Create invocation record
      this.approvalAPI.getService().createInvocation({
        tool_use_id,
        session_id: sessionId,
        tool_name,
        tool_input
      });
      
      // Request approval
      await this.approvalAPI.requestApproval({
        tool_use_id,
        job_id,
        tool_name,
        tool_input,
        session_id: sessionId
      });
      
      // Wait for approval decision
      const decision = await this.approvalAPI.getService().waitForApproval(tool_use_id);
      
      if (decision === 'APPROVED') {
        console.log(`[MockOrchestrator] Tool ${tool_name} approved, executing...`);
        return `Executed ${tool_name} successfully`;
      } else {
        console.log(`[MockOrchestrator] Tool ${tool_name} ${decision.toLowerCase()}`);
        throw new Error(`Tool execution ${decision.toLowerCase()}`);
      }
    } else {
      // Execute immediately if no approval required
      console.log(`[MockOrchestrator] Tool ${tool_name} does not require approval, executing...`);
      return `Executed ${tool_name} without approval`;
    }
  }
}

describe('Approval System Integration', () => {
  let approvalService: ApprovalService;
  let approvalAPI: ApprovalAPI;
  let mockOrchestrator: MockLocalToolOrchestrator;

  beforeEach(() => {
    // Create fresh instances for each test
    approvalService = new ApprovalService({
      required_approval_tools: ['str_replace_editor', 'execute_in_runner_session'],
      default_timeout_minutes: 1,
      approval_enabled: true
    });
    
    approvalAPI = new ApprovalAPI();
    // Override the singleton to use our test instance
    (approvalAPI as any).approvalService = approvalService;
    
    mockOrchestrator = new MockLocalToolOrchestrator(approvalAPI);
  });

  afterEach(() => {
    approvalService.cleanup();
  });

  describe('End-to-End Approval Flow', () => {
    it('should complete full approval flow for approved tool', async () => {
      const sessionId = 'test-session-123';
      const jobInstruction = {
        job_id: 'job-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt', command: 'create' }
      };

      // Start execution (will pause for approval)
      const executionPromise = mockOrchestrator.executeJob(sessionId, jobInstruction);

      // Wait a bit for the approval request to be created
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check that approval is pending
      const pendingApprovals = approvalService.getPendingApprovals(sessionId);
      expect(pendingApprovals).toHaveLength(1);
      expect(pendingApprovals[0].tool_name).toBe('str_replace_editor');

      // Approve the tool
      const approvalResult = await approvalAPI.makeDecision({
        tool_use_id: pendingApprovals[0].tool_use_id,
        decision: 'APPROVED',
        user_id: 'test-user'
      });

      expect(approvalResult.success).toBe(true);

      // Wait for execution to complete
      const result = await executionPromise;
      expect(result).toBe('Executed str_replace_editor successfully');

      // Verify no pending approvals remain
      const remainingApprovals = approvalService.getPendingApprovals(sessionId);
      expect(remainingApprovals).toHaveLength(0);
    });

    it('should handle rejection properly', async () => {
      const sessionId = 'test-session-123';
      const jobInstruction = {
        job_id: 'job-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt', command: 'create' }
      };

      // Start execution (will pause for approval)
      const executionPromise = mockOrchestrator.executeJob(sessionId, jobInstruction);

      // Wait for approval request
      await new Promise(resolve => setTimeout(resolve, 10));

      // Get pending approval
      const pendingApprovals = approvalService.getPendingApprovals(sessionId);
      expect(pendingApprovals).toHaveLength(1);

      // Reject the tool
      const approvalResult = await approvalAPI.makeDecision({
        tool_use_id: pendingApprovals[0].tool_use_id,
        decision: 'REJECTED',
        user_id: 'test-user'
      });

      expect(approvalResult.success).toBe(true);

      // Execution should throw error
      await expect(executionPromise).rejects.toThrow('Tool execution rejected');

      // Verify no pending approvals remain
      const remainingApprovals = approvalService.getPendingApprovals(sessionId);
      expect(remainingApprovals).toHaveLength(0);
    });

    it('should execute immediately for non-approval tools', async () => {
      const sessionId = 'test-session-123';
      const jobInstruction = {
        job_id: 'job-456',
        tool_name: 'cat', // This tool doesn't require approval
        tool_input: { file: 'test.txt' }
      };

      // Execute should complete immediately
      const result = await mockOrchestrator.executeJob(sessionId, jobInstruction);
      expect(result).toBe('Executed cat without approval');

      // No pending approvals should be created
      const pendingApprovals = approvalService.getPendingApprovals(sessionId);
      expect(pendingApprovals).toHaveLength(0);
    });

    it('should handle timeout properly', async () => {
      // Use very short timeout for test
      const shortTimeoutService = new ApprovalService({
        required_approval_tools: ['str_replace_editor'],
        default_timeout_minutes: 0.01, // 0.6 seconds
        approval_enabled: true
      });

      const shortTimeoutAPI = new ApprovalAPI();
      (shortTimeoutAPI as any).approvalService = shortTimeoutService;

      const mockOrchestratorWithTimeout = new MockLocalToolOrchestrator(shortTimeoutAPI);

      const sessionId = 'test-session-123';
      const jobInstruction = {
        job_id: 'job-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt', command: 'create' }
      };

      // Start execution (will pause for approval)
      const executionPromise = mockOrchestratorWithTimeout.executeJob(sessionId, jobInstruction);

      // Don't approve - let it timeout
      await expect(executionPromise).rejects.toThrow('Tool execution timed_out');

      // Cleanup
      shortTimeoutService.cleanup();
    });

    it('should handle multiple concurrent approvals', async () => {
      const sessionId = 'test-session-123';
      
      const job1 = {
        job_id: 'job-1',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test1.txt' }
      };
      
      const job2 = {
        job_id: 'job-2',
        tool_name: 'execute_in_runner_session',
        tool_input: { command: 'ls -la' }
      };

      // Start both executions
      const execution1Promise = mockOrchestrator.executeJob(sessionId, job1);
      const execution2Promise = mockOrchestrator.executeJob(sessionId, job2);

      // Wait for both approval requests
      await new Promise(resolve => setTimeout(resolve, 20));

      // Should have 2 pending approvals
      const pendingApprovals = approvalService.getPendingApprovals(sessionId);
      expect(pendingApprovals).toHaveLength(2);

      // Approve first, reject second
      await approvalAPI.makeDecision({
        tool_use_id: pendingApprovals[0].tool_use_id,
        decision: 'APPROVED',
        user_id: 'test-user'
      });

      await approvalAPI.makeDecision({
        tool_use_id: pendingApprovals[1].tool_use_id,
        decision: 'REJECTED',
        user_id: 'test-user'
      });

      // First should succeed, second should fail
      const results = await Promise.allSettled([execution1Promise, execution2Promise]);
      
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');

      // No pending approvals should remain
      const remainingApprovals = approvalService.getPendingApprovals(sessionId);
      expect(remainingApprovals).toHaveLength(0);
    });
  });

  describe('Configuration Changes', () => {
    it('should respect configuration changes during runtime', async () => {
      const sessionId = 'test-session-123';
      const jobInstruction = {
        job_id: 'job-456',
        tool_name: 'cat',
        tool_input: { file: 'test.txt' }
      };

      // Initially, 'cat' doesn't require approval
      expect(approvalAPI.requiresApproval('cat')).toBe(false);

      // Execute should complete immediately
      let result = await mockOrchestrator.executeJob(sessionId, jobInstruction);
      expect(result).toBe('Executed cat without approval');

      // Update configuration to require approval for 'cat'
      await approvalAPI.updateConfig({
        required_approval_tools: ['str_replace_editor', 'execute_in_runner_session', 'cat']
      });

      // Now 'cat' should require approval
      expect(approvalAPI.requiresApproval('cat')).toBe(true);

      // Start new execution (should pause for approval)
      const executionPromise = mockOrchestrator.executeJob(sessionId, {
        ...jobInstruction,
        job_id: 'job-789'
      });

      // Wait for approval request
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should have pending approval
      const pendingApprovals = approvalService.getPendingApprovals(sessionId);
      expect(pendingApprovals).toHaveLength(1);
      expect(pendingApprovals[0].tool_name).toBe('cat');

      // Approve it
      await approvalAPI.makeDecision({
        tool_use_id: pendingApprovals[0].tool_use_id,
        decision: 'APPROVED',
        user_id: 'test-user'
      });

      result = await executionPromise;
      expect(result).toBe('Executed cat successfully');
    });
  });
});