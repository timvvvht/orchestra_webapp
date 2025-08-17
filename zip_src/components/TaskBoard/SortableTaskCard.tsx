import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types/kanban';
import SimpleTaskCard from './SimpleTaskCard';

interface SortableTaskCardProps {
  task: Task;
  priorityColor: string;
}

const SortableTaskCard: React.FC<SortableTaskCardProps> = ({ 
  task, 
  priorityColor
}) => {
  // Set up sortable behavior
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  // Create styles for the draggable element
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : 0,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style} 
      className="w-full"
      {...attributes} 
      {...listeners}
    >
      <SimpleTaskCard 
        task={task} 
        priorityColor={priorityColor}
        isDragging={isDragging}
      />
    </div>
  );
};

export default SortableTaskCard;