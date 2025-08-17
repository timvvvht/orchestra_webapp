import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMissionControlStore } from '@/stores/missionControlStore';

// Format code path for display - show last 2-3 segments for context
const formatCodePath = (path: string | null): string => {
  if (!path) return 'No directory set';

  // Handle home directory
  const homePath = path.replace(/^~/, '').replace(/^\/home\/[^/]+/, '~');
  const segments = homePath.split('/').filter(Boolean);

  // If path is very short, show it all
  if (segments.length <= 3) {
    return homePath;
  }

  // Otherwise show last 2-3 segments with ellipsis
  const lastSegments = segments.slice(-2);
  return `.../${lastSegments.join('/')}`;
};

const CwdFilterDropdown: React.FC = () => {
  const { sessions, cwdFilter, setCwdFilter } = useMissionControlStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  // Get unique base directories from sessions (with fallback to agent_cwd)
  const uniqueDirs = [...new Set(sessions.map((s) => s.base_dir ?? s.agent_cwd).filter(Boolean))];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleToggleDropdown = () => {
    if (!isDropdownOpen) {
      const rect = dropdownRef.current?.getBoundingClientRect();
      if (rect) {
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
        });
      }
    }
    setIsDropdownOpen((prev) => !prev);
  };

  // Don't render if no directories available
  if (uniqueDirs.length === 0) {
    return null;
  }

  return (
    <>
      <button
        ref={dropdownRef}
        onClick={handleToggleDropdown}
        className="group relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-light text-white/70 hover:text-white/90 focus:outline-none transition-all duration-200"
      >
        {/* Subtle background on hover */}
        <div className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Directory icon - simplified */}
        <div className="relative w-4 h-4 rounded bg-white/10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-sm bg-white/60" />
        </div>
        
        <span className="relative text-xs">
          {cwdFilter ? formatCodePath(cwdFilter) : 'All directories'}
        </span>
        
        {/* Chevron with smooth rotation */}
        <svg
          className={`relative w-3 h-3 transition-all duration-300 ${
            isDropdownOpen ? 'rotate-180 text-white/90' : 'text-white/50'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel - Portaled to body for isolation from parent styles */}
      {isDropdownOpen && dropdownPosition && createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownMenuRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[9999]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              minWidth: '240px',
            }}
          >
            <div className="relative">
              {/* Main dropdown content - completely solid background */}
              <div
                className="rounded-xl py-2 shadow-2xl border border-white/10"
                style={{
                  backgroundColor: '#030712',
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none',
                }}
              >
                {/* Header */}
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
                    Filter by Directory
                  </p>
                </div>
                
                {/* Options */}
                <div className="py-1 max-h-[200px] overflow-y-auto">
                  {/* All directories option */}
                  <button
                    onClick={() => {
                      setCwdFilter(null);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 relative group/item ${
                      !cwdFilter
                        ? 'text-white bg-white/10'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="block truncate">All directories</span>
                      {!cwdFilter && (
                        <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                  </button>
                  
                  {/* Directory options */}
                  {uniqueDirs.map((dir) => (
                    <button
                      key={dir}
                      onClick={() => {
                        setCwdFilter(dir);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 relative group/item ${
                        cwdFilter === dir
                          ? 'text-white bg-white/10'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="block truncate font-mono text-xs">{formatCodePath(dir)}</span>
                        {cwdFilter === dir && (
                          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
                
                {/* Footer tip */}
                <div className="px-4 py-2 border-t border-white/10">
                  <p className="text-xs text-white/50">Filter sessions by working directory</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default CwdFilterDropdown;