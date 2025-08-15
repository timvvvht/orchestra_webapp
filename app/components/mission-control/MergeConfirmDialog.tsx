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
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sourceBranch?: string;
  targetBranch?: string;
  conflictCount?: number;
  className?: string;
}

const MergeConfirmDialog: React.FC<MergeConfirmDialogProps> = ({ 
  isOpen,
  onClose,
  onConfirm,
  sourceBranch = 'feature-branch',
  targetBranch = 'main',
  conflictCount = 0,
  className = ''
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    console.log('🔀 [MergeConfirmDialog] STUB: Would confirm merge:', { sourceBranch, targetBranch });
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Confirm Merge</h2>
          <button
            onClick={onClose}
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
              Merge <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{sourceBranch}</code> into{' '}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{targetBranch}</code>
            </p>
          </div>
          
          {conflictCount > 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">⚠️</span>
                <span className="font-medium text-yellow-800 dark:text-yellow-200">
                  {conflictCount} Conflict{conflictCount !== 1 ? 's' : ''} Detected
                </span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                This merge may require manual conflict resolution.
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
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 rounded text-white ${
              conflictCount > 0 
                ? 'bg-yellow-500 hover:bg-yellow-600' 
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {conflictCount > 0 ? 'Merge with Conflicts' : 'Confirm Merge'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeConfirmDialog;