/**
 * Tests for worktreeApi utility functions
 * Validates API calls and parameter forwarding
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { invokeFinalizeWorktree, invokeCreateWorktree, isTauriEnvironment, checkRepoDirtyLightweight } from '../worktreeApi';
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

// Mock window.__TAURI_IPC__ for environment detection
Object.defineProperty(window, '__TAURI_IPC__', {
  value: {},
  writable: true
});

const mockInvoke = vi.mocked(invoke);

describe('worktreeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isTauriEnvironment', () => {
    it('should return true when __TAURI_IPC__ is available', () => {
      expect(isTauriEnvironment()).toBe(true);
    });

    it('should return false when __TAURI_IPC__ is not available', () => {
      const originalTauri = window.__TAURI_IPC__;
      delete (window as any).__TAURI_IPC__;
      
      expect(isTauriEnvironment()).toBe(false);
      
      // Restore
      window.__TAURI_IPC__ = originalTauri;
    });
  });

  describe('invokeFinalizeWorktree', () => {
    it('should call invoke with correct parameters including projectRoot', async () => {
      const mockResult = {
        status: 'merged',
        commit: 'abc123def456'
      };
      mockInvoke.mockResolvedValue(mockResult);

      const sessionId = 'test-session-123';
      const projectRoot = '/path/to/project';

      const result = await invokeFinalizeWorktree(sessionId, projectRoot);

      expect(mockInvoke).toHaveBeenCalledWith('finalize_worktree', {
        sessionId: sessionId,
        projectRoot: projectRoot
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle different project root paths', async () => {
      const mockResult = { status: 'no_changes' };
      mockInvoke.mockResolvedValue(mockResult);

      const testCases = [
        '/Users/john/projects/my-app',
        '/home/user/workspace',
        'C:\\Users\\User\\Projects\\App',
        '.',
        '../parent-project'
      ];

      for (const projectRoot of testCases) {
        mockInvoke.mockClear();
        
        await invokeFinalizeWorktree('session-123', projectRoot);
        
        expect(mockInvoke).toHaveBeenCalledWith('finalize_worktree', {
          sessionId: 'session-123',
          projectRoot: projectRoot
        });
      }
    });

    it('should handle backend errors gracefully', async () => {
      const errorMessage = 'Backend error: Failed to merge';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(invokeFinalizeWorktree('session-123', '/project')).rejects.toThrow(
        'Failed to finalize worktree: Error: Backend error: Failed to merge'
      );
    });

    it('should log appropriate messages', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockResult = { status: 'merged', commit: 'abc123' };
      mockInvoke.mockResolvedValue(mockResult);

      await invokeFinalizeWorktree('test-session-123', '/test/project');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔄 [worktreeApi] Finalizing worktree for session: test-ses... in project: /test/project')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ [worktreeApi] Worktree finalized:'),
        expect.objectContaining({
          sessionId: 'test-ses...',
          status: 'merged',
          projectRoot: '/test/project'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('invokeCreateWorktree', () => {
    it('should call invoke with correct parameters', async () => {
      const mockResult = {
        workspace_path: '/tmp/worktree-session-123',
        session_id: 'session-123'
      };
      mockInvoke.mockResolvedValue(mockResult);

      const sessionId = 'session-123';
      const projectRoot = '/path/to/project';

      const result = await invokeCreateWorktree(sessionId, projectRoot);

      expect(mockInvoke).toHaveBeenCalledWith('create_worktree', {
        sessionId: sessionId,
        projectRoot: projectRoot
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle creation errors', async () => {
      mockInvoke.mockRejectedValue(new Error('Git error'));

      await expect(invokeCreateWorktree('session-123', '/project')).rejects.toThrow(
        'Failed to create worktree: Error: Git error'
      );
    });
  });

  describe('checkRepoDirtyLightweight', () => {
    it('should return false for repository with only untracked files', async () => {
      // Mock the backend to return false for untracked-only repos
      mockInvoke.mockResolvedValue(false);

      const projectRoot = '/path/to/project/with/untracked/files';
      const result = await checkRepoDirtyLightweight(projectRoot);

      expect(mockInvoke).toHaveBeenCalledWith('check_repo_dirty', {
        projectRoot: projectRoot
      });
      expect(result).toBe(false);
    });

    it('should return true for repository with tracked file changes', async () => {
      // Mock the backend to return true for repos with tracked changes
      mockInvoke.mockResolvedValue(true);

      const projectRoot = '/path/to/project/with/tracked/changes';
      const result = await checkRepoDirtyLightweight(projectRoot);

      expect(mockInvoke).toHaveBeenCalledWith('check_repo_dirty', {
        projectRoot: projectRoot
      });
      expect(result).toBe(true);
    });

    it('should handle backend errors gracefully', async () => {
      const errorMessage = 'Git status check failed';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(checkRepoDirtyLightweight('/project')).rejects.toThrow(
        'Failed to check repository status: Error: Git status check failed'
      );
    });
  });
});