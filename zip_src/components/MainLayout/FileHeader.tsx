import React from 'react';
import { useMainLayout } from './MainLayoutContext';

/**
 * FileHeader - A component that displays file-specific information
 * in routes that need file functionality (like vault).
 * 
 * This component uses MainLayoutContext and should be rendered
 * within MainLayout for routes that need file operations.
 */
const FileHeader: React.FC = () => {
  const { 
    filePath, 
    unsavedChanges, 
    isLoading, 
    showFilePanel,
    toggleFilePanel,
    handleSave 
  } = useMainLayout();

  // Only show file header if we have file-related functionality
  if (!filePath && !showFilePanel) {
    return null;
  }

  return (
    <div className="file-header bg-surface-1 border-b border-border px-4 py-2">
      <div className="flex items-center justify-between">
        {/* File info */}
        <div className="flex items-center gap-2">
          {filePath && (
            <span className="text-sm text-muted-foreground">
              {filePath}
            </span>
          )}
          {unsavedChanges && (
            <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Unsaved changes" />
          )}
        </div>

        {/* File actions */}
        <div className="flex items-center gap-2">
          {showFilePanel !== undefined && (
            <button
              onClick={toggleFilePanel}
              className="px-2 py-1 text-xs bg-surface-2 hover:bg-surface-3 rounded"
            >
              {showFilePanel ? 'Hide Files' : 'Show Files'}
            </button>
          )}
          
          {unsavedChanges && (
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileHeader;