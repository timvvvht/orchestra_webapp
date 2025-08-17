import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useMainLayout } from '@/components/MainLayout';
import VaultEditor from '../components/VaultEditor';
import SimpleFileExplorer from '@/components/FileExplorer/SimpleFileExplorer';
import { useVaultStructure } from '@/hooks/useVaultStructure';
import { useSettingsStore } from '@/stores/settingsStore';
import { Search, Folder, AlertCircle, Plus } from 'lucide-react';
import NewNoteDialog from '@/components/vault/NewNoteDialog';
import '../styles/vault-animations.css';

import { useLocation } from 'react-router-dom';

const VaultPage: React.FC = () => {
  const { 
    showFilePanel, 
    toggleFilePanel, 
    setFilePath, 
    sidePanelWidth,
    setSidePanelWidth,
    filePanelRef
  } = useMainLayout();
  
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showNewNote, setShowNewNote] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const vaultPath = useSettingsStore((state) => state.settings.vault.path);

  // Debug: Track selectedFile changes
  useEffect(() => {
    console.log('📂 VaultPage: selectedFile state changed to:', selectedFile);
  }, [selectedFile]);

  const { isLoading, error, structure, setVaultPath: updateVaultPath } = useVaultStructure();
  const location = useLocation();

  // Watch for vault path changes and trigger reindexing
  useEffect(() => {
    if (vaultPath) {
      console.log('📂 VaultPage: Vault path changed, triggering reindex:', vaultPath);
      updateVaultPath(vaultPath);
    }
  }, [vaultPath, updateVaultPath]);

  useEffect(() => {
    // Check if there's a selected file path in localStorage (from search)
    const storedFilePath = localStorage.getItem('selectedFilePath');
    if (storedFilePath) {
      console.log('📂 VaultPage: Found stored file path from search:', storedFilePath);
      setSelectedFile(storedFilePath);
      setFilePath(storedFilePath);
      // Clear the stored path to prevent reopening on future navigations
      localStorage.removeItem('selectedFilePath');
      console.log('📂 VaultPage: Cleared stored file path from localStorage');
      console.log('📂 VaultPage: File should now be displayed in the editor');
    } else {
      console.log('📂 VaultPage: No stored file path found in localStorage');
    }
    
    // No need to toggle the file panel here anymore
    // The LeftRail component will handle that
    
    // No cleanup needed - we want the file panel state to persist
    // so clicking the vault icon in the sidebar works correctly
  }, [location.pathname]); // Re-run when the location changes

  const handleFileSelect = useCallback((filePath: string) => {
    console.log('📂 VaultPage: handleFileSelect called with:', filePath);
    console.log('📂 VaultPage: Current selectedFile before update:', selectedFile);
    
    // Force synchronous state updates to avoid batching issues
    flushSync(() => {
      setSelectedFile(filePath);
      setFilePath(filePath);
    });
    
    console.log('📂 VaultPage: selectedFile should now be:', filePath);
  }, [setFilePath, selectedFile]);

  // Resizing functionality
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = sidePanelWidth;
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
    
    e.preventDefault();
  }, [sidePanelWidth]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    
    const deltaX = e.clientX - startX.current;
    const newWidth = startWidth.current + deltaX;
    
    // Apply constraints: min 200px, max 600px
    const constrainedWidth = Math.max(200, Math.min(600, newWidth));
    
    // Update width directly via ref for performance (no React re-renders)
    if (filePanelRef.current) {
      filePanelRef.current.style.width = `${constrainedWidth}px`;
    }
  }, [filePanelRef]);

  const handleMouseUp = useCallback(() => {
    if (!isResizing.current) return;
    
    isResizing.current = false;
    
    // Restore cursor and text selection
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    
    // Get the final width from the DOM and update state
    if (filePanelRef.current) {
      const finalWidth = parseInt(filePanelRef.current.style.width) || sidePanelWidth;
      setSidePanelWidth(finalWidth);
    }
  }, [filePanelRef, sidePanelWidth, setSidePanelWidth]);

  // Add global mouse event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="min-h-screen bg-black">
      {/* The Void - Animated background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
        
        {/* Floating orbs - subtle, mystical */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/[0.02] rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/[0.02] rounded-full blur-3xl animate-float" 
             style={{ animationDelay: '-10s' }} />
      </div>
      
      {/* Glass Panels floating over the void */}
      <div className="relative z-10 h-screen flex">
        {/* Left Panel - Knowledge Navigator */}
        {showFilePanel && (
          <div 
            className="h-full border-r border-white/10 overflow-hidden relative"
            style={{ width: `${sidePanelWidth}px` }}
            ref={filePanelRef}
          >
            {/* Glass panel with gradient overlay */}
            <div className="relative h-full bg-white/[0.02] backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
              
              {/* Resize Handle */}
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-ew-resize bg-transparent hover:bg-white/10 transition-colors duration-200 z-20"
                onMouseDown={handleMouseDown}
                title="Drag to resize"
              >
                {/* Visual indicator on hover */}
                <div className="absolute top-1/2 right-0 w-1 h-8 bg-white/20 rounded-l-sm transform -translate-y-1/2 opacity-0 hover:opacity-100 transition-opacity duration-200" />
              </div>
              
              {/* Content */}
              <div className="relative z-10 h-full flex flex-col">
                {/* Header with search */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-white/90">Knowledge Vault</h2>
                    <button
                      type="button"
                      disabled={!vaultPath}
                      onClick={() => setShowNewNote(true)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors
                                  ${vaultPath
                                    ? 'bg-white/[0.05] hover:bg-white/[0.08] border-white/10 hover:border-white/20 text-white/80 hover:text-white'
                                    : 'bg-white/[0.03] border-white/10 text-white/40 cursor-not-allowed'}`}
                      title={vaultPath ? 'Create a new note' : 'Set a vault path in Settings to create notes'}
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Note</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input 
                      placeholder="Search your knowledge..."
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 
                               rounded-xl text-white placeholder-white/25 text-sm
                               focus:outline-none focus:border-white/20 focus:bg-white/[0.05]
                               transition-all duration-200"
                    />
                  </div>
                </div>
                
                {/* File tree with proper spacing */}
                <div className="flex-1 overflow-y-auto">
                  {!vaultPath ? (
                    <div className="relative m-4 p-6 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent rounded-xl pointer-events-none" />
                      <div className="relative z-10 text-center">
                        <Folder className="w-8 h-8 text-white/30 mx-auto mb-3" />
                        <p className="text-sm text-white/60 font-light">
                          No vault path configured
                        </p>
                        <p className="text-xs text-white/40 mt-2">
                          Set a vault path in settings
                        </p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="relative m-4 p-6 bg-red-500/[0.05] backdrop-blur-xl border border-red-500/20 rounded-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.01] to-transparent rounded-xl pointer-events-none" />
                      <div className="relative z-10 text-center">
                        <AlertCircle className="w-8 h-8 text-red-400/60 mx-auto mb-3" />
                        <p className="text-sm text-red-300/80 font-light">
                          {error}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <SimpleFileExplorer 
                      vaultPath={vaultPath}
                      onFileSelect={handleFileSelect}
                      selectedFileId={selectedFile}
                      refreshTrigger={refreshTrigger}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Right Panel - The Sanctuary */}
        <div className="flex-1 relative">
          <VaultEditor 
            filePath={selectedFile || undefined} 
            onFileSelect={handleFileSelect}
            vaultPath={vaultPath}
            isVaultLoading={isLoading}
            vaultStructure={structure}
          />
        </div>
      </div>
      
      {/* New Note Dialog */}
      <NewNoteDialog
        isOpen={showNewNote}
        onClose={() => setShowNewNote(false)}
        defaultDirectory={vaultPath || ''}
        onCreate={(absPath) => {
          // Open the created file and refresh the tree
          flushSync(() => {
            setSelectedFile(absPath);
            setFilePath(absPath);
          });
          setShowNewNote(false);
          setRefreshTrigger((x) => x + 1);
        }}
      />
    </div>
  );
};

export default VaultPage;