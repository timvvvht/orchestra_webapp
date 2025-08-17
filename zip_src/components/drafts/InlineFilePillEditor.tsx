/**
 * DEPRECATED: InlineFilePillEditor
 * 
 * This component has been replaced by PillTextarea which provides
 * seamless textarea integration without display/edit mode switching.
 * 
 * @deprecated Use PillTextarea instead
 */

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FileReference {
  id: string;
  displayName: string;
  fullPath: string;
  startIndex: number;
  endIndex: number;
}

interface InlineFilePillEditorProps {
  value: string;
  onChange: (value: string, cursorPosition?: number) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onEditingChange?: (isEditing: boolean) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

// Parse file references and their positions
const parseFileReferences = (content: string): FileReference[] => {
  const fileRefRegex = /\[@([^\]]+)\]\(@file:([^)]+)\)/g;
  const references: FileReference[] = [];
  let match;

  while ((match = fileRefRegex.exec(content)) !== null) {
    references.push({
      id: `${match[2]}-${match.index}`,
      displayName: match[1],
      fullPath: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });
  }

  return references.sort((a, b) => a.startIndex - b.startIndex);
};

// Convert content with markdown links to renderable segments
const parseContentSegments = (content: string): Array<{ type: 'text' | 'pill'; content: string; reference?: FileReference }> => {
  const references = parseFileReferences(content);
  const segments: Array<{ type: 'text' | 'pill'; content: string; reference?: FileReference }> = [];
  
  let lastIndex = 0;
  
  references.forEach((ref) => {
    // Add text before this reference
    if (ref.startIndex > lastIndex) {
      const textContent = content.slice(lastIndex, ref.startIndex);
      if (textContent) {
        segments.push({ type: 'text', content: textContent });
      }
    }
    
    // Add the pill reference
    segments.push({ 
      type: 'pill', 
      content: ref.displayName, 
      reference: ref 
    });
    
    lastIndex = ref.endIndex;
  });
  
  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent) {
      segments.push({ type: 'text', content: textContent });
    }
  }
  
  return segments;
};

export const InlineFilePillEditor = forwardRef<HTMLTextAreaElement, InlineFilePillEditorProps>(({
  value,
  onChange,
  onKeyDown,
  onEditingChange,
  placeholder,
  className,
  rows = 6
}, ref) => {
  const [isEditing, setIsEditing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Forward ref to the textarea when editing, or the editor div when displaying
  useImperativeHandle(ref, () => {
    if (isEditing && textareaRef.current) {
      return textareaRef.current;
    }
    // Return the editor div as fallback for positioning
    return editorRef.current as any;
  }, [isEditing]);

  // Handle removing a file reference
  const handleRemoveReference = useCallback((reference: FileReference) => {
    const beforeRef = value.slice(0, reference.startIndex);
    const afterRef = value.slice(reference.endIndex);
    const newValue = beforeRef + afterRef;
    
    onChange(newValue, reference.startIndex);
    
    // Position cursor where the pill was removed
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(reference.startIndex, reference.startIndex);
        textareaRef.current.focus();
      }
    }, 0);
  }, [value, onChange]);

  // Handle clicking on the editor to start editing
  const handleEditorClick = useCallback(() => {
    setIsEditing(true);
    onEditingChange?.(true);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [onEditingChange]);

  // Handle textarea blur
  const handleTextareaBlur = useCallback(() => {
    // Small delay to allow for pill interactions
    setTimeout(() => {
      setIsEditing(false);
      onEditingChange?.(false);
    }, 150);
  }, [onEditingChange]);

  // Handle textarea changes
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    onChange(newValue, cursorPos);
    setCursorPosition(cursorPos);
  }, [onChange]);

  // Handle key events
  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const cursorEnd = textarea.selectionEnd;
    
    setCursorPosition(cursorPos);
    
    // Handle backspace/delete for pill removal
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const references = parseFileReferences(value);
      
      // If there's a selection, check if it includes any pills
      if (cursorPos !== cursorEnd) {
        const selectedPills = references.filter(ref => 
          (ref.startIndex >= cursorPos && ref.startIndex < cursorEnd) ||
          (ref.endIndex > cursorPos && ref.endIndex <= cursorEnd) ||
          (ref.startIndex < cursorPos && ref.endIndex > cursorEnd)
        );
        
        if (selectedPills.length > 0) {
          // Let the default deletion happen - it will remove the selected text including pills
          return;
        }
      } else {
        // No selection - handle single character deletion
        if (e.key === 'Backspace') {
          // Backspace: check if cursor is right after a pill
          const pillAtCursor = references.find(ref => ref.endIndex === cursorPos);
          if (pillAtCursor) {
            e.preventDefault();
            handleRemoveReference(pillAtCursor);
            return;
          }
        } else if (e.key === 'Delete') {
          // Delete: check if cursor is right before a pill
          const pillAtCursor = references.find(ref => ref.startIndex === cursorPos);
          if (pillAtCursor) {
            e.preventDefault();
            handleRemoveReference(pillAtCursor);
            return;
          }
        }
      }
    }
    
    onKeyDown?.(e);
  }, [onKeyDown, value, handleRemoveReference]);

  // Sync cursor position
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [isEditing, cursorPosition]);

  const segments = parseContentSegments(value);
  const hasContent = value.trim().length > 0;

  return (
    <div className={cn("relative", className)}>
      {/* Display Mode - Shows pills inline */}
      {!isEditing && (
        <div
          ref={editorRef}
          onClick={handleEditorClick}
          className={cn(
            "w-full min-h-[150px] px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl",
            "text-white cursor-text transition-all duration-200",
            "hover:border-white/20 hover:bg-white/[0.05]",
            "focus-within:border-white/20 focus-within:bg-white/[0.05]"
          )}
          style={{ minHeight: `${rows * 1.5}rem` }}
        >
          {hasContent ? (
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {segments.map((segment, index) => {
                if (segment.type === 'text') {
                  return (
                    <span key={index} className="text-white">
                      {segment.content}
                    </span>
                  );
                } else {
                  // Render pill
                  return (
                    <motion.span
                      key={segment.reference?.id || index}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1.5 mx-1 group relative"
                    >
                      {/* Ethereal Link Orb - Inline */}
                      <span className="
                        inline-flex items-center gap-1.5 px-2 py-1
                        bg-gradient-to-r from-white/[0.12] to-white/[0.08]
                        backdrop-blur-xl
                        border border-white/30
                        rounded-full
                        shadow-[0_0_15px_rgba(255,255,255,0.08)]
                        hover:shadow-[0_0_25px_rgba(255,255,255,0.15)]
                        hover:border-white/40
                        transition-all duration-300 ease-out
                        text-sm font-medium text-white/90
                        cursor-default
                        relative
                      ">
                        {/* Mystical glow effect */}
                        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-pink-500/15 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        {/* File icon */}
                        <span className="relative z-10 flex items-center justify-center w-3 h-3 rounded-full bg-white/20">
                          <FileText className="w-2 h-2 text-white/70" />
                        </span>
                        
                        {/* File name */}
                        <span className="relative z-10 max-w-[150px] truncate">
                          {segment.content}
                        </span>
                        
                        {/* Remove button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (segment.reference) {
                              handleRemoveReference(segment.reference);
                            }
                          }}
                          className="
                            relative z-10 flex items-center justify-center
                            w-4 h-4 rounded-full
                            bg-white/15 hover:bg-red-500/30
                            text-white/50 hover:text-red-300
                            opacity-0 group-hover:opacity-100
                            transition-all duration-200
                            hover:scale-110
                            ml-1
                          "
                          title={`Remove ${segment.content}`}
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                        
                        {/* Tooltip */}
                        {segment.reference && (
                          <span className="
                            absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                            px-2 py-1 bg-black/90 text-white/90 text-xs rounded
                            opacity-0 group-hover:opacity-100 pointer-events-none
                            transition-opacity duration-200 delay-300
                            whitespace-nowrap z-30
                          ">
                            {segment.reference.fullPath}
                            <div className="text-white/60 text-[10px] mt-1 border-t border-white/20 pt-1">
                              Click to edit • Backspace/Delete to remove
                            </div>
                            <span className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90" />
                          </span>
                        )}
                      </span>
                    </motion.span>
                  );
                }
              })}
            </div>
          ) : (
            <div className="text-white/25 leading-relaxed">
              {placeholder || "Start typing..."}
            </div>
          )}
        </div>
      )}

      {/* Edit Mode - Shows raw textarea */}
      {isEditing && (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleTextareaKeyDown}
          onBlur={handleTextareaBlur}
          rows={rows}
          className="w-full px-4 py-3 bg-white/[0.03] border border-white/20 rounded-xl text-white placeholder-white/25 focus:outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 resize-none"
          placeholder={placeholder}
          autoFocus
        />
      )}
      
      {/* Character count */}
      <div className="absolute bottom-3 right-3 text-xs text-white/20 pointer-events-none">
        {value.length}
      </div>
    </div>
  );
});

InlineFilePillEditor.displayName = 'InlineFilePillEditor';