import React, { useState, useEffect, useRef } from 'react';
import { getFileContent, saveFileContent } from '@/api/fileApi';
import EditorAdapter from './Editor/EditorAdapter';
import ErrorBoundary from './ErrorBoundary';
import { Sparkles, ArrowLeft, Copy } from 'lucide-react';
import { getInitialFileStructure, getNodeChildren } from '@/api/vaultApi';
import { TreeNode, DirectoryNode } from '@/hooks/useVaultStructure';
import { fileNavigationService } from '@/utils/fileNavigation';
import {useToast} from '@/components/ui/toast';
import useDelayedSpinner from '@/hooks/useDelayedSpinner';
import '@/styles/vault-editor-transparent.css';
import '@/styles/orchestra-markdown.css';
import '@/styles/orchestra-codemirror.css';

interface VaultEditorProps {
  filePath?: string;
  onFileSelect?: (fileId: string) => void;
  vaultPath?: string;
  isVaultLoading?: boolean;
  vaultStructure?: DirectoryNode | null;
}

const VaultEditor: React.FC<VaultEditorProps> = ({ filePath, onFileSelect, vaultPath, isVaultLoading, vaultStructure }) => {
  console.log('VaultEditor rendering with filePath:', filePath);
  
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<TreeNode[]>([]);
  const [loadingRecent, setLoadingRecent] = useState<boolean>(true);
  const showRecentLoading = useDelayedSpinner(loadingRecent, 300);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState<boolean>(false);
  
  // Ref to hold debounce timer and original content
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalContent = useRef<string>('');

  // Toast hook for notifications
  const { toast } = useToast();

  // Helper functions for the editor
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      
      // Show success toast
      toast({
        title: "Copied to clipboard!",
        description: "Content has been copied successfully.",
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      
      // Show error toast
      toast({
        title: "Copy failed",
        description: "Unable to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleBackToVault = () => {
    setCurrentFilePath(null);
    setContent('');
    if (onFileSelect) {
      onFileSelect('');
    }
  };

  useEffect(() => {
    console.log('VaultEditor useEffect triggered with filePath:', filePath);
    if (filePath) {
      console.log('Loading file with path:', filePath);
      setIsInitialLoadComplete(false); // Reset on new file load
      loadFile(filePath);
    } else {
      console.log('No filePath provided, skipping file load');
      setCurrentFilePath(null);
      setContent('');
      setIsInitialLoadComplete(false);
      originalContent.current = '';
    }
  }, [filePath]);

  // Fetch recent files from vault
  const fetchRecentFiles = async () => {
    try {
      setLoadingRecent(true);
      setRecentFiles([]); // Clear existing files before fetching new ones
      
      // Get initial structure
      const initialStructure = await getInitialFileStructure();
      if (!initialStructure?.first_level) {
        setRecentFiles([]);
        return;
      }

      // Collect all files recursively
      const allFiles: TreeNode[] = [];
      
      const collectFiles = async (nodes: TreeNode[], depth = 0) => {
        // Limit recursion depth to avoid performance issues
        if (depth > 3) return;
        
        for (const node of nodes) {
          if (!node.is_dir) {
            // Only include markdown files in recent files
            if (node.is_markdown) {
              allFiles.push(node);
            }
          } else if (depth < 3) {
            // Get children of directories (only if not too deep)
            try {
              const children = await getNodeChildren(node.id);
              await collectFiles(children, depth + 1);
            } catch {
              console.warn('Could not load children for:', node.name);
            }
          }
        }
      };

      await collectFiles(initialStructure.first_level);

      // Sort by last_modified (most recent first) and take top 15
      const sortedFiles = allFiles
        .sort((a, b) => b.last_modified - a.last_modified)
        .slice(0, 15);

      setRecentFiles(sortedFiles);
    } catch (error) {
      console.error('Error fetching recent files:', error);
      setRecentFiles([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  // Load recent files when vault is ready (path exists, not loading, and structure is available)
  useEffect(() => {
    if (vaultPath && !isVaultLoading && vaultStructure) {
      console.log('VaultEditor: Vault is ready, fetching recent files:', { vaultPath, isVaultLoading, hasStructure: !!vaultStructure });
      fetchRecentFiles();
    } else {
      console.log('VaultEditor: Vault not ready, skipping recent files fetch:', { vaultPath: !!vaultPath, isVaultLoading, hasStructure: !!vaultStructure });
      if (!vaultPath || isVaultLoading || !vaultStructure) {
        // Only clear files if we're still loading or no path - preserve files if structure is just temporarily null
        setRecentFiles([]);
      }
      setLoadingRecent(false);
    }
  }, [vaultPath, isVaultLoading, vaultStructure]);

  // Debounced autosave effect - only after initial load and when content actually changed
  useEffect(() => {
    // No autosave if no path (new/untitled file) or initial load not complete
    if (!filePath || !isInitialLoadComplete) {
      setAutoSaveState('idle');
      return;
    }

    // No autosave if content hasn't actually changed from original
    if (content === originalContent.current) {
      setAutoSaveState('idle');
      return;
    }

    // Clear any existing timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Start new debounce timer (2 seconds)
    autoSaveTimer.current = setTimeout(async () => {
      try {
        if (content.trim() === '') return; // skip empty content
        
        console.log('VaultEditor: Auto-saving file (content changed):', filePath);
        setAutoSaveState('saving');
        await saveFile(filePath, content);
        setAutoSaveState('saved');

        // Update original content to current saved content
        originalContent.current = content;

        // Reset to idle after a short delay
        setTimeout(() => setAutoSaveState('idle'), 1500);
      } catch (e) {
        console.error('Autosave failed:', e);
        setAutoSaveState('idle');
      }
    }, 2000); // 2-second debounce

    // Cleanup if component unmounts before timer fires
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [content, filePath, isInitialLoadComplete]); // Dependencies: content, filePath, and initial load state

  // Flush pending saves on unmount/tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        // Note: Can't do async operations in beforeunload, but we clear the timer
        // The user will see unsaved changes indicator if they close too quickly
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Clear timer on unmount
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);

  // Helper function to format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - (timestamp * 1000); // Convert to milliseconds
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const loadFile = async (identifier: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[VaultEditor] Loading file with identifier:', identifier);
      
      // Use unified file navigation service to resolve identifier
      const result = await fileNavigationService.resolveFileIdentifier(identifier);
      
      if (!result.success || !result.filePath) {
        throw new Error(result.error || 'Failed to resolve file identifier');
      }
      
      console.log('[VaultEditor] Resolved to file path:', result.filePath);
      setCurrentFilePath(result.filePath);
      
      // Load the file content using the resolved path
      const fileContent = await getFileContent(result.filePath);
      
      // Ensure we're setting a string
      if (typeof fileContent === 'string') {
        setContent(fileContent);
        // Store original content and mark initial load as complete
        originalContent.current = fileContent;
        setIsInitialLoadComplete(true);
        console.log('[VaultEditor] File content loaded successfully, length:', fileContent.length);
      } else {
        console.error('[VaultEditor] Received non-string content:', fileContent);
        setContent('');
        originalContent.current = '';
        setIsInitialLoadComplete(false);
        setError('Invalid file content received');
      }
    } catch (err) {
      console.error('[VaultEditor] Error loading file:', err);
      setError(`Failed to load file: ${err}`);
      setContent('');
      originalContent.current = '';
      setIsInitialLoadComplete(false);
    } finally {
      setLoading(false);
    }
  };

  const saveFile = async (identifier: string, content: string) => {
    try {
      console.log('[VaultEditor] Saving file with identifier:', identifier);
      
      // Use unified file navigation service to resolve identifier
      const result = await fileNavigationService.resolveFileIdentifier(identifier);
      
      if (!result.success || !result.filePath) {
        throw new Error(result.error || 'Failed to resolve file identifier');
      }
      
      console.log('[VaultEditor] Saving to resolved path:', result.filePath);
      
      // Save the file content using the resolved path
      await saveFileContent(result.filePath, content);
      console.log('[VaultEditor] File saved successfully');
    } catch (err) {
      console.error('[VaultEditor] Error saving file:', err);
      setError(`Failed to save file: ${err}`);
    }
  };

  const handleChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleSave = () => {
    if (filePath) {
      saveFile(filePath, content);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-black/40">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black/40 text-red-400">
        <p className="mb-4">{error}</p>
        <button 
          className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
          onClick={() => setError(null)}
        >
          Dismiss
        </button>
      </div>
    );
  }

  // No file selected - Empty state
  if (!filePath) {
    return (
      <div className="h-full flex flex-col bg-black/40">
        {/* No file selected - The Invitation */}
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="max-w-2xl w-full">
            {/* Mystical welcome */}
            <div className="text-center mb-12">
              {recentFiles.length > 0 ? (
                <>
                  <h1 className="text-5xl font-extralight text-white/90 tracking-tight mb-4">
                    Your Knowledge Awaits
                  </h1>
                  <p className="text-lg text-white/50 font-light">
                    Select a note to begin, or let AI create something new
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-5xl font-extralight text-white/90 tracking-tight mb-4">
                    Your Knowledge Awaits
                  </h1>
                  <p className="text-lg text-white/50 font-light">
                    Begin your journey with AI-generated insights
                  </p>
                </>
              )}
            </div>

            {/* Recent files as cards */}
            {recentFiles.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-white/30 uppercase tracking-wider mb-4">
                  Recent Thoughts
                </h3>
                {recentFiles.slice(0, 4).map(file => (
                  <button
                    key={file.id}
                    onClick={() => onFileSelect?.(file.id)}
                    className="group w-full relative bg-white/[0.03] backdrop-blur-xl 
                             border border-white/10 rounded-xl p-6
                             hover:bg-white/[0.05] hover:border-white/20
                             transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                  >
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent 
                                  rounded-xl pointer-events-none" />
                    
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="text-left">
                        <h4 className="text-base font-medium text-white/90 mb-1">
                          {file.name}
                        </h4>
                        <p className="text-sm text-white/50 line-clamp-2">
                          {/* TODO: Add preview text */}
                          No preview available
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        {/* TODO: Add AI indicator */}
                        <span>{formatRelativeTime(file.last_modified)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {/* Empty state - The Beginning */}
            {recentFiles.length === 0 && (
              showRecentLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto"></div>
                  <p className="mt-4 text-white/50">Loading recent notes...</p>
                </div>
              ) : (
                <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 
                              rounded-2xl p-12 text-center">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent 
                              rounded-2xl pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br 
                                  from-blue-500/20 to-purple-500/20 
                                  flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white/40" />
                    </div>
                    
                    <h3 className="text-2xl font-light text-white/80 mb-3">
                      Begin Your Journey
                    </h3>
                    <p className="text-white/50 mb-8 max-w-md mx-auto">
                      Ask your AI agents to create your first note, or start writing directly
                    </p>
                    
                    <button className="group relative px-6 py-3 bg-white text-black rounded-xl 
                                     font-medium transition-all duration-300 
                                     hover:scale-105 active:scale-100">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 
                                    rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="relative z-10">Start with AI</span>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // File selected - Editor view
  return (
    <div className="vault-editor h-full flex flex-col bg-black/40">
      {/* File selected - The Editor */}
      {currentFilePath && (
        <>
          {/* Minimal header with breathing room */}
          <div className="border-b border-white/10">
            <div className="px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Back button - subtle */}
                  <button
                    onClick={handleBackToVault}
                    className="p-2 rounded-lg text-white/40 hover:text-white/60 
                             hover:bg-white/[0.05] transition-all duration-200"
                    title="Back to vault (Esc)"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  
                  {/* File info */}
                  <div>
                    <h2 className="text-lg font-medium text-white/90">
                      {currentFilePath.split('/').pop()}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                      {/* TODO: Add AI generated indicator */}
                      <span>{content.split(' ').length} words</span>
                      <span>•</span>
                      <span>Modified recently</span>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Copy button */}
                  <button
                    onClick={handleCopy}
                    className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] 
                             border border-white/10 hover:border-white/20
                             text-sm text-white/70 hover:text-white/90
                             transition-all duration-200 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                  
                  {/* Save indicator */}
                  <div className="px-3 py-2 text-xs text-white/40">
                    {autoSaveState === 'saving' && 'Preserving...'}
                    {autoSaveState === 'saved' && '✓ Preserved'}
                    {autoSaveState === 'idle' && ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* The Editor - with proper Orchestra styling */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full max-w-4xl mx-auto">
              <ErrorBoundary>
                <EditorAdapter
                  content={content}
                  onChange={handleChange}
                  onSave={async () => {
                    handleSave();
                    return true;
                  }}
                  filePath={filePath || null}
                  isLoading={loading}
                  useNewEditor={true} // Use the clean editor
                />
              </ErrorBoundary>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VaultEditor;