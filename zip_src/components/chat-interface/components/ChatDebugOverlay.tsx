/**
 * ChatDebugOverlay - Debug overlay for monitoring container size
 * Extracted from ChatMainCanonicalLegacy to improve maintainability
 */

import React, { useState, useRef, useEffect } from 'react';

interface ChatDebugOverlayProps {
  enabled?: boolean;
}

export const ChatDebugOverlay: React.FC<ChatDebugOverlayProps> = ({ 
  enabled = process.env.NODE_ENV !== 'production' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ 
    width: 0, 
    height: 0 
  });

  useEffect(() => {
    if (!enabled) return;
    
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerSize({ 
        width: Math.round(rect.width), 
        height: Math.round(rect.height) 
      });
    };

    update(); // initial

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [enabled]);

  if (!enabled) {
    return <div ref={containerRef} className="contents" />;
  }

  return (
    <>
      <div ref={containerRef} className="contents" />
      <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs px-3 py-2 rounded z-[9999] pointer-events-none max-w-[200px] break-words">
        {containerSize.width}px × {containerSize.height}px
        <br />
        <span className={containerSize.height <= 945 ? 'text-green-400' : 'text-red-400'}>
          H: {containerSize.height <= 945 ? '✓ Normal' : '⚠ Expanded'}
        </span>
        <br />
        <span className={containerSize.width <= window.innerWidth ? 'text-green-400' : 'text-red-400'}>
          W: {containerSize.width <= window.innerWidth ? '✓ Normal' : '⚠ Overflow'}
        </span>
      </div>
    </>
  );
};