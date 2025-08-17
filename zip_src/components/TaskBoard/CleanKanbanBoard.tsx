import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { useCleanKanbanStore } from '@/stores/cleanKanbanStore';
import { Column, Task } from '@/types/kanban';
import CleanKanbanColumn from './CleanKanbanColumn';
import CleanTaskCard from './CleanTaskCard';
// KanbanHeader removed as it's integrated in the dashboard
import TaskEditModal from './TaskEditModal';

const CleanKanbanBoard: React.FC = () => {
  // Use Zustand store for state management
  const columns = useCleanKanbanStore(state => state.columns || []);
  const moveTask = useCleanKanbanStore(state => state.moveTask);
  const moveColumn = useCleanKanbanStore(state => state.moveColumn);
  const loadBoard = useCleanKanbanStore(state => state.loadBoard);
  const isLoading = useCleanKanbanStore(state => state.isLoading);
  const selectedTask = useCleanKanbanStore(state => state.selectedTask);
  const setSelectedTask = useCleanKanbanStore(state => state.setSelectedTask);
  const updateTask = useCleanKanbanStore(state => state.updateTask);
  
  // Local state for drag and drop
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  
  // Load the board when the component mounts
  React.useEffect(() => {
    loadBoard().catch(err => {
      console.error('Failed to load kanban board:', err);
    });
  }, [loadBoard]);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
        tolerance: 5, // Allow some movement without triggering drag
        delay: 0, // No delay to start dragging
      },
    }),
    useSensor(KeyboardSensor)
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

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    // Removed console log to reduce noise
    
    if (activeData?.type === 'Task') {
      setActiveTask(activeData.task);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    // Removed console log to reduce noise
    const { active, over } = event;
    
    // Reset active task
    setActiveTask(null);
    
    // If no valid drop target, do nothing
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    // Skip if dropped on itself
    if (activeId === overId) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Handle task dropping
    if (activeData?.type === 'Task') {
      // If dropping on a task
      if (overData?.type === 'Task') {
        const targetTask = overData.task;
        const targetColumnId = targetTask.columnId;
        
        // Find the index of the target task in its column
        const targetColumn = columns.find(col => col.id === targetColumnId);
        if (!targetColumn) return;
        
        const targetIndex = targetColumn.tasks.findIndex(task => task.id === targetTask.id);
        
        // Move the task to the target column at the target index
        moveTask(activeId as string, targetColumnId, targetIndex);
      }
      // If dropping on a column
      else if (overData?.type === 'Column') {
        const targetColumnId = overId as string;
        
        // Move the task to the end of the target column
        const targetColumn = columns.find(col => col.id === targetColumnId);
        if (!targetColumn) return;
        
        moveTask(activeId as string, targetColumnId, targetColumn.tasks.length);
      }
    }
    // Handle column reordering
    else if (activeData?.type === 'Column' && overData?.type === 'Column') {
      const activeColumnIndex = columns.findIndex(col => col.id === activeId);
      const overColumnIndex = columns.findIndex(col => col.id === overId);
      
      if (activeColumnIndex !== -1 && overColumnIndex !== -1) {
        // Use the moveColumn from props to avoid state refresh issues
        moveColumn(activeId as string, overColumnIndex);
      }
    }
  };

  // Handle saving edited task
  const handleSaveTask = (editedTask: Task) => {
    updateTask(editedTask.id, editedTask);
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
      
      {/* Main board area */}
      <div className="flex-1 overflow-auto p-4" id="kanban-board-container">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 h-full overflow-x-auto pb-4 pr-4" id="kanban-columns-container">
            <SortableContext items={columns.map(col => col.id)}>
              {columns.map((column) => (
                <CleanKanbanColumn
                  key={column.id}
                  column={column}
                  getPriorityColor={getPriorityColor}
                />
              ))}
            </SortableContext>
          </div>
          
          {/* Drag overlay for the active item */}
          {createPortal(
            <DragOverlay zIndex={1000} className="pointer-events-none fixed" dropAnimation={null}>
              {activeTask && (
                <div className="w-64" style={{ transform: 'scale(1)', transition: 'transform 0.1s ease-in-out' }}> {/* Fixed width to match column width */}
                  <div className={`rounded-lg border border-border border-l-2 ${getPriorityColor(activeTask.priority)} bg-surface-0 p-3 text-sm shadow-xl ring-2 ring-primary/50 w-full`}>
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium">{activeTask.title}</p>
                    </div>
                    {activeTask.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeTask.description.length > 100
                          ? `${activeTask.description.substring(0, 100)}...`
                          : activeTask.description}
                      </p>
                    )}
                    {activeTask.tags && activeTask.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activeTask.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="px-1.5 py-0.5 bg-surface-2 text-[10px] rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </div>

      {/* Task Edit Modal */}
      {selectedTask && (
        <TaskEditModal
          task={selectedTask}
          onSave={handleSaveTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};

export default CleanKanbanBoard;