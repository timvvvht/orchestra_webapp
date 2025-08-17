/**
 * Example usage of MergeConfirmDialog with custom toast integration
 */

import React, { useState } from 'react';
import { MergeConfirmDialog } from '@/components/mission-control-v2/MergeConfirmDialog';

interface MergeResult {
  success: boolean;
  strategy: string;
  files_changed: Array<{
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
  }>;
  new_head: string;
  merge_message: string;
  stats: {
    files_changed: number;
    insertions: number;
    deletions: number;
  };
}

// Your API service - this should return structured merge data from your Rust backend
const mergeWorktree = async (sessionId: string): Promise<MergeResult> => {
  const response = await fetch(`/api/sessions/${sessionId}/merge`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Merge failed');
  }
  
  return response.json();
};

export const ExampleUsage: React.FC = () => {
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  const handleMergeConfirm = async () => {
    try {
      // Call your backend API that returns structured merge data
      const result = await mergeWorktree(currentSessionId);
      
      // Close the dialog
      setShowMergeDialog(false);
      
      // Return the result so the dialog can show the toast
      return result;
    } catch (error) {
      console.error('Merge failed:', error);
      throw error;
    }
  };

  return (
    <>
      <button onClick={() => setShowMergeDialog(true)}>
        Merge Session
      </button>

      <MergeConfirmDialog
        open={showMergeDialog}
        onConfirm={handleMergeConfirm}
        onCancel={() => setShowMergeDialog(false)}
      />
    </>
  );
};

// Example of what your backend should return
const exampleMergeResult = {
  success: true,
  strategy: "ort",
  files_changed: [
    {
      path: "inference/agent_loop.py",
      status: "modified" as const,
      additions: 24,
      deletions: 0
    },
    {
      path: "inference/title_utils.py",
      status: "added" as const,
      additions: 11,
      deletions: 0
    },
    {
      path: "tests/inference/test_agent_loop_async.py",
      status: "added" as const,
      additions: 143,
      deletions: 0
    }
    // ... more files
  ],
  new_head: "a7c1ee87d1832fea519de570128d7e2287d16a09",
  merge_message: "Auto-merging inference/agent_loop.py\nMerge made by the 'ort' strategy.",
  stats: {
    files_changed: 9,
    insertions: 545,
    deletions: 1
  }
};