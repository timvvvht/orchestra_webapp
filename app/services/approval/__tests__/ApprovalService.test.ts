/**
 * ApprovalService Tests
 * 
 * Unit tests for the ApprovalService functionality.
 */

import { ApprovalService } from '../ApprovalService';
import { ApprovalStatus } from '../types';

describe('ApprovalService', () => {
  let service: ApprovalService;

  beforeEach(() => {
    service = new ApprovalService({
      required_approval_tools: ['str_replace_editor', '/.*delete.*/'],
      default_timeout_minutes: 1, // Short timeout for tests
      approval_enabled: true
    });
  });

  afterEach(() => {
    // Clean up any pending timeouts
    service.cleanup();
  });

  describe('requiresApproval', () => {
    it('should return true for exact tool name matches', () => {
      expect(service.requiresApproval('str_replace_editor')).toBe(true);
    });

    it('should return true for regex pattern matches', () => {
      expect(service.requiresApproval('delete_file')).toBe(true);
      expect(service.requiresApproval('soft_delete')).toBe(true);
    });

    it('should return false for non-matching tools', () => {
      expect(service.requiresApproval('cat')).toBe(false);
      expect(service.requiresApproval('read_files')).toBe(false);
    });

    it('should return false when approval is disabled', () => {
      service.updateConfig({ approval_enabled: false });
      expect(service.requiresApproval('str_replace_editor')).toBe(false);
    });
  });

  describe('createInvocation', () => {
    it('should create a new invocation record', () => {
      const invocation = service.createInvocation({
        tool_use_id: 'test-123',
        session_id: 'session-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt' }
      });

      expect(invocation.tool_use_id).toBe('test-123');
      expect(invocation.session_id).toBe('session-456');
      expect(invocation.tool_name).toBe('str_replace_editor');
      expect(invocation.approval_status).toBe(ApprovalStatus.PENDING);
      expect(invocation.created_at).toBeInstanceOf(Date);
    });

    it('should store the invocation for retrieval', () => {
      service.createInvocation({
        tool_use_id: 'test-123',
        session_id: 'session-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt' }
      });

      const retrieved = service.getInvocation('test-123');
      expect(retrieved).toBeDefined();
      expect(retrieved?.tool_use_id).toBe('test-123');
    });
  });

  describe('requestApproval', () => {
    it('should request approval and emit event', async () => {
      const eventPromise = new Promise((resolve) => {
        service.once('approval_event', resolve);
      });

      await service.requestApproval({
        tool_use_id: 'test-123',
        job_id: 'job-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt' },
        session_id: 'session-789'
      });

      const event = await eventPromise;
      expect(event).toMatchObject({
        type: 'APPROVAL_REQUESTED',
        session_id: 'session-789',
        tool_use_id: 'test-123'
      });
    });

    it('should set timeout for approval', async () => {
      await service.requestApproval({
        tool_use_id: 'test-123',
        job_id: 'job-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt' },
        session_id: 'session-789',
        timeout_minutes: 0.01 // Very short timeout
      });

      const invocation = service.getInvocation('test-123');
      expect(invocation?.timeout_at).toBeInstanceOf(Date);
      expect(invocation?.timeout_at!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('processDecision', () => {
    beforeEach(async () => {
      await service.requestApproval({
        tool_use_id: 'test-123',
        job_id: 'job-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt' },
        session_id: 'session-789'
      });
    });

    it('should process approval decision', async () => {
      const eventPromise = new Promise((resolve) => {
        service.once('approval_event', resolve);
      });

      const result = await service.processDecision({
        tool_use_id: 'test-123',
        decision: 'APPROVED',
        user_id: 'user-123'
      });

      expect(result).toBe(true);

      const invocation = service.getInvocation('test-123');
      expect(invocation?.approval_status).toBe(ApprovalStatus.APPROVED);
      expect(invocation?.approved_by).toBe('user-123');

      const event = await eventPromise;
      expect(event).toMatchObject({
        type: 'APPROVAL_DECIDED',
        tool_use_id: 'test-123'
      });
    });

    it('should process rejection decision', async () => {
      const result = await service.processDecision({
        tool_use_id: 'test-123',
        decision: 'REJECTED',
        user_id: 'user-123'
      });

      expect(result).toBe(true);

      const invocation = service.getInvocation('test-123');
      expect(invocation?.approval_status).toBe(ApprovalStatus.REJECTED);
    });

    it('should return false for unknown tool_use_id', async () => {
      const result = await service.processDecision({
        tool_use_id: 'unknown-123',
        decision: 'APPROVED',
        user_id: 'user-123'
      });

      expect(result).toBe(false);
    });

    it('should return false for already processed approval', async () => {
      // First decision
      await service.processDecision({
        tool_use_id: 'test-123',
        decision: 'APPROVED',
        user_id: 'user-123'
      });

      // Second decision should fail
      const result = await service.processDecision({
        tool_use_id: 'test-123',
        decision: 'REJECTED',
        user_id: 'user-456'
      });

      expect(result).toBe(false);
    });
  });

  describe('waitForApproval', () => {
    it('should resolve when approval is granted', async () => {
      await service.requestApproval({
        tool_use_id: 'test-123',
        job_id: 'job-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt' },
        session_id: 'session-789'
      });

      // Start waiting
      const waitPromise = service.waitForApproval('test-123');

      // Approve after a short delay
      setTimeout(() => {
        service.processDecision({
          tool_use_id: 'test-123',
          decision: 'APPROVED',
          user_id: 'user-123'
        });
      }, 10);

      const result = await waitPromise;
      expect(result).toBe('APPROVED');
    });

    it('should resolve when approval is rejected', async () => {
      await service.requestApproval({
        tool_use_id: 'test-123',
        job_id: 'job-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt' },
        session_id: 'session-789'
      });

      // Start waiting
      const waitPromise = service.waitForApproval('test-123');

      // Reject after a short delay
      setTimeout(() => {
        service.processDecision({
          tool_use_id: 'test-123',
          decision: 'REJECTED',
          user_id: 'user-123'
        });
      }, 10);

      const result = await waitPromise;
      expect(result).toBe('REJECTED');
    });

    it('should resolve with REJECTED for unknown tool_use_id', async () => {
      const result = await service.waitForApproval('unknown-123');
      expect(result).toBe('REJECTED');
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for a session', async () => {
      await service.requestApproval({
        tool_use_id: 'test-123',
        job_id: 'job-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt' },
        session_id: 'session-789'
      });

      await service.requestApproval({
        tool_use_id: 'test-456',
        job_id: 'job-789',
        tool_name: 'delete_file',
        tool_input: { file: 'old.txt' },
        session_id: 'session-789'
      });

      const pending = service.getPendingApprovals('session-789');
      expect(pending).toHaveLength(2);
      expect(pending[0].tool_use_id).toBe('test-123');
      expect(pending[1].tool_use_id).toBe('test-456');
    });

    it('should not return approvals from other sessions', async () => {
      await service.requestApproval({
        tool_use_id: 'test-123',
        job_id: 'job-456',
        tool_name: 'str_replace_editor',
        tool_input: { file: 'test.txt' },
        session_id: 'session-789'
      });

      const pending = service.getPendingApprovals('other-session');
      expect(pending).toHaveLength(0);
    });
  });
});