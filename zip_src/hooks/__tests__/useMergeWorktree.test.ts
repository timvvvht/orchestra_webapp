/**
 * Tests for the useMergeWorktree hook
 * Validates merge functionality, error handling, and user feedback
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMergeWorktree } from '../useMergeWorktree';
import { invokeFinalizeWorktree, isTauriEnvironment } from '@/utils/worktreeApi';
import { getRepoRootFromWorktree } from '@/utils/worktreeUtils';

// Mock the dependencies
vi.mock('@/utils/worktreeApi', () => ({
  invokeFinalizeWorktree: vi.fn(),
  isTauriEnvironment: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'loading-toast-id'),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('useMergeWorktree Hook', () => {
  const mockInvokeFinalizeWorktree = vi.mocked(invokeFinalizeWorktree);
  const mockIsTauriEnvironment = vi.mocked(isTauriEnvironment);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useMergeWorktree());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.hasConflict).toBeUndefined();
      expect(result.current.conflictedFiles).toBeUndefined();
      expect(typeof result.current.mergeWorktree).toBe('function');
      expect(typeof result.current.resetState).toBe('function');
      expect(typeof result.current.clearConflict).toBe('function');
    });
  });

  describe('Environment Validation', () => {
    it('should fail when not in Tauri environment', async () => {
      mockIsTauriEnvironment.mockReturnValue(false);

      const { result } = renderHook(() => useMergeWorktree());

      let mergeResult: boolean;
      await act(async () => {
        mergeResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project/root'
        });
      });

      expect(mergeResult!).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Worktree merge is only available in the desktop application');
      expect(result.current.isSuccess).toBe(false);
      expect(mockInvokeFinalizeWorktree).not.toHaveBeenCalled();
    });

    it('should proceed when in Tauri environment', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockResolvedValue({
        success: true,
        branch: 'session-test-session-123',
        workspace_path: '/tmp/worktree-test-session-123'
      });

      const { result } = renderHook(() => useMergeWorktree());

      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project/root'
        });
      });

      expect(mockIsTauriEnvironment).toHaveBeenCalled();
      expect(mockInvokeFinalizeWorktree).toHaveBeenCalledWith('test-session-123', '/test/project/root');
    });
  });

  describe('Successful Merge', () => {
    it('should handle successful merge with commit info', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockResolvedValue({
        status: 'merged',
        commit: 'abc123def456'
      });

      const { result } = renderHook(() => useMergeWorktree());

      let mergeResult: boolean;
      await act(async () => {
        mergeResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Mission Control Task',
          projectRoot: '/test/project/root'
        });
      });

      expect(mergeResult!).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.isSuccess).toBe(true);
      expect(mockInvokeFinalizeWorktree).toHaveBeenCalledWith('test-session-123', '/test/project/root');
    });

    it('should handle no changes scenario', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockResolvedValue({
        status: 'no_changes'
      });

      const { result } = renderHook(() => useMergeWorktree());

      let mergeResult: boolean;
      await act(async () => {
        mergeResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          projectRoot: '/test/project/root'
        });
      });

      expect(mergeResult!).toBe(true);
      expect(result.current.isSuccess).toBe(true);
    });

    it('should handle merge conflicts', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockResolvedValue({
        status: 'needs_merge',
        worktree_path: '/tmp/worktree-test-session-123',
        conflicted_files: ['src/main.ts', 'package.json']
      });

      const { result } = renderHook(() => useMergeWorktree());

      let mergeResult: boolean;
      await act(async () => {
        mergeResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project/root'
        });
      });

      expect(mergeResult!).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toContain('Merge conflicts detected');
      expect(result.current.error).toContain('src/main.ts, package.json');
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.hasConflict).toBe(true);
      expect(result.current.conflictedFiles).toEqual(['src/main.ts', 'package.json']);
    });

    it('should clear conflict state when clearConflict is called', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockResolvedValue({
        status: 'needs_merge',
        worktree_path: '/tmp/worktree-test-session-123',
        conflicted_files: ['src/main.ts', 'package.json']
      });

      const { result } = renderHook(() => useMergeWorktree());

      // Trigger conflicts
      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project/root'
        });
      });

      expect(result.current.hasConflict).toBe(true);
      expect(result.current.conflictedFiles).toEqual(['src/main.ts', 'package.json']);

      // Clear conflict state
      act(() => {
        result.current.clearConflict();
      });

      expect(result.current.hasConflict).toBe(false);
      expect(result.current.conflictedFiles).toBeUndefined();
      // Other state should remain unchanged
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });

    it('should work correctly when MergeWorktreeButton converts worktree path to repo root', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockResolvedValue({
        status: 'merged',
        commit: 'abc123def456',
        conflicted_files: []
      });

      const { result } = renderHook(() => useMergeWorktree());

      // Simulate what MergeWorktreeButton does: convert worktree path to repo root
      const worktreePath = '/Users/tim/Code/latte-analytics/.orchestra/worktrees/ca50959c-70b6-4eb7-8915-710d97f0f5e0';
      const expectedRepoRoot = getRepoRootFromWorktree(worktreePath);

      let mergeResult: boolean;
      await act(async () => {
        mergeResult = await result.current.mergeWorktree({
          sessionId: 'ca50959c-70b6-4eb7-8915-710d97f0f5e0',
          sessionName: 'Test Session',
          projectRoot: expectedRepoRoot  // This should be the repo root, not the worktree path
        });
      });

      expect(mergeResult!).toBe(true);
      // Verify that the hook called the backend with the repo root, not the worktree path
      expect(mockInvokeFinalizeWorktree).toHaveBeenCalledWith(
        'ca50959c-70b6-4eb7-8915-710d97f0f5e0', 
        '/Users/tim/Code/latte-analytics'  // Should be repo root
      );
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('Error Handling', () => {

    it('should handle backend exception', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockRejectedValue(new Error('Network connection failed'));

      const { result } = renderHook(() => useMergeWorktree());

      let mergeResult: boolean;
      await act(async () => {
        mergeResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project/root'
        });
      });

      expect(mergeResult!).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network connection failed');
      expect(result.current.isSuccess).toBe(false);
    });

    it('should handle unknown error types', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockRejectedValue('String error');

      const { result } = renderHook(() => useMergeWorktree());

      let mergeResult: boolean;
      await act(async () => {
        mergeResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          projectRoot: '/test/project/root'
        });
      });

      expect(mergeResult!).toBe(false);
      expect(result.current.error).toBe('Failed to merge worktree changes');
    });
  });

  describe('Loading States', () => {
    it('should set loading state during merge operation', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      
      // Create a promise that we can control
      let resolvePromise: (value: any) => void;
      const controlledPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockInvokeFinalizeWorktree.mockReturnValue(controlledPromise);

      const { result } = renderHook(() => useMergeWorktree());

      // Start the merge operation
      act(() => {
        result.current.mergeWorktree({
          sessionId: 'test-session-123',
          projectRoot: '/test/project/root'
        });
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.isSuccess).toBe(false);

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          status: 'merged',
          commit: 'abc123def456'
        });
      });

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('State Reset', () => {
    it('should reset state when resetState is called', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockResolvedValue({
        status: 'merged',
        commit: 'abc123def456'
      });

      const { result } = renderHook(() => useMergeWorktree());

      // Perform a successful merge
      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          projectRoot: '/test/project/root'
        });
      });

      expect(result.current.isSuccess).toBe(true);

      // Reset state
      act(() => {
        result.current.resetState();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe('Session Name Handling', () => {
    it('should work with session name provided', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockResolvedValue({
        status: 'merged',
        commit: 'abc123def456'
      });

      const { result } = renderHook(() => useMergeWorktree());

      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'My Custom Session Name',
          projectRoot: '/test/project/root'
        });
      });

      expect(result.current.isSuccess).toBe(true);
    });

    it('should work without session name provided', async () => {
      mockIsTauriEnvironment.mockReturnValue(true);
      mockInvokeFinalizeWorktree.mockResolvedValue({
        status: 'merged',
        commit: 'abc123def456'
      });

      const { result } = renderHook(() => useMergeWorktree());

      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          projectRoot: '/test/project/root'
        });
      });

      expect(result.current.isSuccess).toBe(true);
    });
  });
});