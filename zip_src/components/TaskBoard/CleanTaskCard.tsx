import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types/kanban';
import { Trash2 } from 'lucide-react';
import { useCleanKanbanStore } from '@/stores/cleanKanbanStore';

interface CleanTaskCardProps {
  task: Task;
  priorityColor: string;
  isDragging?: boolean;
}

const CleanTaskCard: React.FC<CleanTaskCardProps> = ({ 
  task, 
  priorityColor,
  isDragging = false,
}) => {
  const deleteTask = useCleanKanbanStore(state => state.deleteTask);
  
  // Set up draggable behavior
  const { attributes, listeners, setNodeRef, transform, isDragging: isDraggingNow } = useDraggable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  });
  
  // Combine the isDragging prop with the isDragging state from useDraggable
  const isCurrentlyDragging = isDragging || isDraggingNow;
  
  // Create styles for the draggable element
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isCurrentlyDragging ? 0.4 : 1,
    transition: 'transform 0.1s ease-in-out',
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    deleteTask(task.id);
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-task-id={task.id}
      className={`
        rounded-lg border border-border border-l-2 ${priorityColor} 
        bg-surface-0 p-3 text-sm hover:border-primary/60 transition-colors 
        ${isCurrentlyDragging ? 'shadow-xl ring-2 ring-primary/50' : ''}
        cursor-grab active:cursor-grabbing
        w-full
      `}
    >
      <div className="flex justify-between items-start mb-1">
        <p className="font-medium">{task.title}</p>
        <button 
          onClick={handleDelete}
          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted"
          aria-label="Delete task"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      
      {task.description && (
        <p className="text-xs text-muted-foreground mt-1">
          {task.description.length > 100
            ? `${task.description.substring(0, 100)}...`
            : task.description}
        </p>
      )}
      
      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.map((tag, index) => (
            <span 
              key={index}
              className="px-1.5 py-0.5 bg-surface-2 text-[10px] rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Assigned user */}
      {task.assignedTo && (
        <div className="flex items-center mt-2">
          <div 
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white ${task.assignedTo.color}`}
            title={task.assignedTo.name}
          >
            {task.assignedTo.name.charAt(0)}
          </div>
        </div>
      )}
    </div>
  );
};

export default CleanTaskCard;