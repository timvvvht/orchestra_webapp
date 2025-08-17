import { useEffect, useRef } from 'react';

interface UseAutoResizeOptions {
  minHeight?: number;
  maxLines?: number; // Maximum number of lines before scrolling
  value: string;
}

export function useAutoResize({ minHeight = 48, maxLines = 4, value }: UseAutoResizeOptions) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      console.log('🔧 useAutoResize: No textarea ref');
      return;
    }

    console.log('🔧 useAutoResize: Running with value:', value, 'length:', value.length);

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Get computed styles for accurate calculations
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 24; // fallback to 24px
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
    
    console.log('🔧 useAutoResize: Computed styles:', {
      lineHeight,
      paddingTop,
      paddingBottom,
      borderTop,
      borderBottom
    });
    
    // Calculate the new height based on line-based growth
    let newHeight;
    
    if (!value.trim()) {
      // Empty content - use minHeight
      newHeight = minHeight;
      console.log('🔧 useAutoResize: Empty content, using minHeight:', newHeight);
    } else {
      const lineCount = value.split('\n').length;
      console.log('🔧 useAutoResize: Line count:', lineCount);
      
      // 🎯 LINE-BASED GROWTH: Grow up to maxLines (default 4) then scroll
      const targetLines = Math.min(lineCount, maxLines);
      const calculatedHeight = (targetLines * lineHeight) + paddingTop + paddingBottom + borderTop + borderBottom;
      
      console.log('🔧 useAutoResize: Target lines:', targetLines, 'Calculated height:', calculatedHeight);
      
      // Ensure we don't go below minHeight
      newHeight = Math.max(calculatedHeight, minHeight);
    }
    
    console.log('🔧 useAutoResize: Setting height to:', newHeight);
    
    // Set the new height
    textarea.style.height = `${newHeight}px`;
    
    // Calculate maxHeight based on maxLines for overflow detection
    const maxHeight = (maxLines * lineHeight) + paddingTop + paddingBottom + borderTop + borderBottom;
    const scrollHeight = textarea.scrollHeight;
    
    console.log('🔧 useAutoResize: MaxHeight:', maxHeight, 'ScrollHeight:', scrollHeight);
    
    // Add scrollbar if content exceeds maxLines
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    
    console.log('🔧 useAutoResize: Final textarea height:', textarea.style.height);
  }, [value, minHeight, maxLines]);

  return textareaRef;
}