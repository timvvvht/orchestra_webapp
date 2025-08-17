import React from 'react';
import { Trash2 } from 'lucide-react';
import { Task } from '@/types/kanban';
import { useKanbanStore } from '@/stores/kanbanStore';

interface SimpleTaskCardProps {
  task: Task;
  priorityColor: string;
  isDragging?: boolean;
}

const SimpleTaskCard: React.FC<SimpleTaskCardProps> = ({ 
  task, 
  priorityColor,
  isDragging = false,
}) => {
  const deleteTask = useKanbanStore(state => state.deleteTask);
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    deleteTask(task.id);
  };
  
  return (
    <div
      data-task-id={task.id}
      className={`
        rounded-lg border border-border border-l-2 ${priorityColor} 
        bg-surface-0 p-3 text-sm hover:border-primary/60 transition-colors 
        ${isDragging ? 'shadow-xl ring-2 ring-primary/50' : ''}
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
      
      <div className="mt-2 flex items-center justify-between">
        {task.assignedTo && (
          <div className="flex items-center">
            <div
              className={`h-5 w-5 rounded-full ${task.assignedTo.color} text-[10px] flex items-center justify-center text-white font-bold`}
            >
              {task.assignedTo.name.charAt(0)}
            </div>
          </div>
        )}

        {task.tags && task.tags.length > 0 && (
          <div className="flex gap-1">
            {task.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {task.priority && (
          <span className={`
            rounded px-1.5 py-0.5 text-[10px] 
            ${task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' : 
              task.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' : 
              'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'}
          `}>
            {task.priority}
          </span>
        )}
      </div>
    </div>
  );
};

export default SimpleTaskCard;