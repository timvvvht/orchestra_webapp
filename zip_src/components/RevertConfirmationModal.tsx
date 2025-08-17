/**
 * Revert Confirmation Modal - Apple-level sophistication
 * Dark glassmorphic design matching PermissionsModal style
 */

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, RotateCcw, FileCode, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { gitShowFile } from '@/utils/tauriGitCommands';

interface RevertFileInfo {
  filename: string;
  filepath: string;
  linesAdded: number;
  linesRemoved: number;
  language: string;
  currentContent?: string;
  revertedContent?: string;
  contentError?: string;
}

interface RevertConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  files: RevertFileInfo[];
  commitHash: string;
  isReverting: boolean;
  workspacePath?: string;
}

const RevertConfirmationModal: React.FC<RevertConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  files,
  commitHash,
  isReverting,
  workspacePath
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<RevertFileInfo | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // Debug logging
  console.log('🔍 [RevertConfirmationModal] Render:', { 
    isOpen, 
    filesCount: files.length, 
    commitHash: commitHash.slice(0, 7), 
    isReverting 
  });

  // Load content on-demand when a file is selected
  const loadFileContent = useCallback(async (file: RevertFileInfo) => {
    if (!workspacePath) {
      console.warn('🔍 [RevertConfirmationModal] No workspace path provided for content loading');
      return;
    }

    if (file.revertedContent) {
      console.log('🔍 [RevertConfirmationModal] Content already loaded for', file.filepath);
      return; // Already loaded
    }

    console.log('🔍 [RevertConfirmationModal] Loading content for', file.filepath);
    setLoadingContent(true);

    try {
      // Use projectRoot (main repository) instead of workspacePath (worktree) for Git operations
      const projectRoot = workspacePath.replace(/\/\.orchestra\/worktrees\/.*$/, '');
      const result = await gitShowFile(projectRoot, commitHash, file.filepath);
      
      console.log('🔍 [RevertConfirmationModal] GitShowFile result:', {
        success: result.success,
        stdoutLength: result.stdout?.length || 0,
        stderr: result.stderr
      });

      if (result.success && result.stdout) {
        // Update the file in the files array with the loaded content
        const updatedFile = { ...file, revertedContent: result.stdout };
        setSelectedFile(updatedFile);
        console.log('✅ [RevertConfirmationModal] Loaded content for', file.filepath, ':', result.stdout.length, 'chars');
      } else {
        const error = result.stderr || 'Failed to load content';
        const updatedFile = { ...file, contentError: error };
        setSelectedFile(updatedFile);
        console.warn('⚠️ [RevertConfirmationModal] Failed to load content for', file.filepath, ':', error);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const updatedFile = { ...file, contentError: errorMsg };
      setSelectedFile(updatedFile);
      console.error('❌ [RevertConfirmationModal] Exception loading content for', file.filepath, ':', error);
    } finally {
      setLoadingContent(false);
    }
  }, [workspacePath, commitHash]);

  const totalAdded = files.reduce((sum, f) => sum + f.linesAdded, 0);
  const totalRemoved = files.reduce((sum, f) => sum + f.linesRemoved, 0);
  const totalChanges = totalAdded + totalRemoved;

  // Handle close with animation
  const handleClose = useCallback(() => {
    if (isReverting) return; // Prevent closing during revert
    
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose, isReverting]);

  // Handle confirm with loading state
  const handleConfirm = useCallback(async () => {
    try {
      await onConfirm();
    } catch (error) {
      // Error handling is done in parent component
      console.error('Revert failed:', error);
    }
  }, [onConfirm]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isReverting) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, handleClose, isReverting]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop with smooth fade */}
      <div 
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isClosing ? "opacity-0" : "opacity-100"
        )}
        onClick={handleClose}
      />
      
      {/* Modal with scale animation */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className={cn(
            "relative w-full max-w-2xl transition-all duration-200",
            isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
          )}
        >
          {/* Dark modal matching PermissionsModal theme */}
          <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            
            {/* Header - Minimal and elegant */}
            <div className="relative px-8 pt-8 pb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-light text-white tracking-tight">
                    Revert Changes
                  </h2>
                  <p className="text-white/50 mt-1 text-sm font-light">
                    Reverting to commit <span className="font-mono text-white/70">{commitHash.slice(0, 7)}</span>
                  </p>
                </div>
                
                {/* Close button - subtle */}
                <button
                  onClick={handleClose}
                  disabled={isReverting}
                  className="p-2 -mr-2 rounded-lg hover:bg-white/5 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                </button>
              </div>
            </div>

            {/* Main content area */}
            <div className="px-8 pb-6">
              {/* Summary info - simplified without misleading totals */}
              <div className="mb-6 p-4 bg-white/[0.02] rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/50 font-light">Files to Revert</p>
                    <p className="text-2xl font-light text-white tracking-tight">{files.length}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-sm text-white/60 font-light">Commit</p>
                      <p className="text-xs text-white/40 font-mono">{commitHash.slice(0, 7)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-6">
                {/* File list */}
                <div className={cn("transition-all duration-300", selectedFile ? "w-1/2" : "w-full")}>
                  <h3 className="text-sm font-light text-white/70 mb-3">
                    Files to be reverted ({files.length})
                    {files.length > 0 && <span className="text-xs text-white/40 ml-2">Click to preview</span>}
                  </h3>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {files.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-white/40 mx-auto mb-2" />
                          <p className="text-sm text-white/50 font-light">
                            Analyzing revert impact...
                          </p>
                          <p className="text-xs text-white/30 mt-1 font-light">
                            This may take a few seconds
                          </p>
                        </div>
                      </div>
                    ) : (
                      files.map((file, index) => (
                      <div
                        key={`${file.filepath}-${index}`}
                        onClick={() => {
                          setSelectedFile(file);
                          loadFileContent(file);
                        }}
                        className={cn(
                          "group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border cursor-pointer",
                          selectedFile?.filepath === file.filepath
                            ? "bg-white/[0.08] border-white/20"
                            : "bg-white/[0.02] hover:bg-white/[0.05] border-white/10"
                        )}
                      >
                        <FileCode className="w-4 h-4 text-white/40 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-light text-white/80 truncate">
                            {file.filename}
                          </p>
                          <p className="text-xs text-white/40 font-mono truncate">
                            {file.filepath}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded font-light">
                            Will be reverted
                          </span>
                        </div>
                      </div>
                      ))
                    )}
                  </div>
                </div>

                {/* File preview panel */}
                {selectedFile && (
                  <div className="w-1/2 border-l border-white/10 pl-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-light text-white/70">
                        Preview: {selectedFile.filename}
                      </h3>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/60 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="bg-white/[0.02] rounded-lg border border-white/10 p-4 max-h-64 overflow-y-auto">
                      {selectedFile.revertedContent ? (
                        <div>
                          <p className="text-xs text-white/50 mb-2 font-light">File will be reverted to:</p>
                          <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap">
                            {selectedFile.revertedContent.slice(0, 1000)}
                            {selectedFile.revertedContent.length > 1000 && '\n... (truncated)'}
                          </pre>
                        </div>
                      ) : selectedFile.contentError ? (
                        <div className="text-center py-8">
                          <AlertTriangle className="w-8 h-8 mx-auto text-yellow-400/60 mb-2" />
                          <p className="text-sm text-white/40 font-light">
                            Content preview unavailable
                          </p>
                          <p className="text-xs text-white/30 mt-1 font-light">
                            {selectedFile.contentError}
                          </p>
                          <p className="text-xs text-white/20 mt-2 font-light">
                            File will still be reverted to commit {commitHash.slice(0, 7)}
                          </p>
                        </div>
                      ) : loadingContent ? (
                        <div className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-white/40 mx-auto mb-2" />
                          <p className="text-sm text-white/40 font-light">
                            Loading content preview...
                          </p>
                          <p className="text-xs text-white/30 mt-1 font-light">
                            Fetching file content from commit {commitHash.slice(0, 7)}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileCode className="w-8 h-8 mx-auto text-white/20 mb-2" />
                          <p className="text-sm text-white/40 font-light">
                            Click to load content preview
                          </p>
                          <p className="text-xs text-white/30 mt-1 font-light">
                            This file will be reverted to its state at commit {commitHash.slice(0, 7)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!selectedFile && (
                <div className="mb-6" />
              )}

              {/* Warning */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-light text-yellow-300">
                      This action cannot be undone
                    </p>
                    <p className="text-xs text-yellow-200/70 mt-1 font-light">
                      All changes since this commit will be permanently lost
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Clean action bar matching PermissionsModal */}
            <div className="px-8 py-4 bg-black/50 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/30 font-light">
                  {files.length === 0 ? (
                    "No files to revert"
                  ) : (
                    `${files.length} ${files.length === 1 ? 'file' : 'files'} will be reverted`
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    disabled={isReverting}
                    className="px-4 py-2 text-sm text-white/50 hover:text-white/70 transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleConfirm}
                    disabled={isReverting || files.length === 0}
                    className={cn(
                      "px-6 py-2 rounded-xl text-sm font-normal transition-all duration-300 flex items-center gap-2",
                      isReverting || files.length === 0
                        ? "bg-white/10 text-white/30 cursor-not-allowed"
                        : "bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 hover:scale-105 active:scale-100"
                    )}
                  >
                    {isReverting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Reverting...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Revert Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default RevertConfirmationModal;