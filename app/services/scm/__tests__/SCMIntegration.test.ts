/**
 * Integration Tests for SCM Integration with Orchestra
 * 
 * Tests how SCM integrates with Orchestra's tool execution workflow
 */

import { SCMIntegration, LocalToolOrchestratorSCMIntegration } from '../SCMIntegration';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { vi } from 'vitest';

describe('SCM Integration Tests', () => {
  let scmIntegration: SCMIntegration;
  let testWorkspace: string;

  beforeEach(() => {
    scmIntegration = new SCMIntegration();
    testWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'scm-integration-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true, force: true });
    }
  });

  describe('Tool Execution Workflow', () => {
    test('should create checkpoints before and after tool execution', async () => {
      // Setup initial workspace
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello");');

      // Simulate tool execution workflow
      const preHash = await scmIntegration.preToolExecution(testWorkspace, 'file_editor', { action: 'modify' });
      expect(preHash).toBeTruthy();
      expect(preHash).not.toBe('no-changes');

      // Simulate tool making changes
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello World!");');
      fs.writeFileSync(path.join(testWorkspace, 'new-file.txt'), 'Created by tool');

      const postHash = await scmIntegration.postToolExecution(
        testWorkspace, 
        'file_editor', 
        { success: true }, 
        preHash!
      );
      expect(postHash).toBeTruthy();
      expect(postHash).not.toBe('no-changes');
      expect(postHash).not.toBe(preHash);
    });

    test('should handle no changes scenario', async () => {
      // Setup workspace
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello");');
      
      // Create initial checkpoint
      await scmIntegration.preToolExecution(testWorkspace, 'initial_setup', {});

      // Try to create another checkpoint without changes
      const preHash = await scmIntegration.preToolExecution(testWorkspace, 'no_op_tool', {});
      expect(preHash).toBeNull();

      const postHash = await scmIntegration.postToolExecution(testWorkspace, 'no_op_tool', { success: true });
      expect(postHash).toBeNull();
    });

    test('should generate diff for timeline display', async () => {
      // Setup and create initial checkpoint
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello");');
      const preHash = await scmIntegration.preToolExecution(testWorkspace, 'file_editor', {});

      // Make changes
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello World!");');
      const postHash = await scmIntegration.postToolExecution(testWorkspace, 'file_editor', { success: true }, preHash!);

      // Get diff for timeline
      const diff = await scmIntegration.getDiffForTimeline(testWorkspace, preHash!, postHash!);
      
      expect(diff).toContain('diff --git');
      expect(diff).toContain('-console.log("Hello");');
      expect(diff).toContain('+console.log("Hello World!");');
    });

    test('should support manual checkpoints', async () => {
      // Setup workspace
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello");');

      const hash = await scmIntegration.createManualCheckpoint(testWorkspace, 'User saved work');
      expect(hash).toBeTruthy();

      const history = await scmIntegration.getCheckpointHistory(testWorkspace, 5);
      expect(history).toHaveLength(1);
      expect(history[0].message).toBe('Manual: User saved work');
    });

    test('should support workspace revert', async () => {
      // Create initial state
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello");');
      const checkpoint1 = await scmIntegration.createManualCheckpoint(testWorkspace, 'Initial state');

      // Make changes
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Modified");');
      fs.writeFileSync(path.join(testWorkspace, 'new-file.txt'), 'New content');
      await scmIntegration.createManualCheckpoint(testWorkspace, 'Modified state');

      // Revert to initial state
      const success = await scmIntegration.revertToCheckpoint(testWorkspace, checkpoint1!);
      expect(success).toBe(true);

      // Verify revert
      const appContent = fs.readFileSync(path.join(testWorkspace, 'app.js'), 'utf8');
      expect(appContent).toBe('console.log("Hello");');
      expect(fs.existsSync(path.join(testWorkspace, 'new-file.txt'))).toBe(false);
    });
  });

  describe('LocalToolOrchestrator Integration', () => {
    let orchestratorIntegration: LocalToolOrchestratorSCMIntegration;

    beforeEach(() => {
      orchestratorIntegration = new LocalToolOrchestratorSCMIntegration();
    });

    test('should execute tool with full SCM workflow', async () => {
      // Setup workspace
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello");');

      // Mock tool executor
      const mockToolExecutor = vi.fn().mockImplementation(async () => {
        // Simulate tool making changes
        fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello from tool!");');
        return { success: true, message: 'File modified successfully' };
      });

      // Execute tool with SCM integration
      const result = await orchestratorIntegration.executeToolWithSCM(
        testWorkspace,
        'file_editor',
        { file: 'app.js', action: 'modify' },
        mockToolExecutor
      );

      expect(mockToolExecutor).toHaveBeenCalled();
      expect(result.toolResult.success).toBe(true);
      expect(result.scmData.toolName).toBe('file_editor');
      expect(result.scmData.preCheckpoint).toBeTruthy();
      expect(result.scmData.postCheckpoint).toBeTruthy();
      expect(result.scmData.success).toBe(true);

      // Verify file was actually modified
      const appContent = fs.readFileSync(path.join(testWorkspace, 'app.js'), 'utf8');
      expect(appContent).toBe('console.log("Hello from tool!");');
    });

    test('should handle tool execution failure with SCM', async () => {
      // Setup workspace
      fs.writeFileSync(path.join(testWorkspace, 'app.js'), 'console.log("Hello");');

      // Mock failing tool executor
      const mockToolExecutor = vi.fn().mockImplementation(async () => {
        // Tool makes partial changes then fails
        fs.writeFileSync(path.join(testWorkspace, 'temp-file.txt'), 'Partial work');
        throw new Error('Tool execution failed');
      });

      // Execute tool and expect it to fail
      await expect(
        orchestratorIntegration.executeToolWithSCM(
          testWorkspace,
          'failing_tool',
          { action: 'test' },
          mockToolExecutor
        )
      ).rejects.toThrow('Tool execution failed');

      // Verify that checkpoints were still created
      const scmIntegration = orchestratorIntegration.getSCMIntegration();
      const history = await scmIntegration.getCheckpointHistory(testWorkspace);
      
      expect(history.length).toBeGreaterThanOrEqual(2); // Pre and post checkpoints
      expect(history.some(h => h.message.includes('Before failing_tool'))).toBe(true);
      expect(history.some(h => h.message.includes('After failing_tool'))).toBe(true);
    });

    test('should provide access to SCM integration for direct operations', async () => {
      const scmIntegration = orchestratorIntegration.getSCMIntegration();
      
      expect(scmIntegration).toBeInstanceOf(SCMIntegration);
      expect(scmIntegration.hasRepository(testWorkspace)).toBe(false);

      // Create a checkpoint
      fs.writeFileSync(path.join(testWorkspace, 'test.txt'), 'Test content');
      await scmIntegration.createManualCheckpoint(testWorkspace, 'Test checkpoint');
      
      expect(scmIntegration.hasRepository(testWorkspace)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle SCM errors gracefully during tool execution', async () => {
      // Use invalid workspace path to trigger SCM errors
      const invalidWorkspace = '/non/existent/path';

      const preHash = await scmIntegration.preToolExecution(invalidWorkspace, 'test_tool', {});
      expect(preHash).toBeNull(); // Should return null on error, not throw

      const postHash = await scmIntegration.postToolExecution(invalidWorkspace, 'test_tool', {});
      expect(postHash).toBeNull(); // Should return null on error, not throw
    });

    test('should handle diff generation errors', async () => {
      fs.writeFileSync(path.join(testWorkspace, 'test.txt'), 'Content');
      await scmIntegration.createManualCheckpoint(testWorkspace, 'Test');

      // Try to get diff with invalid hash
      const diff = await scmIntegration.getDiffForTimeline(testWorkspace, 'invalid-hash');
      expect(diff).toBe(''); // Should return empty string on error
    });

    test('should handle revert errors', async () => {
      fs.writeFileSync(path.join(testWorkspace, 'test.txt'), 'Content');
      await scmIntegration.createManualCheckpoint(testWorkspace, 'Test');

      // Try to revert to invalid hash
      const success = await scmIntegration.revertToCheckpoint(testWorkspace, 'invalid-hash');
      expect(success).toBe(false); // Should return false on error
    });
  });

  describe('Configuration Options', () => {
    test('should respect enableAutoCheckpoints option', async () => {
      const disabledSCM = new SCMIntegration({ enableAutoCheckpoints: false });
      
      fs.writeFileSync(path.join(testWorkspace, 'test.txt'), 'Content');

      const preHash = await disabledSCM.preToolExecution(testWorkspace, 'test_tool', {});
      expect(preHash).toBeNull();

      const postHash = await disabledSCM.postToolExecution(testWorkspace, 'test_tool', {});
      expect(postHash).toBeNull();
    });

    test('should use custom checkpoint prefix', async () => {
      const customSCM = new SCMIntegration({ checkpointPrefix: 'Custom Tool' });
      
      fs.writeFileSync(path.join(testWorkspace, 'test.txt'), 'Content');
      await customSCM.preToolExecution(testWorkspace, 'test_tool', {});

      const history = await customSCM.getCheckpointHistory(testWorkspace);
      expect(history[0].message).toBe('Custom Tool: Before test_tool');
    });
  });
});