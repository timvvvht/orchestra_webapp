import React, { useState, useCallback, useEffect, useMemo } from 'react';
import MonacoDiffPane from './MonacoDiffPane';
import Editor from '@monaco-editor/react';

export interface DiffFile {
  id: string;
  filename: string;
  filepath: string;
  originalContent: string;
  modifiedContent: string;
  currentContent: string; // Current state (may be edited)
  language: string;
  hasUnsavedChanges: boolean;
}

interface AdvancedDiffViewerProps {
  files: DiffFile[];
  onClose: () => void;
  onFilesUpdate?: (files: DiffFile[]) => void;
  onSaveFile?: (file: DiffFile) => Promise<void>;
  onRevertFile?: (file: DiffFile) => Promise<void>;
  initialFileIndex?: number; // Which file to start with
}

export const AdvancedMonacoDiffViewer: React.FC<AdvancedDiffViewerProps> = ({
  files,
  onClose,
  onFilesUpdate,
  onSaveFile,
  onRevertFile,
  initialFileIndex = 0
}) => {
  const [currentFileIndex, setCurrentFileIndex] = useState(initialFileIndex);
  const [viewMode, setViewMode] = useState<'diff' | 'edit'>('diff');
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const currentFile = files[currentFileIndex];
  const hasMultipleFiles = files.length > 1;

  // DEBUG: Log file data for diagnostics
  useEffect(() => {
    console.log('📁 [AdvancedMonacoDiffViewer] File data diagnostics:', {
      filename: currentFile?.filename,
      filepath: currentFile?.filepath,
      originalLength: currentFile?.originalContent?.length || 0,
      modifiedLength: currentFile?.modifiedContent?.length || 0,
      currentLength: currentFile?.currentContent?.length || 0,
      hasOriginalContent: !!currentFile?.originalContent?.trim(),
      hasModifiedContent: !!currentFile?.modifiedContent?.trim(),
      hasCurrentContent: !!currentFile?.currentContent?.trim(),
      language: currentFile?.language,
      hasUnsavedChanges: currentFile?.hasUnsavedChanges,
      filesArrayLength: files.length,
      currentFileIndex: currentFileIndex
    });
  }, [currentFile, files, currentFileIndex]);

  // DEBUG: Log when component mounts and files change
  useEffect(() => {
    console.log('🚀 [AdvancedMonacoDiffViewer] Component mounted/updated:', {
      totalFiles: files.length,
      initialFileIndex: initialFileIndex,
      currentFileIndex: currentFileIndex,
      viewMode: viewMode
    });
  }, [files, initialFileIndex, currentFileIndex, viewMode]);

  // Show notification temporarily
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Navigation functions
  const goToPreviousFile = useCallback(() => {
    if (currentFileIndex > 0) {
      setCurrentFileIndex(currentFileIndex - 1);
      setViewMode('diff'); // Reset to diff view when navigating
    }
  }, [currentFileIndex]);

  const goToNextFile = useCallback(() => {
    if (currentFileIndex < files.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
      setViewMode('diff'); // Reset to diff view when navigating
    }
  }, [currentFileIndex, files.length]);

  // File operations - these will be handled by callbacks to the parent component
  const saveCurrentFile = useCallback(async () => {
    if (!currentFile || !onSaveFile) return;

    setIsLoading(true);
    try {
      await onSaveFile(currentFile);
      
      // Update the file state
      const updatedFiles = files.map((file, index) => 
        index === currentFileIndex 
          ? { ...file, hasUnsavedChanges: false, modifiedContent: file.currentContent }
          : file
      );
      
      onFilesUpdate?.(updatedFiles);
      showNotification('success', `✅ Saved ${currentFile.filename}`);
    } catch (error) {
      console.error('Error saving file:', error);
      showNotification('error', `❌ Failed to save ${currentFile.filename}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentFile, currentFileIndex, files, onFilesUpdate, showNotification, onSaveFile]);

  const revertCurrentFile = useCallback(async () => {
    if (!currentFile || !onRevertFile) return;

    setIsLoading(true);
    try {
      await onRevertFile(currentFile);
      
      // Update the file state
      const updatedFiles = files.map((file, index) => 
        index === currentFileIndex 
          ? { 
              ...file, 
              currentContent: file.originalContent,
              modifiedContent: file.originalContent,
              hasUnsavedChanges: false 
            }
          : file
      );
      
      onFilesUpdate?.(updatedFiles);
      showNotification('success', `🔄 Reverted ${currentFile.filename} to original version`);
    } catch (error) {
      console.error('Error reverting file:', error);
      showNotification('error', `❌ Failed to revert ${currentFile.filename}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentFile, currentFileIndex, files, onFilesUpdate, showNotification, onRevertFile]);

  const discardChanges = useCallback(() => {
    if (!currentFile) return;

    const updatedFiles = files.map((file, index) => 
      index === currentFileIndex 
        ? { 
            ...file, 
            currentContent: file.modifiedContent,
            hasUnsavedChanges: false 
          }
        : file
    );
    
    onFilesUpdate?.(updatedFiles);
    showNotification('info', `↩️ Discarded unsaved changes in ${currentFile.filename}`);
  }, [currentFile, currentFileIndex, files, onFilesUpdate, showNotification]);

  // Editor configuration
  const singleEditorOptions = {
    readOnly: false,
    wordWrap: 'on' as const,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    fontSize: 14,
    lineNumbers: 'on' as const,
    glyphMargin: true,
    folding: true,
    selectOnLineNumbers: true,
  };

  // Handle content changes
  const handleDiffChange = useCallback((value: string | undefined) => {
    console.log('🔄 [AdvancedMonacoDiffViewer] handleDiffChange called:', {
      hasValue: value !== undefined,
      valueLength: value?.length || 0,
      valuePreview: value?.substring(0, 50) + (value?.length > 50 ? '...' : ''),
      currentFileIndex: currentFileIndex
    });
    
    if (!currentFile || !value || value === currentFile.currentContent) {
      console.log('⏭️ [AdvancedMonacoDiffViewer] Skipping change - no file or no change');
      return;
    }

    const updatedFiles = files.map((file, index) => 
      index === currentFileIndex 
        ? { 
            ...file, 
            currentContent: value,
            hasUnsavedChanges: value !== file.modifiedContent
          }
        : file
    );
    
    console.log('✅ [AdvancedMonacoDiffViewer] Files updated:', {
      updatedFilesLength: updatedFiles.length,
      hasUnsavedChanges: updatedFiles[currentFileIndex]?.hasUnsavedChanges
    });
    
    onFilesUpdate?.(updatedFiles);
  }, [currentFile, currentFileIndex, files, onFilesUpdate]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    console.log('✏️ [AdvancedMonacoDiffViewer] handleEditorChange called:', {
      hasValue: value !== undefined,
      valueLength: value?.length || 0,
      valuePreview: value?.substring(0, 50) + (value?.length > 50 ? '...' : ''),
      currentFileIndex: currentFileIndex
    });
    
    if (!currentFile || !value || value === currentFile.currentContent) {
      console.log('⏭️ [AdvancedMonacoDiffViewer] Skipping editor change - no file or no change');
      return;
    }

    const updatedFiles = files.map((file, index) => 
      index === currentFileIndex 
        ? { 
            ...file, 
            currentContent: value,
            hasUnsavedChanges: value !== file.modifiedContent
          }
        : file
    );
    
    console.log('✅ [AdvancedMonacoDiffViewer] Editor files updated:', {
      updatedFilesLength: updatedFiles.length,
      hasUnsavedChanges: updatedFiles[currentFileIndex]?.hasUnsavedChanges
    });
    
    onFilesUpdate?.(updatedFiles);
  }, [currentFile, currentFileIndex, files, onFilesUpdate]);

  // Calculate diff statistics for current file (memoized for performance)
  const diffStats = useMemo(() => {
    if (!currentFile) return { linesAdded: 0, linesRemoved: 0, linesModified: 0 };

    const originalLines = currentFile.originalContent.split('\n');
    const modifiedLines = currentFile.currentContent.split('\n');
    
    let linesAdded = 0;
    let linesRemoved = 0;
    let linesModified = 0;

    // Simple diff calculation - this is a basic implementation
    // In a real app, you'd use a proper diff algorithm
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || '';
      const modifiedLine = modifiedLines[i] || '';
      
      if (originalLine === '' && modifiedLine !== '') {
        linesAdded++;
      } else if (originalLine !== '' && modifiedLine === '') {
        linesRemoved++;
      } else if (originalLine !== modifiedLine) {
        linesModified++;
      }
    }

    return { linesAdded, linesRemoved, linesModified };
  }, [currentFile?.originalContent, currentFile?.currentContent]);

  // Essential keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            saveCurrentFile();
            break;
        }
      }
      
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveCurrentFile, onClose]);

  if (!currentFile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop - The Void */}
        <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
        
        {/* Modal Container - The Presence */}
        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden p-8">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
          
          <div className="relative text-center">
            <h2 className="text-xl font-medium text-white/90 mb-6">No Files to Display</h2>
            <button 
              onClick={onClose} 
              className="px-6 py-3 bg-white/[0.02] hover:bg-white/[0.05] text-white/70 hover:text-white/90 rounded-lg border border-white/10 transition-all duration-200 font-light"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - The Void */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" />
      
      {/* Modal Container - The Presence */}
      <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden w-[98vw] h-[95vh] flex flex-col">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-6">
            {/* <h2 className="text-xl font-medium text-white/90">
              Advanced Diff Viewer
            </h2> */}
            
            {/* File navigation - Always visible */}
            <div className="flex items-center gap-3 text-sm text-white/70">
              <button
                onClick={goToPreviousFile}
                disabled={currentFileIndex === 0 || files.length <= 1}
                className="px-3 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 text-white/70 hover:text-white/90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.02] disabled:hover:text-white/70"
                title="Previous file"
              >
                <span className="text-white/40">‹</span> Prev
              </button>
              <span className="px-3 py-1 text-white/50 font-light">
                {files.length > 0 ? `${currentFileIndex + 1} of ${files.length}` : '0 files'}
              </span>
              <button
                onClick={goToNextFile}
                disabled={currentFileIndex >= files.length - 1 || files.length <= 1}
                className="px-3 py-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 text-white/70 hover:text-white/90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.02] disabled:hover:text-white/70"
                title="Next file"
              >
                Next <span className="text-white/40">›</span>
              </button>
            </div>

            {/* Current file info */}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-white/90 font-medium">{currentFile.filename}</span>
              {currentFile.hasUnsavedChanges && (
                <span className="px-2 py-1 rounded-md bg-white/[0.05] text-white/70 text-xs font-light border border-white/10">
                  <span className="inline-block w-1.5 h-1.5 bg-white/70 rounded-full mr-1.5"></span>Unsaved
                </span>
              )}
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-3">
            <div className="flex p-1 rounded-lg border border-white/10 bg-white/[0.02]">
              <button
                onClick={() => setViewMode('diff')}
                className={`px-4 py-2 rounded-md text-sm transition-all duration-200 ${
                  viewMode === 'diff' 
                    ? 'bg-white/10 text-white/90 font-medium' 
                    : 'text-white/70 hover:text-white/90 hover:bg-white/[0.05] font-light'
                }`}
              >
                Diff View
              </button>
              <button
                onClick={() => setViewMode('edit')}
                className={`px-4 py-2 rounded-md text-sm transition-all duration-200 ${
                  viewMode === 'edit' 
                    ? 'bg-white/10 text-white/90 font-medium' 
                    : 'text-white/70 hover:text-white/90 hover:bg-white/[0.05] font-light'
                }`}
              >
                Edit Mode
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/[0.02] hover:bg-white/[0.05] text-white/70 hover:text-white/90 rounded-lg border border-white/10 transition-all duration-200 font-light"
            >
              Close
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="relative flex items-center justify-between p-6 bg-white/[0.01] border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={saveCurrentFile}
              disabled={!currentFile.hasUnsavedChanges || isLoading}
              className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 disabled:bg-white/[0.02] disabled:cursor-not-allowed text-green-400/90 disabled:text-white/40 rounded-lg border border-green-500/20 disabled:border-white/10 transition-all duration-200 flex items-center gap-2 font-light"
              title="Save file (Ctrl+S)"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-3 h-3 border border-current rounded-sm"></div>
              )} 
              Save
            </button>
            
            <button
              onClick={revertCurrentFile}
              disabled={isLoading}
              className="px-4 py-2 bg-white/[0.02] hover:bg-white/[0.05] disabled:bg-white/[0.02] disabled:cursor-not-allowed text-white/70 hover:text-white/90 disabled:text-white/40 rounded-lg border border-white/10 transition-all duration-200 flex items-center gap-2 font-light"
              title="Revert to original version"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-3 h-3 border border-current rounded-full"></div>
              )} 
              Revert
            </button>

            {currentFile.hasUnsavedChanges && (
              <button
                onClick={discardChanges}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400/90 hover:text-red-400 rounded-lg border border-red-500/20 transition-all duration-200 flex items-center gap-2 font-light"
                title="Discard unsaved changes"
              >
                <span className="text-red-400/60">‹</span> Discard
              </button>
            )}
          </div>

          <div className="flex items-center gap-6 text-sm text-white/50 font-light">
            <span>Ctrl+S: Save</span>
            <span>Esc: Close</span>
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`relative p-4 text-sm border-b border-white/10 ${
            notification.type === 'success' ? 'bg-green-500/10 text-green-400/90' :
            notification.type === 'error' ? 'bg-red-500/10 text-red-400/90' :
            'bg-white/[0.02] text-white/70'
          }`}>
            <div className="font-light">{notification.message}</div>
          </div>
        )}

        {/* Editor Container */}
        <div className="relative flex-1 p-6">

          
          <div className="w-full h-full border border-white/10 rounded-xl overflow-hidden bg-white/[0.01]">
            {viewMode === 'diff' ? (
              <MonacoDiffPane
                original={currentFile.originalContent}
                modified={currentFile.currentContent}
                language={currentFile.language}
                height="100%"
                width="100%"
                onChange={(val)=>handleDiffChange(val)}
              />
            ) : (
              <Editor
                value={currentFile.currentContent}
                language={currentFile.language}
                theme="vs-dark"
                height="100%"
                width="100%"
                options={singleEditorOptions}
                onChange={handleEditorChange}
                loading={
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin mx-auto mb-3"></div>
                      <div className="text-white/70 font-light">Loading Monaco Editor...</div>
                    </div>
                  </div>
                }
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="relative p-6 border-t border-white/10 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-red-400/70 font-light">
                <div className="w-1 h-3 bg-red-400/70"></div>
                {diffStats.linesRemoved}
              </span>
              <span className="flex items-center gap-2 text-green-400/70 font-light">
                <div className="w-1 h-3 bg-green-400/70"></div>
                {diffStats.linesAdded}
              </span>
              <span className="flex items-center gap-2 text-blue-400/70 font-light">
                <div className="w-1 h-3 bg-blue-400/70"></div>
                {diffStats.linesModified}
              </span>
              {currentFile.hasUnsavedChanges && (
                <span className="flex items-center gap-2 text-white/70 font-light">
                  <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse"></div>
                  Unsaved
                </span>
              )}
            </div>
            <div className="text-xs text-white/40 font-light">
              {currentFile.filepath} • {currentFile.language}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility function to detect language from filename
export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'json': 'json',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
    'xml': 'xml',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell',
    'zsh': 'shell',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'hpp': 'cpp',
    'java': 'java',
    'kt': 'kotlin',
    'swift': 'swift',
    'dart': 'dart',
    'vue': 'vue',
    'svelte': 'svelte',
  };
  return languageMap[ext || ''] || 'plaintext';
}