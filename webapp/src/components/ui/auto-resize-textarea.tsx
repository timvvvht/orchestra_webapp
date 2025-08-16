import * as React from "react";
import { cn } from "@/lib/utils";

export interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
  expandOnFocus?: boolean;
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, minRows = 1, maxRows = 8, expandOnFocus = true, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [rows, setRows] = React.useState(minRows);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => textareaRef.current!);

    // Auto-resize function
    const autoResize = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      
      // Get computed styles
      const computedStyle = getComputedStyle(textarea);
      const lineHeight = parseInt(computedStyle.lineHeight) || 24; // fallback to 24px
      const paddingTop = parseInt(computedStyle.paddingTop) || 0;
      const paddingBottom = parseInt(computedStyle.paddingBottom) || 0;
      const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
      const borderBottom = parseInt(computedStyle.borderBottomWidth) || 0;
      
      const totalPadding = paddingTop + paddingBottom + borderTop + borderBottom;
      
      // Calculate rows based on scroll height
      const contentHeight = textarea.scrollHeight - totalPadding;
      const calculatedRows = Math.max(1, Math.ceil(contentHeight / lineHeight));
      
      // Apply min/max constraints
      const newRows = Math.max(minRows, Math.min(maxRows, calculatedRows));
      setRows(newRows);
      
      // Set the height explicitly for smooth transitions
      textarea.style.height = `${newRows * lineHeight + totalPadding}px`;
    }, [minRows, maxRows]);

    // Handle focus
    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      if (expandOnFocus && rows === minRows) {
        setRows(Math.min(5, maxRows)); // Expand to 5 rows on focus (increased from 3)
      }
      onFocus?.(e);
    }, [expandOnFocus, rows, minRows, maxRows, onFocus]);

    // Handle blur
    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      // Only collapse if empty and expandOnFocus is enabled
      if (expandOnFocus && !e.target.value.trim()) {
        // Add a small delay before collapsing to prevent jarring transitions
        setTimeout(() => {
          setRows(minRows);
        }, 100);
      }
      onBlur?.(e);
    }, [expandOnFocus, minRows, onBlur]);

    // Auto-resize on content change
    React.useEffect(() => {
      autoResize();
    }, [props.value, autoResize]);

    // Auto-resize on mount
    React.useEffect(() => {
      autoResize();
    }, [autoResize]);

    return (
      <textarea
        ref={textareaRef}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-all duration-200",
          className
        )}
        rows={rows}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };