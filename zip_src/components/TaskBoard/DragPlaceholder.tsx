import React, { useEffect, useRef } from 'react';
import { playAnimation } from '../../utils/animationUtils';

interface DragPlaceholderProps {
  height: number;
  isVisible: boolean;
  animationDuration?: number;
}

/**
 * A placeholder component that animates its height when appearing/disappearing
 */
const DragPlaceholder: React.FC<DragPlaceholderProps> = ({
  height,
  isVisible,
  animationDuration = 150,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const previousVisibleRef = useRef(isVisible);
  
  useEffect(() => {
    // Skip animation on initial render
    if (previousVisibleRef.current === isVisible) return;
    
    const element = ref.current;
    if (!element) return;
    
    if (isVisible) {
      // Animate from 0 to full height
      element.style.height = '0px';
      element.style.opacity = '0';
      
      // Force a reflow
      void element.offsetWidth;
      
      // Animate to full height
      element.style.transition = `height ${animationDuration}ms ease-out, opacity ${animationDuration}ms ease-out`;
      element.style.height = `${height}px`;
      element.style.opacity = '1';
    } else {
      // Animate from full height to 0
      element.style.height = `${height}px`;
      element.style.opacity = '1';
      
      // Force a reflow
      void element.offsetWidth;
      
      // Animate to 0 height
      element.style.transition = `height ${animationDuration}ms ease-in, opacity ${animationDuration}ms ease-in`;
      element.style.height = '0px';
      element.style.opacity = '0';
    }
    
    previousVisibleRef.current = isVisible;
  }, [isVisible, height, animationDuration]);
  
  if (!isVisible && previousVisibleRef.current === false) {
    return null;
  }
  
  return (
    <div 
      ref={ref}
      className="dnd-placeholder border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 overflow-hidden"
      style={{
        height: isVisible ? height : 0,
        marginBottom: isVisible ? '0.75rem' : 0,
        opacity: isVisible ? 1 : 0,
      }}
    />
  );
};

export default DragPlaceholder;