import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
  expandOnFocus?: boolean;
}

/**
 * AutoResizeTextareaRefined - Following Refactoring UI principles:
 * 1. Smooth, predictable interactions
 * 2. Clear focus states
 * 3. Subtle animations that don't distract
 * 4. Consistent spacing and sizing
 */
const AutoResizeTextareaRefined = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, minRows = 1, maxRows = 6, expandOnFocus = true, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [rows, setRows] = React.useState(minRows);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current!);

    // Calculate rows based on content
    const calculateRows = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Save current height
      const currentHeight = textarea.style.height;
      
      // Reset to auto to get accurate scrollHeight
      textarea.style.height = 'auto';
      
      // Get line height from computed styles
      const computedStyle = getComputedStyle(textarea);
      const lineHeight = parseInt(computedStyle.lineHeight) || 24;
      const paddingTop = parseInt(computedStyle.paddingTop) || 0;
      const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
      const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
      const borderBottom = parseInt(computedStyle.borderBottomWidth) || 0;
      
      const totalPadding = paddingTop + paddingBottom + borderTop + borderBottom;
      const contentHeight = textarea.scrollHeight - totalPadding;
      const calculatedRows = Math.ceil(contentHeight / lineHeight);
      
      // Apply constraints
      const newRows = Math.max(minRows, Math.min(maxRows, calculatedRows));
      
      // Restore height if no change needed
      if (rows === newRows) {
        textarea.style.height = currentHeight;
      } else {
        setRows(newRows);
        textarea.style.height = `${newRows * lineHeight + totalPadding}px`;
      }
    }, [minRows, maxRows, rows]);

    // Auto-resize on content change
    React.useEffect(() => {
      calculateRows();
    }, [props.value, calculateRows]);

    // Handle focus - Rule #3: Use subtle animations
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      if (expandOnFocus && !e.target.value?.trim() && rows === minRows) {
        // Expand to 3 rows on focus for better typing experience
        setRows(Math.min(3, maxRows));
      }
      onFocus?.(e);
    }, [expandOnFocus, rows, minRows, maxRows, onFocus]);

    // Handle blur
    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      // Collapse if empty after a short delay
      if (expandOnFocus && !e.target.value?.trim()) {
        setTimeout(() => {
          if (!textareaRef.current?.value?.trim()) {
            setRows(minRows);
          }
        }, 150);
      }
      onBlur?.(e);
    }, [expandOnFocus, minRows, onBlur]);

    return (
      <textarea
        ref={textareaRef}
        className={cn(
          // Base styles - Rule #5: Design in grayscale first
          "flex w-full rounded-xl px-4 py-3",
          "text-base leading-relaxed", // Better readability
          "bg-transparent",
          "placeholder:text-white/40",
          "resize-none",
          "transition-all duration-200 ease-out",
          
          // Border and focus states - Rule #14: Use meaningful color
          "border border-white/10",
          "focus:border-blue-500/50 focus:outline-none",
          
          // Focus ring effect - Rule #7: Use shadows to convey depth
          "focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0",
          
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          
          // Custom scrollbar for better aesthetics
          "scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent",
          
          className
        )}
        rows={rows}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          // Smooth height transitions
          transition: 'height 0.2s ease-out, border-color 0.2s ease-out',
        }}
        {...props}
      />
    );
  }
);

AutoResizeTextareaRefined.displayName = "AutoResizeTextareaRefined";

export { AutoResizeTextareaRefined };