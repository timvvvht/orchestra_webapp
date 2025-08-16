/**
 * useGitStatus Hook - Webapp Stub Implementation
 */

import { useState, useCallback } from 'react';

interface GitStatus {
  branch: string;
  isDirty: boolean;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export function useGitStatus(repoPath?: string) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    console.log('🔧 [useGitStatus] STUB: Would check git status for:', repoPath);
    setIsLoading(true);
    setError(null);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setStatus({
      branch: 'main',
      isDirty: false,
      staged: [],
      unstaged: [],
      untracked: []
    });
    setIsLoading(false);
  }, [repoPath]);

  return { status, isLoading, error, refresh };
}
