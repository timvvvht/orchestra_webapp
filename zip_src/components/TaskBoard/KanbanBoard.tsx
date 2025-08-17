import React, { useState, useMemo } from 'react';
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
  DragOverEvent,
  MeasuringStrategy,
} from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { useKanbanStore } from '@/stores/kanbanStore';
import { Column, Task } from '@/types/kanban';
import KanbanColumn from './KanbanColumn';
import TaskCard from './TaskCard';
import KanbanHeader from './KanbanHeader';
import TaskEditModal from './TaskEditModal';

const KanbanBoard: React.FC = () => {
  // Use Zustand store for state management
  const columns = useKanbanStore(state => state.columns || []);
  const moveTask = useKanbanStore(state => state.moveTask);
  const moveColumn = useKanbanStore(state => state.moveColumn);
  const loadBoard = useKanbanStore(state => state.loadBoard);
  const isLoading = useKanbanStore(state => state.isLoading);
  const selectedTask = useKanbanStore(state => state.selectedTask);
  const setSelectedTask = useKanbanStore(state => state.setSelectedTask);
  const updateTask = useKanbanStore(state => state.updateTask);
  
  // Local state for drag and drop
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  
  // Memoize column IDs for performance
  const columnIds = useMemo(() => columns.map(col => col.id), [columns]);
  
  // Load the board when the component mounts
  React.useEffect(() => {
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

  // Handle drag start event with detailed debugging
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    console.log('🟢 DRAG START', {
      activeId: active.id,
      activeData,
      event
    });
    
    if (activeData?.type === 'Task') {
      setActiveTask(activeData.task);
    } else if (activeData?.type === 'Column') {
      setActiveColumn(activeData.column);
    }
  };
  
  // Handle drag over event with detailed debugging
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!active) return;
    
    // Check if we're over an empty column drop area
    const isOverEmptyColumn = over?.id.toString().includes('empty-column');
    
    // Debug all columns to ensure they're registered as droppable
    if (active.data.current?.type === 'Task') {
      console.log('All columns during drag:', columns.map(col => ({
        id: col.id,
        title: col.title,
        taskCount: col.tasks.length,
        element: document.querySelector(`[data-column-id="${col.id}"]`)
      })));
    }
    
    console.log('ud83dudfe1 DRAG OVER', {
      activeId: active.id,
      activeData: active.data.current,
      overId: over?.id,
      overData: over?.data.current,
      isOverEmptyColumn,
      overElement: over ? document.getElementById(over.id.toString()) : null,
      pointerCoordinates: event.activatorEvent ? {
        x: (event.activatorEvent as MouseEvent).clientX,
        y: (event.activatorEvent as MouseEvent).clientY
      } : null
    });
    
    const activeId = active.id;
    const activeData = active.data.current;
    
    // Handle task dragging
    if (activeData?.type === 'Task') {
      // Check if we're over a valid target
      if (over) {
        const overId = over.id;
        
        // Skip if hovering over the same item
        if (activeId === overId) return;
        
        const overData = over.data.current;
        
        // If dragging over another task
        if (overData?.type === 'Task') {
          const activeTask = activeData.task as Task;
          const overTask = overData.task as Task;
          
          // Find the columns containing these tasks
          const activeColumn = columns.find(col => 
            col.tasks.some(task => task.id === activeTask.id)
          );
          const overColumn = columns.find(col => 
            col.tasks.some(task => task.id === overTask.id)
          );
          
          if (!activeColumn || !overColumn) return;
          
          // If tasks are in the same column
          if (activeColumn.id === overColumn.id) {
            const columnTasks = [...activeColumn.tasks];
            const activeIndex = columnTasks.findIndex(task => task.id === activeTask.id);
            const overIndex = columnTasks.findIndex(task => task.id === overTask.id);
            
            // Update the store with the new task order
            if (activeIndex !== overIndex) {
              const newTasks = arrayMove(columnTasks, activeIndex, overIndex);
              
              // Update the column with the new task order
              useKanbanStore.setState({
                columns: columns.map(col => 
                  col.id === activeColumn.id 
                    ? { ...col, tasks: newTasks } 
                    : col
                )
              });
            }
          } else {
            // Moving between columns
            const overIndex = overColumn.tasks.findIndex(task => task.id === overTask.id);
            moveTask(activeTask.id, overColumn.id, overIndex);
          }
        }
        // If dragging over a column or empty column placeholder
        else if (overData?.type === 'Column' || over.id.toString().includes('empty-column')) {
          // Get the column ID - either directly from the over element or from a data attribute
          let columnId: string;
          
          if (overData?.type === 'Column') {
            columnId = overId as string;
          } else {
            // Try to get the column ID from the DOM element
            const element = document.querySelector(`[data-empty-column="true"][data-column-id="${overId}"], [data-empty-column-drop-area="true"][data-column-id="${overId}"]`);
            columnId = element?.getAttribute('data-column-id') || overId as string;
          }
          
          // Move the task to the end of the column
          moveTask(activeId as string, columnId, columns.find(col => col.id === columnId)?.tasks.length || 0);
        }
      } else {
        // If we're not over a valid target, check if we're over an empty column area
        // This uses DOM APIs to find the element under the pointer
        const activeTask = activeData.task as Task;
        const pointerPosition = event.activatorEvent ? {
          x: (event.activatorEvent as MouseEvent).clientX,
          y: (event.activatorEvent as MouseEvent).clientY
        } : null;
        
        if (pointerPosition) {
          // Find all column elements
          const columnElements = document.querySelectorAll('[data-column-id]');
          
          // Check if the pointer is over any column
          for (const element of Array.from(columnElements)) {
            const rect = element.getBoundingClientRect();
            const columnId = element.getAttribute('data-column-id');
            
            // Check if pointer is within this column's bounds (with extra margin)
            const margin = 50; // 50px margin
            if (
              columnId &&
              pointerPosition.x >= rect.left - margin &&
              pointerPosition.x <= rect.right + margin &&
              pointerPosition.y >= rect.top - margin &&
              pointerPosition.y <= rect.bottom + margin
            ) {
              // We found a column under the pointer
              const column = columns.find(col => col.id === columnId);
              if (column) {
                // Move the task to this column
                moveTask(activeTask.id, columnId, column.tasks.length);
                break;
              }
            }
          }
        }
      }
    }
    // Handle column dragging
    else if (activeData?.type === 'Column' && over?.data.current?.type === 'Column') {
      const overId = over.id;
      
      // Skip if hovering over the same item
      if (activeId === overId) return;
      
      const activeIndex = columns.findIndex(col => col.id === activeId);
      const overIndex = columns.findIndex(col => col.id === overId);
      
      if (activeIndex !== overIndex) {
        moveColumn(activeId as string, overIndex);
      }
    }
  };

  // Handle drag end event with detailed debugging
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Get the pointer position for fallback detection
    const pointerPosition = event.activatorEvent ? {
      x: (event.activatorEvent as MouseEvent).clientX,
      y: (event.activatorEvent as MouseEvent).clientY
    } : null;
    
    console.log('🔴 DRAG END', {
      activeId: active.id,
      activeData: active.data.current,
      overId: over?.id,
      overData: over?.data.current,
      overType: over?.data.current?.type,
      overColumn: over?.data.current?.column,
      pointerPosition,
      delta: event.delta,
      activatorEvent: event.activatorEvent,
    });
    
    // Reset active items
    setActiveTask(null);
    setActiveColumn(null);
    
    const activeId = active.id;
    const activeData = active.data.current;
    
    // Handle task dropping
    if (activeData?.type === 'Task') {
      const activeTask = activeData.task as Task;
      
      // Find the source column
      const sourceColumn = columns.find(col => 
        col.tasks.some(task => task.id === activeTask.id)
      );
      
      if (!sourceColumn) return; // Safety check
      
      // If there's a valid drop target
      if (over) {
        const overId = over.id;
        
        // Skip if dropped on itself
        if (activeId === overId) return;
        
        const overData = over.data.current;
        
        // If dropping on another task
        if (overData?.type === 'Task') {
          const overTask = overData.task as Task;
          
          // Find the target column
          const targetColumn = columns.find(col => 
            col.tasks.some(task => task.id === overTask.id)
          );
          
          if (!targetColumn) return; // Safety check
          
          // Use the unified moveTask function for all task movements
          const sourceIndex = sourceColumn.tasks.findIndex(task => task.id === activeTask.id);
          const targetIndex = targetColumn.tasks.findIndex(task => task.id === overTask.id);
          
          console.log('ud83dudfe3 TASK MOVEMENT', {
            taskId: activeTask.id,
            taskTitle: activeTask.title,
            sourceColumnId: sourceColumn.id,
            targetColumnId: targetColumn.id,
            sourceIndex,
            targetIndex,
            isSameColumn: sourceColumn.id === targetColumn.id
          });
          
          // Use the moveTask function from the store for all movements
          moveTask(activeTask.id, targetColumn.id, targetIndex);
        }
        // If dropping on a column
        else if (overData?.type === 'Column') {
          // Get the column ID - either directly from the over element or from a data attribute
          let columnId: string;
          
          // Regular column drop
          columnId = overId as string;
          
          console.log('ud83dudfe3 COLUMN DROP DETECTED', {
            overId,
            columnId,
            columnTitle: (overData.column as Column).title,
            overElement: document.getElementById(overId.toString()),
            overElementRect: document.getElementById(overId.toString())?.getBoundingClientRect()
          });
          
          // Move the task to the end of the column
          const targetColumn = columns.find(col => col.id === columnId);
          const targetIndex = targetColumn?.tasks.length || 0;
          
          console.log('ud83dudfe3 DROPPING ON COLUMN', {
            sourceColumnId: sourceColumn.id,
            targetColumnId: columnId,
            taskId: activeTask.id,
            taskTitle: activeTask.title,
            targetIndex,
            isEmptyColumn: targetColumn?.tasks.length === 0,
            isEmptyColumnPlaceholder: over.id.toString().includes('empty-column')
          });
          
          moveTask(activeId as string, columnId, targetIndex);
        }
      } 
      // If there's no valid drop target, try to find a column under the pointer
      else if (pointerPosition) {
        // Find all column elements
        const columnElements = document.querySelectorAll('[data-column-id]');
        let foundColumn = false;
        
        // Check if the pointer is over any column
        for (const element of Array.from(columnElements)) {
          const rect = element.getBoundingClientRect();
          const columnId = element.getAttribute('data-column-id');
          
          // Check if pointer is within this column's bounds (with extra margin)
          const margin = 100; // 100px margin for better detection
          if (
            columnId &&
            pointerPosition.x >= rect.left - margin &&
            pointerPosition.x <= rect.right + margin &&
            pointerPosition.y >= rect.top - margin &&
            pointerPosition.y <= rect.bottom + margin
          ) {
            // We found a column under the pointer
            const column = columns.find(col => col.id === columnId);
            if (column) {
              // If it's the same column, we need to handle it specially
              if (column.id === sourceColumn.id) {
                // For same column drops, we don't need to do anything
                // The card will return to its original position
                console.log('Dropped back in the same column');
              } else {
                // Move the task to this column
                moveTask(activeTask.id, columnId, column.tasks.length);
              }
              foundColumn = true;
              break;
            }
          }
        }
        
        // If we didn't find a column, the card will return to its original position
        if (!foundColumn) {
          console.log('ud83dudfe3 NO VALID DROP TARGET FOUND', {
            activeId: active.id,
            activeData: active.data.current,
            pointerPosition,
            sourceColumnId: sourceColumn.id,
            sourceColumnTitle: sourceColumn.title,
            allColumns: columns.map(col => ({ id: col.id, title: col.title }))
          });
        }
      }
    }
    // Handle column dropping
    else if (activeData?.type === 'Column' && over?.data.current?.type === 'Column') {
      const overId = over.id;
      
      // Skip if dropped on itself
      if (activeId === overId) return;
      
      const activeIndex = columns.findIndex(col => col.id === activeId);
      const overIndex = columns.findIndex(col => col.id === overId);
      
      if (activeIndex !== overIndex) {
        moveColumn(activeId as string, overIndex);
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

  // Handle saving edited task
  const handleSaveTask = (editedTask: Task) => {
    updateTask(editedTask.id, editedTask);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with task creation form */}
      <KanbanHeader />
      
      {/* Main board area - allows vertical scrolling for the entire board */}
      <div className="flex-1 overflow-auto p-4" id="kanban-board-container">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
        >
          <div className="flex gap-4 min-h-full overflow-x-auto pb-4 pr-4" id="kanban-columns-container">
            <SortableContext items={columnIds}>
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  getPriorityColor={getPriorityColor}
                />
              ))}
            </SortableContext>
          </div>
          
          {/* Drag overlay for the active item */}
          {createPortal(
            <DragOverlay zIndex={1000} className="pointer-events-none fixed">
              {activeTask && (
                <TaskCard 
                  task={activeTask} 
                  priorityColor={getPriorityColor(activeTask.priority)}
                  isDragging={true}
                />
              )}
              {activeColumn && (
                <KanbanColumn
                  column={activeColumn}
                  getPriorityColor={getPriorityColor}
                  isDragging={true}
                />
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

export default KanbanBoard;

// Helper function for keyboard coordinates
function sortableKeyboardCoordinates(event: KeyboardEvent) {
  return {
    x: 0,
    y: 0,
  };
}