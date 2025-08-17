import React, { useState, useEffect } from 'react';
import { FolderOpen, Clock, X, Plus } from 'lucide-react';
import { recentProjectsManager } from '@/utils/projectStorage';
import { ProjectContext } from '@/types/landingTypes';

interface CodebaseSelectorProps {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
}

export const CodebaseSelector: React.FC<CodebaseSelectorProps> = ({
  value,
  onChange,
  placeholder = "/absolute/or/relative/path"
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentProjects, setRecentProjects] = useState<ProjectContext[]>([]);

  useEffect(() => {
    // Load recent projects
    const projects = recentProjectsManager.get();
    setRecentProjects(projects);
  }, []);

  const handleFolderPick = async () => {
    if (!(window as any).__TAURI__) {
      alert('Folder picker is only available in the desktop app.');
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      
      const folderPath = await open({
        multiple: false,
        directory: true,
        title: 'Select codebase folder'
      });

      if (folderPath && typeof folderPath === 'string') {
        onChange(folderPath);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error picking folder:', error);
      alert('Failed to select folder. Please try again.');
    }
  };

  const handleRecentSelect = (project: ProjectContext) => {
    onChange(project.path);
    setShowDropdown(false);
  };

  const clearInput = () => {
    onChange('');
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-white/50">
          Code Path (required)
        </label>
        {recentProjects.length > 0 && (
          <span className="text-xs text-white/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {recentProjects.length} recent project{recentProjects.length !== 1 ? 's' : ''} available
          </span>
        )}
      </div>

      {/* Quick select recent projects */}
      {recentProjects.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {recentProjects.slice(0, 3).map((project, index) => (
              <button
                key={project.path}
                type="button"
                onClick={() => handleRecentSelect(project)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 rounded-lg text-xs text-white/70 hover:text-white/90 transition-all duration-200 group"
                title={`Select: ${project.path}`}
              >
                <FolderOpen className="w-3 h-3 text-white/40 group-hover:text-white/60" />
                <span className="font-medium">{project.name}</span>
                <span className="text-white/30 font-mono">
                  {project.path.split('/').slice(-2).join('/')}
                </span>
              </button>
            ))}
            {recentProjects.length > 3 && (
              <button
                type="button"
                onClick={() => setShowDropdown(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 border-dashed rounded-lg text-xs text-white/50 hover:text-white/70 transition-all duration-200"
              >
                <Plus className="w-3 h-3" />
                +{recentProjects.length - 3} more
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="relative ">
        {/* Input field with Orchestra styling */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => recentProjects.length > 0 && setShowDropdown(true)}
          placeholder={recentProjects.length > 0 ? "Click to see recent projects or type path..." : placeholder}
          className="w-full px-4 py-3 pr-24 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all duration-200"
        />
        
        {/* Action buttons with improved styling */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          {value && (
            <button
              type="button"
              onClick={clearInput}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white/60 transition-colors"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          <button
            type="button"
            onClick={handleFolderPick}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white/60 transition-colors"
            title="Browse folders"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          
          {recentProjects.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white/60 transition-colors"
              title="Recent codebases"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown for recent projects with Orchestra styling */}
      {showDropdown && recentProjects.length > 0 && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown content with glassmorphic design */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-20 max-h-48 overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
            
            <div className="relative p-3">
              <div className="text-xs text-white/40 mb-3 px-2 font-medium uppercase tracking-wider">
                Recent Codebases
              </div>
              
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {recentProjects.map((project, index) => (
                  <button
                    key={project.path}
                    type="button"
                    onClick={() => handleRecentSelect(project)}
                    className="w-full text-left p-3 hover:bg-white/[0.05] rounded-lg transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FolderOpen className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 transition-colors" />
                      <div className="text-sm text-white/70 font-medium group-hover:text-white/90 transition-colors">
                        {project.name}
                      </div>
                      {index === 0 && (
                        <span className="text-xs bg-white/10 text-white/50 px-1.5 py-0.5 rounded font-medium">
                          RECENT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 truncate font-mono ml-5">
                      {project.path}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};