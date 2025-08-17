/**
 * PillTextarea - Seamless inline pill integration into textarea
 * 
 * Uses ghost overlay pattern to render pills while maintaining native textarea behavior
 */

import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { FileText, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FileReference {
  id: string;
  displayName: string;
  fullPath: string;
  startIndex: number;
  endIndex: number;
}

interface PillTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string, cursorPosition?: number) => void;
  onKeyDownExtra?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

// Parse file references and their positions
const parseFileReferences = (content: string): FileReference[] => {
  const fileRefRegex = /\[@([^\]]+?)\]\(@file:([^\)\n\r]+?)\)/g;
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

// Render text with inline pills
const renderWithPills = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const references = parseFileReferences(text);
  let lastIndex = 0;
  let keyIndex = 0;

  references.forEach((ref) => {
    // Add text before this reference
    if (ref.startIndex > lastIndex) {
      const textContent = text.slice(lastIndex, ref.startIndex);
      if (textContent) {
        parts.push(textContent);
      }
    }

    // Add the pill
    parts.push(
      <FilePill 
        key={`pill-${keyIndex++}`}
        label={ref.displayName}
        fullPath={ref.fullPath}
      />
    );

    lastIndex = ref.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    const textContent = text.slice(lastIndex);
    if (textContent) {
      parts.push(textContent);
    }
  }

  return parts;
};

// Individual pill component
const FilePill: React.FC<{ label: string; fullPath: string }> = ({ label, fullPath }) => (
  <motion.span
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    className="inline-flex items-center gap-1.5 mx-0.5 group relative"
  >
    <span className="
      inline-flex items-center gap-1.5 px-2 py-0.5
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
        {label}
      </span>
      
      {/* Tooltip */}
      <span className="
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
        px-2 py-1 bg-black/90 text-white/90 text-xs rounded
        opacity-0 group-hover:opacity-100 pointer-events-none
        transition-opacity duration-200 delay-300
        whitespace-nowrap z-30
      ">
        {fullPath}
        <div className="text-white/60 text-[10px] mt-1 border-t border-white/20 pt-1">
          Backspace/Delete to remove
        </div>
        <span className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90" />
      </span>
    </span>
  </motion.span>
);

// Atomic delete logic for pills
const pillAwareKeydown = (
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  replace: (newVal: string, cursorPos?: number) => void
) => {
  if (e.key !== 'Backspace' && e.key !== 'Delete') return;

  const { selectionStart: start, selectionEnd: end } = e.currentTarget;

  // If user has a selection that spans text -> let browser handle
  if (start !== end) return;

  const refs = parseFileReferences(value);
  
  // Backspace: cursor after pill
  if (e.key === 'Backspace') {
    const pill = refs.find(r => r.endIndex === start);
    if (pill) {
      e.preventDefault();
      const newValue = value.slice(0, pill.startIndex) + value.slice(pill.endIndex);
      replace(newValue, pill.startIndex);
      return;
    }
  }
  
  // Delete: cursor before pill
  if (e.key === 'Delete') {
    const pill = refs.find(r => r.startIndex === start);
    if (pill) {
      e.preventDefault();
      const newValue = value.slice(0, pill.startIndex) + value.slice(pill.endIndex);
      replace(newValue, pill.startIndex);
      return;
    }
  }
};

export const PillTextarea = forwardRef<HTMLTextAreaElement, PillTextareaProps>(({
  value,
  onChange,
  onKeyDownExtra,
  className,
  ...rest
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Forward ref to textarea
  useImperativeHandle(ref, () => textareaRef.current!, []);

  // Handle keydown with pill-aware logic
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    pillAwareKeydown(e, value, (newVal, cursorPos) => {
      onChange(newVal, cursorPos);
      
      // Position cursor after pill deletion
      if (cursorPos !== undefined) {
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.setSelectionRange(cursorPos, cursorPos);
            textareaRef.current.focus();
          }
        }, 0);
      }
    });
    
    onKeyDownExtra?.(e);
  };

  // Handle textarea changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    onChange(newValue, cursorPosition);
  };

  return (
    <div className={cn("relative text-sm leading-relaxed", className)}>
      {/* REAL TEXTAREA - transparent, handles all input */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 w-full h-full resize-none bg-transparent text-transparent caret-white selection:bg-white/20 focus:outline-none z-10"
        {...rest}
      />

      {/* GHOST OVERLAY - shows pills and styled text */}
      <div className="pointer-events-none whitespace-pre-wrap break-words px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white leading-relaxed">
        {value ? renderWithPills(value) : (
          <span className="text-white/25">
            {rest.placeholder || "Start typing..."}
          </span>
        )}
      </div>
      
      {/* Character count */}
      <div className="absolute bottom-3 right-3 text-xs text-white/20 pointer-events-none z-20">
        {value.length}
      </div>
    </div>
  );
});

PillTextarea.displayName = 'PillTextarea';