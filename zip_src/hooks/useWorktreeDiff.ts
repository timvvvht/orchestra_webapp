import { invoke } from '@tauri-apps/api/tauri';
import { useQuery } from '@tanstack/react-query';
import { WorktreeDiffResponse } from '../types/worktreeDiffTypes';

export const useWorktreeDiff = (sessionId: string, projectRoot: string) =>
  useQuery(['worktree-diff', sessionId], async () =>
    invoke<WorktreeDiffResponse>('get_worktree_diff', { sessionId, projectRoot })
  );