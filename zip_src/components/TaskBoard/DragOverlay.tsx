import React, { useEffect, useRef } from 'react';
import { Task } from '../../types/kanban';

interface DragOverlayProps {
  task: Task | null;
  position: { x: number; y: number } | null;
  offset: { x: number; y: number } | null;
  getPriorityColor: (priority?: 'low' | 'medium' | 'high') => string;
}

/**
 * A component that renders a dragged task as an overlay
 */
const DragOverlay: React.FC<DragOverlayProps> = ({
  task,
  position,
  offset,
  getPriorityColor,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  // Update the position of the overlay using requestAnimationFrame for smooth animation
  useEffect(() => {
    if (!task || !position || !offset || !ref.current) return;
    
    const updatePosition = () => {
      if (!ref.current || !position || !offset) return;
      
      const x = position.x - offset.x;
      const y = position.y - offset.y;
      
      ref.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };
    
    // Initial position update
    updatePosition();
    
    // Add a small rotation and scale effect for visual feedback
    ref.current.style.transform += ' rotate(2deg) scale(1.05)';
    ref.current.style.boxShadow = '0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)';
  }, [task, position, offset]);
  
  if (!task || !position || !offset) return null;
  
  const priorityColor = getPriorityColor(task.priority);
  
  return (
    <div
      ref={ref}
      className={`fixed top-0 left-0 rounded-lg border border-border border-l-2 ${priorityColor} bg-card p-3 text-sm pointer-events-none z-[100] opacity-90 will-change-transform`}
      style={{
        width: '280px', // Match the width of the original card
      }}
    >
      <div className="flex justify-between items-start mb-1">
        <p>{task.title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{task.description}</p>
    </div>
  );
};

export default DragOverlay;