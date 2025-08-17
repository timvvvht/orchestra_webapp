import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useKanbanStore } from '../../stores/kanbanStore';
import { Task, Column } from '../../types/kanban';
import DragPlaceholder from './DragPlaceholder';
import DragOverlay from './DragOverlay';
import SmoothTaskForm from './SmoothTaskForm';

interface SmoothTaskColumnProps {
  column: Column;
  tasks: Task[];
  getPriorityColor: (priority?: 'low' | 'medium' | 'high') => string;
}

interface SmoothTaskCardProps {
  task: Task;
  getPriorityColor: (priority?: 'low' | 'medium' | 'high') => string;
  onDragStart: (event: React.PointerEvent, id: string, containerId: string) => void;
}

// Task Card Component
const SmoothTaskCard: React.FC<SmoothTaskCardProps> = ({ task, getPriorityColor, onDragStart }) => {
  const itemRef = useRef<HTMLDivElement>(null);
  // Use the drag and drop context
  const dndInstance = React.useContext(DragAndDropContext);
  const { registerItem } = dndInstance || {};
  const deleteTask = useKanbanStore(state => state.deleteTask);
  
  const priorityColor = getPriorityColor(task.priority);
  
  useEffect(() => {
    if (itemRef.current && registerItem) {
      registerItem(task.id, itemRef.current);
    }
    
    return () => {
      if (registerItem) {
        registerItem(task.id, null);
      }
    };
  }, [task.id, registerItem]);
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask(task.id);
  };
  
  return (
    <div
      ref={itemRef}
      className={`rounded-lg border border-border border-l-2 ${priorityColor} bg-card p-3 text-sm hover:border-primary/60 transition-colors cursor-pointer relative z-20`}
      onPointerDown={(e) => task.columnId && onDragStart(e, task.id, task.columnId)}
    >
      <div className="flex justify-between items-start mb-1">
        <p>{task.title}</p>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Delete task"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{task.description}</p>
    </div>
  );
};

// Task Column Component
const SmoothTaskColumn: React.FC<SmoothTaskColumnProps> = ({ column, tasks, getPriorityColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Use the drag and drop context
  const dndInstance = React.useContext(DragAndDropContext);
  const { registerContainer, startDrag, dragState } = dndInstance || {};
  
  // Get the placeholder dimensions from the first task or use default values
  const placeholderHeight = tasks.length > 0 ? 80 : 60; // Approximate height of a task card
  
  // Determine if the placeholder should be visible in this column
  const showPlaceholder = dragState?.isDragging && 
                         dragState?.targetContainerId === column.id && 
                         dragState?.placeholderIndex !== null;
  
  useEffect(() => {
    if (containerRef.current && registerContainer) {
      registerContainer(column.id, containerRef.current);
    }
    
    return () => {
      if (registerContainer) {
        registerContainer(column.id, null);
      }
    };
  }, [column.id, registerContainer]);
  
  // Create a modified task list that includes the placeholder at the correct position
  const tasksWithPlaceholder = [...tasks];
  if (showPlaceholder && dragState?.placeholderIndex !== null) {
    // If the dragged task is from this column, remove it from the list
    const filteredTasks = dragState?.draggedId ? 
      tasksWithPlaceholder.filter(task => task.id !== dragState?.draggedId) : 
      tasksWithPlaceholder;
    
    // Insert the placeholder at the correct position
    const index = Math.min(dragState?.placeholderIndex || 0, filteredTasks.length);
    filteredTasks.splice(index, 0, { id: 'placeholder', title: '', description: '', columnId: column.id });
    
    // Update the task list
    tasksWithPlaceholder.length = 0;
    tasksWithPlaceholder.push(...filteredTasks);
  }
  
  return (
    <div className="flex flex-col rounded-xl bg-muted/30 overflow-hidden relative z-10">
      <h3 className="border-b border-border px-4 py-2 text-xs font-semibold text-muted-foreground">
        {column.title} ({tasks.length})
      </h3>
      <div 
        ref={containerRef}
        className="flex-1 space-y-3 overflow-y-auto p-3 min-h-[200px]"
      >
        {tasksWithPlaceholder.map((task) => {
          if (task.id === 'placeholder') {
            return (
              <DragPlaceholder 
                key="placeholder"
                height={placeholderHeight}
                isVisible={true}
                animationDuration={150}
              />
            );
          }
          
          // Skip rendering the task that's being dragged
          if (dragState?.isDragging && task.id === dragState?.draggedId) {
            return null;
          }
          
          return (
            <SmoothTaskCard
              key={task.id}
              task={task}
              getPriorityColor={getPriorityColor}
              onDragStart={startDrag || (() => {})}
            />
          );
        })}
        
        {/* Add task form */}
        <div className="mt-4">
          <SmoothTaskForm columnId={column.id} />
        </div>
      </div>
    </div>
  );
};

// Create a context for the drag and drop instance
// Define it outside the component to avoid recreation on each render
const DragAndDropContext = React.createContext<ReturnType<typeof useDragAndDrop> | null>(null);

// Main Task Board Component
const SmoothTaskBoard: React.FC = () => {
  // Use separate selectors to avoid infinite loop warning
  const columns = useKanbanStore(state => state.columns || []);
  const tasks = useMemo(() => columns.flatMap(column => column.tasks), [columns]);
  const moveTask = useKanbanStore(state => state.moveTask);
  
  // Get the currently dragged task
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  
  // Create a single instance of the drag and drop hook with memoized callbacks
  const onDragStartCallback = useCallback((taskId: string, sourceColumnId: string) => {
    // Find the task that's being dragged
    const task = tasks.find((t: Task) => t.id === taskId);
    if (task) {
      setDraggedTask(task);
    }
  }, [tasks]);
  
  const onDragEndCallback = useCallback((taskId: string, sourceColumnId: string, targetColumnId: string | null, targetIndex: number | null) => {
    // Reset the dragged task
    setDraggedTask(null);
    
    // Move the task if it was dropped on a valid target
    if (targetColumnId && targetIndex !== null) {
      moveTask(taskId, targetColumnId, targetIndex);
    }
  }, [moveTask]);
  
  // Create a single instance of the drag and drop hook with memoized callbacks
  const dndInstance = useDragAndDrop({
    onDragStart: onDragStartCallback,
    onDragEnd: onDragEndCallback
  });
  
  const getPriorityColor = useCallback((priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'low':
        return 'border-l-blue-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'high':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-500';
    }
  }, []);
  
  // Load the board data when the component mounts
  useEffect(() => {
    const loadBoard = useKanbanStore.getState().loadBoard;
    loadBoard().catch(err => {
      console.error('Failed to load kanban board:', err);
    });
  }, []);

  return (
    <DragAndDropContext.Provider value={dndInstance}>
      <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/10">
        <h2 className="text-lg font-semibold">Task Board</h2>
        <div className="text-sm text-muted-foreground">
          {tasks.length} tasks in {columns.length} columns
        </div>
      </div>
      
      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 flex-1 overflow-auto">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task: Task) => task.columnId === column.id);
          
          return (
            <SmoothTaskColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              getPriorityColor={getPriorityColor}
            />
          );
        })}
        
        {/* Custom Drag Overlay */}
        <DragOverlay
          task={draggedTask}
          position={dndInstance?.dragState?.currentPosition}
          offset={dndInstance?.dragState?.offset}
          getPriorityColor={getPriorityColor}
        />
      </div>
      </div>
    </DragAndDropContext.Provider>
  );
};

export default SmoothTaskBoard;