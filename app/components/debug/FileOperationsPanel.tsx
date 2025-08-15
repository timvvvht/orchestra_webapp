import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  FolderOpen, 
  FileEdit, 
  FilePlus, 
  FileX,
  ChevronRight,
  Search
} from 'lucide-react';

export interface FileOperation {
  path: string;
  operation: 'created' | 'modified' | 'deleted';
  timestamp: number;
  toolName: string;
  preview?: string;
}

interface FileOperationsPanelProps {
  operations: FileOperation[];
  className?: string;
}

export function FileOperationsPanel({ operations, className }: FileOperationsPanelProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'created' | 'modified' | 'deleted'>('all');
  
  // Group and filter operations
  const { fileTree, stats } = useMemo(() => {
    // Filter operations
    const filtered = operations.filter(op => {
      const matchesSearch = op.path.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === 'all' || op.operation === filterType;
      return matchesSearch && matchesFilter;
    });
    
    // Build file tree
    const tree = new Map<string, { files: FileOperation[], subdirs: Set<string> }>();
    
    filtered.forEach(op => {
      const parts = op.path.split('/').filter(Boolean);
      let currentPath = '';
      
      parts.forEach((part, idx) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (idx === parts.length - 1) {
          // It's a file
          const dir = parentPath || '/';
          if (!tree.has(dir)) {
            tree.set(dir, { files: [], subdirs: new Set() });
          }
          tree.get(dir)!.files.push(op);
        } else {
          // It's a directory
          const dir = parentPath || '/';
          if (!tree.has(dir)) {
            tree.set(dir, { files: [], subdirs: new Set() });
          }
          tree.get(dir)!.subdirs.add(currentPath);
          
          if (!tree.has(currentPath)) {
            tree.set(currentPath, { files: [], subdirs: new Set() });
          }
        }
      });
    });
    
    // Calculate stats
    const stats = {
      total: filtered.length,
      created: filtered.filter(op => op.operation === 'created').length,
      modified: filtered.filter(op => op.operation === 'modified').length,
      deleted: filtered.filter(op => op.operation === 'deleted').length
    };
    
    return { fileTree: tree, stats };
  }, [operations, searchQuery, filterType]);
  
  const toggleDir = (dir: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      return next;
    });
  };
  
  const renderTree = (dir: string, level: number = 0): React.ReactNode => {
    const node = fileTree.get(dir);
    if (!node) return null;
    
    const isExpanded = expandedDirs.has(dir) || dir === '/';
    const dirName = dir === '/' ? 'Root' : dir.split('/').pop() || dir;
    
    return (
      <div key={dir} className={cn("space-y-1", level > 0 && "ml-4")}>
        {/* Directory */}
        {dir !== '/' && (
          <button
            onClick={() => toggleDir(dir)}
            className="flex items-center gap-2 w-full px-2 py-1 rounded-lg
                     hover:bg-white/5 transition-colors group"
          >
            <ChevronRight className={cn(
              "w-3 h-3 text-white/40 transition-transform",
              isExpanded && "rotate-90"
            )} />
            <FolderOpen className="w-4 h-4 text-yellow-500/80" />
            <span className="text-sm font-mono text-white/80 group-hover:text-white">
              {dirName}
            </span>
            <span className="text-xs text-white/40 ml-auto">
              {node.files.length + node.subdirs.size}
            </span>
          </button>
        )}
        
        {/* Contents */}
        {(isExpanded || dir === '/') && (
          <div className={dir !== '/' ? "ml-5" : ""}>
            {/* Subdirectories */}
            {Array.from(node.subdirs).sort().map(subdir => renderTree(subdir, level + 1))}
            
            {/* Files */}
            {node.files.sort((a, b) => a.path.localeCompare(b.path)).map((file, idx) => {
              const fileName = file.path.split('/').pop() || file.path;
              const Icon = file.operation === 'created' ? FilePlus :
                          file.operation === 'modified' ? FileEdit :
                          FileX;
              const color = file.operation === 'created' ? 'text-green-400' :
                           file.operation === 'modified' ? 'text-yellow-400' :
                           'text-red-400';
              
              return (
                <div
                  key={`${file.path}-${idx}`}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg
                           hover:bg-white/5 transition-colors group"
                >
                  <Icon className={cn("w-4 h-4", color)} />
                  <span className="text-sm font-mono text-white/70 group-hover:text-white/90 flex-1">
                    {fileName}
                  </span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    file.operation === 'created' && "bg-green-500/20 text-green-300",
                    file.operation === 'modified' && "bg-yellow-500/20 text-yellow-300",
                    file.operation === 'deleted' && "bg-red-500/20 text-red-300"
                  )}>
                    {file.operation}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className={cn("flex flex-col h-full bg-gray-950", className)}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-light flex items-center gap-2 mb-4">
          <FileEdit className="w-5 h-5" />
          File Operations
        </h2>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg
                     text-sm text-white placeholder-white/40 focus:outline-none 
                     focus:border-white/20 transition-colors"
          />
        </div>
        
        {/* Filters */}
        <div className="flex gap-1">
          {(['all', 'created', 'modified', 'deleted'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-3 py-1 text-xs rounded-lg transition-colors capitalize",
                filterType === type
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      
      {/* File Tree */}
      <div className="flex-1 overflow-y-auto p-4">
        {operations.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            No file operations yet
          </div>
        ) : stats.total === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            No files match your search
          </div>
        ) : (
          renderTree('/')
        )}
      </div>
      
      {/* Stats */}
      {stats.total > 0 && (
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Total:</span>
            <span className="text-white font-mono">{stats.total}</span>
          </div>
          {stats.created > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Created:</span>
              <span className="text-green-300 font-mono">{stats.created}</span>
            </div>
          )}
          {stats.modified > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Modified:</span>
              <span className="text-yellow-300 font-mono">{stats.modified}</span>
            </div>
          )}
          {stats.deleted > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Deleted:</span>
              <span className="text-red-300 font-mono">{stats.deleted}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}