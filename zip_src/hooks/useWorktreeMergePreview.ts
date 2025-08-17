import { useState, useCallback } from 'react';
import { invokePreviewMergeWorktree } from '@/utils/worktreeApi';
import type { MergePreviewSummary } from '@/types/worktreeTypes';

export function useWorktreeMergePreview() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MergePreviewSummary | null>(null);

  const fetchPreview = useCallback(async (sessionId: string, projectRoot: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await invokePreviewMergeWorktree(sessionId, projectRoot);
      setData(summary);
      return summary;
    } catch (e: any) {
      setError(e?.message || 'Failed to load merge preview');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, data, fetchPreview };
}
