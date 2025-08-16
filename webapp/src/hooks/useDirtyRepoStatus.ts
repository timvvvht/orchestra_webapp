/**
 * useDirtyRepoStatus Hook - Webapp Stub Implementation
 */

import { useState, useCallback, useEffect } from 'react';

interface DirtyRepoStatus {
  isDirty: boolean;
  changedFiles: string[];
  lastCheck: string;
}

export function useDirtyRepoStatus(repoPath?: string, autoRefresh = true) {
  const [status, setStatus] = useState<DirtyRepoStatus>({
    isDirty: false,
    changedFiles: [],
    lastCheck: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    console.log('🔧 [useDirtyRepoStatus] STUB: Would check dirty repo status for:', repoPath);
    setIsLoading(true);
    
    // Simulate status check
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setStatus({
      isDirty: false,
      changedFiles: [],
      lastCheck: new Date().toISOString()
    });
    setIsLoading(false);
  }, [repoPath]);

  useEffect(() => {
    if (autoRefresh && repoPath) {
      checkStatus();
      const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, repoPath, checkStatus]);

  return { status, isLoading, checkStatus };
}
