#!/bin/bash

# Create Git-related hook stubs for webapp migration

echo "🔧 Creating Git-related hook stubs..."

# useGitStatus hook
if [ ! -f "app/hooks/useGitStatus.ts" ]; then
cat > app/hooks/useGitStatus.ts << 'EOF'
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
EOF
echo "✅ Created useGitStatus.ts"
fi

# useGitDiffFile hook
if [ ! -f "app/hooks/useGitDiffFile.ts" ]; then
cat > app/hooks/useGitDiffFile.ts << 'EOF'
/**
 * useGitDiffFile Hook - Webapp Stub Implementation
 */

import { useState, useCallback } from 'react';

interface GitDiff {
  filePath: string;
  diff: string;
  additions: number;
  deletions: number;
}

export function useGitDiffFile() {
  const [diff, setDiff] = useState<GitDiff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDiff = useCallback(async (filePath: string, ref1?: string, ref2?: string) => {
    console.log('🔧 [useGitDiffFile] STUB: Would get diff for:', { filePath, ref1, ref2 });
    setIsLoading(true);
    setError(null);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setDiff({
      filePath,
      diff: '// Diff content would appear here in full implementation',
      additions: 5,
      deletions: 2
    });
    setIsLoading(false);
  }, []);

  return { diff, isLoading, error, getDiff };
}
EOF
echo "✅ Created useGitDiffFile.ts"
fi

# useMergeWorktree hook
if [ ! -f "app/hooks/useMergeWorktree.ts" ]; then
cat > app/hooks/useMergeWorktree.ts << 'EOF'
/**
 * useMergeWorktree Hook - Webapp Stub Implementation
 */

import { useState, useCallback } from 'react';

interface MergeResult {
  success: boolean;
  conflicts: string[];
  message: string;
}

export function useMergeWorktree() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergeWorktree = useCallback(async (sourcePath: string, targetBranch: string): Promise<MergeResult> => {
    console.log('🔧 [useMergeWorktree] STUB: Would merge worktree:', { sourcePath, targetBranch });
    setIsLoading(true);
    setError(null);
    
    // Simulate merge operation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsLoading(false);
    
    return {
      success: true,
      conflicts: [],
      message: 'Merge completed successfully (stub)'
    };
  }, []);

  return { mergeWorktree, isLoading, error };
}
EOF
echo "✅ Created useMergeWorktree.ts"
fi

# useDirtyRepoStatus hook
if [ ! -f "app/hooks/useDirtyRepoStatus.ts" ]; then
cat > app/hooks/useDirtyRepoStatus.ts << 'EOF'
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
EOF
echo "✅ Created useDirtyRepoStatus.ts"
fi

echo "🎉 Finished creating Git-related hook stubs!"