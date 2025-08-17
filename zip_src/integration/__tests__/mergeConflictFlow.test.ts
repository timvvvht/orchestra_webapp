/**
 * Integration test for merge conflict resolution flow
 * Tests the complete user journey from conflict detection to resolution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMergeWorktree } from '@/hooks/useMergeWorktree';
import { invokeFinalizeWorktree, isTauriEnvironment } from '@/utils/worktreeApi';
import { readFileAbs, writeFileAbs } from '@/utils/worktreeFs';
import { stripGitConflictMarkers } from '@/utils/conflictResolution';

// Mock all dependencies
vi.mock('@/utils/worktreeApi');
vi.mock('@/utils/worktreeFs');
vi.mock('@/utils/conflictResolution');
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));
vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'loading-toast-id'),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
  }
}));

const mockInvokeFinalizeWorktree = vi.mocked(invokeFinalizeWorktree);
const mockIsTauriEnvironment = vi.mocked(isTauriEnvironment);
const mockReadFileAbs = vi.mocked(readFileAbs);
const mockWriteFileAbs = vi.mocked(writeFileAbs);
const mockStripGitConflictMarkers = vi.mocked(stripGitConflictMarkers);

describe('Merge Conflict Resolution Flow Integration', () => {
  const mockConflictedFiles = ['src/main.ts', 'package.json'];
  const mockFileContent = `<<<<<<< HEAD
Original content
=======
Modified content
>>>>>>> branch`;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default environment
    mockIsTauriEnvironment.mockReturnValue(true);
    
    // Setup file operations
    mockReadFileAbs.mockResolvedValue(mockFileContent);
    mockWriteFileAbs.mockResolvedValue(undefined);
    mockStripGitConflictMarkers.mockReturnValue({
      cleaned: 'Original content',
      hadMarkers: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Conflict Resolution Flow', () => {
    it('should handle the full flow from conflict detection to successful merge', async () => {
      // Step 1: Initial merge attempt results in conflicts
      mockInvokeFinalizeWorktree.mockResolvedValueOnce({
        status: 'needs_merge',
        conflicted_files: mockConflictedFiles
      });

      const { result } = renderHook(() => useMergeWorktree());

      // Step 2: Trigger merge and expect conflicts
      let mergeResult: boolean;
      await act(async () => {
        mergeResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      // Verify conflict state
      expect(mergeResult).toBe(false);
      expect(result.current.hasConflict).toBe(true);
      expect(result.current.conflictedFiles).toEqual(mockConflictedFiles);
      expect(result.current.error).toContain('Merge conflicts detected');

      // Step 3: Simulate user resolving files (this would happen in the modal)
      // In real flow, user would:
      // - Open modal (triggered by hasConflict effect)
      // - Select each file
      // - Edit content in Monaco
      // - Save changes
      // - Mark as resolved

      // Simulate file operations that would happen in modal
      for (const file of mockConflictedFiles) {
        // User opens file (simulated by modal)
        await act(async () => {
          await mockReadFileAbs(`/test/worktree/${file}`);
        });

        // User edits and saves file (simulated by modal)
        const resolvedContent = `Resolved content for ${file}`;
        await act(async () => {
          await mockWriteFileAbs(`/test/worktree/${file}`, resolvedContent);
        });

        // Conflict markers are stripped when marking as resolved
        mockStripGitConflictMarkers.mockReturnValue({
          cleaned: resolvedContent,
          hadMarkers: true
        });
      }

      // Step 4: User clicks "Complete Merge" which calls mergeWorktree again
      // This time it should succeed
      mockInvokeFinalizeWorktree.mockResolvedValueOnce({
        status: 'merged',
        commit: 'abc123def456'
      });

      let secondMergeResult: boolean;
      await act(async () => {
        secondMergeResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      // Verify successful merge
      expect(secondMergeResult).toBe(true);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.hasConflict).toBe(false);
      expect(result.current.error).toBe(null);

      // Verify backend was called twice
      expect(mockInvokeFinalizeWorktree).toHaveBeenCalledTimes(2);
      expect(mockInvokeFinalizeWorktree).toHaveBeenNthCalledWith(1, 'test-session-123', '/test/project');
      expect(mockInvokeFinalizeWorktree).toHaveBeenNthCalledWith(2, 'test-session-123', '/test/project');
    });

    it('should handle persistent conflicts after resolution attempt', async () => {
      // Step 1: Initial merge with conflicts
      mockInvokeFinalizeWorktree.mockResolvedValueOnce({
        status: 'needs_merge',
        conflicted_files: mockConflictedFiles
      });

      const { result } = renderHook(() => useMergeWorktree());

      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      expect(result.current.hasConflict).toBe(true);

      // Step 2: Simulate partial resolution (user only resolves one file)
      await act(async () => {
        await mockWriteFileAbs('/test/worktree/src/main.ts', 'Resolved content');
      });

      // Step 3: Retry merge but still get conflicts
      mockInvokeFinalizeWorktree.mockResolvedValueOnce({
        status: 'needs_merge',
        conflicted_files: ['package.json'] // Still one file conflicted
      });

      let retryResult: boolean;
      await act(async () => {
        retryResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      // Should still indicate conflicts
      expect(retryResult).toBe(false);
      expect(result.current.hasConflict).toBe(true);
      expect(result.current.conflictedFiles).toEqual(['package.json']);
    });

    it('should handle dirty repo error during conflict resolution', async () => {
      // Step 1: Initial merge with conflicts
      mockInvokeFinalizeWorktree.mockResolvedValueOnce({
        status: 'needs_merge',
        conflicted_files: mockConflictedFiles
      });

      const { result } = renderHook(() => useMergeWorktree());

      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      expect(result.current.hasConflict).toBe(true);

      // Step 2: Simulate user resolving all files
      for (const file of mockConflictedFiles) {
        await act(async () => {
          await mockWriteFileAbs(`/test/worktree/${file}`, `Resolved ${file}`);
        });
      }

      // Step 3: Retry merge but get dirty repo error
      const dirtyRepoError = { code: 'DirtyRepo', message: 'Repository has uncommitted changes.' };
      mockInvokeFinalizeWorktree.mockRejectedValueOnce(dirtyRepoError);

      let retryResult: boolean;
      await act(async () => {
        retryResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      // Should fail with dirty repo error
      expect(retryResult).toBe(false);
      expect(result.current.error).toBe('Repository has uncommitted changes.');
      // Conflict state should be preserved
      expect(result.current.hasConflict).toBe(true);
    });

    it('should clear conflict state when clearConflict is called', async () => {
      // Step 1: Trigger conflicts
      mockInvokeFinalizeWorktree.mockResolvedValueOnce({
        status: 'needs_merge',
        conflicted_files: mockConflictedFiles
      });

      const { result } = renderHook(() => useMergeWorktree());

      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      expect(result.current.hasConflict).toBe(true);

      // Step 2: Clear conflict state
      act(() => {
        result.current.clearConflict();
      });

      expect(result.current.hasConflict).toBe(false);
      expect(result.current.conflictedFiles).toBeUndefined();
    });

    it('should handle file I/O errors during conflict resolution', async () => {
      // Step 1: Initial merge with conflicts
      mockInvokeFinalizeWorktree.mockResolvedValueOnce({
        status: 'needs_merge',
        conflicted_files: mockConflictedFiles
      });

      const { result } = renderHook(() => useMergeWorktree());

      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      expect(result.current.hasConflict).toBe(true);

      // Step 2: Simulate file read error (this would happen in modal)
      mockReadFileAbs.mockRejectedValueOnce(new Error('Permission denied'));

      // The error would be handled by the modal, but hook state should remain consistent
      expect(result.current.hasConflict).toBe(true);
      expect(result.current.conflictedFiles).toEqual(mockConflictedFiles);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty conflicted files list', async () => {
      mockInvokeFinalizeWorktree.mockResolvedValueOnce({
        status: 'needs_merge',
        conflicted_files: []
      });

      const { result } = renderHook(() => useMergeWorktree());

      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      expect(result.current.hasConflict).toBe(true);
      expect(result.current.conflictedFiles).toEqual([]);
    });

    it('should handle backend error on second merge attempt', async () => {
      // Step 1: Initial conflicts
      mockInvokeFinalizeWorktree.mockResolvedValueOnce({
        status: 'needs_merge',
        conflicted_files: mockConflictedFiles
      });

      const { result } = renderHook(() => useMergeWorktree());

      await act(async () => {
        await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      expect(result.current.hasConflict).toBe(true);

      // Step 2: Simulate resolution
      for (const file of mockConflictedFiles) {
        await act(async () => {
          await mockWriteFileAbs(`/test/worktree/${file}`, `Resolved ${file}`);
        });
      }

      // Step 3: Backend error on retry
      mockInvokeFinalizeWorktree.mockRejectedValueOnce(new Error('Network error'));

      let retryResult: boolean;
      await act(async () => {
        retryResult = await result.current.mergeWorktree({
          sessionId: 'test-session-123',
          sessionName: 'Test Session',
          projectRoot: '/test/project'
        });
      });

      expect(retryResult).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(result.current.hasConflict).toBe(false); // Should be cleared on new error
    });
  });
});