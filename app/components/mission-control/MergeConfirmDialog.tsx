/**
 * MergeConfirmDialog Component - Webapp Stub Implementation
 * 
 * Simplified stub version of the merge confirmation dialog for webapp migration.
 * Provides the basic interface for confirming merge operations.
 * 
 * TODO: Implement full merge confirmation functionality when needed
 */

import React from 'react';

interface MergeConfirmDialogProps {
  open: boolean;
  onConfirm: (opts?: { keepWorktree?: boolean }) => Promise<any>;
  onCancel: () => void;
  preview?: any;
  previewError?: string | null;
  previewLoading?: boolean;
  projectRoot: string;
  sessionId: string;
  autoCloseAfterMs?: number;
  onMerged?: (result: { ok: boolean; result?: any; error?: string }) => void;
}

export const MergeConfirmDialog: React.FC<MergeConfirmDialogProps> = ({ 
  open,
  onConfirm,
  onCancel,
  preview,
  previewError,
  previewLoading = false,
  projectRoot,
  sessionId,
  autoCloseAfterMs,
  onMerged
}) => {
  if (!open) return null;

  const handleConfirm = async (keepWorktree = false) => {
    console.log('🔀 [MergeConfirmDialog] STUB: Would confirm merge:', { 
      sessionId: sessionId.slice(0, 8) + '...', 
      projectRoot,
      keepWorktree 
    });
    
    try {
      const result = await onConfirm({ keepWorktree });
      
      // Simulate successful merge result
      const mockResult = {
        ok: true,
        result: {
          sessionId,
          projectRoot,
          keepWorktree
        }
      };
      
      if (onMerged) {
        onMerged(mockResult);
      }
      
      // Auto-close if specified
      if (autoCloseAfterMs && autoCloseAfterMs > 0) {
        setTimeout(() => {
          onCancel();
        }, autoCloseAfterMs);
      }
      
      return result;
    } catch (error) {
      console.error('[MergeConfirmDialog] STUB: Merge error:', error);
      
      const errorResult = {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      if (onMerged) {
        onMerged(errorResult);
      }
      
      throw error;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Confirm Merge</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">🔀</span>
              <span className="font-medium">Merge Operation</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Session: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{sessionId.slice(0, 8)}...</code>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Project: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{projectRoot}</code>
            </p>
          </div>
          
          {previewLoading && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">⏳</span>
                <span className="font-medium">Loading preview...</span>
              </div>
            </div>
          )}
          
          {previewError && (
            <div className="p-4 bg-red-50 dark:bg-red-900 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">❌</span>
                <span className="font-medium text-red-800 dark:text-red-200">Preview Error</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                {previewError}
              </p>
            </div>
          )}
          
          {preview && (
            <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">📋</span>
                <span className="font-medium text-green-800 dark:text-green-200">Preview Available</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Changes ready for merge
              </p>
            </div>
          )}
          
          <div className="text-center py-2">
            <p className="text-sm text-gray-500 italic">
              Merge functionality is simplified in webapp mode
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={() => handleConfirm(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            Keep Worktree
          </button>
          <button
            onClick={() => handleConfirm(false)}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded"
          >
            Merge & Finalize
          </button>
        </div>
      </div>
    </div>
  );
};