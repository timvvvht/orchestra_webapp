/**
 * FancyFileSelector - Elegant File Selection Component
 *
 * A beautiful, animated file selector component extracted from ChatInput's @ mention dropdown.
 * Features glassmorphic design, smooth animations, and keyboard navigation.
 *
 * ## Design Theme
 * - Dark glassmorphic background with backdrop blur
 * - Smooth Framer Motion animations (spring-based)
 * - Apple/Linear/Raycast-inspired visual design
 * - Keyboard navigation hints and visual feedback
 * - Responsive and accessible
 *
 * ## Usage
 * ```tsx
 * <FancyFileSelector
 *   isOpen={showSelector}
 *   query={searchQuery}
 *   results={fileResults}
 *   selectedIndex={selectedIndex}
 *   onFileSelect={(file) => handleFileSelect(file)}
 *   onClose={() => setShowSelector(false)}
 *   anchorPosition={{ top: 100, left: 50 }} // Optional positioning
 *   isSearching={isLoading}
 * />
 * ```
 *
 * ## Integration Points
 * - ChatInput: @ mention file selection
 * - FileMentionPlugin: Lexical editor file mentions
 * - NewDraftModal: Ctrl+K file search overlay
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { File, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchMatch } from "@/lib/tauri/fileSelector";

interface FancyFileSelectorProps {
  isOpen: boolean;
  query: string;
  onQueryChange?: (query: string) => void;
  results: SearchMatch[];
  selectedIndex: number;
  onFileSelect: (file: SearchMatch) => void;
  onClose: () => void;
  anchorPosition?: { top: number; left: number };
  isSearching?: boolean;
  className?: string;
}

export function FancyFileSelector({
  isOpen,
  query,
  onQueryChange,
  results,
  selectedIndex,
  onFileSelect,
  onClose,
  anchorPosition,
  isSearching = false,
  className,
}: FancyFileSelectorProps) {
  if (!isOpen) return null;

  const handleFileClick = (file: SearchMatch) => {
    onFileSelect(file);
  };

  const positionStyle = anchorPosition
    ? {
        position: "absolute" as const,
        top: anchorPosition.top,
        left: anchorPosition.left,
      }
    : {};

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className={cn(
          "w-96 max-w-[90vw] bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl z-50",
          className
        )}
        style={positionStyle}
      >
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <File className="h-4 w-4 text-white/60" />
            <h3 className="text-sm font-medium text-white">
              Select File {query && `"${query}"`}
            </h3>
            {isSearching && (
              <div className="ml-auto">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto">
          {results.length > 0 ? (
            results.map((file, index) => (
              <button
                key={file.full_path}
                onClick={() => handleFileClick(file)}
                className={cn(
                  "w-full text-left p-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0",
                  index === selectedIndex && "bg-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <File className="h-4 w-4 text-white/40 flex-shrink-0" />
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
              {isSearching ? "Searching..." : "No files found"}
            </div>
          ) : (
            <div className="p-4 text-center text-white/50 text-sm">
              Type to search files...
            </div>
          )}
        </div>

        <div className="p-3 border-t border-white/10 text-xs text-white/50">
          <div className="flex items-center justify-between">
            <span>Use ↑↓ to navigate, Enter to select, Esc to cancel</span>
            <div className="flex items-center gap-1">
              <ChevronUp className="h-3 w-3" />
              <ChevronDown className="h-3 w-3" />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
