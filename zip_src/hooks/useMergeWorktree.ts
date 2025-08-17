/**
 * Hook for merging worktree changes back to main repository
 * Handles the complete merge workflow with error handling and user feedback
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { invokeFinalizeWorktree, isTauriEnvironment } from '@/utils/worktreeApi';
import type { FinalizeResultResponse } from '@/types/worktreeTypes';

interface MergeWorktreeOptions {
  sessionId: string;
  sessionName?: string;
  projectRoot: string;
  mode?: 'merge_only' | 'finalize';
  keepWorktree?: boolean;
  keepWorktree?: boolean;
}

interface MergeWorktreeState {
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
  hasConflict?: boolean;
  conflictedFiles?: string[];
}

export const useMergeWorktree = () => {
  const [state, setState] = useState<MergeWorktreeState>({
    isLoading: false,
    error: null,
    isSuccess: false
  });

  // New structured return type for better UI handling
  type MergeReturn = { ok: boolean; result?: FinalizeResultResponse; error?: string };

  const mergeWorktree = useCallback(async (options: MergeWorktreeOptions): Promise<MergeReturn> => {
    const { sessionId, sessionName, projectRoot, mode = 'finalize', keepWorktree } = options;

    // Check if we're in Tauri environment
    if (!isTauriEnvironment()) {
      const errorMsg = 'Worktree merge is only available in the desktop application';
      setState(prev => ({ ...prev, error: errorMsg }));
      toast.error(errorMsg);
      return { ok: false, error: errorMsg };
    }

    // Reset state
    setState({
      isLoading: true,
      error: null,
      isSuccess: false
    });

    try {
      console.log(`🔄 [useMergeWorktree] Starting merge for session: ${sessionId}`);
      
      // Show loading toast
      const loadingToast = toast.loading('Merging worktree changes...');

      // Call the backend for merge-only or finalize (unified via keepWorktree flag)
      const useKeep = keepWorktree === true || mode === 'merge_only';
      const result = await invokeFinalizeWorktree(sessionId, projectRoot, useKeep);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Handle different result statuses
      if (result.status === 'merged') {
        const successMsg = `✅ Successfully merged changes from ${sessionName || sessionId}`;
        console.log(`✅ [useMergeWorktree] ${successMsg}`, result);
        
        setState({
          isLoading: false,
          error: null,
          isSuccess: true
        });

        // Show success toast with commit details
        toast.success(successMsg, {
          description: result.commit ? `Commit: ${result.commit.slice(0, 8)}` : undefined,
          duration: 5000
        });

        return { ok: true, result };
      } else if (result.status === 'no_changes') {
        const infoMsg = `No changes to merge from ${sessionName || sessionId}`;
        console.log(`ℹ️ [useMergeWorktree] ${infoMsg}`, result);
        
        setState({
          isLoading: false,
          error: null,
          isSuccess: true
        });

        toast.success(infoMsg, {
          description: 'Worktree is already up to date',
          duration: 4000
        });

        return { ok: true, result };
      } else if (result.status === 'needs_merge') {
        console.log(`🔄 [useMergeWorktree] Merge conflicts detected for session: ${sessionId}`);
        console.log(`🔄 [useMergeWorktree] Conflicted files: ${result.conflicted_files?.join(', ')}`);
        
        // Set conflict state before throwing to preserve existing toast logic
        setState({
          isLoading: false,
          error: `Merge conflicts detected. Please resolve conflicts in: ${result.conflicted_files?.join(', ') || 'unknown files'}`,
          isSuccess: false,
          hasConflict: true,
          conflictedFiles: result.conflicted_files || []
        });

        return {
          ok: false,
          result,
          error: `Merge conflicts detected. Please resolve conflicts in: ${result.conflicted_files?.join(', ') || 'unknown files'}`
        };
      } else if (result.status === 'DirtyRepo') {
        throw { code: 'DirtyRepo', message: 'Repository has uncommitted changes.' };
      } else {
        return { ok: false, error: 'Unknown merge result status' };
      }
    } catch (error) {
      let errorMsg: string;
      let errorCode: string | undefined;

      if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
        // Handle structured error objects (like DirtyRepo)
        errorMsg = (error as any).message;
        errorCode = (error as any).code;
      } else if (error instanceof Error) {
        errorMsg = error.message;
      } else {
        errorMsg = 'Failed to merge worktree changes';
      }
      
      console.error('❌ [useMergeWorktree] Merge failed:', error);
      
      setState({
        isLoading: false,
        error: errorMsg,
        isSuccess: false
      });

      // Show error toast with appropriate title based on error code
      const toastTitle = errorCode === 'DirtyRepo' ? 'Repository Not Clean' : 'Merge Failed';
      toast.error(toastTitle, {
        description: errorMsg,
        duration: 7000
      });

      return { ok: false, error: errorMsg };
    }
  }, []);

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      isSuccess: false
    });
  }, []);

  const clearConflict = useCallback(() => {
    setState(prev => ({
      ...prev,
      hasConflict: false,
      conflictedFiles: undefined
    }));
  }, []);

  return {
    mergeWorktree,
    resetState,
    clearConflict,
    ...state
  };
};