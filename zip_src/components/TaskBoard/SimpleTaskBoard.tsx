import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  MeasuringStrategy,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useKanbanStore } from '@/stores/kanbanStore';
import { Task } from '@/types/kanban';
import SimpleTaskColumn from './SimpleTaskColumn';
import SimpleTaskCard from './SimpleTaskCard';
import SimpleTaskHeader from './SimpleTaskHeader';

const SimpleTaskBoard: React.FC = () => {
  // Use separate selectors to avoid infinite loop warning
  const columns = useKanbanStore(state => state.columns || []);
  const moveTask = useKanbanStore(state => state.moveTask);
  const loadBoard = useKanbanStore(state => state.loadBoard);
  const isLoading = useKanbanStore(state => state.isLoading);
  
  // State for the active dragging task
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Load the board when the component mounts
  useEffect(() => {
    loadBoard().catch(err => {
      console.error('Failed to load kanban board:', err);
    });
  }, [loadBoard]);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Configure for better touch support
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get priority color for task styling
  const getPriorityColor = (priority?: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-amber-500';
      case 'low':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  // Handle drag start event
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;
    
    // Find the task being dragged across all columns
    const task = columns.flatMap(col => col.tasks).find(t => t.id === activeId);
    if (task) {
      setActiveTask(task);
    }
  };

  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;
    
    // Reset active task
    setActiveTask(null);
    
    // If there's no over element, just return (card goes back to original position)
    if (!over) return;
    
    const overId = over.id as string;
    
    // Find the source column and task
    let sourceColumnId = null;
    let sourceTaskIndex = -1;
    
    for (const column of columns) {
      const taskIndex = column.tasks.findIndex(task => task.id === activeId);
      if (taskIndex !== -1) {
        sourceColumnId = column.id;
        sourceTaskIndex = taskIndex;
        break;
      }
    }
    
    // If we can't find the source column, just return
    if (!sourceColumnId) return;
    
    // Check if we're dropping on a column
    const targetColumn = columns.find(col => col.id === overId);
    if (targetColumn) {
      // We're dropping directly onto a column, append to the end
      moveTask(activeId, targetColumn.id, targetColumn.tasks.length);
      return;
    }
    
    // Check if we're dropping on another task
    for (const column of columns) {
      const taskIndex = column.tasks.findIndex(task => task.id === overId);
      if (taskIndex !== -1) {
        // We found the task we're dropping on
        
        // Special handling for same-column moves to prevent disappearing cards
        if (column.id === sourceColumnId) {
          // If we're moving within the same column, we need to handle the indices carefully
          // Get all tasks except the one being moved
          const newTasks = column.tasks.filter(task => task.id !== activeId);
          
          // Insert the task at the new position
          newTasks.splice(taskIndex, 0, column.tasks[sourceTaskIndex]);
          
          // Update the column with the new task order
          const updatedColumn = {
            ...column,
            tasks: newTasks
          };
          
          // Update the store with the new column state
          useKanbanStore.setState({
            columns: columns.map(col => col.id === column.id ? updatedColumn : col)
          });
          
          // Save the board
          useKanbanStore.getState().saveBoard();
        } else {
          // Normal case - moving between different columns
          moveTask(activeId, column.id, taskIndex);
        }
        return;
      }
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading board...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with task creation form */}
      <SimpleTaskHeader />
      
      {/* Main board area */}
      <div className="flex-1 overflow-visible p-4">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
            {columns.map((column) => (
              <SortableContext key={column.id} items={column.tasks.map(t => t.id)}>
                <SimpleTaskColumn
                  key={column.id}
                  column={column}
                  getPriorityColor={getPriorityColor}
                />
              </SortableContext>
            ))}
          </div>
          
          {/* Drag overlay for the active task */}
          <DragOverlay zIndex={1000} className="pointer-events-none fixed">
            {activeTask && (
              <SimpleTaskCard 
                task={activeTask} 
                priorityColor={getPriorityColor(activeTask.priority)}
                isDragging={true}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

export default SimpleTaskBoard;