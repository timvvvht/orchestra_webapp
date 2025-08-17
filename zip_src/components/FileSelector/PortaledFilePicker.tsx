/**
 * Portaled File Picker Component
 * 
 * Renders the @-trigger file picker using React Portal to avoid clipping issues
 */

import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { cn } from '@/lib/utils';
import { SearchMatch } from '@/lib/tauri/fileSelector';

interface PortaledFilePickerProps {
  /** Whether the picker is visible */
  isVisible: boolean;
  /** Current search query */
  query: string;
  /** Search results */
  results: SearchMatch[];
  /** Whether search is loading */
  isLoading: boolean;
  /** Currently selected index */
  selectedIndex: number;
  /** Reference element to position relative to */
  anchorRef: React.RefObject<HTMLElement>;
  /** Callback when a file is selected */
  onFileSelect: (file: SearchMatch) => void;
  /** Callback when mouse enters a file item */
  onMouseEnter: (index: number) => void;
  /** Additional CSS classes */
  className?: string;
}

export const PortaledFilePicker: React.FC<PortaledFilePickerProps> = ({
  isVisible,
  query,
  results,
  isLoading,
  selectedIndex,
  anchorRef,
  onFileSelect,
  onMouseEnter,
  className
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);

  // Update position when visibility changes or window resizes
  useEffect(() => {
    if (!isVisible || !anchorRef.current) return;

    const updatePosition = () => {
      const anchorRect = anchorRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const pickerHeight = 300; // Approximate height of picker
      
      // Calculate position
      let top = anchorRect.bottom + 8; // 8px gap below anchor
      let left = anchorRect.left;
      const width = Math.min(384, anchorRect.width); // max-w-96 = 384px
      
      // If picker would go below viewport, position it above the anchor
      if (top + pickerHeight > viewportHeight - 20) {
        top = anchorRect.top - pickerHeight - 8;
      }
      
      // Ensure picker doesn't go off-screen horizontally
      if (left + width > window.innerWidth - 20) {
        left = window.innerWidth - width - 20;
      }
      if (left < 20) {
        left = 20;
      }

      setPosition({ top, left, width });
    };

    updatePosition();
    
    // Update position on window resize or scroll
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible, anchorRef]);

  if (!isVisible) return null;

  return ReactDOM.createPortal(
    <div
      ref={pickerRef}
      className={cn(
        "fixed z-[9999] bg-white/[0.05] backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl",
        className
      )}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-sm font-medium text-white">
            Select File {query && `"${query}"`}
          </h3>
          {isLoading && (
            <div className="ml-auto">
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
      
      {/* Results */}
      <div className="max-h-60 overflow-y-auto">
        {results.length > 0 ? (
          results.map((file, index) => (
            <button
              key={file.full_path}
              onClick={() => onFileSelect(file)}
              onMouseEnter={() => onMouseEnter(index)}
              className={cn(
                "w-full text-left p-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0",
                index === selectedIndex && "bg-white/10"
              )}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {file.display}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    {file.relative_path}
                  </div>
                </div>
                {index === selectedIndex && (
                  <div className="flex items-center gap-1 text-xs text-white/40">
                    <span>Enter</span>
                  </div>
                )}
              </div>
            </button>
          ))
        ) : query ? (
          <div className="p-4 text-center text-white/50 text-sm">
            {isLoading ? 'Searching...' : 'No files found'}
          </div>
        ) : (
          <div className="p-4 text-center text-white/50 text-sm">
            Type to search files...
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-white/10 text-xs text-white/50">
        <div className="flex items-center justify-between">
          <span>Use ↑↓ to navigate, Enter to select, Esc to cancel</span>
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};