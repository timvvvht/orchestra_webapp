import React, { useState, useEffect, useCallback, useRef } from 'react';
import { setVaultPath, getVaultPath, getInitialFileStructure, getNodeChildren } from '@/api/vaultApi';
import { FiFolder, FiFile, FiChevronRight, FiChevronDown, FiRefreshCw } from 'react-icons/fi';
import { TreeNode } from '../../hooks/useVaultStructure';

interface SimpleFileExplorerProps {
  vaultPath: string;
  onFileSelect: (path: string) => void;
  selectedFileId?: string | null;
  refreshTrigger?: number;
  onRefreshed?: () => void;
}

const SimpleFileExplorer: React.FC<SimpleFileExplorerProps> = ({ vaultPath, onFileSelect, selectedFileId, refreshTrigger, onRefreshed }) => {
  
  // State
  const [rootId, setRootId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderContents, setFolderContents] = useState<Record<string, TreeNode[]>>({});
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());
  const [initialising, setInitialising] = useState(true);

  // Refresh the file structure
  const refreshStructure = useCallback(async () => {
    try {
      console.log('Refreshing file structure');
      setIsLoading(true);
      
      // Only set the vault path if it has changed
      if (vaultPath) {
        // Get current vault path from backend
        const currentVaultPath = await getVaultPath();
        
        // Only call setVaultPath if the path has changed or is not set
        if (!currentVaultPath || currentVaultPath !== vaultPath) {
          console.log(`Setting vault path from ${currentVaultPath || 'none'} to ${vaultPath}`);
          await setVaultPath(vaultPath);
        } else {
          console.log(`Vault path already set to ${vaultPath}, skipping re-indexing`);
        }
      }
      
      // Get the initial structure from the backend
      const initialStructure = await getInitialFileStructure();
      
      console.log('Got initial structure:', initialStructure);
      
      // Set the root ID
      if (initialStructure && initialStructure.root && initialStructure.root.id) {
        setRootId(initialStructure.root.id);
        
        // Load the root children
        if (initialStructure.first_level && initialStructure.first_level.length > 0) {
          setFolderContents(prev => ({
            ...prev,
            [initialStructure.root.id]: initialStructure.first_level
          }));
        } else {
          console.warn('Warning: First level children array is empty');
          
          // Try to get children directly
          try {
            const rootChildren = await getNodeChildren(initialStructure.root.id);
            console.log(`Got ${rootChildren.length} children directly for root:`, rootChildren);
            
            if (rootChildren.length > 0) {
              setFolderContents(prev => ({
                ...prev,
                [initialStructure.root.id]: rootChildren
              }));
            }
          } catch (childError) {
            console.error('Error getting root children directly:', childError);
          }
        }
      } else {
        console.error('Error: Initial structure is missing root node', initialStructure);
      }
      
      setInitialising(false);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to refresh structure:', err);
      setInitialising(false);
      setIsLoading(false);
    }
  }, [vaultPath]);
  
  // Load folder contents
  const loadFolderContents = useCallback(async (folderId: string) => {
    try {
      console.log(`Loading contents for folder ${folderId}`);
      
      // Mark folder as loading
      setLoadingFolders(prev => new Set(prev).add(folderId));
      
      // Check if we already have contents for this folder
      const existingContents = folderContents[folderId];
      if (existingContents && existingContents.length > 0) {
        console.log(`Already have ${existingContents.length} children for folder ${folderId}, using cached data`);
        return;
      }
      
      // Get children from backend
      const children = await getNodeChildren(folderId);
      console.log(`Got ${children.length} children for folder ${folderId}:`, children);
      
      // Update state
      setFolderContents(prev => ({
        ...prev,
        [folderId]: children
      }));
    } catch (err) {
      console.error(`Failed to load contents for folder ${folderId}:`, err);
      // Set empty array for this folder
      setFolderContents(prev => ({
        ...prev,
        [folderId]: []
      }));
    } finally {
      // Mark folder as not loading
      setLoadingFolders(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        return newSet;
      });
    }
  }, [folderContents]);

  // Stable refs so effect dependencies don't change
  const refreshRef = useRef(refreshStructure);
  const loadRef = useRef(loadFolderContents);

  // Keep refs up-to-date on every render
  useEffect(() => { refreshRef.current = refreshStructure; });
  useEffect(() => { loadRef.current = loadFolderContents; });

  // Runs once on mount to load whatever is already indexed
  useEffect(() => { refreshStructure(); }, [refreshStructure]);
  
  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      console.log('SimpleFileExplorer: refreshTrigger changed, refreshing structure');
      refreshStructure().then(() => {
        if (onRefreshed) {
          onRefreshed();
        }
      });
    }
  }, [refreshTrigger, refreshStructure, onRefreshed]);
  
  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      console.log('SimpleFileExplorer: refreshTrigger changed, refreshing structure');
      refreshStructure().then(() => {
        if (onRefreshed) {
          onRefreshed();
        }
      });
    }
  }, [refreshTrigger, refreshStructure, onRefreshed]);
  
  // Toggle folder expansion
  const toggleFolder = useCallback((folderId: string) => {
    if (expandedFolders.has(folderId)) {
      // Collapse folder
      const newExpanded = new Set(expandedFolders);
      newExpanded.delete(folderId);
      setExpandedFolders(newExpanded);
    } else {
      // Expand folder
      const newExpanded = new Set(expandedFolders);
      newExpanded.add(folderId);
      setExpandedFolders(newExpanded);
      
      // Load contents if not already loaded
      if (!folderContents[folderId]) {
        loadRef.current(folderId);
      }
    }
  }, [expandedFolders, folderContents, loadRef]);
  
  // Sort nodes: folders first, then files, both alphabetically
  const sortNodes = useCallback((nodes: TreeNode[]) => {
    return [...nodes].sort((a, b) => {
      // Folders come first
      if (a.is_dir && !b.is_dir) return -1;
      if (!a.is_dir && b.is_dir) return 1;
      // Within same type, sort alphabetically (case-insensitive)
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, []);

  // Helper function to format time ago
  const formatTimeAgo = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - (timestamp * 1000); // Convert to milliseconds
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }, []);

  // Render a file
  const renderFile = useCallback((node: TreeNode) => {
    const handleClick = () => {
      console.log('🗂️ SimpleFileExplorer: File clicked:', { nodeId: node.id, nodeName: node.name });
      onFileSelect(node.id);
    };
    
    const isSelected = selectedFileId === node.id;
    const isAIGenerated = false; // TODO: Add AI metadata detection
    
    return (
      <button
        key={node.id}
        onClick={handleClick}
        className={`
          group relative w-full text-left
          px-4 py-3 mx-2 mb-1 rounded-lg
          transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isSelected 
            ? 'bg-white/[0.08] border border-white/20' 
            : 'hover:bg-white/[0.03] border border-transparent hover:border-white/10'
          }
        `}
      >
        {/* Selection glow */}
        {isSelected && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 
                          animate-pulse" style={{ animationDuration: '3s' }} />
        )}
        
        <div className="relative z-10 flex items-center gap-3">
          {/* File icon with AI indicator */}
          <div className="relative">
            <FiFile className="w-4 h-4 text-white/40" />
            {isAIGenerated && (
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-400 rounded-full 
                            shadow-[0_0_8px_rgba(147,51,234,0.6)]" />
            )}
          </div>
          
          {/* File name with proper typography */}
          <span className={`
            text-sm font-normal truncate flex-1
            ${isSelected ? 'text-white/90' : 'text-white/70 group-hover:text-white/90'}
            transition-colors duration-200
          `}>
            {node.name}
          </span>
          
          {/* Metadata on hover */}
          <div className={`
            text-xs text-white/30
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          `}>
            {formatTimeAgo(node.last_modified)}
          </div>
        </div>
      </button>
    );
  }, [onFileSelect, selectedFileId, formatTimeAgo]);
  
  // Render a folder
  const renderFolder = useCallback((node: TreeNode) => {
    const isExpanded = expandedFolders.has(node.id);
    const isLoading = loadingFolders.has(node.id);
    const children = folderContents[node.id] || [];
    
    // If folder is expanded but has no children and isn't loading, try to load them
    if (isExpanded && children.length === 0 && !isLoading && folderContents[node.id] !== undefined) {
      // Use setTimeout to avoid infinite render loops
      setTimeout(() => loadRef.current(node.id), 100);
    }
    
    return (
      <div key={node.id} className="relative">
        <div 
          className="flex items-center px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/[0.05] transition-all duration-200 group"
          onClick={() => toggleFolder(node.id)}
        >
          <div className="flex items-center mr-3 relative">
            <FiFolder className="text-white/40 group-hover:text-white/70 transition-colors" size={16} />
            <span className="flex items-center justify-center ml-1.5">
              {isLoading ? (
                <FiRefreshCw className="animate-spin text-white/30" size={12} />
              ) : (
                isExpanded ? 
                  <FiChevronDown className="text-white/30 group-hover:text-white/50 transition-colors" size={12} /> : 
                  <FiChevronRight className="text-white/30 group-hover:text-white/50 transition-colors" size={12} />
              )}
            </span>
          </div>
          <div className="truncate font-light text-sm text-white/70 group-hover:text-white/90 select-none">{node.name}</div>
        </div>
        
        {isExpanded && (
          <div className="pl-5 border-l border-white/10 ml-3">
            {isLoading ? (
              <div className="py-2 px-3 text-white/40 italic font-light text-sm select-none">Loading...</div>
            ) : children.length === 0 ? (
              <div className="py-2 px-3 text-white/40 italic font-light text-sm select-none">
                {folderContents[node.id] === undefined ? "Loading..." : "Empty folder"}
              </div>
            ) : (
              sortNodes(children).map(child => {
                if (child.is_dir) {
                  return renderFolder(child);
                } else {
                  return renderFile(child);
                }
              })
            )}
          </div>
        )}
      </div>
    );
  }, [expandedFolders, folderContents, loadingFolders, toggleFolder, loadRef, sortNodes, renderFile]);
  
  // Render the root
  const renderRoot = useCallback(() => {
    if (initialising) {
      return <div className="text-white/40 p-6 animate-pulse font-light text-sm select-none">
               Loading vault structure...
             </div>;
    }
    
    if (isLoading && !rootId) {
      return <div className="text-white/40 p-6 font-light text-sm select-none">Indexing vault...</div>;
    }
    
    if (!rootId) {
      return <div className="text-white/40 p-6 font-light text-sm select-none">No vault structure found</div>;
    }
    
    const rootChildren = folderContents[rootId] || [];
    
    if (rootChildren.length === 0) {
      if (loadingFolders.has(rootId)) {
        return <div className="text-white/40 p-6 font-light text-sm select-none">Loading root folder...</div>;
      }
      
      return <div className="text-white/40 p-6 italic font-light text-sm select-none">Empty vault</div>;
    }
    
    const sortedChildren = sortNodes(rootChildren);
    
    return (
      <div className="p-4">
        {sortedChildren.map(node => {
          if (node.is_dir) {
            return renderFolder(node);
          } else {
            return renderFile(node);
          }
        })}
      </div>
    );
  }, [isLoading, rootId, folderContents, loadingFolders, renderFolder, renderFile, initialising, sortNodes]);
  
  return (
    <div className="h-full overflow-auto bg-transparent select-none">
      {renderRoot()}
    </div>
  );
};

export default SimpleFileExplorer;