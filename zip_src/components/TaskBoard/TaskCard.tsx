import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '@/types/kanban';
import { useKanbanStore } from '@/stores/kanbanStore';
import { Trash2, Pencil } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  priorityColor: string;
  isDragging?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  priorityColor,
  isDragging = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const updateTask = useKanbanStore(state => state.updateTask);
  const deleteTask = useKanbanStore(state => state.deleteTask);
  const setSelectedTask = useKanbanStore(state => state.setSelectedTask);
  
  // Set up sortable behavior
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
    disabled: isEditing,
  });
  
  // Log when a card is being dragged
  React.useEffect(() => {
    if (isSortableDragging) {
      console.log('🟣 CARD BEING DRAGGED', {
        taskId: task.id,
        title: task.title,
        transform
      });
    }
  }, [isSortableDragging, task.id, task.title, transform]);

  // Create styles for the draggable element
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // Handle click on the card to open the edit modal
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open the modal if clicking on the action buttons
    if (e.target instanceof Element && (e.target.closest('button') || e.target.closest('a'))) {
      return;
    }
    
    // Open the edit modal
    setSelectedTask(task);
  };
  
  // If card is being dragged in the overlay
  if (isDragging) {
    return (
      <div
        className={`
          rounded-lg border border-border border-l-2 ${priorityColor} 
          bg-card p-3 text-sm shadow-xl ring-2 ring-primary/50
          w-80 max-w-80
        `}
      >
        <div className="font-medium">{task.title}</div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {task.description}
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
                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {task.priority && (
            <span className={`
              rounded px-1.5 py-0.5 text-[10px] 
              ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
                task.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 
                'bg-blue-100 text-blue-800'}
            `}>
              {task.priority}
            </span>
          )}
        </div>
      </div>
    );
  }
  
  // We no longer need the inline editing mode as we're using a modal
  // Removing this code block
  
  // Normal view
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      className={`
        rounded-lg border border-border border-l-2 ${priorityColor} 
        bg-card p-3 text-sm hover:border-primary/60 transition-colors 
        ${isSortableDragging ? 'opacity-50' : ''}
        cursor-grab active:cursor-grabbing
        w-full relative
      `}
    >
      <div className="flex justify-between items-start mb-1">
        <h3 className="font-medium">{task.title}</h3>
        
        {isHovered && (
          <div className="flex gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setSelectedTask(task);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              aria-label="Edit task"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (confirm('Are you sure you want to delete this task?')) {
                  deleteTask(task.id);
                }
              }}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted"
              aria-label="Delete task"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      
      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
          {task.description}
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
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {task.priority && (
          <span className={`
            rounded px-1.5 py-0.5 text-[10px] 
            ${task.priority === 'high' ? 'bg-red-100 text-red-800' : 
              task.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 
              'bg-blue-100 text-blue-800'}
          `}>
            {task.priority}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;